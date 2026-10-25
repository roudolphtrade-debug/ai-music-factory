// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { makeSession, type FakeSupabase } from "@/test/fakeSupabase";
import { mountPage, navigations, pageOf, setUpAccounts, submit, type } from "@/test/authHarness";
import type { AuthHolder } from "@/test/clientMock";
import { authCopy } from "@/i18n/auth";
import { LANGS } from "@/i18n/translations";

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
import { Route as ResetRoute } from "@/routes/auth.reset-password";

const SignUp = pageOf(SignUpRoute);
const SignIn = pageOf(SignInRoute);
const Reset = pageOf(ResetRoute);
const en = authCopy.en;

let fake: FakeSupabase;
beforeEach(() => {
  fake = setUpAccounts(holder);
});
afterEach(cleanup);

// Each password below misses exactly one criterion (or the stated ones).
const OK = "Abcdefghi1!x"; // 12 characters, all four classes
const ONLY: Record<"length" | "upper" | "lower" | "digit" | "special", string> = {
  length: "Abcdefg1!", //          9 characters
  upper: "abcdefghi1!x", //        no uppercase
  lower: "ABCDEFGHI1!X", //        no lowercase
  digit: "Abcdefghij!x", //        no digit
  special: "Abcdefghij1x", //      no symbol
};
const LABEL = {
  length: en.critLength,
  upper: en.critUpper,
  lower: en.critLower,
  digit: en.critDigit,
  special: en.critSpecial,
};

const passwordField = () => screen.getByLabelText(/^(new )?password/i) as HTMLInputElement;
const emailField = () => screen.getByLabelText(/email address/i) as HTMLInputElement;
const focused = (el: HTMLElement) => waitFor(() => expect(document.activeElement).toBe(el));
const items = () =>
  within(screen.getByText(en.passwordReqTitle).closest("div") as HTMLElement).getAllByRole(
    "listitem",
  );
const states = () => items().map((li) => li.getAttribute("data-state"));

const openSignUp = async () => {
  mountPage(SignUp);
  await screen.findByRole("heading", { name: "Join the factory" });
};
const signUpWith = async (password: string) => {
  type(/email address/i, "amina@example.test");
  type(/^password/i, password);
  await submit("Create my account");
};
const openReset = async () => {
  mountPage(Reset);
  act(() => fake.emit("PASSWORD_RECOVERY", makeSession()));
  await screen.findByRole("heading", { name: "Choose a new password" });
};

describe("sign-up: the rules are shown before the first key press", () => {
  it("lists the five requirements and the accepted symbols, none ticked, none in red", async () => {
    await openSignUp();
    expect(screen.getByText(en.passwordReqTitle)).toBeTruthy();
    expect(items().map((li) => li.textContent)).toEqual([
      en.critLength,
      en.critUpper,
      en.critLower,
      en.critDigit,
      en.critSpecial,
    ]);
    expect(states()).toEqual(["idle", "idle", "idle", "idle", "idle"]);
    expect(screen.getByText(/Special characters accepted/).textContent).toContain(
      "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~",
    );
  });

  it("is linked to the field for screen readers", async () => {
    await openSignUp();
    const rules = screen.getByText(en.passwordReqTitle).closest("div") as HTMLElement;
    expect(passwordField().getAttribute("aria-describedby")).toContain(rules.id);
  });

  it("ticks each rule as it is met, while typing", async () => {
    await openSignUp();
    type(/^password/i, "a");
    expect(states()).toEqual(["pending", "pending", "met", "pending", "pending"]);
    type(/^password/i, "aB");
    expect(states()).toEqual(["pending", "met", "met", "pending", "pending"]);
    type(/^password/i, "aB3");
    expect(states()).toEqual(["pending", "met", "met", "met", "pending"]);
    type(/^password/i, "aB3?");
    expect(states()).toEqual(["pending", "met", "met", "met", "met"]);
    type(/^password/i, "aB3?" + "x".repeat(8));
    expect(states()).toEqual(["met", "met", "met", "met", "met"]);
  });
});

