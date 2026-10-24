import type { FakeSupabase } from "./fakeSupabase";

/**
 * Stand-in for "@/integrations/supabase/client" in component tests. It must not import any app
 * module: the mock factory runs while that module is being resolved.
 */
export interface AuthHolder {
  fake: FakeSupabase | null;
  configured: boolean;
  /** Whether the page opens with a stored session or an email link (the client starts at once). */
  startWithClient: boolean;
  snapshot: { path: string; hash: string; search: string } | null;
}

export function clientModule(holder: AuthHolder) {
  return {
    get isAuthConfigured() {
      return holder.configured;
    },
    loadSupabase: async () => (holder.configured ? (holder.fake?.client ?? null) : null),
    whenSupabaseReady: (listener: (sb: unknown) => void) => {
      if (holder.configured && holder.fake) listener(holder.fake.client);
      return () => {};
    },
    authNeededAtStart: () => holder.configured && holder.startWithClient,
    takeAuthUrlSnapshot: () => holder.snapshot,
    consumeAuthUrlSnapshot: (path: string) => {
      const taken = holder.snapshot;
      holder.snapshot = null;
      return taken && taken.path === path ? taken : null;
    },
  };
}
