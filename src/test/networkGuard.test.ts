import { describe, expect, it } from "vitest";
import { isRealNetworkHost, RealNetworkBlocked } from "./networkGuard";

describe("the test set-up refuses real providers", () => {
  it("recognises real hosts and lets reserved test hosts through", () => {
    for (const host of [
      "ai.gateway.lovable.dev",
      "liewjcwkogoesgxcuyff.supabase.co",
      "accounts.google.com",
      "api.openai.com",
    ]) {
      expect(isRealNetworkHost(host), host).toBe(true);
    }
    for (const host of [
      "",
      "localhost",
      "127.0.0.1",
      "app.test",
      "project.example.test",
      "x.invalid",
      "example.com",
    ]) {
      expect(isRealNetworkHost(host), host).toBe(false);
    }
  });

  it("rejects an un-stubbed fetch to the AI gateway or to the project, before any network use", async () => {
    for (const url of [
      "https://ai.gateway.lovable.dev/v1/audio/speech",
      "https://liewjcwkogoesgxcuyff.supabase.co/auth/v1/user",
      new URL("https://ai.gateway.lovable.dev/v1/chat/completions"),
      new Request("https://ai.gateway.lovable.dev/v1/chat/completions"),
    ]) {
      await expect(fetch(url as RequestInfo)).rejects.toBeInstanceOf(RealNetworkBlocked);
    }
  });

  it("has removed the AI provider key from the environment", () => {
    expect(process.env.LOVABLE_API_KEY).toBeUndefined();
  });
});
