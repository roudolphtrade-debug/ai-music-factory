import { createElement, forwardRef, type ComponentProps } from "react";

/**
 * A stand-in for TanStack Router in component tests: links are plain anchors, navigation is
 * recorded, and the current path and search are set by the test.
 * Use it with: vi.mock("@tanstack/react-router", async () => (await import("@/test/routerMock")).routerModule)
 */
export const routerState = {
  navigations: [] as { to?: string; search?: unknown; replace?: boolean }[],
  pathname: "/",
  search: {} as Record<string, unknown>,
};

export function resetRouter() {
  routerState.navigations = [];
  routerState.pathname = "/";
  routerState.search = {};
}

function href(to: unknown, search: unknown) {
  const query =
    search && typeof search === "object"
      ? new URLSearchParams(search as Record<string, string>).toString()
      : "";
  return `${String(to)}${query ? `?${query}` : ""}`;
}

type LinkProps = ComponentProps<"a"> & { to?: string; search?: unknown };

export const routerModule = {
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => routerState.search }),
  Link: forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, search, ...rest }, ref) {
    return createElement("a", { ...rest, ref, href: href(to, search) });
  }),
  Outlet: () => null,
  useNavigate: () => (opts: { to?: string; search?: unknown; replace?: boolean }) => {
    routerState.navigations.push(opts);
    return Promise.resolve();
  },
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: routerState.pathname } }),
};

export const lastNavigation = () => routerState.navigations.at(-1);
