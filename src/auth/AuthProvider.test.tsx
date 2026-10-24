// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  authError,
  createFakeSupabase,
  makeProfile,
  makeSession,
  type FakeSupabase,
} from "@/test/fakeSupabase";

const holder = vi.hoisted(() => ({
  fake: null as unknown as FakeSupabase | null,
  configured: true,
  startWithClient: true,
  /** Listeners waiting for the client, as the real module keeps them. */
  waiting: new Set<(sb: unknown) => void>(),
  loaded: 0,
}));
vi.mock("@/integrations/supabase/client", () => ({
  get isAuthConfigured() {
    return holder.configured;
  },
  loadSupabase: async () => {
    if (!holder.configured || !holder.fake) return null;
    holder.loaded += 1;
    for (const listener of [...holder.waiting]) listener(holder.fake.client);
    return holder.fake.client;
  },
  whenSupabaseReady: (listener: (sb: unknown) => void) => {
    holder.waiting.add(listener);
    return () => void holder.waiting.delete(listener);
  },
  authNeededAtStart: () => holder.configured && holder.startWithClient,
}));

import { loadSupabase } from "@/integrations/supabase/client";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./context";

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const mount = () => renderHook(() => useAuth(), { wrapper });

let fake: FakeSupabase;
beforeEach(() => {
  fake = createFakeSupabase();
  holder.fake = fake;
  holder.configured = true;
  holder.startWithClient = true;
  holder.waiting.clear();
  holder.loaded = 0;
});
afterEach(cleanup);

describe("restoring a session", () => {
  it("starts as 'loading', then 'signedOut' when nothing is stored", async () => {
    const { result } = mount();
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(fake.client.from).not.toHaveBeenCalled(); // no profile is requested for a visitor
  });

  it("restores the member after a reload, then loads the profile", async () => {
    fake.restore(makeSession("user-1", "amina@example.test"));
    fake.set("fetchProfile", { data: makeProfile({ display_name: "Amina O." }), error: null });
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    expect(result.current.user?.email).toBe("amina@example.test");
    await waitFor(() => expect(result.current.profileState).toBe("ready"));
    expect(result.current.profile?.display_name).toBe("Amina O.");
    expect(result.current.memberName).toBe("Amina O.");
    expect(fake.profileQuery.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("falls back on the part of the address before '@' when the profile has no name or fails", async () => {
    fake.restore(makeSession("user-1", "amina.o@example.test"));
    fake.set("fetchProfile", { data: null, error: authError("PGRST000", 500) });
    const { result } = mount();
    await waitFor(() => expect(result.current.profileState).toBe("error"));
    expect(result.current.status).toBe("signedIn"); // a profile problem does not sign anyone out
    expect(result.current.memberName).toBe("amina.o");
  });

  it("can retry loading the profile", async () => {
    fake.restore(makeSession());
    fake.set("fetchProfile", { data: null, error: authError("PGRST000", 500) });
    const { result } = mount();
    await waitFor(() => expect(result.current.profileState).toBe("error"));
    fake.set("fetchProfile", { data: makeProfile({ display_name: "Back" }), error: null });
    act(() => result.current.reloadProfile());
    await waitFor(() => expect(result.current.profile?.display_name).toBe("Back"));
  });
});

describe("following the backend's announcements", () => {
  it("signs in on SIGNED_IN and signs out on SIGNED_OUT, forgetting the profile", async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    act(() => fake.emit("SIGNED_IN", makeSession()));
    await waitFor(() => expect(result.current.profileState).toBe("ready"));
    expect(result.current.status).toBe("signedIn");
    act(() => fake.emit("SIGNED_OUT", null));
    expect(result.current.status).toBe("signedOut");
    expect(result.current.profile).toBeNull();
    expect(result.current.profileState).toBe("idle");
  });

  it("flags a password-recovery session, and clears the flag on request or on sign-out", async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    expect(result.current.recovering).toBe(false);
    act(() => fake.emit("PASSWORD_RECOVERY", makeSession()));
    expect(result.current.recovering).toBe(true);
    act(() => result.current.endRecovery());
    expect(result.current.recovering).toBe(false);
    act(() => fake.emit("PASSWORD_RECOVERY", makeSession()));
    act(() => fake.emit("SIGNED_OUT", null));
    expect(result.current.recovering).toBe(false);
  });

  it("keeps the member signed in when the token is refreshed", async () => {
    fake.restore(makeSession());
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    act(() => fake.emit("TOKEN_REFRESHED", makeSession()));
    expect(result.current.status).toBe("signedIn");
  });

  it("stops listening when it is removed", async () => {
    const { unmount } = mount();
    await waitFor(() => expect(fake.client.auth.onAuthStateChange).toHaveBeenCalled());
    unmount();
    expect(() => fake.emit("SIGNED_IN", makeSession())).not.toThrow();
  });
});

describe("changing the profile", () => {
  it("saves under the member's id and shows the saved row", async () => {
    fake.restore(makeSession("user-1"));
    const { result } = mount();
    await waitFor(() => expect(result.current.profileState).toBe("ready"));
    fake.set("saveProfile", {
      data: makeProfile({ display_name: "New name", handle: "new_name" }),
      error: null,
    });
    let saved = false;
    await act(async () => {
      saved = (await result.current.updateProfile({ display_name: "New name", handle: "new_name" }))
        .ok;
    });
    expect(saved).toBe(true);
    expect(result.current.profile?.display_name).toBe("New name");
    expect(result.current.memberName).toBe("New name");
  });

  it("keeps the previous profile when saving fails", async () => {
    fake.restore(makeSession("user-1"));
    fake.set("fetchProfile", { data: makeProfile({ display_name: "Before" }), error: null });
    const { result } = mount();
    await waitFor(() => expect(result.current.profile?.display_name).toBe("Before"));
    fake.set("saveProfile", { data: null, error: { code: "23505", message: "duplicate" } });
    let outcome: Awaited<ReturnType<typeof result.current.updateProfile>> | undefined;
    await act(async () => {
      outcome = await result.current.updateProfile({ handle: "taken" });
    });
    expect(outcome?.ok).toBe(false);
    expect(result.current.profile?.display_name).toBe("Before");
  });

  it("refuses to save when nobody is signed in", async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    let outcome: Awaited<ReturnType<typeof result.current.updateProfile>> | undefined;
    await act(async () => {
      outcome = await result.current.updateProfile({ display_name: "x" });
    });
    expect(outcome?.ok).toBe(false);
    expect(fake.profileQuery.update).not.toHaveBeenCalled();
  });
});

