// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authError,
  createFakeSupabase,
  makeProfile,
  makeSession,
  type FakeSupabase,
} from "@/test/fakeSupabase";

const holder = vi.hoisted(() => ({
  fake: null as unknown as FakeSupabase | null,
  configured: true,
}));
vi.mock("@/integrations/supabase/client", () => ({
  get isAuthConfigured() {
    return holder.configured;
  },
  loadSupabase: async () => (holder.configured ? (holder.fake?.client ?? null) : null),
}));

import {
  fetchProfile,
  requestPasswordReset,
  resendConfirmation,
  saveProfile,
  signInWithEmail,
  signOutMember,
  signUpWithEmail,
  updateMemberPassword,
} from "./service";

let fake: FakeSupabase;
beforeEach(() => {
  fake = createFakeSupabase();
  holder.fake = fake;
  holder.configured = true;
});

describe("sign-up", () => {
  it("sends the confirmation link back to the confirmation page", async () => {
    await signUpWithEmail("amina@example.test", "a long enough password");
    expect(fake.client.auth.signUp).toHaveBeenCalledWith({
      email: "amina@example.test",
      password: "a long enough password",
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
  });

  it("asks for confirmation when no session comes back", async () => {
    const result = await signUpWithEmail("a@b.co", "a long enough password");
    expect(result).toEqual({ ok: true, data: { needsConfirmation: true } });
  });

  it("does not ask when the project confirms addresses itself (a session comes back)", async () => {
    fake.set("signUp", { data: { user: { id: "u" }, session: makeSession() }, error: null });
    expect(await signUpWithEmail("a@b.co", "a long enough password")).toEqual({
      ok: true,
      data: { needsConfirmation: false },
    });
  });

  it("answers like a normal sign-up when the address already has an account", async () => {
    fake.set("signUp", { data: {}, error: authError("user_already_exists", 422) });
    expect(await signUpWithEmail("a@b.co", "a long enough password")).toEqual({
      ok: true,
      data: { needsConfirmation: true },
    });
    fake.set("signUp", { data: {}, error: authError("email_exists", 422) });
    expect((await signUpWithEmail("a@b.co", "a long enough password")).ok).toBe(true);
  });

  it("reports a weak password, a closed sign-up and a rate limit as such", async () => {
    for (const [code, status, kind] of [
      ["weak_password", 422, "weak_password"],
      ["signup_disabled", 422, "signup_disabled"],
      ["over_email_send_rate_limit", 429, "rate_limit"],
    ] as const) {
      fake.set("signUp", { data: {}, error: authError(code, status) });
      const result = await signUpWithEmail("a@b.co", "a long enough password");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.failure.kind).toBe(kind);
    }
  });

  it("turns a thrown network error into a failure instead of crashing", async () => {
    fake.client.auth.signUp.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const result = await signUpWithEmail("a@b.co", "a long enough password");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.kind).toBe("network");
  });
});

