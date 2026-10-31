import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { battleHistory, battles, hallOfFame, labels } from "@/data/mock";
import { LANGS, translations, type Lang } from "./translations";

const langs = LANGS.map((l) => l.code) as Lang[];
type Tree = Record<string, unknown>;

/** Every written text of a language, by dotted key: strings, items of a list, forms of a counted text. */
function texts(lang: Lang): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (value: unknown, key: string) => {
    if (typeof value === "string") out.set(key, value);
    else if (Array.isArray(value)) value.forEach((v, i) => typeof v === "string" && out.set(`${key}.${i}`, v));
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value as Tree)) walk(v, key ? `${key}.${k}` : k);
    }
  };
  walk((translations as Record<Lang, Tree>)[lang], "");
  return out;
}

// ---------------------------------------------------------------- written in the language, not copied
describe("the texts of Portuguese, Chinese and Arabic are translated, not copied from English", () => {
  // Names of products and of features, and words that are written the same in the language: each one is
  // here on purpose. A text copied from English by mistake would not be on this list, and fails.
  const SAME_AS_ENGLISH: Record<"pt" | "zh" | "ar", string[]> = {
    pt: [
      "nav.demo", "nav.menu", "home.arena.eyebrow", "studio.prompt", "studio.voices.Instrumental",
      "studio.voices.Soprano", "battles.final", "settings.bio", "charts.regions.Global", "credits.popular",
      "credits.plans.studio.name", "credits.plans.label.name", "labels.mrr", "avatarLab.persona",
    ],
    zh: ["credits.plans.studio.name", "credits.plans.label.name"],
    ar: ["credits.plans.studio.name", "credits.plans.label.name"],
  };

  it.each(["pt", "zh", "ar"] as const)("%s: a text identical to the English one is a known name or word, and only those", (lang) => {
    const en = texts("en");
    const same = [...texts(lang)]
      .filter(([key, value]) => value === en.get(key) && /[A-Za-z]{3,}/.test(value))
      .map(([key]) => key)
      .sort();
    expect(same).toEqual([...SAME_AS_ENGLISH[lang]].sort());
  });

  it("Chinese texts are written in Chinese: the only Latin-only ones are the product names and 'VS'", () => {
    const wrong = [...texts("zh")]
      .filter(([, v]) => /[A-Za-z]/.test(v) && !/[一-鿿]/.test(v))
      .map(([k]) => k)
      .sort();
    expect(wrong).toEqual(["common.vs", "credits.plans.label.name", "credits.plans.studio.name"]);
  });

  it("Arabic texts are written in Arabic: the only Latin-only ones are the product names", () => {
    const wrong = [...texts("ar")]
      .filter(([, v]) => /[A-Za-z]/.test(v) && !/[؀-ۿ]/.test(v))
      .map(([k]) => k)
      .sort();
    expect(wrong).toEqual(["credits.plans.label.name", "credits.plans.studio.name"]);
  });

  it("Portuguese has no English sentence: the one English-looking word is the verb 'for' (se for)", () => {
    const ENGLISH = /\b(the|and|with|your|for|from|this|that|are|you)\b/i;
    const wrong = [...texts("pt")].filter(([, v]) => ENGLISH.test(v)).map(([k]) => k);
    expect(wrong).toEqual(["settings.accountsDesc"]);
  });

  it.each(langs)("%s: no text is left half-translated with a French or English variable name changed", (lang) => {
    // a placeholder is {name}; a typo such as { name } or {Name} would be shown as it is
    const wrong = [...texts(lang)].filter(([, v]) => /\{\s|\s\}|\{[A-Z]/.test(v)).map(([k]) => k);
    expect(wrong).toEqual([]);
  });
});

// ---------------------------------------------------------------- dashes
describe("no new dash in the texts of the interface", () => {
  // The older texts below still carry a dash, in every language; the brand rule is to avoid it. The list
  // can only shrink: a text that is written from now on uses a colon, a comma or a middle dot.
  const COMMON = [
    "artists.desc", "battles.desc", "credits.earningsDesc", "credits.earningsStatus",
    "credits.earningsStep2Desc", "labels.desc", "voice.promptDesc", "voice.tooShort",
  ];
  const OLDER_WITH_A_DASH: Record<"pt" | "zh" | "ar", string[]> = {
    pt: COMMON,
    zh: [...COMMON, "settings.lightModeDesc"],
    ar: [...COMMON, "settings.lightModeDesc"],
  };
  it.each(["pt", "zh", "ar"] as const)("%s: only the older texts keep a dash", (lang) => {
    const withDash = [...texts(lang)]
      .filter(([, v]) => /[—–]/.test(v))
      .map(([k]) => k)
      .sort();
    expect(withDash).toEqual([...OLDER_WITH_A_DASH[lang]].sort());
  });
});

// ---------------------------------------------------------------- the keys that the code uses exist
describe("every dictionary key that the code writes out exists", () => {
  const walkFiles = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walkFiles(full, out);
      else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !/translations\.ts$/.test(name)) out.push(full);
    }
    return out;
  };
  const files = walkFiles("src");
  const used = new Map<string, string>();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(/\b(?:t|tn|ta)\(\s*"([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_-]+)+)"/g)) {
      if (!used.has(m[1])) used.set(m[1], file);
    }
  }

  it("the scan finds the keys of the application", () => {
    expect(files.length).toBeGreaterThan(100);
    expect(used.size).toBeGreaterThan(300);
  });

  it("each key written out in the code is in the English dictionary, so that no page shows a raw key", () => {
    const en = texts("en");
    const known = new Set([...en.keys()].map((k) => k));
    const exists = (key: string) => [...known].some((k) => k === key || k.startsWith(key + "."));
    const missing = [...used].filter(([key]) => !exists(key)).map(([key, file]) => `${key} (${file})`);
    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------- the keys that the demonstration data builds
describe("the texts that the demonstration data points to exist in each language, written in that language", () => {
  const own = (lang: Lang, key: string) => texts(lang).get(key);

  it.each(langs)("%s: the Hall of Fame entries (title, crown, note) and the four awards", (lang) => {
    for (const h of hallOfFame) {
      for (const part of ["title", "crown", "note"]) {
        expect(own(lang, `hallOfFame.items.${h.id}.${part}`), `${lang} ${h.id} ${part}`).toBeTruthy();
      }
    }
    for (const award of ["Artist of the Year", "Underground Icon", "Master of Craft", "Radio Favorite"]) {
      expect(own(lang, `hallOfFame.awards.${award}`), `${lang} ${award}`).toBeTruthy();
    }
  });

  it.each(langs)("%s: the three tiers of a label, whichever label is shown", (lang) => {
    for (const tier of new Set(labels.map((l) => l.tier))) {
      expect(own(lang, `labels.tier.${tier}`), `${lang} ${tier}`).toBeTruthy();
    }
  });

  it.each(langs)("%s: every round of a battle, in the current battles and in the history", (lang) => {
    const phases = new Set([...battles.map((b) => b.round.phase), ...battleHistory.map((b) => b.round.phase)]);
    for (const phase of phases) expect(own(lang, `battles.${phase}`), `${lang} ${phase}`).toBeTruthy();
  });

  it.each(langs)("%s: the five regions of the audience and the three posts of the community", (lang) => {
    for (const region of ["North America", "Europe", "Asia", "Latin America", "Other"]) {
      expect(own(lang, `analytics.regions.${region}`), `${lang} ${region}`).toBeTruthy();
    }
    for (const id of ["c-1", "c-2", "c-3"]) expect(own(lang, `community.posts.${id}`), `${lang} ${id}`).toBeTruthy();
  });

  it.each(["pt", "zh", "ar"] as const)("%s: the names of the artists and of the works inside a text are kept as they are", (lang) => {
    expect(own(lang, "community.posts.c-1")).toContain("Chrome Aria");
    expect(own(lang, "community.posts.c-3")).toContain("Amber Cathedral");
  });

  it.each(["pt", "zh", "ar"] as const)("%s: the amounts and the figures of the plans keep their numbers", (lang) => {
    expect(own(lang, "credits.perks.free1")).toContain("20");
    expect(own(lang, "credits.perks.studio1")).toContain("250");
    expect(own(lang, "credits.perks.label1")).toMatch(/1[.,]200/);
  });

  it("Arabic writes the numbers of the plans in Western digits, like the rest of the interface", () => {
    for (const key of ["credits.perks.free1", "credits.perks.studio1", "credits.perks.label1", "hallOfFame.items.hof-1.note"]) {
      expect(own("ar", key), key).not.toMatch(/[٠-٩۰-۹]/);
      expect(own("ar", key), key).toMatch(/[0-9]/);
    }
  });
});
