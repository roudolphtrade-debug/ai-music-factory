import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { AuthKey } from "@/i18n/auth";
import type { AuthFailure, AuthFailureKind } from "./errors";

/** Failures that belong to one field: the message goes under it and the cursor goes there. */
const FIELD_OF: Partial<Record<AuthFailureKind, string>> = {
  weak_password: "password",
  password_pwned: "password",
  same_password: "password",
  invalid_email: "email",
};

/** Failures about the whole form that still point at a field to correct. */
const FOCUS_OF: Partial<Record<AuthFailureKind, string>> = {
  credentials: "password",
};

/**
 * Shows what the service answered. Whatever the failure, the form keeps what was typed. A failure that
 * belongs to a field is written under that field and the cursor is placed in it; the others (network,
 * mail, service) go to the notice above the form, and a wrong password puts the cursor back in the
 * password field with its text selected.
 */
export function showFailure<T extends FieldValues>(
  form: UseFormReturn<T>,
  failure: AuthFailure,
  setFormError: (key: AuthKey | null) => void,
): void {
  const has = (name: string | undefined): name is string =>
    !!name && Object.prototype.hasOwnProperty.call(form.getValues(), name);
  const field = FIELD_OF[failure.kind];
  if (has(field)) {
    setFormError(null);
    form.setError(
      field as Path<T>,
      { type: "server", message: failure.key },
      { shouldFocus: true },
    );
    return;
  }
  setFormError(failure.key);
  const focus = FOCUS_OF[failure.kind];
  if (has(focus)) form.setFocus(focus as Path<T>, { shouldSelect: true });
}