describe("sign-up: what is missing is named, and nothing is lost", () => {
  it.each(Object.entries(ONLY))(
    "a password that only misses the %s criterion says exactly that",
    async (criterion, password) => {
      await openSignUp();
      await signUpWith(password);
      const message = await screen.findByText(/^Still missing:/);
      expect(message.textContent).toBe(`Still missing: ${LABEL[criterion as keyof typeof LABEL]}.`);
      expect(fake.client.auth.signUp).not.toHaveBeenCalled();
      // what was typed is kept, and the cursor is on the password
      expect(passwordField().value).toBe(password);
      expect(emailField().value).toBe("amina@example.test");
      await focused(passwordField());
      expect(passwordField().getAttribute("aria-invalid")).toBe("true");
    },
  );

  it("lists several missing criteria together", async () => {
    await openSignUp();
    await signUpWith("abcdefghij"); // 10 lowercase letters
    const message = await screen.findByText(/^Still missing:/);
    expect(message.textContent).toBe(
      `Still missing: ${en.critLength}, ${en.critUpper}, ${en.critDigit}, and ${en.critSpecial}.`,
    );
    expect(states()).toEqual(["missing", "missing", "met", "missing", "missing"]);
  });

  it("an empty password is 'required', not a list of five items", async () => {
    await openSignUp();
    type(/email address/i, "amina@example.test");
    await submit("Create my account");
    expect(await screen.findByText(en.errRequired)).toBeTruthy();
    expect(screen.queryByText(/^Still missing:/)).toBeNull();
  });

  it("the message follows the typed password once it is corrected", async () => {
    await openSignUp();
    await signUpWith("abcdefghij");
    await screen.findByText(/^Still missing:/);
    type(/^password/i, "Abcdefghij"); // now misses the digit and the symbol
    await waitFor(() =>
      expect(screen.getByText(/^Still missing:/).textContent).toBe(
        `Still missing: ${en.critLength}, ${en.critDigit}, and ${en.critSpecial}.`,
      ),
    );
    type(/^password/i, OK);
    await waitFor(() => expect(screen.queryByText(/^Still missing:/)).toBeNull());
    expect(states()).toEqual(["met", "met", "met", "met", "met"]);
  });

  it("sends a compliant password, unchanged", async () => {
    await openSignUp();
    await signUpWith(OK);
    await waitFor(() => expect(fake.client.auth.signUp).toHaveBeenCalled());
    expect(fake.client.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "amina@example.test", password: OK }),
    );
  });

  it("a password that is the address is refused even if it follows the rules", async () => {
    await openSignUp();
    type(/email address/i, "Amina-Studio_26@example.test");
    type(/^password/i, "Amina-Studio_26@example.test");
    await submit("Create my account");
    expect(await screen.findByText(en.errPasswordWeak)).toBeTruthy();
    expect(fake.client.auth.signUp).not.toHaveBeenCalled();
  });
});

describe("pasting and password managers", () => {
  it("does not block pasting, and takes a pasted password as typed", async () => {
    await openSignUp();
    const field = passwordField();
    const allowed = fireEvent.paste(field, {
      clipboardData: { getData: () => "Pasted-Passw0rd-123" },
    });
    expect(allowed).toBe(true); // not cancelled
    expect(fireEvent.drop(field)).toBe(true);
    fireEvent.change(field, { target: { value: "Pasted-Passw0rd-123" } });
    expect(states()).toEqual(["met", "met", "met", "met", "met"]);
  });

  it("is a plain, named password field with the right autocomplete hints", async () => {
    await openSignUp();
    expect(passwordField().type).toBe("password");
    expect(passwordField().name).toBe("password");
    expect(passwordField().getAttribute("autocomplete")).toBe("new-password");
    expect(passwordField().hasAttribute("maxlength")).toBe(false);
    expect(passwordField().hasAttribute("onpaste")).toBe(false);
    expect(emailField().name).toBe("email");
    expect(emailField().getAttribute("autocomplete")).toBe("email");
    // showing the password does not change its name or hints
    fireEvent.click(screen.getByRole("button", { name: en.showPassword }));
    expect(passwordField().type).toBe("text");
    expect(passwordField().getAttribute("autocomplete")).toBe("new-password");
  });

  it("sign-in offers the saved password (current-password), and the reset form new-password twice", async () => {
    mountPage(SignIn);
    await screen.findByLabelText(/email address/i);
    expect(passwordField().getAttribute("autocomplete")).toBe("current-password");
    cleanup();
    await openReset();
    expect(screen.getByLabelText("New password").getAttribute("autocomplete")).toBe("new-password");
    expect(screen.getByLabelText("Confirm password").getAttribute("autocomplete")).toBe(
      "new-password",
    );
    expect(
      (screen.getByLabelText("New password") as HTMLInputElement).hasAttribute("maxlength"),
    ).toBe(false);
  });
});

describe("existing accounts keep signing in", () => {
  it("accepts an old, weak password at sign-in: the policy is only for new passwords", async () => {
    mountPage(SignIn);
    await screen.findByLabelText(/email address/i);
    type(/email address/i, "old.member@example.test");
    type(/^password/i, "short");
    await submit("Sign me in");
    await waitFor(() =>
      expect(fake.client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "old.member@example.test",
        password: "short",
      }),
    );
    expect(screen.queryByText(/^Still missing:/)).toBeNull();
    expect(screen.queryByText(en.passwordReqTitle)).toBeNull(); // no rules block on the sign-in form
  });
});

