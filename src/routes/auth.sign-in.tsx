import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import {
  AuthCard,
  AuthField,
  FormNotice,
  PasswordField,
  SubmitButton,
} from "@/components/auth/AuthParts";
import { ResendButton } from "@/components/auth/ResendButton";
import { useAuth } from "@/auth/context";
import { AUTH_PATHS, safeRedirect } from "@/auth/redirects";
import { resendConfirmation, signInWithEmail } from "@/auth/service";
import { signInSchema } from "@/auth/validation";
import { usePostAuth } from "@/auth/usePostAuth";
import { useAuthCopy, type AuthKey } from "@/i18n/auth";

export const Route = createFileRoute("/auth/sign-in")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = safeRedirect(search.redirect);
    return redirect ? { redirect } : {};
  },
  component: SignInPage,
});

interface Values {
  email: string;
  password: string;
}

function SignInPage() {
  const { t } = useAuthCopy();
  const { redirect } = Route.useSearch();
  const { status } = useAuth();
  const { go, pending } = usePostAuth(redirect);
  const [formError, setFormError] = useState<AuthKey | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(signInSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const msg = (key?: string) => (key ? t(key as AuthKey) : undefined);

  // Opened while already signed in (a bookmark, the back button): just continue.
  useEffect(() => {
    if (status === "signedIn" && !pending) go();
    // `go` is stable; this runs when the status settles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setFormError(null);
    setUnconfirmed(null);
    const result = await signInWithEmail(email.trim(), password);
    if (result.ok) {
      go();
      return;
    }
    if (result.failure.kind === "not_confirmed") setUnconfirmed(email.trim());
    else setFormError(result.failure.key);
  });

  return (
    <AuthCard
      title={t("signInTitle")}
      description={t("signInDesc")}
      icon={<LogIn aria-hidden="true" className="h-5 w-5" />}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <FormNotice tone="error">{t(formError)}</FormNotice>}
        {unconfirmed && (
          <div className="space-y-3">
            <FormNotice tone="error">
              <p className="font-medium">{t("notConfirmedTitle")}</p>
              <p className="mt-0.5 text-muted-foreground">{t("notConfirmedDesc")}</p>
            </FormNotice>
            <ResendButton email={unconfirmed} send={resendConfirmation} label={t("resend")} />
          </div>
        )}
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
          autoComplete="current-password"
          error={msg(errors.password?.message)}
        />
        <div className="text-end">
          <Link
            to={AUTH_PATHS.forgot}
            className="text-sm font-medium text-gold underline-offset-4 hover:underline"
          >
            {t("forgot")}
          </Link>
        </div>
        <SubmitButton pending={isSubmitting || pending} pendingLabel={t("signingIn")}>
          {t("signInCta")}
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          to={AUTH_PATHS.signUp}
          className="font-medium text-gold underline-offset-4 hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>
    </AuthCard>
  );
}
