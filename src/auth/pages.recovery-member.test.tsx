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
import { LANGS } from "@/i18n/translations";

const holder = vi.hoisted(
  () => ({ fake: null, configured: true, startWithClient: true, snapshot: null }) as AuthHolder,
);
vi.mock("@tanstack/react-router", async () => (await import("@/test/routerMock")).routerModule);
vi.mock("@/integrations/supabase/client", async () =>
  (await import("@/test/clientMock")).clientModule(holder),
);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { routerState } from "@/test/routerMock";
import { Route as ResetRoute } from "@/routes/auth.reset-password";
import { Route as ConfirmRoute } from "@/routes/auth.confirm";
import { Route as WelcomeRoute } from "@/routes/_app.welcome";
import { Route as AuthLayoutRoute } from "@/routes/auth";
import { RequireMember } from "@/components/auth/AuthGate";
import { AccountMenu } from "@/components/auth/AccountMenu";

const Reset = pageOf(ResetRoute);
const Confirm = pageOf(ConfirmRoute);
const Welcome = pageOf(WelcomeRoute);
const AuthLayout = pageOf(AuthLayoutRoute);

let fake: FakeSupabase;
beforeEach(() => {
  fake = setUpAccounts(holder);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const link = (path: string, hash: string) => ({ path, hash, search: "" });
const expiredHash =
  "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

describe("password reset page", () => {
  it("explains what to do when it is opened without a link, and shows no password field", async () => {
    mountPage(Reset);
    expect(
      await screen.findByText("Open the link sent by email to choose a new password."),
    ).toBeTruthy();
    expect(document.querySelectorAll("input").length).toBe(0);
    expect(screen.getByRole("link", { name: "Get a new link" }).getAttribute("href")).toBe(
      "/auth/forgot-password",
    );
  });

  it("says plainly that an expired link has expired, and offers a new one", async () => {
    holder.snapshot = link("/auth/reset-password", expiredHash);
    mountPage(Reset);
    expect(
      await screen.findByRole("heading", { name: "This reset link has expired" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Get a new link" })).toBeTruthy();
    expect(document.querySelectorAll("input").length).toBe(0);
  });

  it("shows the new-password form once the link has opened a recovery session", async () => {
    holder.snapshot = link("/auth/reset-password", "#access_token=abc&type=recovery");
    mountPage(Reset);
    expect(await screen.findByText("Confirming…")).toBeTruthy();
    act(() => fake.emit("PASSWORD_RECOVERY", makeSession()));
    expect(await screen.findByRole("heading", { name: "Choose a new password" })).toBeTruthy();
    expect(screen.getByLabelText("New password").getAttribute("autocomplete")).toBe("new-password");
    expect(screen.getByLabelText("Confirm password")).toBeTruthy();
  });

  async function openForm() {
    holder.snapshot = link("/auth/reset-password", "#access_token=abc&type=recovery");
    mountPage(Reset);
    act(() => fake.emit("PASSWORD_RECOVERY", makeSession()));
    await screen.findByRole("heading", { name: "Choose a new password" });
  }

  it("refuses a short password and a confirmation that differs, and sends nothing", async () => {
    await openForm();
    type("New password", "tiny");
    type("Confirm password", "other");
    await submit("Save password");
    expect(await screen.findByText(/^Still missing: at least 12 characters/)).toBeTruthy();
    expect(await screen.findByText("The two passwords do not match.")).toBeTruthy();
    expect(fake.client.auth.updateUser).not.toHaveBeenCalled();
  });

  it("saves the new password and takes the member to the site", async () => {
    await openForm();
    type("New password", "Brand-New-Passphrase-1");
    type("Confirm password", "Brand-New-Passphrase-1");
    await submit("Save password");
    await waitFor(() =>
      expect(fake.client.auth.updateUser).toHaveBeenCalledWith({
        password: "Brand-New-Passphrase-1",
      }),
    );
    await waitFor(() => expectNavigation("/"));
  });

  it("tells the member when the new password is the same as the old one", async () => {
    await openForm();
    fake.set("updateUser", {
      data: {},
      error: authError(
        "same_password",
        422,
        "New password should be different from the old password.",
      ),
    });
    type("New password", "The-Very-Same-Passphrase-1");
    type("Confirm password", "The-Very-Same-Passphrase-1");
    await submit("Save password");
    expect(await screen.findByText("Choose a password different from the old one.")).toBeTruthy();
    expect(screen.queryByText(/New password should be different/)).toBeNull();
    expect(navigations()).toEqual([]);
  });

  it("gives up on a link that never becomes a recovery session", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    holder.snapshot = link("/auth/reset-password", "#access_token=abc&type=recovery");
    mountPage(Reset);
    await act(async () => void (await vi.advanceTimersByTimeAsync(8_500)));
    expect(
      await screen.findByRole("heading", { name: "This reset link has expired" }),
    ).toBeTruthy();
  });
});

describe("confirmation page", () => {
  it("an expired link: says so, offers the address typed at sign-up, and sends a new link", async () => {
    sessionStorage.setItem("afm-pending-email", "amina@example.test");
    holder.snapshot = link("/auth/confirm", expiredHash);
    mountPage(Confirm);
    expect(await screen.findByRole("heading", { name: "This link has expired" })).toBeTruthy();
    expect((screen.getByLabelText(/email address/i) as HTMLInputElement).value).toBe(
      "amina@example.test",
    );
    await submit("Get a new link");
    expect(await screen.findByText(/a new link has just been sent/i)).toBeTruthy();
    expect(fake.client.auth.resend).toHaveBeenCalledWith(
      expect.objectContaining({ type: "signup", email: "amina@example.test" }),
    );
  });

  it("an expired link without a remembered address asks for it", async () => {
    holder.snapshot = link("/auth/confirm", expiredHash);
    mountPage(Confirm);
    await screen.findByRole("heading", { name: "This link has expired" });
    expect((screen.getByLabelText(/email address/i) as HTMLInputElement).value).toBe("");
    await submit("Get a new link");
    expect(await screen.findByText("This field is required.")).toBeTruthy();
    expect(fake.client.auth.resend).not.toHaveBeenCalled();
  });

  it("a link that is not an expiry says it is not valid", async () => {
    holder.snapshot = link(
      "/auth/confirm",
      "#error=access_denied&error_code=bad_jwt&error_description=nope",
    );
    mountPage(Confirm);
    expect(await screen.findByRole("heading", { name: "This link is not valid" })).toBeTruthy();
  });

  it("a rate-limited request for a new link shows a wait message", async () => {
    holder.snapshot = link("/auth/confirm", expiredHash);
    fake.set("resend", { data: {}, error: authError("over_email_send_rate_limit", 429) });
    mountPage(Confirm);
    await screen.findByRole("heading", { name: "This link has expired" });
    type(/email address/i, "amina@example.test");
    await submit("Get a new link");
    expect(
      await screen.findByText("Too many attempts. Wait a few minutes before trying again."),
    ).toBeTruthy();
  });

  it("a good link confirms the address, then continues to the welcome page for a new member", async () => {
    sessionStorage.setItem("afm-pending-email", "amina@example.test");
    holder.snapshot = link("/auth/confirm", "#access_token=abc&refresh_token=def&type=signup");
    fake.set("fetchProfile", { data: makeProfile({ onboarding_completed_at: null }), error: null });
    mountPage(Confirm);
    expect(await screen.findByText("Confirming…")).toBeTruthy();
    act(() => fake.emit("SIGNED_IN", makeSession()));
    expect(await screen.findByRole("heading", { name: "Address confirmed" })).toBeTruthy();
    await waitFor(() => expect(sessionStorage.getItem("afm-pending-email")).toBeNull());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue" })));
    await waitFor(() => expectNavigation("/welcome"));
  });

  it("a good link for a member who already finished the welcome page goes home", async () => {
    holder.snapshot = link("/auth/confirm", "#access_token=abc&type=signup");
    fake.set("fetchProfile", {
      data: makeProfile({ onboarding_completed_at: "2026-10-20T10:00:00Z" }),
      error: null,
    });
    mountPage(Confirm);
    act(() => fake.emit("SIGNED_IN", makeSession()));
    await screen.findByRole("heading", { name: "Address confirmed" });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue" })));
    await waitFor(() => expectNavigation("/"));
  });

  it("a link that never produces a session ends as not valid", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    holder.snapshot = link("/auth/confirm", "#access_token=abc&type=signup");
    mountPage(Confirm);
    await act(async () => void (await vi.advanceTimersByTimeAsync(8_500)));
    expect(await screen.findByRole("heading", { name: "This link is not valid" })).toBeTruthy();
  });

  it("opened by hand it moves on: to sign-in for a visitor, home for a member", async () => {
    mountPage(Confirm);
    await waitFor(() => expectNavigation("/auth/sign-in"));
    cleanup();
    setUpAccounts(holder);
    holder.fake!.restore(makeSession());
    mountPage(Confirm);
    await waitFor(() => expectNavigation("/"));
  });
});

describe("welcome page", () => {
  const signedIn = (
    profile = makeProfile({ display_name: "Amina", onboarding_completed_at: null }),
  ) => {
    fake.restore(makeSession());
    fake.set("fetchProfile", { data: profile, error: null });
  };
  const written = () =>
    fake.profileQuery.update.mock.calls.map((c) => c[0] as Record<string, unknown>);

  it("greets the member by name, with optional steps and a note on local data", async () => {
    signedIn();
    mountPage(Welcome);
    expect(await screen.findByRole("heading", { name: "Welcome, Amina" })).toBeTruthy();
    expect((screen.getByLabelText("Display name") as HTMLInputElement).value).toBe("Amina");
    expect(screen.getAllByText(/optional/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Your data stays on this device")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open the Avatar Lab" }).getAttribute("href")).toBe(
      "/avatar-lab",
    );
    // Artist and label are choices, none is selected by default.
    for (const name of ["Artist", "Label"])
      expect(screen.getByRole("button", { name }).getAttribute("aria-pressed")).toBe("false");
  });

  it.each(LANGS.map((l) => l.code))(
    "shows no raw catalog key on the welcome page in %s",
    async (lang) => {
      cleanup();
      fake = setUpAccounts(holder, lang);
      signedIn();
      mountPage(Welcome);
      await screen.findByDisplayValue("Amina");
      const shown = [
        document.body.textContent ?? "",
        ...[...document.querySelectorAll("[aria-label], [placeholder], [title]")].map((e) =>
          ["aria-label", "placeholder", "title"].map((a) => e.getAttribute(a)).join(" "),
        ),
      ].join(" ");
      // A key such as "profileCardTitle" on screen would mean a missing translation.
      const keys = Object.keys(authCopy.fr).filter((k) => /^[a-z]+[A-Z]/.test(k));
      expect(keys.filter((k) => new RegExp("\\b" + k + "\\b").test(shown))).toEqual([]);
      expect(shown.length).toBeGreaterThan(100); // the page really rendered
    },
  );

  it("saves name, handle and roles, completes the onboarding and goes to the site", async () => {
    signedIn();
    mountPage(Welcome);
    await screen.findByRole("heading", { name: "Welcome, Amina" });
    type("Display name", " Amina Okafor ");
    type(/^Handle/, "@Amina_O");
    press("Artist");
    expect(screen.getByRole("button", { name: "Artist" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    await submit("Enter the factory");
    await waitFor(() => expectNavigation("/"));
    expect(written()[0]).toMatchObject({
      display_name: "Amina Okafor",
      handle: "amina_o",
      creator_roles: ["artist"],
    });
    expect(typeof written()[0].onboarding_completed_at).toBe("string");
  });

  it("lets artist and label be chosen together, changed, or not chosen at all", async () => {
    const pressed = (name: string) =>
      screen.getByRole("button", { name }).getAttribute("aria-pressed");
    signedIn();
    mountPage(Welcome);
    await screen.findByRole("heading", { name: "Welcome, Amina" });
    press("Artist");
    press("Label");
    expect([pressed("Artist"), pressed("Label")]).toEqual(["true", "true"]);
    press("Artist"); // a choice can be taken back
    expect([pressed("Artist"), pressed("Label")]).toEqual(["false", "true"]);
    press("Label");
    await submit("Enter the factory"); // no role at all is a valid listener profile
    await waitFor(() => expectNavigation("/"));
    expect(written()[0]).toMatchObject({ creator_roles: [] });
  });

  it("saves both roles when both are chosen", async () => {
    signedIn();
    mountPage(Welcome);
    await screen.findByRole("heading", { name: "Welcome, Amina" });
    press("Artist");
    press("Label");
    await submit("Enter the factory");
    await waitFor(() => expectNavigation("/"));
    expect(written()[0]).toMatchObject({ creator_roles: ["artist", "label"] });
  });

  it("lets the member leave everything for later: only the onboarding is recorded", async () => {
    signedIn();
    mountPage(Welcome);
    await screen.findByRole("heading", { name: "Welcome, Amina" });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Later" })));
    await waitFor(() => expectNavigation("/"));
    expect(Object.keys(written()[0]).sort()).toEqual(["onboarding_completed_at"]);
  });

  it("goes on to the page the member was heading to", async () => {
    signedIn();
    mountPage(Welcome, { search: { redirect: "/library" } });
    await screen.findByRole("heading", { name: "Welcome, Amina" });
    await submit("Enter the factory");
    await waitFor(() => expectNavigation("/library"));
  });

  it("refuses an empty name and a malformed handle", async () => {
    signedIn();
    mountPage(Welcome);
    await screen.findByRole("heading", { name: "Welcome, Amina" });
    type("Display name", "   ");
    type(/^Handle/, "a b");
    await submit("Enter the factory");
    expect(await screen.findByText("The name must be 1 to 60 characters.")).toBeTruthy();
    expect(await screen.findByText(/Characters not allowed: .?\(space\)/)).toBeTruthy();
    expect(written()).toEqual([]);
  });

  it("says when the handle is already taken, and stays on the page", async () => {
    signedIn();
    fake.set("saveProfile", {
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    mountPage(Welcome);
    await screen.findByRole("heading", { name: "Welcome, Amina" });
    type(/^Handle/, "taken_name");
    await submit("Enter the factory");
    expect(await screen.findByText(/This handle is already taken/)).toBeTruthy();
    expect(screen.queryByText(/duplicate key/)).toBeNull();
    expect(navigations()).toEqual([]);
  });

  it("offers to try again when the profile cannot be loaded", async () => {
    fake.restore(makeSession());
    fake.set("fetchProfile", { data: null, error: authError("PGRST000", 500) });
    mountPage(Welcome);
    expect(await screen.findByText("The profile could not be loaded.")).toBeTruthy();
    fake.set("fetchProfile", { data: makeProfile({ display_name: "Amina" }), error: null });
    press("Continue");
    expect(await screen.findByRole("heading", { name: "Welcome, Amina" })).toBeTruthy();
  });

  it("sends a visitor to sign-in, remembering the welcome page, and shows nothing private", async () => {
    mountPage(Welcome, { pathname: "/welcome" });
    await waitFor(() => expectNavigation("/auth/sign-in", { redirect: "/welcome" }));
    expect(screen.queryByLabelText("Display name")).toBeNull();
  });
});

describe("private-page guard", () => {
  const Guarded = () => (
    <RequireMember>
      <p>private content</p>
    </RequireMember>
  );

  it("sends a visitor to sign-in exactly once, with the page they wanted", async () => {
    mountPage(Guarded, { pathname: "/welcome" });
    await waitFor(() => expectNavigation("/auth/sign-in", { redirect: "/welcome" }));
    expect(navigations().filter((n) => n.to === "/auth/sign-in").length).toBe(1);
    expect(screen.queryByText("private content")).toBeNull();
  });

  it("does not send the member to sign-in again once the router is already on an account page", async () => {
    // The shell remounts its children on each route change: the guard can render again at /auth/sign-in.
    mountPage(Guarded, { pathname: "/auth/sign-in" });
    await new Promise((r) => setTimeout(r, 50));
    expect(navigations()).toEqual([]);
  });

  it("shows the content to a signed-in member and a notice when accounts are off", async () => {
    fake.restore(makeSession());
    mountPage(Guarded);
    expect(await screen.findByText("private content")).toBeTruthy();
    cleanup();
    setUpAccounts(holder);
    holder.configured = false;
    mountPage(Guarded);
    expect(await screen.findByText("Accounts are temporarily unavailable")).toBeTruthy();
    expect(screen.queryByText("private content")).toBeNull();
  });
});

describe("account menu in the top bar", () => {
  it("shows nothing at all when accounts are not configured", async () => {
    holder.configured = false;
    const { container } = mountPage(AccountMenu);
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("offers distinct sign-in and sign-up links to a visitor", async () => {
    mountPage(AccountMenu);
    const link = await screen.findByRole("link", { name: "Sign in" });
    expect(link.getAttribute("href")).toBe("/auth/sign-in");
    const signUp = screen.getByRole("link", { name: "Create an account" });
    expect(signUp.getAttribute("href")).toBe("/auth/sign-up");
  });

  it("names the member, and opens a menu with settings and sign-out", async () => {
    fake.restore(makeSession("user-1", "amina@example.test"));
    fake.set("fetchProfile", { data: makeProfile({ display_name: "Amina Okafor" }), error: null });
    mountPage(AccountMenu);
    const trigger = await screen.findByRole("button", { name: /My account · Amina Okafor/ });
    expect(trigger.textContent).toContain("Amina Okafor");
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(await screen.findByText("amina@example.test")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Profile and settings/ })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("menuitem", { name: /Sign out/ })));
    await waitFor(() => expect(fake.client.auth.signOut).toHaveBeenCalledWith({ scope: "local" }));
    await waitFor(() => expectNavigation("/"));
  });

  it("no longer says 'Studio A' anywhere", async () => {
    fake.restore(makeSession());
    const { container } = mountPage(AccountMenu);
    await screen.findByRole("button", { name: /My account/ });
    expect(container.textContent).not.toContain("Studio A");
  });
});

describe("account screens frame", () => {
  it("replaces the screens by an explanation, with a way back, when accounts are not configured", async () => {
    holder.configured = false;
    mountPage(AuthLayout);
    expect(
      await screen.findByRole("heading", { name: "Accounts are temporarily unavailable" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Back to discovery" }).length).toBe(1);
  });

  it("keeps a way back to the public site on every account screen", async () => {
    mountPage(AuthLayout);
    expect(await screen.findByRole("link", { name: "Back to discovery" })).toBeTruthy();
    expect(routerState.navigations).toEqual([]);
  });
});
