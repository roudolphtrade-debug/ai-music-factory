// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { authError, makeProfile, makeSession, type FakeSupabase } from "@/test/fakeSupabase";
import { mountPage, navigations, pageOf, setUpAccounts, submit, type } from "@/test/authHarness";
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
import { Route as WelcomeRoute } from "@/routes/_app.welcome";

const SignUp = pageOf(SignUpRoute);
const SignIn = pageOf(SignInRoute);
const Welcome = pageOf(WelcomeRoute);
const en = authCopy.en;

let fake: FakeSupabase;
beforeEach(() => {
  fake = setUpAccounts(holder);
});
afterEach(cleanup);

const emailField = () => screen.getByLabelText(/email address/i) as HTMLInputElement;
const passwordField = () => screen.getByLabelText(/^password/i) as HTMLInputElement;
const focused = (el: HTMLElement) => waitFor(() => expect(document.activeElement).toBe(el));
const technical =
  /smtp|535|\bhttp|supabase|unexpected_failure|error sending|authentication failed/i;

const signUpWith = async (email = "amina@example.test", password = "a long enough password") => {
  mountPage(SignUp);
  await screen.findByRole("heading", { name: "Join the factory" });
  type(/email address/i, email);
  type(/^password/i, password);
  await submit("Create my account");
};

