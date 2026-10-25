import { useRef, useState, type ReactNode } from "react";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/auth/context";
import type { CreatorRole, Profile } from "@/auth/types";
import { formatRefusedChars, HANDLE_EXAMPLE, isolate, suggestHandle } from "@/auth/handle";
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
  // What a field message needs beyond its key: the refused characters, the length, a suggestion.
  const details = useRef<Partial<Record<"displayName" | "handle", Record<string, unknown>>>>({});
  const form = useForm<Values>({
    // Validates name and handle, and keeps the handle in its normalized form.
    resolver: async (values) => {
      const parsed = profileSchema.safeParse({
        displayName: values.displayName,
        handle: values.handle,
      });
      if (parsed.success) return { values: { ...values, handle: parsed.data.handle }, errors: {} };
      const errors: FieldErrors<Values> = {};
      details.current = {};
      for (const issue of parsed.error.issues) {
        const name = issue.path[0] as "displayName" | "handle";
        if (errors[name]) continue;
        errors[name] = { type: "validation", message: issue.message };
        details.current[name] = issue.code === "custom" ? (issue.params ?? {}) : {};
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
  /** The message of a handle error, with the exact characters, length or suggestion filled in. */
  const handleMsg = (key?: string) => {
    if (!key) return undefined;
    const d = details.current.handle ?? {};
    return t(key as AuthKey, {
      chars: Array.isArray(d.chars) ? formatRefusedChars(d.chars as string[], t("charSpace")) : "",
      count: typeof d.count === "number" ? d.count : 0,
      suggestion:
        typeof d.suggestion === "string" ? isolate(d.suggestion) : isolate(HANDLE_EXAMPLE),
    });
  };

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
        // Unavailable: say so on the handle field, offer another one, keep what was typed, and put the
        // cursor in the field.
        details.current.handle = { suggestion: suggestHandle(values.handle) };
        form.setError(
          "handle",
          { type: "taken", message: result.failure.key },
          { shouldFocus: true },
        );
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
        hint={t("handleHint")}
        error={handleMsg(errors.handle?.message)}
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
