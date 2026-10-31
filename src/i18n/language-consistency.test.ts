import { describe, expect, it } from "vitest";
import { projects } from "@/data/mock";
import { LANGS, translations, type Lang } from "./translations";
import { listening } from "./listening";
import { pluralForm, translatePlural } from "./plural";

const langs = LANGS.map((l) => l.code) as Lang[];
const others = langs.filter((l) => l !== "en");

// translate() falls back to English for a missing key, which hides the gap: look in each language's own text.
type Tree = Record<string, unknown>;
const own = (lang: Lang, key: string): unknown =>
  key.split(".").reduce<unknown>(
    (acc, part) => (acc && typeof acc === "object" ? (acc as Tree)[part] : undefined),
    translations[lang],
  );
// a counted text (its plural forms) is one key: Chinese has one form, Arabic six
const isCounted = (value: unknown) =>
  !!value && typeof value === "object" && typeof (value as Tree).other === "string";
const flat = (value: unknown, prefix = "", acc: string[] = []): string[] => {
  if (value && typeof value === "object" && !Array.isArray(value) && !isCounted(value)) {
    for (const [k, v] of Object.entries(value as Tree)) flat(v, prefix ? `${prefix}.${k}` : k, acc);
  } else acc.push(prefix);
  return acc;
};

// ---------------------------------------------------------------- the demonstration projects
describe("the demonstration projects are described in each language", () => {
  const item = (lang: Lang, id: string) => own(lang, `studio.examples.items.${id}`);

  it.each(langs)("%s: every demonstration project has a description of its own", (lang) => {
    for (const p of projects) {
      expect(typeof item(lang, p.id), `${lang} ${p.id}`).toBe("string");
      expect((item(lang, p.id) as string).length, `${lang} ${p.id}`).toBeGreaterThan(20);
    }
  });

  it.each(others)("%s: the description is a translation, not the English text", (lang) => {
    for (const p of projects) {
      expect(item(lang, p.id), `${lang} ${p.id}`).not.toBe(item("en", p.id));
      expect(item(lang, p.id), `${lang} ${p.id}`).not.toBe(p.prompt);
    }
  });

  it("the English text is the source text of the project, unchanged", () => {
    for (const p of projects) expect(item("en", p.id)).toBe(p.prompt);
  });

  it.each(langs)("%s: no dash, no broken character, written in normalised Unicode", (lang) => {
    for (const p of projects) {
      const text = item(lang, p.id) as string;
      expect(text, `${lang} ${p.id}`).not.toContain("—");
      expect(text, `${lang} ${p.id}`).not.toContain("�");
      expect(text, `${lang} ${p.id}`).toBe(text.normalize("NFC"));
    }
  });

  const ENGLISH_ONLY = /\b(the|and|with|for|your|from|that|this|toward|build|slow|late-night|sparse|restrained)\b/i;
  it.each(["fr", "es", "pt"] as const)("%s: no English word is left in the descriptions", (lang) => {
    for (const p of projects) expect(item(lang, p.id), `${lang} ${p.id}`).not.toMatch(ENGLISH_ONLY);
  });

  it("the tempo in the Arabic text is an isolated left-to-right run, so that it reads 90 BPM and not BPM 90", () => {
    const text = item("ar", "p-2") as string;
    expect(text).toContain("\u206690 BPM\u2069");
  });

  it("the label of the create button is shorter than the English one (a longer one overflowed a 375 px header in Spanish)", () => {
    const en = own("en", "studio.createNew") as string;
    for (const lang of ["fr", "es", "pt"] as const) {
      const label = own(lang, "studio.createNew") as string;
      expect(label.length, `${lang}: ${label}`).toBeLessThan(en.length);
    }
  });

  it("Chinese is written in Chinese, Arabic in Arabic (only a tempo such as BPM stays Latin)", () => {
    for (const p of projects) {
      expect(item("zh", p.id) as string, `zh ${p.id}`).toMatch(/[一-鿿]/);
      const ar = item("ar", p.id) as string;
      expect(ar, `ar ${p.id}`).toMatch(/[؀-ۿ]/);
      expect(ar.replace(/BPM/g, ""), `ar ${p.id}`).not.toMatch(/[A-Za-z]/);
    }
  });

  it("accented letters are present where the language needs them", () => {
    const all = (lang: Lang) => projects.map((p) => item(lang, p.id) as string).join(" ");
    expect(all("fr")).toMatch(/[éèêàçœ]/);
    expect(all("es")).toMatch(/[áéíóúñ]/);
    expect(all("pt")).toMatch(/[ãõçéáê]/);
  });

  it("the works, the artists and the brands are not translated: the project titles stay as they are", () => {
    for (const p of projects) expect(p.title, p.id).not.toMatch(/[一-鿿؀-ۿ]/);
    expect(projects.map((p) => p.title)).toEqual([
      "Amber Cathedral",
      "Untitled · Nocturne 03",
      "Gold Thread (Remix)",
      "Working Idea · Chrome",
    ]);
  });
});

