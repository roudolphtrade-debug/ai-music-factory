import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./context";
import { AUTH_PATHS } from "./redirects";
import { clearReturnTo, peekReturnTo } from "./returnTo";

/**
 * After a successful sign-in or confirmation: wait for the member's profile, then go to the welcome
 * page if they never finished it, otherwise to where they were headed (or the home page).
 * If the profile cannot be loaded, the member is not stuck: they continue to their destination.
 * Without a destination in the address, the one remembered for 24 hours in this browser (see
 * returnTo.ts) is used, so that sign-up and e-mail confirmation lead back to where the member started.
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
    const target = destination ?? peekReturnTo();
    clearReturnTo();
    if (profile && !profile.onboarding_completed_at) {
      void navigate({
        to: AUTH_PATHS.welcome,
        search: target ? { redirect: target } : {},
        replace: true,
      });
    } else {
      void navigate({ to: target ?? "/", replace: true });
    }
  }, [pending, status, profile, profileState, destination, navigate]);

  return { go, pending };
}
