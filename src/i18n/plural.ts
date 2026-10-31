import { translations, type Lang } from "./translations";

/**
 * The forms of a counted text, by CLDR plural category. Only `other` is required: Chinese has no plural,
 * French and English have `one` and `other`, Arabic has all six. `{n}` is replaced by the number.
 */
export type PluralForms = { other: string } & Partial<Record<"zero" | "one" | "two" | "few" | "many", string>>;

/** The right form for a number, in a language ("1 titre", "2 titres", "مقطوعتان"). */
export function pluralForm(lang: Lang, forms: PluralForms, n: number): string {
  const category = new Intl.PluralRules(lang).select(n) as keyof PluralForms;
  return (forms[category] ?? forms.other).replace("{n}", String(n));
}

function resolve(lang: Lang, key: string): unknown {
  return key.split(".").reduce<unknown>(
    (acc, part) =>
      acc && typeof acc === "object" && part in (acc as Record<string, unknown>)
        ? (acc as Record<string, unknown>)[part]
        : undefined,
    translations[lang],
  );
}
const isForms = (value: unknown): value is PluralForms =>
  !!value && typeof value === "object" && typeof (value as PluralForms).other === "string";

/** A counted text of the dictionary, in the language, then in English, then in French (like `translate`). */
export function translatePlural(lang: Lang, key: string, n: number): string {
  for (const l of [lang, "en", "fr"] as const) {
    const found = resolve(l, key);
    if (isForms(found)) return pluralForm(lang, found, n);
  }
  return key;
}
