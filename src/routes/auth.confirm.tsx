import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Link2Off, Loader2, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard, AuthField, FormNotice, SubmitButton } from "@/components/auth/AuthParts";
import { useAuth } from "@/auth/context";
import { clearPendingEmail, readPendingEmail } from "@/auth/pendingEmail";
import { AUTH_PATHS, readAuthUrlOutcome, type AuthUrlOutcome } from "@/auth/redirects";
import { resendConfirmation } from "@/auth/service";
import { forgotSchema } from "@/auth/validation";
import { usePostAuth } from "@/auth/usePostAuth";
import { consumeAuthUrlSnapshot } from "@/integrations/supabase/client";
import { ResendButton } from "@/components/auth/ResendButton";
import { useAuthCopy, type AuthKey } from "@/i18n/auth";

export const Route = createFileRoute("/auth/confirm")({ component: ConfirmPage });

/** How long to wait for the backend to turn the link into a session before calling it invalid. */
const LINK_WAIT_MS = 8000;

/** Where the link in the confirmation email lands. */
function ConfirmPage() {
  const { t } = useAuthCopy();
  const navigate = useNavigate();
  const { status } = useAuth();
  const { go, pending } = usePostAuth();
  const [outcome, setOutcome] = useState<AuthUrlOutcome | null>(null);
  const [waitedOut, setWaitedOut] = useState(false);

  // What the link brought back, read once (child effects run before the provider's).
  useEffect(() => {
    setOutcome(readAuthUrlOutcome(consumeAuthUrlSnapshot(AUTH_PATHS.confirm)));
  }, []);

  // Opened by hand, without a link: sign in, or carry on if already a member.
  useEffect(() => {
    if (outcome?.kind !== "none" || status === "loading") return;
    void navigate({ to: status === "signedIn" ? "/" : AUTH_PATHS.signIn, replace: true });
  }, [outcome, status, navigate]);

  // A link that never becomes a session is treated as invalid.
  useEffect(() => {
    if (outcome?.kind !== "link" || status === "signedIn") return;
    const timer = setTimeout(() => setWaitedOut(true), LINK_WAIT_MS);
    return () => clearTimeout(timer);
  }, [outcome, status]);

  useEffect(() => {
    if (outcome?.kind === "link" && status === "signedIn") clearPendingEmail();
  }, [outcome, status]);

  if (!outcome || outcome.kind === "none") return <Waiting label={t("confirmWorking")} />;

  if (outcome.kind === "error") {
    return outcome.expired ? <LinkProblem expired /> : <LinkProblem expired={false} />;
  }

  if (status === "signedIn") {
    return (
      <AuthCard
        title={t("confirmedTitle")}
        description={t("confirmedDesc")}
        icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
      >
        <Button
          type="button"
          variant="gold"
          size="xl"
          className="w-full"
          onClick={go}
          disabled={pending}
        >
          {pending && (
            <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          )}
          {t("continueLabel")}
        </Button>
      </AuthCard>
    );
  }

  if (waitedOut) return <LinkProblem expired={false} />;
  return <Waiting label={t("confirmWorking")} />;
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

/** An expired or unusable link: say so plainly and offer a new one. */
function LinkProblem({ expired }: { expired: boolean }) {
  const { t } = useAuthCopy();
  const [email, setEmail] = useState(() => readPendingEmail());
  const [sent, setSent] = useState<string | null>(null);
  const [formError, setFormError] = useState<AuthKey | null>(null);
  const form = useForm<{ email: string }>({
    resolver: zodResolver(forgotSchema),
    mode: "onTouched",
    defaultValues: { email },
  });
  const { errors, isSubmitting } = form.formState;
  const msg = (key?: string) => (key ? t(key as AuthKey) : undefined);

  const onSubmit = form.handleSubmit(async ({ email: value }) => {
    setFormError(null);
    const result = await resendConfirmation(value.trim());
    if (!result.ok) {
      setFormError(result.failure.key);
      return;
    }
    setEmail(value.trim());
    setSent(value.trim());
  });

  return (
    <AuthCard
      title={expired ? t("expiredTitle") : t("invalidTitle")}
      description={expired ? t("expiredDesc") : t("invalidDesc")}
      icon={
        expired ? (
          <TimerOff aria-hidden="true" className="h-5 w-5" />
        ) : (
          <Link2Off aria-hidden="true" className="h-5 w-5" />
        )
      }
    >
      {sent ? (
        <div className="space-y-4">
          <FormNotice tone="success">{t("resent")}</FormNotice>
          <ResendButton email={sent} send={resendConfirmation} label={t("resend")} startCounting />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {formError && <FormNotice tone="error">{t(formError)}</FormNotice>}
          <AuthField
            {...form.register("email")}
            label={t("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            ltr
            error={msg(errors.email?.message)}
          />
          <SubmitButton pending={isSubmitting} pendingLabel={t("saving")}>
            {t("getNewLink")}
          </SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link
          to={AUTH_PATHS.signIn}
          className="font-medium text-gold underline-offset-4 hover:underline"
        >
          {t("backToSignIn")}
        </Link>
      </p>
    </AuthCard>
  );
}
