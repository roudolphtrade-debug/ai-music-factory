import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./context";
import { AUTH_PATHS } from "./redirects";

/**
 * After a successful sign-in or confirmation: wait for the member's profile, then go to the welcome
 * page if they never finished it, otherwise to where they were headed (or the home page).
 * If the profile cannot be loaded, the member is not stuck: they continue to their destination.
 */
export function usePostAuth(destination?: string) {
  const navigate = useNavigate();
  const { status, profile, profileState } = useAuth();
  const [pending, setPending] = useState(false);

  const go = useCallback(() => setPending(true), []);

  useEffect(() => {
    if (!pending || status !== "signedIn") return;
    if (profileState !== "ready" && profileState !== "error") return;
    setPending(false);
    if (profile && !profile.onboarding_completed_at) {
      void navigate({
        to: AUTH_PATHS.welcome,
        search: destination ? { redirect: destination } : {},
        replace: true,
      });
    } else {
      void navigate({ to: destination ?? "/", replace: true });
    }
  }, [pending, status, profile, profileState, destination, navigate]);

  return { go, pending };
}
