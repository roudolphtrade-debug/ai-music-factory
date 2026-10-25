/**
 * The password policy, in one place. It mirrors what the Supabase project is asked to enforce on its
 * own side (Authentication, Sign In / Providers, Email: minimum length 12 and "lowercase, uppercase
 * letters, digits and symbols"), so that a password the form accepts is a password the service accepts.
 * The service stays the authority: this only tells the member early and precisely what is missing.
 *
 * Letters and digits are the ASCII ones, as in the service (an accented capital such as "É" does not
 * count as an uppercase letter there), and the accepted symbols are exactly the service's list.
 * Pure and free of zod, so that screens can use it without pulling the schemas into the first load.
 */
export const PASSWORD_MIN = 12;
/** The auth service refuses more than 72 bytes (bcrypt); counting bytes keeps accents and emoji honest. */
export const PASSWORD_MAX_BYTES = 72;
/** The symbols the service accepts, as listed in its documentation. */
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export type PasswordCriterion = "length" | "upper" | "lower" | "digit" | "special";
export const PASSWORD_CRITERIA: PasswordCriterion[] = [
  "length",
  "upper",
  "lower",
  "digit",
  "special",
];

const SYMBOLS = new Set(Array.from(PASSWORD_SYMBOLS));

/** Which criteria the password meets. Length counts characters, not bytes or UTF-16 units. */
export function passwordCriteria(password: string): Record<PasswordCriterion, boolean> {
  const chars = Array.from(password);
  return {
    length: chars.length >= PASSWORD_MIN,
    upper: chars.some((c) => c >= "A" && c <= "Z"),
    lower: chars.some((c) => c >= "a" && c <= "z"),
    digit: chars.some((c) => c >= "0" && c <= "9"),
    special: chars.some((c) => SYMBOLS.has(c)),
  };
}

/** The criteria still missing, in the order they are listed to the member. */
export function missingCriteria(password: string): PasswordCriterion[] {
  const met = passwordCriteria(password);
  return PASSWORD_CRITERIA.filter((criterion) => !met[criterion]);
}

export function passwordTooLong(password: string): boolean {
  return new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES;
}
