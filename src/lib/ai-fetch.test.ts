// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The backend client is replaced by a scripted one; fetch by a fake AI route. Nothing real is reached.
const auth = vi.hoisted(() => ({
  token: "aaaaaaaa.bbbbbbbb.cccccccc" as string | null,
  renewed: null as string | null,
  configured: true,
}));
vi.mock("@/integrations/supabase/client", () => ({
  loadSupabase: async () =>
    auth.configured
      ? {
          auth: {
            getSession: async () => ({
              data: { session: auth.token ? { access_token: auth.token } : null },
            }),
            refreshSession: async () => ({
              data: { session: auth.renewed ? { access_token: auth.renewed } : null },
            }),
          },
        }
      : null,
}));

import { aiFetch, hasMemberSession, SignInRequiredError } from "./ai-fetch";

let route: ReturnType<typeof vi.fn>;
beforeEach(() => {
  auth.token = "aaaaaaaa.bbbbbbbb.cccccccc";
  auth.renewed = null;
  auth.configured = true;
  route = vi.fn(async () => new Response("ok", { status: 200 }));
  vi.stubGlobal("fetch", route);
});
afterEach(() => vi.unstubAllGlobals());

const sentAuthorization = (call: number) =>
  new Headers((route.mock.calls[call][1] as RequestInit).headers).get("Authorization");

describe("calls to the AI routes", () => {
  it("send the member's session token", async () => {
    const res = await aiFetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(200);
    expect(sentAuthorization(0)).toBe("Bearer aaaaaaaa.bbbbbbbb.cccccccc");
    expect(new Headers((route.mock.calls[0][1] as RequestInit).headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("send nothing at all without a session or without a backend", async () => {
    auth.token = null;
    await expect(aiFetch("/api/studio/generate")).rejects.toBeInstanceOf(SignInRequiredError);
    expect(await hasMemberSession()).toBe(false);
    auth.configured = false;
    await expect(aiFetch("/api/studio/generate")).rejects.toBeInstanceOf(SignInRequiredError);
    expect(route).not.toHaveBeenCalled();
  });

  it("renew the session once on a 401 and try once more with the new token", async () => {
    auth.renewed = "dddddddd.eeeeeeee.ffffffff";
    route.mockResolvedValueOnce(new Response("no", { status: 401 }));
    route.mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const res = await aiFetch("/api/studio/generate", { method: "POST", body: "{}" });
    expect(res.status).toBe(200);
    expect(route).toHaveBeenCalledTimes(2);
    expect(sentAuthorization(1)).toBe("Bearer dddddddd.eeeeeeee.ffffffff");
  });

  it("hand back the 401 when the session cannot be renewed, after a single attempt", async () => {
    route.mockResolvedValue(new Response("no", { status: 401 }));
    const res = await aiFetch("/api/studio/generate", { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
    expect(route).toHaveBeenCalledTimes(1);
  });

  it("never loop: a second 401 after renewing is returned as it is", async () => {
    auth.renewed = "dddddddd.eeeeeeee.ffffffff";
    route.mockResolvedValue(new Response("no", { status: 401 }));
    const res = await aiFetch("/api/studio/generate", { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
    expect(route).toHaveBeenCalledTimes(2);
  });

  it("do not retry other errors", async () => {
    route.mockResolvedValue(new Response("busy", { status: 429 }));
    expect((await aiFetch("/api/studio/generate")).status).toBe(429);
    expect(route).toHaveBeenCalledTimes(1);
  });
});
