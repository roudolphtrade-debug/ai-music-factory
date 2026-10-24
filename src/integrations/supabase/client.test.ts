// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function load() {
  vi.resetModules();
  return import("./client");
}

beforeEach(() => {
  vi.unstubAllEnvs();
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("member backend configuration", () => {
  it("is off, and gives no client, when the two public values are missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    const client = await load();
    expect(client.isAuthConfigured).toBe(false);
    expect(await client.loadSupabase()).toBeNull();
    expect(client.authNeededAtStart()).toBe(false);
  });

  it("is off when only one of the two is set", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    expect((await load()).isAuthConfigured).toBe(false);
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect((await load()).isAuthConfigured).toBe(false);
  });

  it("is off for an address that is not an http(s) URL", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect((await load()).isAuthConfigured).toBe(false);
  });

  it("is on with both values, and always hands out the same client", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    const client = await load();
    expect(client.isAuthConfigured).toBe(true);
    const first = await client.loadSupabase();
    expect(first?.auth).toBeTruthy();
    expect(await client.loadSupabase()).toBe(first);
  });
});

describe("loading the client on demand", () => {
  const configure = () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  };

  it("creates nothing until it is asked for, then tells the listeners waiting for it", async () => {
    configure();
    const client = await load();
    const seen = vi.fn();
    client.whenSupabaseReady(seen);
    expect(seen).not.toHaveBeenCalled();
    const sb = await client.loadSupabase();
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenCalledWith(sb);
    const late = vi.fn();
    client.whenSupabaseReady(late); // already there: called at once
    expect(late).toHaveBeenCalledWith(sb);
  });

  it("lets a listener stop waiting", async () => {
    configure();
    const client = await load();
    const seen = vi.fn();
    client.whenSupabaseReady(seen)();
    await client.loadSupabase();
    expect(seen).not.toHaveBeenCalled();
  });

  it("starts with the page only for a stored session or an email link", async () => {
    configure();
    const client = await load();
    expect(client.authNeededAtStart()).toBe(false); // a visitor who only browses
    window.localStorage.setItem(client.AUTH_STORAGE_KEY, "{}");
    expect(client.authNeededAtStart()).toBe(true);
    window.localStorage.clear();
    for (const address of [
      "/auth/confirm#access_token=abc&type=signup",
      "/auth/reset-password#access_token=abc&type=recovery",
      "/auth/confirm#error=access_denied&error_code=otp_expired",
      "/auth/confirm?code=abc",
    ]) {
      window.history.replaceState(null, "", address);
      expect(client.authNeededAtStart(), address).toBe(true);
    }
    window.history.replaceState(null, "", "/radio#now-playing");
    expect(client.authNeededAtStart()).toBe(false);
  });
});

describe("the first-load address of an email link", () => {
  it("is kept before the client can read and clean it, and handed over once for the right page", async () => {
    window.history.replaceState(
      null,
      "",
      "/auth/confirm#error=access_denied&error_code=otp_expired",
    );
    const client = await load();
    expect(client.takeAuthUrlSnapshot()).toMatchObject({
      path: "/auth/confirm",
      hash: "#error=access_denied&error_code=otp_expired",
    });
    // Later navigation does not overwrite what the page was opened with.
    window.history.replaceState(null, "", "/somewhere-else");
    expect(client.takeAuthUrlSnapshot()?.path).toBe("/auth/confirm");
    expect(client.consumeAuthUrlSnapshot("/auth/confirm")?.hash).toContain("otp_expired");
    // Used once: a second visit to the page does not replay the old outcome.
    expect(client.consumeAuthUrlSnapshot("/auth/confirm")).toBeNull();
  });

  it("is not handed to a different page", async () => {
    window.history.replaceState(null, "", "/auth/confirm#access_token=abc");
    const client = await load();
    expect(client.consumeAuthUrlSnapshot("/auth/reset-password")).toBeNull();
    expect(client.consumeAuthUrlSnapshot("/auth/confirm")).toBeNull();
  });

  it("is taken when the client is first created", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    window.history.replaceState(null, "", "/auth/reset-password#access_token=abc&type=recovery");
    const client = await load();
    await client.loadSupabase();
    expect(client.consumeAuthUrlSnapshot("/auth/reset-password")?.hash).toContain("type=recovery");
  });
});
