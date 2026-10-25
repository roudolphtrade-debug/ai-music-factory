// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { authError, makeProfile, makeSession, type FakeSupabase } from "@/test/fakeSupabase";
import {
  expectNavigation,
  mountPage,
  navigations,
  pageOf,
  press,
  setUpAccounts,
  submit,
  type,
} from "@/test/authHarness";
import type { AuthHolder } from "@/test/clientMock";
import { authCopy } from "@/i18n/auth";

const holder = vi.hoisted(
  () => ({ fake: null, configured: true, startWithClient: true, snapshot: null }) as AuthHolder,
);
vi.mock("@tanstack/react-router", async () => (await import("@/test/routerMock")).routerModule);
vi.mock("@/integrations/supabase/client", async () =>
  (await import("@/test/clientMock")).clientModule(holder),
);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { Route as SignUpRoute } from "@/routes/auth.sign-up";
import { Route as SignInRoute } from "@/routes/auth.sign-in";
import { Route as ForgotRoute } from "@/routes/auth.forgot-password";

const SignUp = pageOf(SignUpRoute);
const SignIn = pageOf(SignInRoute);
const Forgot = pageOf(ForgotRoute);

let fake: FakeSupabase;
beforeEach(() => {
  fake = setUpAccounts(holder);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const fillSignUp = (email = "amina@example.test", password = "a long enough password") => {
  type(/email address/i, email);
  type(/^password/i, password);
};

describe("sign-up", () => {
  it("shows the form, the password rule and a way to sign in", async () => {
    mountPage(SignUp);
    expect(await screen.findByRole("heading", { name: "Join the factory" })).toBeTruthy();
    expect(screen.getByText("At least 12 characters.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(
      "/auth/sign-in",
    );
    expect(screen.getByLabelText(/email address/i).getAttribute("autocomplete")).toBe("email");
    expect(screen.getByLabelText(/^password/i).getAttribute("autocomplete")).toBe("new-password");
  });

  it("explains empty and invalid fields and sends nothing", async () => {
    mountPage(SignUp);
    await submit("Create my account");
    expect((await screen.findAllByText("This field is required.")).length).toBe(2);
    fillSignUp("nope", "short");
    await submit("Create my account");
    expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
    expect(
      await screen.findByText("The password must be at least 12 characters long."),
    ).toBeTruthy();
    expect(fake.client.auth.signUp).not.toHaveBeenCalled();
  });

  it("marks an invalid field for assistive technology and ties its message to it", async () => {
    mountPage(SignUp);
    await submit("Create my account");
    const email = screen.getByLabelText(/email address/i);
    await waitFor(() => expect(email.getAttribute("aria-invalid")).toBe("true"));
    const described = email.getAttribute("aria-describedby")!;
    expect(document.getElementById(described)?.textContent).toBe("This field is required.");
  });

  it("creates the account, then asks to check the inbox, naming the address", async () => {
    mountPage(SignUp);
    fillSignUp("  amina@example.test ");
    await submit("Create my account");
    expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeTruthy();
    expect(fake.client.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "amina@example.test" }),
    );
    expect(screen.getByText(/amina@example.test/)).toBeTruthy();
    expect(sessionStorage.getItem("afm-pending-email")).toBe("amina@example.test");
    // The member is not signed in until the link is opened.
    expect(navigations()).toEqual([]);
  });

  it("makes the member wait before asking for the link again, then allows it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mountPage(SignUp);
    fillSignUp();
    await submit("Create my account");
    const resend = await screen.findByRole("button", { name: /Resend in 60 s/ });
    expect((resend as HTMLButtonElement).disabled).toBe(true);
    await act(async () => void (await vi.advanceTimersByTimeAsync(30_000)));
    expect(screen.getByRole("button", { name: /Resend in 30 s/ })).toBeTruthy();
    await act(async () => void (await vi.advanceTimersByTimeAsync(30_000)));
    const ready = screen.getByRole("button", { name: "Resend the link" }) as HTMLButtonElement;
    expect(ready.disabled).toBe(false);
    await act(async () => fireEvent.click(ready));
    expect(fake.client.auth.resend).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/a new link has just been sent/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Resend in 60 s/ })).toBeTruthy();
  });

  it("tells the member to wait when the service refuses another mail", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mountPage(SignUp);
    fillSignUp();
    await submit("Create my account");
    await act(async () => void (await vi.advanceTimersByTimeAsync(60_000)));
    fake.set("resend", { data: {}, error: authError("over_email_send_rate_limit", 429) });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Resend the link" })));
    expect(
      await screen.findByText("Too many attempts. Wait a few minutes before trying again."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Resend in/ })).toBeTruthy();
  });

  it("lets the member go back and correct the address", async () => {
    mountPage(SignUp);
    fillSignUp();
    await submit("Create my account");
    await screen.findByRole("heading", { name: "Check your inbox" });
    press("Wrong address? Start over");
    expect(await screen.findByRole("heading", { name: "Join the factory" })).toBeTruthy();
  });

  it("looks the same when the address already has an account", async () => {
    fake.set("signUp", { data: {}, error: authError("user_already_exists", 422) });
    mountPage(SignUp);
    fillSignUp();
    await submit("Create my account");
    expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeTruthy();
  });

  it("shows a plain message, never the backend's text, when sign-up fails", async () => {
    fake.set("signUp", {
      data: {},
      error: authError("weak_password", 422, "Password is known to be weak and easy to guess"),
    });
    mountPage(SignUp);
    fillSignUp();
    await submit("Create my account");
    expect(await screen.findByText(/too weak/i)).toBeTruthy();
    expect(screen.queryByText(/easy to guess/)).toBeNull();
  });

  it("goes straight to the welcome page when the project confirms addresses itself", async () => {
    fake.set("signUp", { data: { user: { id: "u" }, session: makeSession() }, error: null });
    mountPage(SignUp);
    fillSignUp();
    await submit("Create my account");
    await waitFor(() => expectNavigation("/welcome"));
  });

  it("sends a member who is already signed in to the welcome page", async () => {
    fake.restore(makeSession());
    mountPage(SignUp);
    await waitFor(() => expectNavigation("/welcome"));
  });

  it("can show and hide the password", async () => {
    mountPage(SignUp);
    const field = screen.getByLabelText(/^password/i) as HTMLInputElement;
    expect(field.type).toBe("password");
    press("Show password");
    expect(field.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    press("Hide password");
    expect(field.type).toBe("password");
  });
});

