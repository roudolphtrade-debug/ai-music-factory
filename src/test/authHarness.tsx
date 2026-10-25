import { expect } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { LanguageProvider } from "@/i18n/context";
import { AuthProvider } from "@/auth/AuthProvider";
import type { AuthHolder } from "./clientMock";
import { createFakeSupabase } from "./fakeSupabase";
import { resetRouter, routerState } from "./routerMock";

/**
 * Shared set-up of the account-screen tests. A test file declares, at its top level:
 *
 *   const holder = vi.hoisted(() => ({ fake: null, configured: true, startWithClient: true, snapshot: null }) as AuthHolder);
 *   vi.mock("@tanstack/react-router", ...);   vi.mock("@/integrations/supabase/client", ...) built from @/test/clientMock
 *
 * (vi.mock calls are hoisted per file, so they cannot live in here.)
 */
export function setUpAccounts(holder: AuthHolder, lang = "en") {
  resetRouter();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem("afm-lang", lang);
  holder.fake = createFakeSupabase();
  holder.configured = true;
  holder.startWithClient = true;
  holder.snapshot = null;
  holder.settings = null;
  return holder.fake;
}

export function mountPage(
  Page: ComponentType,
  options: { search?: Record<string, unknown>; pathname?: string } = {},
) {
  routerState.search = options.search ?? {};
  routerState.pathname = options.pathname ?? "/";
  return render(
    <LanguageProvider>
      <AuthProvider>
        <Page />
      </AuthProvider>
    </LanguageProvider>,
  );
}

export const pageOf = (route: unknown) =>
  (route as { options: { component: ComponentType } }).options.component;

/** Types into the field whose label matches. */
export function type(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

export const press = (name: RegExp | string) =>
  fireEvent.click(screen.getByRole("button", { name }));

export async function submit(name: RegExp | string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

export const text = (re: RegExp | string) => screen.findByText(re);
export const gone = (re: RegExp | string) =>
  waitFor(() => expect(screen.queryByText(re)).toBeNull());

export const navigations = () => routerState.navigations;
export function expectNavigation(to: string, search?: unknown) {
  const hit = routerState.navigations.find(
    (n) =>
      n.to === to && (search === undefined || JSON.stringify(n.search) === JSON.stringify(search)),
  );
  expect(hit, `navigation to ${to}; got ${JSON.stringify(routerState.navigations)}`).toBeTruthy();
}
