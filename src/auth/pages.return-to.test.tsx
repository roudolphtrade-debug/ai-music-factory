// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { makeProfile, makeSession, type FakeSupabase } from "@/test/fakeSupabase";
import {
  expectNavigation,
  mountPage,
  navigations,
  pageOf,
  setUpAccounts,
} from "@/test/authHarness";
import type { AuthHolder } from "@/test/clientMock";
import { peekReturnTo, rememberReturnTo, RETURN_TO_KEY, RETURN_TO_TTL_MS } from "@/auth/returnTo";

const holder = vi.hoisted(
  () => ({ fake: null, configured: true, startWithClient: true, snapshot: null }) as AuthHolder,
);
vi.mock("@tanstack/react-router", async () => (await import("@/test/routerMock")).routerModule);
vi.mock("@/integrations/supabase/client", async () =>
  (await import("@/test/clientMock")).clientModule(holder),
);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { Route as ConfirmRoute } from "@/routes/auth.confirm";
import { Route as WelcomeRoute } from "@/routes/_app.welcome";
import { Route as SignInRoute } from "@/routes/auth.sign-in";
import { Route as SignUpRoute } from "@/routes/auth.sign-up";

const Confirm = pageOf(ConfirmRoute);
const Welcome = pageOf(WelcomeRoute);
const SignIn = pageOf(SignInRoute);
const SignUp = pageOf(SignUpRoute);

let fake: FakeSupabase;
beforeEach(() => {
  fake = setUpAccounts(holder);
});
afterEach(() => cleanup());

const link = (path: string, hash: string) => ({ path, hash, search: "" });
const finished = { onboarding_completed_at: "2026-10-20T10:00:00Z" };

describe("the way back remembered by the Generate click", () => {
  it("e-mail confirmation of a member who finished the welcome page leads back to the studio", async () => {
    rememberReturnTo("/studio");
    holder.snapshot = link("/auth/confirm", "#access_token=abc&type=signup");
    fake.set("fetchProfile", { data: makeProfile(finished), error: null });
    mountPage(Confirm);
    act(() => fake.emit("SIGNED_IN", makeSession()));
    await screen.findByRole("heading", { name: "Address confirmed" });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue" })));
    await waitFor(() => expectNavigation("/studio"));
    expect(peekReturnTo()).toBeUndefined(); // used once
  });

  it("a new member goes through the welcome page, which then returns to the studio", async () => {
    rememberReturnTo("/studio");
    holder.snapshot = link("/auth/confirm", "#access_token=abc&type=signup");
    fake.set("fetchProfile", { data: makeProfile({ onboarding_completed_at: null }), error: null });
    mountPage(Confirm);
    act(() => fake.emit("SIGNED_IN", makeSession()));
    await screen.findByRole("heading", { name: "Address confirmed" });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue" })));
    await waitFor(() => expectNavigation("/welcome", { redirect: "/studio" }));
  });

  it("the welcome page returns to the studio even when it was reached without the address carrying it", async () => {
    rememberReturnTo("/studio");
    fake.restore(makeSession());
    fake.set("fetchProfile", { data: makeProfile({ onboarding_completed_at: null }), error: null });
    mountPage(Welcome);
    await screen.findByRole("heading", { name: /Welcome/ });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /Later|Not now|Skip/i })),
    );
    await waitFor(() => expectNavigation("/studio"));
    expect(peekReturnTo()).toBeUndefined();
  });

  it("the address wins over the memory, and the memory is used up either way", async () => {
    rememberReturnTo("/studio");
    fake.restore(makeSession());
    fake.set("fetchProfile", { data: makeProfile(finished), error: null });
    const { routerState } = await import("@/test/routerMock");
    mountPage(SignIn, { search: { redirect: "/library" } });
    expect(routerState.search).toEqual({ redirect: "/library" });
    await waitFor(() => expectNavigation("/library"));
    expect(peekReturnTo()).toBeUndefined();
  });

  it("without any memory nothing changes: home", async () => {
    holder.snapshot = link("/auth/confirm", "#access_token=abc&type=signup");
    fake.set("fetchProfile", { data: makeProfile(finished), error: null });
    mountPage(Confirm);
    act(() => fake.emit("SIGNED_IN", makeSession()));
    await screen.findByRole("heading", { name: "Address confirmed" });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue" })));
    await waitFor(() => expectNavigation("/"));
    expect(navigations().some((n) => n.to === "/studio")).toBe(false);
  });

  it("a memory older than 24 hours is ignored and removed", async () => {
    localStorage.setItem(
      RETURN_TO_KEY,
      JSON.stringify({ path: "/studio", at: Date.now() - RETURN_TO_TTL_MS - 1000 }),
    );
    holder.snapshot = link("/auth/confirm", "#access_token=abc&type=signup");
    fake.set("fetchProfile", { data: makeProfile(finished), error: null });
    mountPage(Confirm);
    act(() => fake.emit("SIGNED_IN", makeSession()));
    await screen.findByRole("heading", { name: "Address confirmed" });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue" })));
    await waitFor(() => expectNavigation("/"));
    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });

  it("the sign-up page, for a member who is already signed in, keeps the way back for the welcome page", async () => {
    rememberReturnTo("/studio");
    fake.restore(makeSession());
    fake.set("fetchProfile", { data: makeProfile({ onboarding_completed_at: null }), error: null });
    mountPage(SignUp);
    await waitFor(() => expectNavigation("/welcome"));
    expect(peekReturnTo()).toBe("/studio"); // still there for the welcome page to use
  });
});