// ---------------------------------------------------------------- nothing falls back to English
describe("every text of the interface exists in each of the six languages", () => {
  const leaves = (lang: Lang) => {
    const out: string[] = [];
    for (const section of Object.keys((translations as Record<Lang, Tree>)[lang])) {
      flat((translations as Record<Lang, Tree>)[lang][section], section, out);
    }
    return out.sort();
  };
  const frLeaves = leaves("fr");

  it("French, the reference, is not empty", () => {
    expect(frLeaves.length).toBeGreaterThan(600);
  });

  it.each(others)("%s: no key of the French dictionary is missing, whatever the page", (lang) => {
    const have = new Set(leaves(lang));
    expect(frLeaves.filter((k) => !have.has(k))).toEqual([]);
  });

  it.each(langs)("%s: no key that French does not have (a stale or misspelt key)", (lang) => {
    const reference = new Set(frLeaves);
    expect(leaves(lang).filter((k) => !reference.has(k))).toEqual([]);
  });

  it("the 195 keys that were still borrowed from English are written in Portuguese, Chinese and Arabic", () => {
    const sections = [
      "avatarLab", "artistProfile", "battles", "bracket", "notif", "seasons", "credits", "labels",
      "hallOfFame", "community", "analytics",
    ];
    for (const lang of ["pt", "zh", "ar"] as const) {
      for (const section of sections) {
        for (const key of flat((translations.fr as Tree)[section], section)) {
          expect(own(lang, key), `${lang} ${key}`).toBeDefined();
        }
      }
    }
  });

  // a text that is rewritten must keep its variables, or the page shows "{n}" or loses the number
  const placeholders = (value: unknown) =>
    typeof value === "string" ? [...new Set(value.match(/\{[a-zA-Z]+\}/g) ?? [])].sort().join(",") : "";
  it.each(others)("%s: every text keeps exactly the variables of the French one", (lang) => {
    const wrong: string[] = [];
    for (const key of frLeaves) {
      const fr = own("fr", key);
      const v = own(lang, key);
      if (typeof fr === "string" && placeholders(v) !== placeholders(fr)) wrong.push(`${key}: ${placeholders(v)} instead of ${placeholders(fr)}`);
    }
    expect(wrong).toEqual([]);
  });

  it.each(others)("%s: a list (the days of the week) has as many items as the French one", (lang) => {
    const wrong: string[] = [];
    for (const key of frLeaves) {
      const fr = own("fr", key);
      const v = own(lang, key);
      if (Array.isArray(fr) && (!Array.isArray(v) || v.length !== fr.length)) wrong.push(key);
    }
    expect(wrong).toEqual([]);
  });

  it.each(langs)("%s: no empty text, no space at either end", (lang) => {
    const wrong: string[] = [];
    for (const key of leaves(lang)) {
      const v = own(lang, key);
      if (typeof v === "string" && (v.trim() === "" || v !== v.trim())) wrong.push(key);
    }
    expect(wrong).toEqual([]);
  });

  it.each(["pt", "zh", "ar"] as const)("%s: the counted texts keep the shape of the other languages (an 'other' form)", (lang) => {
    for (const key of frLeaves) {
      const fr = own("fr", key);
      if (fr && typeof fr === "object" && !Array.isArray(fr)) {
        expect(typeof (own(lang, key) as Tree | undefined)?.other, `${lang} ${key}`).toBe("string");
      }
    }
  });

  it.each(langs)("%s: the hidden label of the close button is translated", (lang) => {
    expect(typeof own(lang, "common.close"), lang).toBe("string");
    if (lang !== "en") expect(own(lang, "common.close")).not.toBe(own("en", "common.close"));
  });

  it("the player texts exist in the six languages, with the same keys everywhere", () => {
    const reference = Object.keys(listening.fr).sort();
    for (const lang of langs) expect(Object.keys(listening[lang]).sort(), lang).toEqual(reference);
  });
});

