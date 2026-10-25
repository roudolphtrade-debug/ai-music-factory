import { missingCriteria, type PasswordCriterion } from "./password";
import { useAuthCopy, type AuthKey } from "@/i18n/auth";

/** The catalog text that names each criterion ("an uppercase letter (A to Z)"). */
export const CRITERION_KEY: Record<PasswordCriterion, AuthKey> = {
  length: "critLength",
  upper: "critUpper",
  lower: "critLower",
  digit: "critDigit",
  special: "critSpecial",
};

/**
 * The text of a password error. "Still missing" names exactly the criteria the typed password does
 * not meet, listed with the language's own conjunction; the other errors are plain catalog texts.
 */
export function usePasswordMessage() {
  const { t, lang } = useAuthCopy();
  return (key?: string, password = ""): string | undefined => {
    if (!key) return undefined;
    if (key !== "errPasswordMissing") return t(key as AuthKey);
    const labels = missingCriteria(password).map((criterion) => t(CRITERION_KEY[criterion]));
    let list: string;
    try {
      list = new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format(labels);
    } catch {
      list = labels.join(", ");
    }
    return t("errPasswordMissing", { missing: list });
  };
}
