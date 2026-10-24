import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, MailCheck } from "lucide-react";
import { AuthCard, AuthField, FormNotice, SubmitButton } from "@/components/auth/AuthParts";
import { ResendButton } from "@/components/auth/ResendButton";
import { AUTH_PATHS } from "@/auth/redirects";
import { requestPasswordReset } from "@/auth/service";
import { forgotSchema } from "@/auth/validation";
import { useAuthCopy, type AuthKey } from "@/i18n/auth";

export const Route = createFileRoute("/auth/forgot-password")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const { t } = useAuthCopy();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<AuthKey | null>(null);
  const form = useForm<{ email: string }>({
    resolver: zodResolver(forgotSchema),
    mode: "onTouched",
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const msg = (key?: string) => (key ? t(key as AuthKey) : undefined);

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(null);
    const result = await requestPasswordReset(email.trim());
    if (!result.ok) {
      setFormError(result.failure.key);
      return;
    }
    setSentTo(email.trim());
  });

  if (sentTo) {
    return (
      <AuthCard
        title={t("forgotSentTitle")}
        description={t("forgotSentDesc", { email: sentTo })}
        icon={<MailCheck aria-hidden="true" className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <FormNotice tone="info">{t("checkSpam")}</FormNotice>
          <ResendButton
            email={sentTo}
            send={requestPasswordReset}
            label={t("resend")}
            successKey="forgotSentTitle"
            startCounting
          />
          <p className="text-center text-sm">
            <Link
              to={AUTH_PATHS.signIn}
              className="font-medium text-gold underline-offset-4 hover:underline"
            >
              {t("backToSignIn")}
            </Link>
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("forgotTitle")}
      description={t("forgotDesc")}
      icon={<KeyRound aria-hidden="true" className="h-5 w-5" />}
    >
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
          {t("forgotCta")}
        </SubmitButton>
      </form>
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
