export type CreatorRole = "artist" | "label";
export const CREATOR_ROLES: CreatorRole[] = ["artist", "label"];

/** A row of `public.profiles` (see supabase/migrations). */
export interface Profile {
  id: string;
  display_name: string;
  handle: string | null;
  avatar_url: string | null;
  creator_roles: CreatorRole[];
  preferred_language: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** What a member may change about their own profile. */
export type ProfilePatch = Partial<
  Pick<Profile, "display_name" | "handle" | "avatar_url" | "creator_roles" | "preferred_language">
> & { onboardingCompleted?: boolean };
