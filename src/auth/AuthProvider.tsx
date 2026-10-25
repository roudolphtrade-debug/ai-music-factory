import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  authNeededAtStart,
  isAuthConfigured,
  loadSupabase,
  whenSupabaseReady,
} from "@/integrations/supabase/client";
import { fetchProfile, saveProfile, signOutMember, type Result } from "./service";
import type { Profile, ProfilePatch } from "./types";
import { AuthContext, type AuthStatus, type AuthValue, type ProfileState } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileState, setProfileState] = useState<ProfileState>("idle");
  const [recovering, setRecovering] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Session restore on load, then follow every change (sign-in, sign-out, refresh, recovery link).
  // The backend client is loaded on demand: right away when there is a session to restore or an
  // email link to read, otherwise only when an account page or a sign-in needs it.
  useEffect(() => {
    if (!isAuthConfigured) {
      setStatus("unconfigured");
      return;
    }
    let cancelled = false;
    let unsubscribe = () => {};

    const stopWaiting = whenSupabaseReady((sb) => {
      const { data } = sb.auth.onAuthStateChange((event, next) => {
        // Never call the backend from inside this callback: it can deadlock the client.
        setSession(next);
        setStatus(next ? "signedIn" : "signedOut");
        if (event === "PASSWORD_RECOVERY") setRecovering(true);
        if (event === "SIGNED_OUT") {
          setRecovering(false);
          setProfile(null);
          setProfileState("idle");
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();

      void sb.auth.getSession().then(({ data: current }) => {
        if (cancelled) return;
        setSession((prev) => prev ?? current.session);
        setStatus((prev) =>
          prev === "loading" ? (current.session ? "signedIn" : "signedOut") : prev,
        );
      });
    });

    if (authNeededAtStart()) void loadSupabase();
    else setStatus("signedOut");

    return () => {
      cancelled = true;
      stopWaiting();
      unsubscribe();
    };
  }, []);

  // The member's profile follows the signed-in user.
  const userId = session?.user.id ?? null;
  const email = session?.user.email;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setProfileState("loading");
    void fetchProfile(userId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setProfile(result.data);
        setProfileState("ready");
      } else {
        setProfileState("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadTick]);

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!userId) return { ok: false, failure: { kind: "session", key: "errSession" } } as const;
      const result = await saveProfile(userId, patch, email?.split("@")[0]);
      if (result.ok) {
        setProfile(result.data);
        setProfileState("ready");
      }
      return result;
    },
    [userId, email],
  );

  const reloadProfile = useCallback(() => setReloadTick((n) => n + 1), []);
  const signOut = useCallback(async () => {
    const result = await signOutMember();
    // Even if the server could not be reached, this device must forget the member.
    if (!result.ok) {
      setSession(null);
      setStatus("signedOut");
      setProfile(null);
      setProfileState("idle");
      setRecovering(false);
    }
    return result;
  }, []);
  const endRecovery = useCallback(() => setRecovering(false), []);

  const user = session?.user ?? null;
  const value = useMemo<AuthValue>(() => {
    const emailName = user?.email?.split("@")[0] ?? "";
    return {
      status,
      user,
      profile,
      profileState,
      recovering,
      memberName: profile?.display_name?.trim() || emailName,
      updateProfile,
      reloadProfile,
      signOut,
      endRecovery,
    };
  }, [
    status,
    user,
    profile,
    profileState,
    recovering,
    updateProfile,
    reloadProfile,
    signOut,
    endRecovery,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
