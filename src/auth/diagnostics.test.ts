// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authError, createFakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";

const holder = vi.hoisted(() => ({ fake: null as unknown as FakeSupabase | null }));
vi.mock("@/integrations/supabase/client", () => ({
  isAuthConfigured: true,
  loadSupabase: async () => holder.fake?.client ?? null,
}));

import { diagnoseAuthError, recordAuthDiagnostic, type AuthDiagnostic } from "./diagnostics";
import { signUpWithEmail } from "./service";

const trace = () =>
  (window as unknown as { __afmAuthDiagnostics?: AuthDiagnostic[] }).__afmAuthDiagnostics;

beforeEach(() => {
  delete (window as unknown as { __afmAuthDiagnostics?: unknown }).__afmAuthDiagnostics;
  holder.fake = createFakeSupabase();
});
afterEach(() => vi.unstubAllEnvs());

describe("telling the three kinds of failure apart", () => {
  it("a request that got no answer is a network problem", () => {
    expect(
      diagnoseAuthError({ name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" }),
    ).toEqual({
      category: "network",
      status: 0,
      code: "",
    });
    expect(diagnoseAuthError(new TypeError("Failed to fetch")).category).toBe("network");
    expect(
      diagnoseAuthError({ message: "NetworkError when attempting to fetch resource." }).category,
    ).toBe("network");
  });

  it.each([
    ["rate limit", 429, "over_email_send_rate_limit"],
    ["sign-up closed", 422, "signup_disabled"],
    ["address not authorised (default mail service)", 400, "email_address_not_authorized"],
    ["address refused", 400, "email_address_invalid"],
    ["weak password", 422, "weak_password"],
    ["key refused", 401, "invalid_api_key"],
  ])("a 4xx answer is the service refusing: %s", (_label, status, code) => {
    expect(diagnoseAuthError(authError(code, status, "whatever")).category).toBe("service_refusal");
    expect(diagnoseAuthError(authError(code, status, "whatever"))).toMatchObject({ status, code });
  });

  it("a 500 about sending the mail is an SMTP failure", () => {
    for (const message of [
      "Error sending confirmation email",
      "Error sending recovery email",
      "Error sending magic link email",
      "535 5.7.8 SMTP authentication failed",
    ]) {
      expect(diagnoseAuthError(authError("unexpected_failure", 500, message))).toEqual({
        category: "smtp",
        status: 500,
        code: "unexpected_failure",
      });
    }
  });

  it("another 5xx is a service error, not an SMTP failure", () => {
    expect(
      diagnoseAuthError(authError("unexpected_failure", 500, "Database error saving new user"))
        .category,
    ).toBe("service_error");
    expect(
      diagnoseAuthError({ name: "AuthRetryableFetchError", status: 502, message: "Bad gateway" })
        .category,
    ).toBe("service_error");
  });

  it("anything unreadable is unknown", () => {
    expect(diagnoseAuthError(undefined).category).toBe("unknown");
    expect(diagnoseAuthError({}).category).toBe("unknown");
    expect(diagnoseAuthError("oops").category).toBe("unknown");
  });
});

describe("what is kept", () => {
  const nasty = authError(
    "unexpected_failure",
    500,
    "Error sending confirmation email to amina.private@example.test password=correct-horse-battery token=eyJhbGciOiJIUzI1NiJ9.abc.def https://x.supabase.co/auth/v1/verify?token=secret123",
  );

  it("keeps only time, operation, category, status and code: no address, password, token or link", () => {
    const entry = recordAuthDiagnostic("signUpWithEmail", nasty);
    expect(entry && Object.keys(entry).sort()).toEqual([
      "at",
      "category",
      "code",
      "operation",
      "status",
    ]);
    const dump = JSON.stringify(trace());
    for (const secret of [
      "amina.private",
      "example.test",
      "correct-horse",
      "eyJ",
      "secret123",
      "verify",
      "http",
    ]) {
      expect(dump).not.toContain(secret);
    }
    expect(trace()?.[0]).toMatchObject({
      category: "smtp",
      status: 500,
      code: "unexpected_failure",
      operation: "signUpWithEmail",
    });
  });

  it("refuses a code that is not a plain Supabase code, and an odd operation name", () => {
    recordAuthDiagnostic("sign up!", authError("amina@example.test", 400, "x"));
    expect(trace()?.[0]).toMatchObject({ operation: "other", code: "" });
  });

  it("keeps the last 20 only, in order", () => {
    for (let i = 0; i < 25; i += 1)
      recordAuthDiagnostic("signUpWithEmail", authError("over_request_rate_limit", 429, String(i)));
    expect(trace()).toHaveLength(20);
  });

  it("records nothing outside development builds", () => {
    vi.stubEnv("DEV", false);
    expect(recordAuthDiagnostic("signUpWithEmail", nasty)).toBeNull();
    expect(trace()).toBeUndefined();
  });
});

describe("through the sign-up service", () => {
  it("an SMTP failure leaves a trace of its kind while the screen keeps its neutral message", async () => {
    holder.fake!.set("signUp", {
      data: { user: null, session: null },
      error: authError("unexpected_failure", 500, "Error sending confirmation email"),
    });
    const result = await signUpWithEmail("someone@example.test", "a very long password 123");
    expect(result.ok).toBe(false);
    // the mail failed: the screen says so, and never blames the network
    expect(!result.ok && result.failure.kind).toBe("email_failed");
    expect(trace()).toHaveLength(1);
    expect(trace()?.[0]).toMatchObject({
      operation: "signUpWithEmail",
      category: "smtp",
      status: 500,
    });
    expect(JSON.stringify(trace())).not.toContain("someone");
    expect(JSON.stringify(trace())).not.toContain("a very long password");
  });

  it("a refusal and a network failure are told apart too", async () => {
    holder.fake!.set("signUp", {
      data: { user: null, session: null },
      error: authError("over_email_send_rate_limit", 429, "email rate limit exceeded"),
    });
    await signUpWithEmail("someone@example.test", "a very long password 123");
    holder.fake!.set("signUp", {
      data: { user: null, session: null },
      error: { name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" },
    });
    await signUpWithEmail("someone@example.test", "a very long password 123");
    expect(trace()?.map((t) => t.category)).toEqual(["service_refusal", "network"]);
  });

  it("a successful sign-up leaves no trace", async () => {
    await signUpWithEmail("someone@example.test", "a very long password 123");
    expect(trace()).toBeUndefined();
  });
});
