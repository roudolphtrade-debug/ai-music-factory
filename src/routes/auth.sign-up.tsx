import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AuthCard,
  AuthField,
  FormNotice,
  PasswordField,
  SubmitButton,
} from "@/components/auth/AuthParts";
import { ResendButton } from "@/components/auth/ResendButton";
import { useAuth } from "@/auth/context";
import { AUTH_PATHS } from "@/auth/redirects";
import { resendConfirmation, signUpWithEmail } from "@/auth/service";
import { showFailure } from "@/auth/showFailure";
import { signUpSchema } from "@/auth/validation";
import { PENDING_EMAIL_KEY } from "@/auth/pendingEmail";
import { useAuthCopy, type AuthKey } from "@/i18n/auth";

export const Route = createFileRoute("/auth/sign-up")({ component: SignUpPage });

interface Values {
  email: string;
  password: string;
}

function SignUpPage() {
  const { t } = useAuthCopy();
  const navigate = useNavigate();
  const { status } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<AuthKey | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const msg = (key?: string) => (key ? t(key as AuthKey) : undefined);

  // Already a member: nothing to create here.
  useEffect(() => {
    if (status === "signedIn" && !sentTo) void navigate({ to: AUTH_PATHS.welcome, replace: true });
  }, [status, sentTo, navigate]);

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setFormError(null);
    const result = await signUpWithEmail(email.trim(), password);
    if (!result.ok) {
      showFailure(form, result.failure, setFormError);
      return;
    }
    if (!result.data.needsConfirmation) {
      void navigate({ to: AUTH_PATHS.welcome, replace: true });
      return;
    }
    try {
      sessionStorage.setItem(PENDING_EMAIL_KEY, email.trim());
    } catch {
      /* private mode: the expired-link page just asks for the address again */
    }
    form.reset({ email: "", password: "" });
    setSentTo(email.trim());
  });

  if (sentTo) {
    return (
      <AuthCard
        title={t("checkTitle")}
        description={t("checkDesc", { email: sentTo })}
        icon={<Mail aria-hidden="true" className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <FormNotice tone="info">{t("checkSpam")}</FormNotice>
          <ResendButton
            email={sentTo}
            send={resendConfirmation}
            label={t("resend")}
            startCounting
          />
          <Button type="button" variant="ghost" className="w-full" onClick={() => setSentTo(null)}>
            {t("changeEmail")}
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("signUpTitle")}
      description={t("signUpDesc")}
      icon={<Sparkles aria-hidden="true" className="h-5 w-5" />}
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
        <PasswordField
          {...form.register("password")}
          label={t("password")}
          autoComplete="new-password"
          hint={t("passwordRule")}
          error={msg(errors.password?.message)}
        />
        <SubmitButton pending={isSubmitting} pendingLabel={t("signingUp")}>
          {t("signUpCta")}
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link
          to={AUTH_PATHS.signIn}
          className="font-medium text-gold underline-offset-4 hover:underline"
        >
          {t("signIn")}
        </Link>
      </p>
    </AuthCard>
  );
}
