// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { authError, type FakeSupabase } from "@/test/fakeSupabase";
import { mountPage, pageOf, setUpAccounts } from "@/test/authHarness";
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
import { loadEnabledProviders } from "./providers";
import { signInWithGoogle } from "./service";

const SignUp = pageOf(SignUpRoute);
const SignIn = pageOf(SignInRoute);
const en = authCopy.en;

let fake: FakeSupabase;
beforeEach(() => {
  fake = setUpAccounts(holder);
});
afterEach(cleanup);

const googleButton = () => screen.queryByRole("button", { name: en.googleContinue });
const projectSays = (settings: unknown) => {
  holder.settings = settings;
};

describe("which providers the project really has switched on", () => {
  it.each([
    ["Google enabled", { external: { email: true, google: true } }, true],
    ["Google not enabled", { external: { email: true, google: false } }, false],
    ["no Google entry", { external: { email: true } }, false],
    ["no external section", { disable_signup: false }, false],
    ["Google given as text, not as true", { external: { google: "true" } }, false],
    ["no usable answer at all", null, false],
    ["something that is not an object", "oops", false],
  ])("%s", async (_label, settings, expected) => {
    projectSays(settings);
    expect(await loadEnabledProviders()).toEqual({ google: expected });
  });
});

describe("the Google button is shown only when Google is really configured", () => {
  it.each([
    ["sign-in", SignIn],
    ["sign-up", SignUp],
  ])("%s: nothing at all while the project has not said Google is on", async (_name, Page) => {
    projectSays({ external: { email: true, google: false } });
    mountPage(Page);
    await screen.findByLabelText(/email address/i);
    // give the settings answer time to arrive: still nothing
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(googleButton()).toBeNull();
    expect(screen.queryByText(en.googleOr)).toBeNull();
    expect(screen.queryByText(/google/i)).toBeNull();
    expect(screen.queryByTestId("google-section")).toBeNull();
  });

  it("no button when the project cannot be asked", async () => {
    projectSays(null);
    mountPage(SignIn);
    await screen.findByLabelText(/email address/i);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(googleButton()).toBeNull();
  });

  it.each([
    ["sign-in", SignIn],
    ["sign-up", SignUp],
  ])(
    "%s: the button appears once Google is on, with the divider before the e-mail form",
    async (_name, Page) => {
      projectSays({ external: { email: true, google: true } });
      mountPage(Page);
      expect(googleButton()).toBeNull(); // not before the project has answered
      const button = await screen.findByRole("button", { name: en.googleContinue });
      expect(button).toBeTruthy();
      expect(screen.getByText(en.googleOr)).toBeTruthy();
      expect(screen.getByLabelText(/email address/i)).toBeTruthy(); // e-mail sign-in is still there
      // the brand mark is decorative
      expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    },
  );

  it("is translated in the six languages", async () => {
    for (const { code } of LANGS) {
      cleanup();
      fake = setUpAccounts(holder, code);
      projectSays({ external: { google: true } });
      mountPage(SignIn);
      const button = await screen.findByRole("button", { name: authCopy[code].googleContinue });
      expect(button.textContent).toContain(authCopy[code].googleContinue);
      if (code !== "en") expect(authCopy[code].googleContinue).not.toBe(en.googleContinue);
    }
  });
});

describe("starting the Google sign-in", () => {
  it("asks Supabase for Google and comes back to the sign-in page", async () => {
    projectSays({ external: { google: true } });
    mountPage(SignIn);
    fireEvent.click(await screen.findByRole("button", { name: en.googleContinue }));
    await waitFor(() => expect(fake.client.auth.signInWithOAuth).toHaveBeenCalledTimes(1));
    const [options] = fake.client.auth.signInWithOAuth.mock.calls[0] as unknown as [
      { provider: string; options: { redirectTo: string } },
    ];
    expect(options.provider).toBe("google");
    expect(new URL(options.options.redirectTo).pathname).toBe("/auth/sign-in");
    expect(options.options.redirectTo).not.toContain("redirect=");
  });

  it("remembers where the member was heading", async () => {
    projectSays({ external: { google: true } });
    mountPage(SignIn, { search: { redirect: "/library" } });
    fireEvent.click(await screen.findByRole("button", { name: en.googleContinue }));
    await waitFor(() => expect(fake.client.auth.signInWithOAuth).toHaveBeenCalled());
    const [options] = fake.client.auth.signInWithOAuth.mock.calls[0] as unknown as [
      { options: { redirectTo: string } },
    ];
    expect(options.options.redirectTo).toMatch(/\/auth\/sign-in\?redirect=%2Flibrary$/);
  });

  it("from the sign-up page too: Google returns to the sign-in page, which routes the new member", async () => {
    projectSays({ external: { google: true } });
    mountPage(SignUp);
    fireEvent.click(await screen.findByRole("button", { name: en.googleContinue }));
    await waitFor(() => expect(fake.client.auth.signInWithOAuth).toHaveBeenCalled());
    const [options] = fake.client.auth.signInWithOAuth.mock.calls[0] as unknown as [
      { options: { redirectTo: string } },
    ];
    expect(new URL(options.options.redirectTo).pathname).toBe("/auth/sign-in");
  });

  it("a refusal shows the Google message, never the service's reason", async () => {
    projectSays({ external: { google: true } });
    fake.set("signInWithOAuth", {
      data: null,
      error: authError("validation_failed", 400, "Unsupported provider: provider is not enabled"),
    });
    mountPage(SignIn);
    fireEvent.click(await screen.findByRole("button", { name: en.googleContinue }));
    expect(await screen.findByText(en.errGoogle)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /unsupported provider|not enabled|validation_failed/i,
    );
    expect(screen.queryByText(en.errEmail)).toBeNull(); // not mistaken for a bad address
    // the button is usable again
    expect(
      (await screen.findByRole("button", { name: en.googleContinue })).hasAttribute("disabled"),
    ).toBe(false);
  });

  it("an outage keeps its own message", async () => {
    projectSays({ external: { google: true } });
    fake.set("signInWithOAuth", {
      data: null,
      error: { name: "AuthRetryableFetchError", status: 503, message: "upstream connect error" },
    });
    mountPage(SignIn);
    fireEvent.click(await screen.findByRole("button", { name: en.googleContinue }));
    expect(await screen.findByText(en.errServiceDown)).toBeTruthy();
  });

  it("the service function reports an unconfigured back end without calling anything", async () => {
    holder.configured = false;
    expect(await signInWithGoogle()).toMatchObject({ ok: false });
    expect(fake.client.auth.signInWithOAuth).not.toHaveBeenCalled();
  });
});

describe("coming back from Google", () => {
  it("says so when Google was refused or cancelled, and the e-mail form is still there", async () => {
    holder.snapshot = {
      path: "/auth/sign-in",
      hash: "#error=access_denied&error_code=access_denied&error_description=The+user+denied+access",
      search: "",
    };
    mountPage(SignIn);
    expect(await screen.findByText(en.errGoogle)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/denied access|access_denied/i);
    expect(screen.getByLabelText(/email address/i)).toBeTruthy();
  });

  it("says nothing on a normal visit", async () => {
    mountPage(SignIn);
    await screen.findByLabelText(/email address/i);
    expect(screen.queryByText(en.errGoogle)).toBeNull();
  });
});
