// @vitest-environment jsdom
/**
 * P3a: the UNCHANGED Studio component, wired this time through the real chain of production code:
 * browser aiFetch -> Lovable relay (session, owner, HMAC signature) -> dedicated Worker front (HMAC, session again)
 * -> handler, D1 over SQLite, queue, private bucket. The existing component tests are left as they are.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/context";
import { PRIVATE_PILOT_COPY } from "@/music/private-demo-copy";
import { PILOT_SCHEMA_SQL } from "@/music/private-pilot-sql";
import type { PrivateLyriaBindings } from "@/music/private-pilot-bindings";
import { fakeSupabase, MockBucket, MockQueue, openBindings, sessionToken, sqlite, sqliteD1 } from "@/test/pilot-harness";

const env = vi.hoisted(() => ({
  user: "owner-1" as string | null,
  bindings: null as unknown,
  posts: 0,
  workerCalls: 0,
}));
vi.mock("@/auth/context", () => ({
  useAuth: () => ({ status: env.user ? "signedIn" : "signedOut", user: env.user ? { id: env.user } : null }),
}));
vi.mock("@/lib/ai-fetch", () => ({
  aiFetch: async (input: string, init: RequestInit = {}) => {
    const { createPilotRelay, createRelayLimiter } = await import("@/music/private-pilot-relay");
    const { handlePilotServiceRequest } = await import("@/music/private-pilot-service");
    const harness = await import("@/test/pilot-harness");
    if (init.method === "POST") env.posts++;
    const headers = new Headers(init.headers);
    headers.set("origin", "https://aimf.test");
    if (env.user) headers.set("authorization", `Bearer ${harness.sessionToken(env.user)}`);
    const req = new Request(new URL(input, "https://aimf.test"), { method: init.method ?? "GET", headers, body: init.body });
    const relay = createPilotRelay({
      fetch: (async (i: RequestInfo | URL, ri?: RequestInit) => {
        env.workerCalls++;
        return handlePilotServiceRequest(new Request(i, ri), env.bindings as PrivateLyriaBindings, { processEnv: {}, log: () => {} });
      }) as typeof fetch,
      processEnv: {},
      limiter: createRelayLimiter(),
      log: () => {},
    });
    return relay(req, harness.relayEnv());
  },
}));

const fr = PRIVATE_PILOT_COPY.fr;
let queue: MockQueue;
let bucket: MockBucket;
let providerCalls = 0;
const AUDIO = new Uint8Array(2048).map((_, i) => i % 251);

const deliver = async () => {
  const { consumePrivateLyriaBatch } = await import("@/music/private-pilot-worker");
  const messages = queue.sent.splice(0).map((body) => ({ body, ack() {} }));
  await consumePrivateLyriaBatch({ messages }, env.bindings as PrivateLyriaBindings, {
    processEnv: {},
    generate: async () => {
      providerCalls++;
      return { model: "lyria-3.5", audio: AUDIO, mimeType: "audio/mpeg", text: "la la la", estimatedCostUsd: 0.08 };
    },
  });
};
const mount = async () => {
  const { PrivateLyriaPilot } = await import("./PrivateLyriaPilot");
  return render(
    <LanguageProvider>
      <PrivateLyriaPilot />
    </LanguageProvider>,
  );
};
const generateOnce = async () => {
  const promptBox = await screen.findByLabelText(fr.prompt);
  fireEvent.change(promptBox, { target: { value: "Une chanson lumineuse" } });
  await act(async () => fireEvent.submit(promptBox.closest("form") as HTMLFormElement));
  await screen.findByText(fr.statusQueued);
};

beforeEach(() => {
  if (!sqlite) return;
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec(PILOT_SCHEMA_SQL);
  queue = new MockQueue();
  bucket = new MockBucket();
  providerCalls = 0;
  env.posts = 0;
  env.workerCalls = 0;
  env.user = "owner-1";
  env.bindings = openBindings(sqliteD1(db), queue, bucket, { AIMF_PRIVATE_LYRIA_PROVIDER: "lyria-3.5", GEMINI_API_KEY: "TEST-KEY-not-real-000000000000" });
  vi.stubGlobal("fetch", fakeSupabase({ [sessionToken("owner-1")]: "owner-1", [sessionToken("member-2")]: "member-2" }).fetch);
  localStorage.clear();
  localStorage.setItem("afm-lang", "fr");
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:pilot-song", revokeObjectURL: () => {} }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

(sqlite ? describe : describe.skip)("Studio component through the signed relay (browser contract unchanged)", () => {
  it("one click, one attempt, one provider call; the song is played after its fingerprint is checked", async () => {
    await mount();
    await generateOnce();
    expect(env.posts).toBe(1);
    await deliver();
    expect(providerCalls).toBe(1);
    cleanup();
    await mount();
    expect(await screen.findByText(fr.statusStored)).toBeTruthy();
    await waitFor(() => expect(document.querySelector("audio")?.getAttribute("src")).toBe("blob:pilot-song"));
    expect(env.posts).toBe(1);
    expect(env.workerCalls).toBeGreaterThan(0);
  });

  it("another member: hidden, and the relay never asks the Worker", async () => {
    env.user = "member-2";
    await mount();
    await act(async () => new Promise((r) => setTimeout(r, 30)));
    expect(screen.queryByLabelText(fr.title)).toBeNull();
    expect(env.workerCalls).toBe(0);
  });

  it("T-A3 the song stream cut at 50 %: the browser rejects it, no blob is played, the owner reads the message", async () => {
    await mount();
    await generateOnce();
    await deliver();
    const real = bucket.get.bind(bucket);
    bucket.get = async (key: string) => {
      const object = await real(key);
      if (!object || !key.endsWith(".mp3")) return object;
      const half = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(AUDIO.slice(0, AUDIO.length / 2));
          c.error(new Error("connection reset"));
        },
      });
      return { ...object, body: half };
    };
    cleanup();
    await mount();
    expect(await screen.findByText(fr.audioUnavailable)).toBeTruthy();
    expect(document.querySelector("audio")).toBeNull();
  });
});
