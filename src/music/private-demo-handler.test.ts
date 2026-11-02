import { describe, expect, it, vi } from "vitest";
import type { MemberCheck } from "@/lib/member-guard";
import { handlePrivateLyriaRequest, type PrivateLyriaBindings } from "./private-demo-handler";
import type { BudgetDatabase, BudgetStatement } from "./private-demo-budget";
import type { LyriaSong } from "./lyria35";
import { LyriaGenerationError } from "./lyria35";

const ID0 = "11111111-1111-4111-8111-000000000000";
const ID1 = "11111111-1111-4111-8111-000000000001";

class FakeD1 implements BudgetDatabase {
  used = 0;
  active: string | null = null;
  ids: string[] = [];

  prepare(sql: string): BudgetStatement {
    const state = () => this;
    let args: (string | number | null)[] = [];
    const stmt: BudgetStatement = {
      bind(...values) { args = values; return stmt; },
      async first<T>() {
        const id = args[0];
        if (sql.startsWith("SELECT")) {
          return { used_calls: state().used, active_request_id: state().active, request_ids: JSON.stringify(state().ids) } as T;
        }
        if (typeof id !== "string") throw new Error("missing id");
        if (sql.includes("SET used_calls")) {
          if (state().used >= 5 || state().active || state().ids.includes(id)) return null;
          state().used += 1;
          state().active = id;
          state().ids.push(id);
          return { used_calls: state().used } as T;
        }
        if (sql.includes("SET active_request_id")) {
          if (state().active !== id) return null;
          state().active = null;
          return { used_calls: state().used } as T;
        }
        throw new Error("unexpected SQL");
      },
    };
    return stmt;
  }
}

function request(id = ID0, body: unknown = { prompt: "Afrobeats song in French" }) {
  return new Request("https://aimf.test/api/studio/lyria-private", {
    method: "POST",
    headers: { origin: "https://aimf.test", "idempotency-key": id, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const testSong: LyriaSong = {
  model: "lyria-3.5",
  mimeType: "audio/mpeg",
  audio: new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0]),
  text: "[Chorus]\nSomething memorable",
  estimatedCostUsd: 0.08,
};

function setup(db = new FakeD1()) {
  const bindings: PrivateLyriaBindings = {
    AIMF_PRIVATE_LYRIA_ENABLED: "1",
    AIMF_PRIVATE_LYRIA_OWNER_ID: "owner-1",
    GEMINI_API_KEY: "server-test-only",
    AIMF_PRIVATE_LYRIA_DB: db,
  };
  const verify = vi.fn(async (): Promise<MemberCheck> => ({ ok: true, userId: "owner-1" }));
  const generate = vi.fn(async (): Promise<LyriaSong> => testSong);
  return { db, bindings, verify, generate };
}

describe("owner-only real generation pilot", () => {
  it("remains off by default: no auth, budget or provider call", async () => {
    const x = setup();
    delete x.bindings.AIMF_PRIVATE_LYRIA_ENABLED;
    const res = await handlePrivateLyriaRequest(request(), x.bindings, x);
    expect(res.status).toBe(503);
    expect(x.verify).not.toHaveBeenCalled();
    expect(x.generate).not.toHaveBeenCalled();
    expect(x.db.used).toBe(0);
  });

  it("rejects cross-origin requests before authentication", async () => {
    const x = setup();
    const req = new Request("https://aimf.test/api/studio/lyria-private", {
      method: "POST", headers: { origin: "https://foreign.example" },
    });
    expect((await handlePrivateLyriaRequest(req, x.bindings, x)).status).toBe(403);
    expect(x.verify).not.toHaveBeenCalled();
  });

  it("checks the owner identity after server-validated authentication", async () => {
    const x = setup();
    x.verify.mockResolvedValueOnce({ ok: true, userId: "other-member" });
    const res = await handlePrivateLyriaRequest(request(), x.bindings, x);
    expect(res.status).toBe(403);
    expect(x.db.used).toBe(0);
    expect(x.generate).not.toHaveBeenCalled();
  });

  it("refuses sessions that are unavailable before spending", async () => {
    const x = setup();
    x.verify.mockResolvedValueOnce({
      ok: false,
      response: Response.json({ code: "invalid_session" }, { status: 401 }),
    });
    const res = await handlePrivateLyriaRequest(request(), x.bindings, x);
    expect(res.status).toBe(401);
    expect(x.generate).not.toHaveBeenCalled();
    expect(x.db.used).toBe(0);
  });

  it("requires D1 and a server secret even if the owner is signed in", async () => {
    const x = setup();
    delete x.bindings.AIMF_PRIVATE_LYRIA_DB;
    expect((await handlePrivateLyriaRequest(request(), x.bindings, x)).status).toBe(503);
    expect(x.generate).not.toHaveBeenCalled();
    const y = setup();
    delete y.bindings.GEMINI_API_KEY;
    expect((await handlePrivateLyriaRequest(request(), y.bindings, y)).status).toBe(503);
    expect(y.generate).not.toHaveBeenCalled();
  });

  it("reserves exactly once and returns MP3 + lyrics, without exposing secrets", async () => {
    const x = setup();
    const res = await handlePrivateLyriaRequest(request(), x.bindings, x);
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(x.db.used).toBe(1);
    expect(x.db.active).toBeNull();
    expect(x.generate).toHaveBeenCalledTimes(1);
    expect(body.audioBase64).toBe(Buffer.from(testSong.audio).toString("base64"));
    expect(body.lyrics).toBe(testSong.text);
    expect(body.pilotCallsUsed).toBe(1);
    expect(JSON.stringify(body)).not.toContain("server-test-only");
  });

  it("does not replay a previously completed request ID", async () => {
    const x = setup();
    await handlePrivateLyriaRequest(request(ID0), x.bindings, x);
    const res = await handlePrivateLyriaRequest(request(ID0), x.bindings, x);
    expect(res.status).toBe(409);
    expect(x.generate).toHaveBeenCalledTimes(1);
    expect(x.db.used).toBe(1);
  });

  it("holds the lock after a provider failure of uncertain billing status", async () => {
    const x = setup();
    x.generate.mockRejectedValueOnce(new LyriaGenerationError("upstream_unavailable", 502));
    const first = await handlePrivateLyriaRequest(request(ID0), x.bindings, x);
    expect(first.status).toBe(502);
    expect(x.db.active).toBe(ID0);
    const second = await handlePrivateLyriaRequest(request(ID1), x.bindings, x);
    expect(second.status).toBe(409);
    expect(x.generate).toHaveBeenCalledTimes(1);
    expect(x.db.used).toBe(1);
  });

  it("refuses invalid prompt and missing idempotency key without reservation", async () => {
    const x = setup();
    expect((await handlePrivateLyriaRequest(request(ID0, { prompt: "" }), x.bindings, x)).status).toBe(400);
    expect((await handlePrivateLyriaRequest(request("invalid"), x.bindings, x)).status).toBe(400);
    expect(x.db.used).toBe(0);
    expect(x.generate).not.toHaveBeenCalled();
  });
});