describe("sign-up: what the member is told when it fails", () => {
  it("a mail that could not be sent is not blamed on the network, and nothing is lost", async () => {
    // How supabase-js reports an HTTP 500 answered by the service when the mail server refuses.
    fake.set("signUp", {
      data: { user: null, session: null },
      error: {
        name: "AuthRetryableFetchError",
        status: 500,
        message: "Error sending confirmation email",
      },
    });
    await signUpWith();
    expect(await screen.findByText(en.errEmailSend)).toBeTruthy();
    expect(screen.queryByText(en.errNetwork)).toBeNull();
    expect(screen.queryByText(/check your network/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(technical);
    // still on the form, with what was typed
    expect(emailField().value).toBe("amina@example.test");
    expect(passwordField().value).toBe("a long enough password");
    expect(screen.queryByRole("heading", { name: "Check your inbox" })).toBeNull();
  });

  it("a service failure says the service is down, not the connection", async () => {
    fake.set("signUp", {
      data: { user: null, session: null },
      error: { name: "AuthRetryableFetchError", status: 503, message: "upstream connect error" },
    });
    await signUpWith();
    expect(await screen.findByText(en.errServiceDown)).toBeTruthy();
    expect(screen.queryByText(en.errNetwork)).toBeNull();
    expect(document.body.textContent).not.toMatch(technical);
    expect(emailField().value).toBe("amina@example.test");
  });

  it("only a request that got no answer is a network problem", async () => {
    fake.set("signUp", {
      data: { user: null, session: null },
      error: { name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" },
    });
    await signUpWith();
    expect(await screen.findByText(en.errNetwork)).toBeTruthy();
    expect(screen.queryByText(en.errEmailSend)).toBeNull();
    expect(passwordField().value).toBe("a long enough password");
  });

  it("a password the service refuses is written under the password field, which gets the cursor", async () => {
    fake.set("signUp", {
      data: { user: null, session: null },
      error: authError("weak_password", 422),
    });
    await signUpWith();
    expect(await screen.findByText(en.errPasswordWeak)).toBeTruthy();
    expect(passwordField().getAttribute("aria-invalid")).toBe("true");
    await focused(passwordField());
    expect(emailField().value).toBe("amina@example.test");
  });

  it("puts the cursor on the first invalid field", async () => {
    mountPage(SignUp);
    await screen.findByRole("heading", { name: "Join the factory" });
    await submit("Create my account"); // both empty
    await focused(emailField());
    type(/email address/i, "amina@example.test");
    type(/^password/i, "short");
    await submit("Create my account");
    expect(await screen.findByText(en.errPasswordShort)).toBeTruthy();
    await focused(passwordField());
    expect(emailField().value).toBe("amina@example.test"); // kept
    expect(passwordField().value).toBe("short");
  });
});

describe("sign-in: the cursor goes back to the password", () => {
  it("keeps the address, selects the password and says nothing technical", async () => {
    fake.set("signInWithPassword", { data: {}, error: authError("invalid_credentials", 400) });
    mountPage(SignIn);
    await screen.findByLabelText(/email address/i);
    type(/email address/i, "amina@example.test");
    type(/^password/i, "wrong password here");
    await submit("Sign me in");
    expect(await screen.findByText(en.errCredentials)).toBeTruthy();
    await focused(passwordField());
    expect(emailField().value).toBe("amina@example.test");
    expect(passwordField().value).toBe("wrong password here");
    expect(document.body.textContent).not.toMatch(technical);
  });
});

describe("the handle on the welcome page", () => {
  const signedIn = () => {
    fake.restore(makeSession());
    fake.set("fetchProfile", {
      data: makeProfile({ display_name: "Amina", onboarding_completed_at: null }),
      error: null,
    });
  };
  const open = async () => {
    signedIn();
    mountPage(Welcome);
    await screen.findByRole("heading", { name: "Welcome, Amina" });
  };
  const handleField = () => screen.getByLabelText(/^Handle/) as HTMLInputElement;
  const nameField = () => screen.getByLabelText("Display name") as HTMLInputElement;
  const save = () => submit("Enter the factory");

  it("shows the rule and a valid example before anything is typed", async () => {
    await open();
    expect(screen.getByText(en.handleHint)).toBeTruthy();
    expect(en.handleHint).toContain("amina_o");
  });

  it("names the refused characters, shows an example, keeps the text and puts the cursor on the handle", async () => {
    await open();
    type(/^Handle/, "Amina é-o");
    await save();
    const message = await screen.findByText(/Characters not allowed/);
    expect(message.textContent).toContain("(space), é, -");
    expect(message.textContent).toContain("amina_o");
    expect(handleField().getAttribute("aria-invalid")).toBe("true");
    await focused(handleField());
    expect(handleField().value).toBe("Amina é-o"); // not rewritten
    expect(nameField().value).toBe("Amina");
    expect(navigations()).toEqual([]);
  });

  it("says how many characters were typed when the handle is too short", async () => {
    await open();
    type(/^Handle/, "ab");
    await save();
    const message = await screen.findByText(/Too short/);
    expect(message.textContent).toContain("at least 3");
    expect(message.textContent).toContain("you typed 2");
    expect(message.textContent).toContain("amina_o");
    await focused(handleField());
  });

  it("says how many characters were typed when the handle is too long", async () => {
    await open();
    type(/^Handle/, "a".repeat(30));
    await save();
    const message = await screen.findByText(/Too long/);
    expect(message.textContent).toContain("at most 24");
    expect(message.textContent).toContain("you typed 30");
    await focused(handleField());
  });

  it("puts the cursor on the first invalid field, here the name, and keeps both texts", async () => {
    await open();
    type("Display name", "   ");
    type(/^Handle/, "a b");
    await save();
    expect(await screen.findByText(en.errName)).toBeTruthy();
    expect(await screen.findByText(/Characters not allowed/)).toBeTruthy();
    await focused(nameField());
    expect(handleField().value).toBe("a b");
  });

  it("says when the handle is unavailable, offers another, keeps the text and puts the cursor there", async () => {
    await open();
    fake.set("saveProfile", {
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    type(/^Handle/, "taken_name");
    await save();
    const message = await screen.findByText(/already taken/);
    expect(message.textContent).toContain("taken_name2"); // a valid suggestion
    expect(document.body.textContent).not.toMatch(/duplicate|constraint|23505/i);
    await focused(handleField());
    expect(handleField().value).toBe("taken_name");
    expect(navigations()).toEqual([]);
  });

  it("clears the message when the handle is corrected", async () => {
    await open();
    type(/^Handle/, "ab");
    await save();
    await screen.findByText(/Too short/);
    type(/^Handle/, "abc");
    await waitFor(() => expect(screen.queryByText(/Too short/)).toBeNull());
  });
});
