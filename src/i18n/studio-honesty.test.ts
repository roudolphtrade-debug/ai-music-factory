import { describe, expect, it } from "vitest";
import { LANGS, translate, type Lang } from "./translations";

const langs = LANGS.map((l) => l.code) as Lang[];
const t = (lang: Lang, key: string) => translate(lang, key, { n: 5 });

// What the service really does: a text model writes four lines, a speech synthesis reads them, and
// an instrumental is synthesized in the browser. Nothing sings, and nothing can be bought yet.
const SINGING: Record<Lang, RegExp> = {
  fr: /chant[ée]/i,
  en: /\bsung\b|\bsinging\b/i,
  es: /cantad[oa]/i,
  zh: /演唱/,
  pt: /cantad[oa]/i,
  ar: /غنائ/,
};
const BUYING: Record<Lang, RegExp> = {
  fr: /ajoutez des cr[ée]dits|rechargez/i,
  en: /add credits|top up/i,
  es: /a[ñn]ade cr[ée]ditos|recarga/i,
  zh: /充值/,
  pt: /recarregue|adicione cr[ée]ditos/i,
  ar: /شحن|أضف/,
};

describe("the studio does not promise what it does not do", () => {
  it.each(langs)("%s: no 'sung preview'", (lang) => {
    expect(t(lang, "studio.gen.ready")).not.toMatch(SINGING[lang]);
  });

  it.each(langs)("%s: no invitation to buy or top up credits", (lang) => {
    for (const key of ["studio.gen.errorCredits", "studio.gen.noCredits", "aiErrors.credits"]) {
      expect(t(lang, key), `${lang} ${key}`).not.toMatch(BUYING[lang]);
    }
  });

  it.each(langs)("%s: says it is a synthetic voice, and that the free allowance renews", (lang) => {
    const ready = t(lang, "studio.gen.ready");
    const synthetic = {
      fr: /synth[eè]se/i,
      en: /synthetic/i,
      es: /sint[eé]tica/i,
      zh: /合成/,
      pt: /sint[eé]tica/i,
      ar: /اصطناعي/,
    }[lang];
    expect(ready).toMatch(synthetic);
    expect(t(lang, "studio.gen.noCredits")).toContain("5"); // the {n} placeholder is still filled
  });
});

describe("the new studio and session texts exist in the six languages", () => {
  const keys = [
    "studio.gen.ready",
    "studio.gen.errorCredits",
    "studio.gen.errorRate",
    "studio.gen.errorGeneric",
    "studio.gen.noCredits",
    "studio.gen.signInFirst",
    "studio.gen.accountsOff",
    "studio.gen.notKept",
    "studio.gen.prepResumed",
    "studio.gen.prepClear",
    "studio.gen.prepCleared",
    "aiErrors.session",
    "aiErrors.authUnavailable",
    "aiErrors.signIn",
  ];

  it.each(langs)("%s: every key has its own text, no dash, and no raw key left", (lang) => {
    for (const key of keys) {
      const value = t(lang, key);
      expect(value, `${lang} ${key}`).not.toBe(key);
      expect(value.length, `${lang} ${key}`).toBeGreaterThan(3);
      // errorRate predates this lot in fr, en and es (and keeps its dash there); everything else is new
      const predates = key === "studio.gen.errorRate" && ["fr", "en", "es"].includes(lang);
      if (!predates) expect(value, `${lang} ${key}`).not.toContain("—");
      if (lang !== "en")
        expect(value, `${lang} ${key} is not the English text`).not.toBe(t("en", key));
    }
  });

  it("the sign-in prompts say to sign in and never show a technical detail", () => {
    for (const lang of langs) {
      for (const key of [
        "aiErrors.session",
        "aiErrors.authUnavailable",
        "aiErrors.signIn",
        "studio.gen.signInFirst",
      ]) {
        expect(t(lang, key)).not.toMatch(/\b(401|403|503|jwt|token|bearer)\b/i);
      }
    }
  });
});
