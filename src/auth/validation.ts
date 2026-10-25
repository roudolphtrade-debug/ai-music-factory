import { z } from "zod";
import type { AuthKey } from "@/i18n/auth";
import { handleProblem, normalizeHandle } from "./handle";

/** Error messages are catalog keys: the form translates them. */
const msg = (key: AuthKey) => key;

export const PASSWORD_MIN = 12;
/** The auth service refuses more than 72 bytes (bcrypt); counting bytes keeps accents and emoji honest. */
export const PASSWORD_MAX_BYTES = 72;
export const NAME_MAX = 60;

export const emailSchema = z
  .string()
  .trim()
  .min(1, msg("errRequired"))
  .max(254, msg("errEmail"))
  .email(msg("errEmail"));

export const newPasswordSchema = z
  .string()
  .min(1, msg("errRequired"))
  .min(PASSWORD_MIN, msg("errPasswordShort"))
  .refine((v) => new TextEncoder().encode(v).length <= PASSWORD_MAX_BYTES, msg("errPasswordLong"));

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
