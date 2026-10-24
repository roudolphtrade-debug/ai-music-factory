import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { HardDrive, Loader2, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard, FormNotice } from "@/components/auth/AuthParts";
import { RequireMember } from "@/components/auth/AuthGate";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { MemberMonogram } from "@/components/auth/ProfileParts";
import { useAuth } from "@/auth/context";
import { safeRedirect } from "@/auth/redirects";
import { useAuthCopy } from "@/i18n/auth";

export const Route = createFileRoute("/_app/welcome")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = safeRedirect(search.redirect);
    return redirect ? { redirect } : {};
  },
  head: () => ({ meta: [{ title: "Ai Music Factory" }, { name: "robots", content: "noindex" }] }),
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <RequireMember>
      <Welcome />
    </RequireMember>
  );
}

/** First visit of a new member. Every step is optional and can be left for later. */
function Welcome() {
  const { t } = useAuthCopy();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { profile, profileState, memberName, updateProfile, reloadProfile } = useAuth();
  const destination = redirect ?? "/";
  const leave = () => void navigate({ to: destination, replace: true });

  const later = async () => {
    const result = await updateProfile({ onboardingCompleted: true });
    if (!result.ok) toast.error(t("saveFailed"));
    leave();
  };

  if (profileState === "loading" || profileState === "idle") {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"
      >
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        {t("loadingProfile")}
      </div>
    );
  }

  if (profileState === "error") {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10">
        <FormNotice tone="error">{t("profileLoadFailed")}</FormNotice>
        <Button type="button" variant="ghost-gold" onClick={reloadProfile}>
          {t("continueLabel")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <MemberMonogram name={memberName} className="h-14 w-14 rounded-2xl text-xl" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            {t("welcomeTitle", { name: memberName })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("welcomeDesc")}</p>
        </div>
      </div>

      <AuthCard
        title={t("profileCardTitle")}
        headingLevel={2}
        icon={<UserRound aria-hidden="true" className="h-5 w-5" />}
      >
        <ProfileForm
          profile={profile}
          completeOnboarding
          submitLabel={t("finish")}
          onSaved={leave}
          footer={
            <Button type="button" variant="ghost" className="w-full" onClick={later}>
              {t("later")}
            </Button>
          }
        />
      </AuthCard>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/60 text-gold">
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t("avatarTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("avatarDesc")}</p>
            <Button asChild variant="ghost-gold" size="sm" className="mt-3">
              <Link to="/avatar-lab">{t("avatarCta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/60 text-gold">
            <HardDrive aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t("localTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("localDesc")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
