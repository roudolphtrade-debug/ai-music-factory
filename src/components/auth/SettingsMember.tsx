import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/context";
import { AUTH_PATHS } from "@/auth/redirects";
import { useAuthCopy } from "@/i18n/auth";
import { FormNotice } from "./AuthParts";
import { ProfileForm } from "./ProfileForm";
import { MemberMonogram } from "./ProfileParts";

/** The real part of the Settings profile card: the signed-in member's own name, handle and roles. */
export function MemberProfileSection() {
  const { t } = useAuthCopy();
  const { status, user, profile, profileState, reloadProfile } = useAuth();

  if (status === "unconfigured") return null;

  if (status === "signedOut") {
    return (
      <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-5">
        <h3 className="font-display text-base font-semibold text-foreground">
          {t("settingsGuestTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("settingsGuestDesc")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="gold">
            <Link to={AUTH_PATHS.signIn} search={{ redirect: "/settings" }}>
              {t("signIn")}
            </Link>
          </Button>
          <Button asChild variant="ghost-gold">
            <Link to={AUTH_PATHS.signUp}>{t("signUp")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (status === "loading" || profileState === "loading" || profileState === "idle") {
    return (
      <div role="status" className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        {t("loadingProfile")}
      </div>
    );
  }

  if (profileState === "error") {
    return (
      <div className="mt-5 space-y-3">
        <FormNotice tone="error">{t("profileLoadFailed")}</FormNotice>
        <Button type="button" variant="ghost-gold" size="sm" onClick={reloadProfile}>
          {t("continueLabel")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-5 max-w-xl">
      <ProfileForm profile={profile} email={user?.email} submitLabel={t("save")} />
    </div>
  );
}

/** Settings side card: the member's monogram, name and handle. Only for a signed-in member. */
export function MemberSideCard() {
  const { t } = useAuthCopy();
  const { status, profile, memberName } = useAuth();
  if (status !== "signedIn") return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <MemberMonogram name={memberName} className="mx-auto h-20 w-20 rounded-2xl text-2xl" />
      <p className="mt-4 truncate font-display text-lg font-semibold text-foreground">
        {memberName}
      </p>
      {profile?.handle && (
        <p className="text-xs text-muted-foreground">
          <bdi dir="ltr">@{profile.handle}</bdi>
        </p>
      )}
      <Button asChild variant="ghost-gold" className="mt-5 w-full">
        <Link to="/avatar-lab">{t("avatarCta")}</Link>
      </Button>
    </div>
  );
}
