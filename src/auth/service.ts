import { loadSupabase } from "@/integrations/supabase/client";
import { AUTH_PATHS, absoluteUrl } from "./redirects";
import { classifyAuthError, failure, isAlreadyRegistered, type AuthFailure } from "./errors";
import type { Profile, ProfilePatch } from "./types";

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; failure: AuthFailure };
const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (f: AuthFailure): Result<never> => ({ ok: false, failure: f });
const unavailable = () => fail(failure("unavailable"));

/** Creates the account. `needsConfirmation` is false only when the project confirms addresses itself. */
export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<Result<{ needsConfirmation: boolean }>> {
  const sb = await loadSupabase();
  if (!sb) return unavailable();
  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: absoluteUrl(AUTH_PATHS.confirm) },
    });
    // An address that already has an account looks like a new sign-up: no way to probe addresses.
    if (error) {
      return isAlreadyRegistered(error)
        ? ok({ needsConfirmation: true })
        : fail(classifyAuthError(error));
    }
    return ok({ needsConfirmation: !data.session });
  } catch (e) {
    return fail(classifyAuthError(e));
  }
}

export async function signInWithEmail(email: string, password: string): Promise<Result> {
  const sb = await loadSupabase();
  if (!sb) return unavailable();
  try {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? fail(classifyAuthError(error)) : ok(undefined);
  } catch (e) {
    return fail(classifyAuthError(e));
  }
}

export async function signOutMember(): Promise<Result> {
  const sb = await loadSupabase();
  if (!sb) return unavailable();
  try {
    // This device only: signing out here does not end the member's sessions elsewhere.
    const { error } = await sb.auth.signOut({ scope: "local" });
    return error ? fail(classifyAuthError(error)) : ok(undefined);
  } catch (e) {
    return fail(classifyAuthError(e));
  }
}

export async function resendConfirmation(email: string): Promise<Result> {
  const sb = await loadSupabase();
  if (!sb) return unavailable();
  try {
    const { error } = await sb.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: absoluteUrl(AUTH_PATHS.confirm) },
    });
    return error ? fail(classifyAuthError(error)) : ok(undefined);
  } catch (e) {
    return fail(classifyAuthError(e));
  }
}

/** Always looks successful unless the member should wait or the network is down. */
export async function requestPasswordReset(email: string): Promise<Result> {
  const sb = await loadSupabase();
  if (!sb) return unavailable();
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: absoluteUrl(AUTH_PATHS.reset),
    });
    if (!error) return ok(undefined);
    const f = classifyAuthError(error);
    return f.kind === "rate_limit" || f.kind === "network" ? fail(f) : ok(undefined);
  } catch (e) {
    return fail(classifyAuthError(e));
  }
}

export async function updateMemberPassword(password: string): Promise<Result> {
  const sb = await loadSupabase();
  if (!sb) return unavailable();
  try {
    const { error } = await sb.auth.updateUser({ password });
    return error ? fail(classifyAuthError(error)) : ok(undefined);
  } catch (e) {
    return fail(classifyAuthError(e));
  }
}

export async function fetchProfile(userId: string): Promise<Result<Profile | null>> {
  const sb = await loadSupabase();
  if (!sb) return unavailable();
  try {
    const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    return error ? fail(classifyAuthError(error)) : ok((data as Profile | null) ?? null);
  } catch (e) {
    return fail(classifyAuthError(e));
  }
}

/**
 * Saves the member's own profile row (RLS lets a member write only their own).
 * The row is normally created by the database trigger at sign-up, so this is a plain UPDATE of
 * the member's own row. An upsert would not work: it sends `id` in its SET list, and `id` is
 * deliberately not writable by members. If the row is missing (trigger never ran), it is created.
 */
export async function saveProfile(
  userId: string,
  patch: ProfilePatch,
  fallbackName = "",
): Promise<Result<Profile>> {
  const sb = await loadSupabase();
  if (!sb) return unavailable();
  const { onboardingCompleted, ...fields } = patch;
  const changes: Record<string, unknown> = { ...fields };
  if (onboardingCompleted) changes.onboarding_completed_at = new Date().toISOString();
  try {
    const updated = await sb
      .from("profiles")
      .update(changes)
      .eq("id", userId)
      .select()
      .maybeSingle();
    if (updated.error) return fail(classifyAuthError(updated.error));
    if (updated.data) return ok(updated.data as Profile);

    const name = (fields.display_name ?? fallbackName).trim().slice(0, 60) || "member";
    const created = await sb
      .from("profiles")
      .insert({ id: userId, ...changes, display_name: name })
      .select()
      .single();
    return created.error ? fail(classifyAuthError(created.error)) : ok(created.data as Profile);
  } catch (e) {
    return fail(classifyAuthError(e));
  }
}