describe("signing out", () => {
  it("asks the backend to end this device's session", async () => {
    fake.restore(makeSession());
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    await act(async () => void (await result.current.signOut()));
    expect(fake.client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("makes this device forget the member even if the backend cannot be reached", async () => {
    fake.restore(makeSession());
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    fake.set("signOut", { error: authError("unexpected_failure", 500) });
    await act(async () => void (await result.current.signOut()));
    expect(result.current.status).toBe("signedOut");
    expect(result.current.profile).toBeNull();
  });
});

describe("loading the backend only when needed", () => {
  it("does not start it for a visitor with no session to restore and no email link", async () => {
    holder.startWithClient = false;
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    expect(holder.loaded).toBe(0);
    expect(fake.client.auth.getSession).not.toHaveBeenCalled();
    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it("starts it at once when a session is stored or an email link is open", async () => {
    fake.restore(makeSession("user-1"));
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    expect(holder.loaded).toBeGreaterThan(0);
    expect(fake.client.auth.getSession).toHaveBeenCalled();
  });

  it("follows a sign-in that starts the backend later", async () => {
    holder.startWithClient = false;
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    await act(async () => void (await loadSupabase())); // an account page or a sign-in needs it
    act(() => fake.emit("SIGNED_IN", makeSession("user-1", "late@example.test")));
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    expect(result.current.user?.email).toBe("late@example.test");
    act(() => fake.emit("SIGNED_OUT", null));
    expect(result.current.status).toBe("signedOut");
  });

  it("stops following when it is removed, even before the backend started", async () => {
    holder.startWithClient = false;
    const { unmount } = mount();
    await waitFor(() => expect(holder.waiting.size).toBe(1));
    unmount();
    expect(holder.waiting.size).toBe(0);
  });
});

describe("accounts not configured", () => {
  it("settles on 'unconfigured' and never contacts the backend", async () => {
    holder.configured = false;
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe("unconfigured"));
    expect(fake.client.auth.getSession).not.toHaveBeenCalled();
    expect(fake.client.auth.onAuthStateChange).not.toHaveBeenCalled();
  });
});