// ---------------------------------------------------------------- one, two, many
describe("a count is written correctly for one, two and many", () => {
  const count = (lang: Lang, n: number) => pluralForm(lang, listening[lang].tracksCount, n);

  it.each([
    ["fr", 0, "0 titre"], ["fr", 1, "1 titre"], ["fr", 2, "2 titres"], ["fr", 25, "25 titres"],
    ["en", 0, "0 tracks"], ["en", 1, "1 track"], ["en", 2, "2 tracks"],
    ["es", 1, "1 canción"], ["es", 2, "2 canciones"],
    ["pt", 1, "1 faixa"], ["pt", 2, "2 faixas"],
    ["zh", 1, "1 首曲目"], ["zh", 12, "12 首曲目"],
  ] as const)("%s, %i: %s", (lang, n, expected) => {
    expect(count(lang, n)).toBe(expected);
  });

  it.each([
    [0, "لا توجد مقطوعات"],
    [1, "مقطوعة واحدة"],
    [2, "مقطوعتان"],
    [3, "3 مقطوعات"],
    [10, "10 مقطوعات"],
    [11, "11 مقطوعة"],
    [99, "99 مقطوعة"],
    [100, "100 مقطوعة"],
  ])("ar, %i: %s", (n, expected) => {
    expect(count("ar", n)).toBe(expected);
  });

  it("the results line uses the same rule", () => {
    expect(pluralForm("fr", listening.fr.results, 1)).toBe("1 titre");
    expect(pluralForm("fr", listening.fr.results, 3)).toBe("3 titres");
    expect(pluralForm("ar", listening.ar.results, 2)).toBe("مقطوعتان");
  });

  it.each(langs)("%s: the playlist count has its plural forms", (lang) => {
    const forms = own(lang, "playlists.count") as Record<string, string>;
    expect(typeof forms.other, lang).toBe("string");
    expect(translatePlural(lang, "playlists.count", 1)).not.toBe("playlists.count");
    expect(translatePlural(lang, "playlists.count", 5)).toContain("5");
  });

  it("the playlist count reads correctly in French and English for one track", () => {
    expect(translatePlural("fr", "playlists.count", 1)).toBe("1 titre");
    expect(translatePlural("en", "playlists.count", 1)).toBe("1 track");
    expect(translatePlural("en", "playlists.count", 4)).toBe("4 tracks");
  });

  it("a key that does not exist is returned as it is, not as a blank", () => {
    expect(translatePlural("en", "nothing.here", 3)).toBe("nothing.here");
  });
});

// ---------------------------------------------------------------- numbers in Arabic
describe("numbers in Arabic are written like everywhere else in the interface", () => {
  const strings = (value: unknown, acc: string[] = []): string[] => {
    if (typeof value === "string") acc.push(value);
    else if (Array.isArray(value)) value.forEach((v) => strings(v, acc));
    else if (value && typeof value === "object") Object.values(value as Tree).forEach((v) => strings(v, acc));
    return acc;
  };
  const ARABIC_INDIC = /[\u0660-\u0669\u06f0-\u06f9]/;

  it("the Arabic texts use Western digits only, as the rest of the interface (times, scores, counts) does", () => {
    const all = [...strings(translations.ar), ...strings(listening.ar)];
    expect(all.length).toBeGreaterThan(400);
    expect(all.filter((x) => ARABIC_INDIC.test(x))).toEqual([]);
  });

  it("a count in Arabic carries its number in Western digits, for every plural category", () => {
    for (const n of [0, 1, 2, 3, 5, 10, 11, 25, 99, 100, 101, 102, 1000]) {
      const text = pluralForm("ar", listening.ar.tracksCount, n);
      expect(text, String(n)).not.toMatch(ARABIC_INDIC);
      if (![0, 1, 2].includes(n)) expect(text, String(n)).toContain(String(n));
    }
  });

  it("a number is written with the same digits in every language", () => {
    for (const lang of langs) {
      const text = pluralForm(lang, listening[lang].results, 12);
      expect(text, lang).toContain("12");
    }
  });
});