describe("sign-in", () => {
  const fillSignIn = (password = "correct horse battery") => {
    type(/email address/i, "amina@example.test");
    type(/^password/i, password);
  };

  it("shows the form with the right autofill hints and a recovery link", async () => {
    mountPage(SignIn);
    expect(await screen.findByRole("heading", { name: "Good to see you again" })).toBeTruthy();
    expect(screen.getByLabelText(/^password/i).getAttribute("autocomplete")).toBe(
      "current-password",
    );
    expect(screen.getByRole("link", { name: "Forgot your password?" }).getAttribute("href")).toBe(
      "/auth/forgot-password",
    );
    expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href")).toBe(
      "/auth/sign-up",
    );
  });

  it("answers a wrong password with one neutral message", async () => {
    fake.set("signInWithPassword", {
      data: {},
      error: authError("invalid_credentials", 400, "Invalid login credentials"),
    });
    mountPage(SignIn);
    fillSignIn("wrong");
    await submit("Sign me in");
    expect(await screen.findByText("Incorrect email address or password.")).toBeTruthy();
    expect(screen.queryByText(/Invalid login credentials/)).toBeNull();
    expect(navigations()).toEqual([]);
  });

  it("asks an unconfirmed member to confirm, with a button to get a new link", async () => {
    fake.set("signInWithPassword", { data: {}, error: authError("email_not_confirmed") });
    mountPage(SignIn);
    fillSignIn();
    await submit("Sign me in");
    expect(await screen.findByText("Address to confirm")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Resend the link" })));
    expect(fake.client.auth.resend).toHaveBeenCalledWith(
      expect.objectContaining({ email: "amina@example.test" }),
    );
    expect(await screen.findByText(/a new link has just been sent/i)).toBeTruthy();
  });

  it.each([
    [
      authError("over_request_rate_limit", 429),
      "Too many attempts. Wait a few minutes before trying again.",
    ],
    [
      Object.assign(new TypeError("Failed to fetch"), { name: "TypeError" }),
      "Connection failed. Check your network and try again.",
    ],
    [authError("unexpected_failure", 500), authCopy.en.errServiceDown],
  ])("explains a refusal or an outage in plain words (%#)", async (error, message) => {
    fake.set("signInWithPassword", { data: {}, error });
    mountPage(SignIn);
    fillSignIn();
    await submit("Sign me in");
    expect(await screen.findByText(message)).toBeTruthy();
  });

  it("takes a returning member to where they were headed", async () => {
    mountPage(SignIn, { search: { redirect: "/library" } });
    fillSignIn();
    await submit("Sign me in");
    // The backend announces the session, the profile loads, then the member moves on.
    fake.set("fetchProfile", {
      data: makeProfile({ onboarding_completed_at: "2026-10-20T10:00:00Z" }),
      error: null,
    });
    act(() => fake.emit("SIGNED_IN", makeSession()));
    await waitFor(() => expectNavigation("/library"));
  });

  it("takes a member who never finished the welcome page there first, remembering the destination", async () => {
    mountPage(SignIn, { search: { redirect: "/library" } });
    fillSignIn();
    await submit("Sign me in");
    fake.set("fetchProfile", { data: makeProfile({ onboarding_completed_at: null }), error: null });
    act(() => fake.emit("SIGNED_IN", makeSession()));
    await waitFor(() => expectNavigation("/welcome", { redirect: "/library" }));
  });

  it("does not trap the member if the profile cannot be loaded", async () => {
    mountPage(SignIn);
    fillSignIn();
    await submit("Sign me in");
    fake.set("fetchProfile", { data: null, error: authError("PGRST000", 500) });
    act(() => fake.emit("SIGNED_IN", makeSession()));
    await waitFor(() => expectNavigation("/"));
  });

  it("moves on at once when opened by a member who is already signed in", async () => {
    fake.restore(makeSession());
    fake.set("fetchProfile", {
      data: makeProfile({ onboarding_completed_at: "2026-10-20T10:00:00Z" }),
      error: null,
    });
    mountPage(SignIn);
    await waitFor(() => expectNavigation("/"));
  });
});

