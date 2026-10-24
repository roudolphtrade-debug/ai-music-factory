import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { Result } from "./service";
import type { Profile, ProfilePatch } from "./types";

export type AuthStatus = "loading" | "unconfigured" | "signedOut" | "signedIn";
export type ProfileState = "idle" | "loading" | "ready" | "error";

export interface AuthValue {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  profileState: ProfileState;
  /** True after the member opened a password-recovery link (they hold a short-lived session). */
  recovering: boolean;
  /** Name to show: the profile's display name, else the part of the address before "@". */
  memberName: string;
  updateProfile: (patch: ProfilePatch) => Promise<Result<Profile>>;
  reloadProfile: () => void;
  signOut: () => Promise<Result>;
  endRecovery: () => void;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
