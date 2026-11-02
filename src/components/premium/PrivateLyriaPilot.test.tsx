// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/context";
import { PRIVATE_PILOT_COPY } from "@/music/private-demo-copy";
import { PILOT_SCHEMA_SQL } from "@/music/private-pilot-sql";
import type { D1Like, PilotMessage, PrivateLyriaBindings, R2Like } from "@/music/private-pilot-bindings";

// The browser's aiFetch is wired to the REAL server handler, over SQLite, an in-memory queue and bucket.
const env = vi.hoisted(() => ({
  user: "owner-1" as string | null,
  bindings: null as unknown,
  sent: [] as unknown[],
  posts: 0,
}));
vi.mock("@/auth/context", () => ({
  useAuth: () => ({ status: env.user ? "signedIn" : "signedOut", user: env.user ? { id: env.user } : null }),
}));
vi.mock("@/lib/ai-fetch", () => ({
  aiFetch: async (input: string, init: RequestInit = {}) => {
    const { handlePrivateLyriaRequest } = await import("@/music/private-demo-handler");
    if (init.method === "POST") env.posts++;
    const headers = new Headers(init.headers);
    headers.set("origin", "https://aimf.test");
    const req = new Request(new URL(input, "https://aimf.test"), { method: init.method ?? "GET", headers, body: init.body });
    return handlePrivateLyriaRequest(req, env.bindings as PrivateLyriaBindings, {
      verify: async () => (env.user ? { ok: true, userId: env.user } : { ok: false, response: new Response(null, { status: 401 }) }),
      processEnv: {},
    });
  },
}));

type SqliteDb = { exec(sql: string): void; prepare(sql: string): { get(...v: unknown[]): unknown; all(...v: unknown[]): unknown[]; run(...v: unknown[]): unknown } };
const sqlite = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule?.("node:sqlite") as
  | { DatabaseSync: new (path: string) => SqliteDb }
  | undefined;

function d1(db: SqliteDb): D1Like {
  return {
    prepare(sql) {
      let v: (string | number | null)[] = [];
      const s = {
        bind: (...x: (string | number | null)[]) => ((v = x), s),
        first: async <T,>() => (db.prepare(sql).get(...v) ?? null) as T | null,
        all: async <T,>() => ({ results: db.prepare(sql).all(...v) as T[] }),
        run: async () => db.prepare(sql).run(...v),
      };
      return s;
    },
  };
}
const objects = new Map<string, { bytes: Uint8Array; meta: Record<string, string> }>();
const bucket: R2Like = {
  async put(key, value, options) {
    const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
    objects.set(key, { bytes, meta: { ...(options?.customMetadata ?? {}) } });
    return { size: bytes.byteLength };
  },
  async head(key) {
    const o = objects.get(key);
    return o ? { size: o.bytes.byteLength, customMetadata: o.meta } : null;
  },
  async get(key) {
    const o = objects.get(key);
    return o
      ? { size: o.bytes.byteLength, customMetadata: o.meta, body: new Response(o.bytes.slice()).body as ReadableStream<Uint8Array>, text: async () => new TextDecoder().decode(o.bytes) }
      : null;
  },
};
const AUDIO = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 1, 2, 3]);
let providerCalls = 0;
const deliver = async () => {
  const { consumePrivateLyriaBatch } = await import("@/music/private-pilot-worker");
  const messages = env.sent.splice(0).map((body) => ({ body, ack() {} }));
  await consumePrivateLyriaBatch({ messages }, env.bindings as PrivateLyriaBindings, {
    processEnv: {},
    generate: async () => {
      providerCalls++;
      return { model: "lyria-3.5", audio: AUDIO, mimeType: "audio/mpeg", text: "la la la", estimatedCostUsd: 0.08 };
    },
  });
};

const fr = PRIVATE_PILOT_COPY.fr;
const mount = async () => {
  const { PrivateLyriaPilot } = await import("./PrivateLyriaPilot");
  return render(
    <LanguageProvider>
      <PrivateLyriaPilot />
    </LanguageProvider>,
  );
};

beforeEach(() => {
  if (!sqlite) return;
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec(PILOT_SCHEMA_SQL);
  objects.clear();
  env.sent = [];
  env.posts = 0;
  env.user = "owner-1";
  providerCalls = 0;
  env.bindings = {
    AIMF_PRIVATE_LYRIA_ENABLED: "1",
    AI_ROUTES_PAUSED: "0",
    AIMF_PRIVATE_LYRIA_OWNER_ID: "owner-1",
    GEMINI_API_KEY: "TEST-KEY-not-real-000000000000",
    AIMF_PRIVATE_LYRIA_DB: d1(db),
    AIMF_PRIVATE_LYRIA_QUEUE: { send: async (m: PilotMessage) => void env.sent.push(m) },
    AIMF_PRIVATE_LYRIA_BUCKET: bucket,
  } satisfies PrivateLyriaBindings;
  localStorage.clear();
  localStorage.setItem("afm-lang", "fr");
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:pilot-song", revokeObjectURL: () => {} }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

(sqlite ? describe : describe.skip)("private pilot in the Studio: asynchronous, recoverable, owner only", () => {
  it("is not shown to another member, and nothing is sent", async () => {
    env.user = "member-2";
    await mount();
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(screen.queryByLabelText(fr.title)).toBeNull();
    expect(env.posts).toBe(0);
  });

  it("one click queues one attempt; the song comes back from the private store, also after the tab was closed", async () => {
    const first = await mount();
    const promptBox = await screen.findByLabelText(fr.prompt);
    fireEvent.change(promptBox, { target: { value: "Une chanson lumineuse" } });
    await act(async () => fireEvent.submit(promptBox.closest("form") as HTMLFormElement));
    expect(await screen.findByText(fr.statusQueued)).toBeTruthy();
    expect(env.posts).toBe(1);
    expect(providerCalls).toBe(0);

    first.unmount(); // the tab is closed while the server works
    await deliver();
    expect(providerCalls).toBe(1);

    await mount(); // a new tab
    expect(await screen.findByText(fr.statusStored)).toBeTruthy();
    await waitFor(() => expect(document.querySelector("audio")?.getAttribute("src")).toBe("blob:pilot-song"));
    expect(screen.getByText("la la la")).toBeTruthy();
    expect(env.posts).toBe(1); // reopening never sends a new attempt
  });

  it("the texts no longer say the song stays only in the tab, in any language", () => {
    for (const copy of Object.values(PRIVATE_PILOT_COPY)) {
      expect(copy.spokenNotGuaranteed).not.toMatch(/uniquement dans cet onglet|only in this tab|solo en esta pestaña|仅保留在当前标签页|apenas nesta aba|في علامة التبويب هذه فقط/);
      for (const key of ["statusQueued", "statusRunning", "statusStored", "statusNeedsReview", "statusHalted", "refresh", "reviewRequired"] as const) {
        expect(copy[key].length).toBeGreaterThan(3);
      }
    }
  });
});