describe("sign-in and sign-out", () => {
  it("signs in with the address and password as typed", async () => {
    expect(await signInWithEmail("a@b.co", "pw")).toEqual({ ok: true, data: undefined });
    expect(fake.client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "pw",
    });
  });

  it("separates a wrong password from an unconfirmed address", async () => {
    fake.set("signInWithPassword", { data: {}, error: authError("invalid_credentials") });
    const wrong = await signInWithEmail("a@b.co", "pw");
    fake.set("signInWithPassword", { data: {}, error: authError("email_not_confirmed") });
    const unconfirmed = await signInWithEmail("a@b.co", "pw");
    expect(!wrong.ok && wrong.failure.kind).toBe("credentials");
    expect(!unconfirmed.ok && unconfirmed.failure.kind).toBe("not_confirmed");
  });

  it("signs out of this device only", async () => {
    await signOutMember();
    expect(fake.client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});

describe("confirmation link and recovery", () => {
  it("asks for a new confirmation link with the same return address", async () => {
    await resendConfirmation("a@b.co");
    expect(fake.client.auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "a@b.co",
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
  });

  it("reports a rate-limited resend", async () => {
    fake.set("resend", { data: {}, error: authError("over_email_send_rate_limit", 429) });
    const result = await resendConfirmation("a@b.co");
    expect(!result.ok && result.failure.kind).toBe("rate_limit");
  });

  it("sends the recovery link to the reset page", async () => {
    await requestPasswordReset("a@b.co");
    expect(fake.client.auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.co", {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
  });

  it("looks successful for any error that could reveal whether the address exists", async () => {
    for (const code of [
      "user_not_found",
      "validation_failed",
      "unexpected_failure",
      "email_address_invalid",
    ]) {
      fake.set("resetPasswordForEmail", { data: {}, error: authError(code) });
      expect((await requestPasswordReset("nobody@example.test")).ok, code).toBe(true);
    }
  });

  it("still tells the member to wait, or that the network is down", async () => {
    fake.set("resetPasswordForEmail", {
      data: {},
      error: authError("over_email_send_rate_limit", 429),
    });
    const limited = await requestPasswordReset("a@b.co");
    fake.client.auth.resetPasswordForEmail.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const offline = await requestPasswordReset("a@b.co");
    expect(!limited.ok && limited.failure.kind).toBe("rate_limit");
    expect(!offline.ok && offline.failure.kind).toBe("network");
  });

  it("updates the password and reports the same-password and weak-password refusals", async () => {
    expect((await updateMemberPassword("a brand new passphrase")).ok).toBe(true);
    expect(fake.client.auth.updateUser).toHaveBeenCalledWith({
      password: "a brand new passphrase",
    });
    fake.set("updateUser", { data: {}, error: authError("same_password", 422) });
    const same = await updateMemberPassword("x");
    fake.set("updateUser", { data: {}, error: authError("weak_password", 422) });
    const weak = await updateMemberPassword("x");
    expect(!same.ok && same.failure.kind).toBe("same_password");
    expect(!weak.ok && weak.failure.kind).toBe("weak_password");
  });
});

describe("profile", () => {
  it("reads only the profile of the given member", async () => {
    fake.set("fetchProfile", { data: makeProfile({ display_name: "Amina" }), error: null });
    const result = await fetchProfile("user-1");
    expect(fake.client.from).toHaveBeenCalledWith("profiles");
    expect(fake.profileQuery.eq).toHaveBeenCalledWith("id", "user-1");
    expect(result.ok && result.data?.display_name).toBe("Amina");
  });

  it("answers null when there is no profile row yet", async () => {
    fake.set("fetchProfile", { data: null, error: null });
    expect(await fetchProfile("user-1")).toEqual({ ok: true, data: null });
  });

  it("updates the member's own row, with the onboarding stamp only when asked", async () => {
    await saveProfile("user-1", { display_name: "Amina", handle: null, creator_roles: ["artist"] });
    expect(fake.profileQuery.update.mock.calls[0][0]).toEqual({
      display_name: "Amina",
      handle: null,
      creator_roles: ["artist"],
    });
    expect(fake.updateQuery.eq).toHaveBeenCalledWith("id", "user-1");
    expect(fake.profileQuery.insert).not.toHaveBeenCalled();

    await saveProfile("user-1", { onboardingCompleted: true });
    const stamped = fake.profileQuery.update.mock.calls[1][0] as Record<string, unknown>;
    expect(typeof stamped.onboarding_completed_at).toBe("string");
    expect("onboardingCompleted" in stamped).toBe(false);
    expect("id" in stamped).toBe(false); // the id is never written: members have no right to it
  });

  it("never upserts: an upsert would write the id, which members may not", async () => {
    await saveProfile("user-1", { display_name: "Amina" });
    expect(Object.keys(fake.profileQuery)).not.toContain("upsert");
  });

  it("creates the row when the sign-up trigger never made one", async () => {
    fake.set("saveProfile", { data: null, error: null });
    fake.set("insertProfile", { data: makeProfile({ display_name: "amina.o" }), error: null });
    const result = await saveProfile("user-1", { onboardingCompleted: true }, " amina.o ");
    expect(result.ok && result.data.display_name).toBe("amina.o");
    const row = fake.profileQuery.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toMatchObject({ id: "user-1", display_name: "amina.o" });
    expect(typeof row.onboarding_completed_at).toBe("string");
  });

  it("names a created row after the typed name first, then 'member' as a last resort", async () => {
    fake.set("saveProfile", { data: null, error: null });
    await saveProfile("user-1", { display_name: "Amina O." }, "amina.o");
    expect(fake.profileQuery.insert.mock.calls[0][0]).toMatchObject({ display_name: "Amina O." });
    await saveProfile("user-1", { handle: "x_1" });
    expect(fake.profileQuery.insert.mock.calls[1][0]).toMatchObject({ display_name: "member" });
  });

  it("reports a refused update without trying to insert", async () => {
    fake.set("saveProfile", { data: null, error: { code: "42501", message: "raw" } });
    const result = await saveProfile("user-1", { display_name: "Amina" });
    expect(result.ok).toBe(false);
    expect(fake.profileQuery.insert).not.toHaveBeenCalled();
  });

  it("reports a refused insert", async () => {
    fake.set("saveProfile", { data: null, error: null });
    fake.set("insertProfile", { data: null, error: { code: "42501", message: "raw" } });
    expect((await saveProfile("user-1", { display_name: "Amina" })).ok).toBe(false);
  });

  it("reports a handle that another member already uses", async () => {
    fake.set("saveProfile", {
      data: null,
      error: { code: "23505", message: "duplicate key value" },
    });
    const result = await saveProfile("user-1", { handle: "taken" });
    expect(!result.ok && result.failure.kind).toBe("handle_taken");
  });
});

describe("accounts not configured", () => {
  it("every action answers 'unavailable' and nothing is called", async () => {
    holder.configured = false;
    const results = await Promise.all([
      signUpWithEmail("a@b.co", "x"),
      signInWithEmail("a@b.co", "x"),
      signOutMember(),
      resendConfirmation("a@b.co"),
      requestPasswordReset("a@b.co"),
      updateMemberPassword("x"),
      fetchProfile("u"),
      saveProfile("u", {}),
    ]);
    for (const r of results) expect(!r.ok && r.failure.kind).toBe("unavailable");
    expect(fake.client.auth.signUp).not.toHaveBeenCalled();
    expect(fake.client.from).not.toHaveBeenCalled();
  });
});
