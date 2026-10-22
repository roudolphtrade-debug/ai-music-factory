import { describe, expect, it } from "vitest";
import { LANGS, translations, type Lang } from "./translations";

const KEYS = [
  "aiErrors.paused",
  "aiErrors.rate",
  "aiErrors.credits",
  "aiErrors.tooLarge",
  "aiErrors.generic",
  "voice.maxDuration",
];
const codes = LANGS.map((l) => l.code);

// Read the language's own dictionary: `translate()` would hide a missing key behind its fallback.
function own(lang: Lang, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
      translations[lang],
    );
}

describe("AI route messages exist in the six languages", () => {
  it("covers FR, EN, ES, ZH, PT and AR", () => {
    expect(codes).toEqual(["fr", "en", "es", "zh", "pt", "ar"]);
  });

  it.each(KEYS)("%s is a non-empty string of its own in every language", (key) => {
    for (const lang of codes) {
      const value = own(lang, key);
      expect(typeof value, `${lang}:${key}`).toBe("string");
      expect((value as string).trim().length, `${lang}:${key}`).toBeGreaterThan(5);
    }
    // No language reuses another one's sentence (a copy-paste would show up as a duplicate).
    const values = codes.map((lang) => own(lang, key));
    expect(new Set(values).size).toBe(codes.length);
  });

  it("uses the right script for Chinese and Arabic and no placeholder is left open", () => {
    for (const key of KEYS) {
      expect(own("zh", key)).toMatch(/[\u4e00-\u9fff]/);
      expect(own("ar", key)).toMatch(/[\u0600-\u06ff]/);
      for (const lang of codes) expect(own(lang, key)).not.toMatch(/[{}]/);
    }
  });

  it("keeps editorial punctuation: no em dash in the new messages", () => {
    for (const key of KEYS) for (const lang of codes) expect(own(lang, key)).not.toContain("—");
  });
});