describe("forgotten password", () => {
  it("answers the same way whether or not the address has an account", async () => {
    mountPage(Forgot);
    type(/email address/i, "someone@example.test");
    await submit("Send the link");
    expect(await screen.findByRole("heading", { name: "Link sent" })).toBeTruthy();
    expect(screen.getByText(/If an account exists for someone@example.test/)).toBeTruthy();
    expect(fake.client.auth.resetPasswordForEmail).toHaveBeenCalledWith("someone@example.test", {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
  });

  it("looks the same when the backend refuses the unknown address", async () => {
    fake.set("resetPasswordForEmail", { data: {}, error: authError("user_not_found", 404) });
    mountPage(Forgot);
    type(/email address/i, "nobody@example.test");
    await submit("Send the link");
    expect(await screen.findByRole("heading", { name: "Link sent" })).toBeTruthy();
  });

  it("validates the address first", async () => {
    mountPage(Forgot);
    type(/email address/i, "not an address");
    await submit("Send the link");
    expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
    expect(fake.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("asks to wait, rather than pretending, when the mail service is rate limited", async () => {
    fake.set("resetPasswordForEmail", {
      data: {},
      error: authError("over_email_send_rate_limit", 429),
    });
    mountPage(Forgot);
    type(/email address/i, "a@b.co");
    await submit("Send the link");
    expect(
      await screen.findByText("Too many attempts. Wait a few minutes before trying again."),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Link sent" })).toBeNull();
  });

  it("offers a way back to sign-in", async () => {
    mountPage(Forgot);
    expect(screen.getByRole("link", { name: "Back to sign in" }).getAttribute("href")).toBe(
      "/auth/sign-in",
    );
  });
});
