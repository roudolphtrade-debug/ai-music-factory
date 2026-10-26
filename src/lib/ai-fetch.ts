import { loadSupabase } from "@/integrations/supabase/client";

/**
 * Calls to the paid AI routes. Each call carries the member's session token
 * (`Authorization: Bearer`), which the server checks before any provider is called (see
 * `member-guard.ts`). Without a session nothing is sent at all.
 */
export class SignInRequiredError extends Error {
  constructor() {
    super("sign-in required");
    this.name = "SignInRequiredError";
  }
}

/** The current access token, or `null` when nobody is signed in (or the backend is not configured). */
async function accessToken(renew = false): Promise<string | null> {
  const sb = await loadSupabase();
  if (!sb) return null;
  try {
    if (renew) {
      const { data } = await sb.auth.refreshSession();
      return data.session?.access_token ?? null;
    }
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Whether a member session exists on this device. Sends nothing to any AI route. */
export async function hasMemberSession(): Promise<boolean> {
  return (await accessToken()) !== null;
}

/**
 * `fetch` for an AI route, with the session token. Throws `SignInRequiredError` before sending
 * anything when there is no session. On a 401 it renews the session once and retries once; a second
 * 401 is returned as it is, for the caller to turn into "sign in again".
 */
export async function aiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken();
  if (!token) throw new SignInRequiredError();
  const send = (value: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${value}`);
    return fetch(input, { ...init, headers });
  };
  const first = await send(token);
  if (first.status !== 401) return first;
  const renewed = await accessToken(true);
  if (!renewed || renewed === token) return first;
  return send(renewed);
}