describe("reset: the same policy, the same messages", () => {
  it("shows the rules before typing", async () => {
    await openReset();
    expect(screen.getByText(en.passwordReqTitle)).toBeTruthy();
    expect(states()).toEqual(["idle", "idle", "idle", "idle", "idle"]);
  });

  it.each(Object.entries(ONLY))(
    "a new password that only misses the %s criterion says exactly that",
    async (criterion, password) => {
      await openReset();
      type("New password", password);
      type("Confirm password", password);
      await submit("Save password");
      const message = await screen.findByText(/^Still missing:/);
      expect(message.textContent).toBe(`Still missing: ${LABEL[criterion as keyof typeof LABEL]}.`);
      expect(fake.client.auth.updateUser).not.toHaveBeenCalled();
      expect((screen.getByLabelText("New password") as HTMLInputElement).value).toBe(password);
      expect((screen.getByLabelText("Confirm password") as HTMLInputElement).value).toBe(password);
      await focused(screen.getByLabelText("New password"));
    },
  );

  it("reports a bad password and a different confirmation together, cursor on the first", async () => {
    await openReset();
    type("New password", "tiny");
    type("Confirm password", "other");
    await submit("Save password");
    expect(await screen.findByText(/^Still missing:/)).toBeTruthy();
    expect(await screen.findByText(en.errPasswordMismatch)).toBeTruthy();
    await focused(screen.getByLabelText("New password"));
    expect((screen.getByLabelText("Confirm password") as HTMLInputElement).value).toBe("other");
  });

  it("saves a compliant password", async () => {
    await openReset();
    type("New password", OK);
    type("Confirm password", OK);
    await submit("Save password");
    await waitFor(() => expect(fake.client.auth.updateUser).toHaveBeenCalledWith({ password: OK }));
    await waitFor(() => expect(navigations().length).toBeGreaterThan(0));
  });
});

describe("what the service says when it refuses a password anyway", () => {
  const refusal = (reasons: string[]) => ({
    name: "AuthWeakPasswordError",
    code: "weak_password",
    status: 422,
    message: "Password is known to be weak and easy to guess, please choose a different one.",
    reasons,
  });

  it("a leaked password is said to be leaked, under the field, with the values kept (sign-up)", async () => {
    fake.set("signUp", { data: { user: null, session: null }, error: refusal(["pwned"]) });
    await openSignUp();
    await signUpWith(OK);
    expect(await screen.findByText(en.errPasswordPwned)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/known to be weak|pwned|haveibeenpwned/i);
    expect(passwordField().value).toBe(OK);
    expect(emailField().value).toBe("amina@example.test");
    await focused(passwordField());
  });

  it("a password refused for its length or characters gets the general refusal (sign-up)", async () => {
    fake.set("signUp", { data: { user: null, session: null }, error: refusal(["characters"]) });
    await openSignUp();
    await signUpWith(OK);
    expect(await screen.findByText(en.errPasswordWeak)).toBeTruthy();
    expect(screen.queryByText(en.errPasswordPwned)).toBeNull();
    await focused(passwordField());
  });

  it("a leaked password is told apart on the reset form too", async () => {
    fake.set("updateUser", { data: {}, error: refusal(["pwned"]) });
    await openReset();
    type("New password", OK);
    type("Confirm password", OK);
    await submit("Save password");
    expect(await screen.findByText(en.errPasswordPwned)).toBeTruthy();
    await focused(screen.getByLabelText("New password"));
    expect((screen.getByLabelText("Confirm password") as HTMLInputElement).value).toBe(OK);
    expect(navigations()).toEqual([]);
  });
});

describe.each(LANGS.map((l) => l.code))("the rules and the missing list in %s", (lang) => {
  const copy = authCopy[lang];

  it("shows the five rules, the symbols, and a precise list after a refusal", async () => {
    cleanup();
    fake = setUpAccounts(holder, lang);
    mountPage(SignUp);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText(copy.passwordReqTitle)).toBeTruthy();
    const list = within(
      screen.getByText(copy.passwordReqTitle).closest("div") as HTMLElement,
    ).getAllByRole("listitem");
    expect(list.map((li) => li.textContent)).toEqual([
      copy.critLength,
      copy.critUpper,
      copy.critLower,
      copy.critDigit,
      copy.critSpecial,
    ]);

    const [email, password] = Array.from(
      document.querySelectorAll("form input"),
    ) as HTMLInputElement[];
    fireEvent.change(email, { target: { value: "amina@example.test" } });
    fireEvent.change(password, { target: { value: "abcdefghij" } }); // misses length, uppercase, digit, symbol
    await act(
      async () =>
        void fireEvent.click(document.querySelector("button[type=submit]") as HTMLElement),
    );
    const prefix = copy.errPasswordMissing.split("{missing}")[0];
    const message = await screen.findByText(
      (text) => text.startsWith(prefix.trim()) && text.includes(copy.critLength),
    );
    for (const label of [copy.critLength, copy.critUpper, copy.critDigit, copy.critSpecial])
      expect(message.textContent).toContain(label);
    expect(message.textContent).not.toContain(copy.critLower); // met: not listed
    expect(message.textContent).not.toMatch(/[{}]/);
    expect(password.value).toBe("abcdefghij");
    expect(email.value).toBe("amina@example.test");
  });
});
