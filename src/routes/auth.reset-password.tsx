import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound, Loader2, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard, FormNotice, PasswordField, SubmitButton } from "@/components/auth/AuthParts";
import { useAuth } from "@/auth/context";
import { AUTH_PATHS, readAuthUrlOutcome, type AuthUrlOutcome } from "@/auth/redirects";
import { updateMemberPassword } from "@/auth/service";
import { showFailure } from "@/auth/showFailure";
import { resetSchema } from "@/auth/validation";
import { consumeAuthUrlSnapshot } from "@/integrations/supabase/client";
import { useAuthCopy, type AuthKey } from "@/i18n/auth";

export const Route = createFileRoute("/auth/reset-password")({ component: ResetPasswordPage });

/** How long to wait for the backend to turn the link into a recovery session. */
const LINK_WAIT_MS = 8000;

function ResetPasswordPage() {
  const { t } = useAuthCopy();
  const navigate = useNavigate();
  const { recovering, endRecovery } = useAuth();
  const [outcome, setOutcome] = useState<AuthUrlOutcome | null>(null);
  const [waitedOut, setWaitedOut] = useState(false);
  const [formError, setFormError] = useState<AuthKey | null>(null);
  const form = useForm<{ password: string; confirm: string }>({
    resolver: zodResolver(resetSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const msg = (key?: string) => (key ? t(key as AuthKey) : undefined);

  // What the link brought back, read once (child effects run before the provider's).
  useEffect(() => {
    setOutcome(readAuthUrlOutcome(consumeAuthUrlSnapshot(AUTH_PATHS.reset)));
  }, []);

  // A link that never turns into a recovery session is treated as invalid.
  useEffect(() => {
    if (outcome?.kind !== "link" || recovering) return;
    const timer = setTimeout(() => setWaitedOut(true), LINK_WAIT_MS);
    return () => clearTimeout(timer);
  }, [outcome, recovering]);

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setFormError(null);
    const result = await updateMemberPassword(password);
    if (!result.ok) {
      showFailure(form, result.failure, setFormError);
      return;
    }
    endRecovery();
    toast.success(t("resetDone"));
    void navigate({ to: "/", replace: true });
  });

  if (!outcome) return <Waiting label={t("loading")} />;

  const linkFailed =
    outcome.kind === "error" || (outcome.kind === "link" && waitedOut && !recovering);
  if (linkFailed) {
    return (
      <AuthCard
        title={t("resetExpiredTitle")}
        description={t("resetExpiredDesc")}
        icon={<TimerOff aria-hidden="true" className="h-5 w-5" />}
      >
        <Button asChild variant="gold" size="xl" className="w-full">
          <Link to={AUTH_PATHS.forgot}>{t("requestNewReset")}</Link>
        </Button>
      </AuthCard>
    );
  }

  if (!recovering) {
    if (outcome.kind === "link") return <Waiting label={t("confirmWorking")} />;
    return (
      <AuthCard
        title={t("resetTitle")}
        description={t("resetNoLink")}
        icon={<KeyRound aria-hidden="true" className="h-5 w-5" />}
      >
        <Button asChild variant="ghost-gold" size="lg" className="w-full">
          <Link to={AUTH_PATHS.forgot}>{t("requestNewReset")}</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("resetTitle")}
      description={t("resetDesc")}
      icon={<KeyRound aria-hidden="true" className="h-5 w-5" />}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <FormNotice tone="error">{t(formError)}</FormNotice>}
        <PasswordField
          {...form.register("password")}
          label={t("newPassword")}
          autoComplete="new-password"
          hint={t("passwordRule")}
          error={msg(errors.password?.message)}
        />
        <PasswordField
          {...form.register("confirm")}
          label={t("confirmPassword")}
          autoComplete="new-password"
          error={msg(errors.confirm?.message)}
        />
        <SubmitButton pending={isSubmitting} pendingLabel={t("saving")}>
          {t("resetCta")}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}

function Waiting({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"
    >
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      {label}
    </div>
  );
}
