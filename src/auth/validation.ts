import { z } from "zod";
import type { AuthKey } from "@/i18n/auth";
import { handleProblem, normalizeHandle } from "./handle";
import { missingCriteria, passwordTooLong } from "./password";

/** Error messages are catalog keys: the form translates them. */
const msg = (key: AuthKey) => key;

export { PASSWORD_MAX_BYTES, PASSWORD_MIN } from "./password";
export const NAME_MAX = 60;

export const emailSchema = z
  .string()
  .trim()
  .min(1, msg("errRequired"))
  .max(254, msg("errEmail"))
  .email(msg("errEmail"));

/**
 * A new password (sign-up and reset): 12 characters at least, with an uppercase letter, a lowercase
 * letter, a digit and a symbol. One issue at a time; the screens list what is missing from the value.
 */
export const newPasswordSchema = z.string().superRefine((value, ctx) => {
  const issue = (key: AuthKey) => ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg(key) });
  if (value === "") return issue("errRequired");
  if (passwordTooLong(value)) return issue("errPasswordLong");
  if (missingCriteria(value).length) return issue("errPasswordMissing");
});

export const signUpSchema = z
  .object({ email: emailSchema, password: newPasswordSchema })
  .refine((v) => v.password.toLowerCase() !== v.email.toLowerCase(), {
    path: ["password"],
    message: msg("errPasswordWeak"),
  });

export const signInSchema = z.object({
  email: emailSchema,
  // No length rule at sign-in: it must accept whatever the account already has.
  password: z.string().min(1, msg("errRequired")),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ password: newPasswordSchema, confirm: z.string().min(1, msg("errRequired")) })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: msg("errPasswordMismatch"),
  });

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, msg("errName"))
  .max(NAME_MAX, msg("errName"));

export { normalizeHandle } from "./handle";

/**
 * The handle is optional. When it is not valid, the issue says exactly why (refused characters, too
 * short, too long) and carries the details the message needs in `params`.
 */
export const handleSchema = z
  .string()
  .transform(normalizeHandle)
  .superRefine((value, ctx) => {
    const problem = handleProblem(value);
    if (!problem) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: msg(problem.key),
      params:
        problem.key === "errHandleChars" ? { chars: problem.chars } : { count: problem.count },
    });
  });

export const profileSchema = z.object({
  displayName: displayNameSchema,
  handle: handleSchema,
});

// Kept in redirects.ts (no zod there) so that routes can use it without pulling the schemas into the first load.
export { safeRedirect } from "./redirects";
