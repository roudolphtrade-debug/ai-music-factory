import { useState, type ReactNode } from "react";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/auth/context";
import type { CreatorRole, Profile } from "@/auth/types";
import { profileSchema } from "@/auth/validation";
import { useAuthCopy, type AuthKey } from "@/i18n/auth";
import { AuthField, FormNotice, SubmitButton } from "./AuthParts";
import { RoleChips } from "./ProfileParts";

interface Values {
  displayName: string;
  handle: string;
  roles: CreatorRole[];
}

/**
 * The member's own profile: name, optional handle, optional creator roles. Used by the welcome page
 * (which also completes the onboarding) and by Settings. Saving writes the member's own row only.
 */
export function ProfileForm({
  profile,
  email,
  completeOnboarding = false,
  submitLabel,
  onSaved,
  footer,
}: {
  profile: Profile | null;
  /** When given, shown read-only (Settings). */
  email?: string;
  completeOnboarding?: boolean;
  submitLabel: string;
  onSaved?: () => void;
  footer?: ReactNode;
}) {
  const { t } = useAuthCopy();
  const { updateProfile, memberName } = useAuth();
  const [formError, setFormError] = useState<AuthKey | null>(null);
  const form = useForm<Values>({
    // Validates name and handle, and keeps the handle in its normalized form.
    resolver: async (values) => {
      const parsed = profileSchema.safeParse({
        displayName: values.displayName,
        handle: values.handle,
      });
      if (parsed.success) return { values: { ...values, handle: parsed.data.handle }, errors: {} };
      const errors: FieldErrors<Values> = {};
      for (const issue of parsed.error.issues) {
        const name = issue.path[0] as "displayName" | "handle";
        errors[name] ??= { type: "validation", message: issue.message };
      }
      return { values: {}, errors };
    },
    mode: "onTouched",
    defaultValues: {
      displayName: profile?.display_name || memberName,
      handle: profile?.handle ?? "",
      roles: profile?.creator_roles ?? [],
    },
  });
  const { errors, isSubmitting } = form.formState;
  const msg = (key?: string) => (key ? t(key as AuthKey) : undefined);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await updateProfile({
      display_name: values.displayName.trim(),
      handle: values.handle ? values.handle : null,
      creator_roles: values.roles,
      ...(completeOnboarding ? { onboardingCompleted: true } : {}),
    });
    if (!result.ok) {
      if (result.failure.kind === "handle_taken") {
        form.setError("handle", { message: result.failure.key });
      } else {
        setFormError(result.failure.key);
      }
      return;
    }
    toast.success(t("saved"));
    onSaved?.();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <FormNotice tone="error">{t(formError)}</FormNotice>}
      {email && (
        <AuthField
          label={t("emailReadonly")}
          value={email}
          readOnly
          ltr
          type="email"
          tabIndex={-1}
          className="text-muted-foreground"
        />
      )}
      <AuthField
        {...form.register("displayName")}
        label={t("displayName")}
        autoComplete="nickname"
        error={msg(errors.displayName?.message)}
      />
      <AuthField
        {...form.register("handle")}
        label={t("handle")}
        optionalLabel={t("optional")}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        ltr
        placeholder="@"
        error={msg(errors.handle?.message)}
      />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {t("roleTitle")}{" "}
          <span className="text-xs font-normal text-muted-foreground">({t("optional")})</span>
        </legend>
        <p className="text-xs text-muted-foreground">{t("roleDesc")}</p>
        <Controller
          control={form.control}
          name="roles"
          render={({ field }) => <RoleChips value={field.value} onChange={field.onChange} />}
        />
      </fieldset>
      <div className="space-y-3 pt-1">
        <SubmitButton pending={isSubmitting} pendingLabel={t("saving")}>
          {submitLabel}
        </SubmitButton>
        {footer}
      </div>
    </form>
  );
}
