import { vi } from "vitest";
import type { Profile } from "@/auth/types";

type Listener = (event: string, session: unknown) => void;
type Reply = { data?: unknown; error?: unknown };

export function makeSession(id = "user-1", email = "amina@example.test") {
  return { access_token: "token", refresh_token: "refresh", user: { id, email } };
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    display_name: "Amina",
    handle: null,
    avatar_url: null,
    creator_roles: [],
    preferred_language: null,
    onboarding_completed_at: null,
    created_at: "2026-10-24T09:00:00Z",
    updated_at: "2026-10-24T09:00:00Z",
    ...overrides,
  };
}

/** AuthError-shaped object, as supabase-js hands them back. */
export const authError = (code: string, status = 400, message = "raw backend message") => ({
  name: "AuthApiError",
  code,
  status,
  message,
});

/**
 * A scripted stand-in for the supabase-js client. Each call returns what the test queued for it,
 * and every call is recorded. This is a simulation: it says nothing about the real service.
 */
export function createFakeSupabase() {
  const listeners = new Set<Listener>();
  const state = { session: null as unknown };
  const reply: Record<string, Reply> = {
    signUp: { data: { user: { id: "new" }, session: null }, error: null },
    signInWithPassword: { data: {}, error: null },
    signOut: { error: null },
    resend: { data: {}, error: null },
    resetPasswordForEmail: { data: {}, error: null },
    updateUser: { data: {}, error: null },
    fetchProfile: { data: makeProfile(), error: null },
    saveProfile: { data: makeProfile(), error: null },
    insertProfile: { data: makeProfile(), error: null },
  };

  // Reading, updating and inserting a profile are separate chains, like the real query builder.
  const updateQuery = {
    eq: vi.fn((..._args: unknown[]) => updateQuery),
    select: vi.fn((..._args: unknown[]) => updateQuery),
    maybeSingle: vi.fn(async () => reply.saveProfile),
  };
  const insertQuery = {
    select: vi.fn((..._args: unknown[]) => insertQuery),
    single: vi.fn(async () => reply.insertProfile),
  };
  const profileQuery = {
    select: vi.fn((..._args: unknown[]) => profileQuery),
    eq: vi.fn((..._args: unknown[]) => profileQuery),
    maybeSingle: vi.fn(async () => reply.fetchProfile),
    update: vi.fn((..._args: unknown[]) => updateQuery),
    insert: vi.fn((..._args: unknown[]) => insertQuery),
  };

  const client = {
    auth: {
      signUp: vi.fn(async () => reply.signUp),
      signInWithPassword: vi.fn(async () => reply.signInWithPassword),
      signOut: vi.fn(async () => reply.signOut),
      resend: vi.fn(async () => reply.resend),
      resetPasswordForEmail: vi.fn(async () => reply.resetPasswordForEmail),
      updateUser: vi.fn(async () => reply.updateUser),
      getSession: vi.fn(async () => ({ data: { session: state.session }, error: null })),
      onAuthStateChange: vi.fn((cb: Listener) => {
        listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      }),
    },
    from: vi.fn(() => profileQuery),
  };

  return {
    client,
    profileQuery,
    updateQuery,
    insertQuery,
    /** Queue the next answer of an operation. */
    set(operation: keyof typeof reply, value: Reply) {
      reply[operation] = value;
    },
    /** The session returned by getSession (what a reload restores). */
    restore(session: unknown) {
      state.session = session;
    },
    /** What the backend client announces: SIGNED_IN, SIGNED_OUT, PASSWORD_RECOVERY, TOKEN_REFRESHED. */
    emit(event: string, session: unknown) {
      state.session = session;
      for (const cb of [...listeners]) cb(event, session);
    },
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
