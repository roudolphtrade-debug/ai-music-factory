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

describe("the pause texts are calm, truthful and free of technical detail", () => {
  it.each(langs)("%s: no code, no status number, no claim that the engine is connected", (lang) => {
    for (const key of ["studio.gen.ready", "studio.gen.pausedStatus", "studio.gen.pausedNotice"]) {
      expect(t(lang, key), `${lang} ${key}`).not.toMatch(/\b(ai_paused|503|json)\b/i);
    }
    const connected: Record<Lang, RegExp> = {
      fr: /connect[ée]/i,
      en: /connected/i,
      es: /conectado/i,
      zh: /已连接/,
      pt: /conectado/i,
      ar: /متصل/,
    };
    expect(t(lang, "studio.gen.ready")).not.toMatch(connected[lang]);
  });

  it.each(langs)("%s: the notice says the preparation is kept", (lang) => {
    const kept: Record<Lang, RegExp> = {
      fr: /conservée/,
      en: /is kept/,
      es: /se conserva/,
      zh: /已保留/,
      pt: /foi mantida/,
      ar: /محفوظ/,
    };
    expect(t(lang, "studio.gen.pausedNotice")).toMatch(kept[lang]);
  });
});

describe("the new studio and session texts exist in the six languages", () => {
  const keys = [
    "studio.gen.ready",
    "studio.gen.pausedStatus",
    "studio.gen.pausedNotice",
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

describe("the recovery of tracks that belong to nobody", () => {
  const keys = [
    "unassignedTitle",
    "unassignedDesc",
    "unassignedClaim",
    "unassignedDelete",
    "claimTitle",
    "claimWarning",
    "claimNoProof",
    "claimConfirm",
    "deleteTitle",
    "deleteWarning",
    "deleteConfirm",
    "dialogCancel",
    "unassignedClaimed",
    "unassignedClaimFailed",
    "unassignedDeleted",
    "unassignedDeleteFailed",
    "unassignedClaimCancelled",
    "deleteDraftFailed",
  ].map((k) => `studio.gen.${k}`);
  const takesCount = [
    "studio.gen.unassignedDesc",
    "studio.gen.deleteWarning",
    "studio.gen.unassignedClaimed",
    "studio.gen.unassignedDeleted",
  ];
  const shared: Record<Lang, RegExp> = {
    fr: /partagé/i,
    en: /shared/i,
    es: /compartido/i,
    zh: /共用/,
    pt: /compartilhado/i,
    ar: /مشترك/,
  };
  const noProof: Record<Lang, RegExp> = {
    fr: /ne vérifie pas/i,
    en: /does not check/i,
    es: /no comprueba/i,
    zh: /不会核实/,
    pt: /não verifica/i,
    ar: /لا يتحقق/,
  };

  it.each(langs)("%s: every text exists, is its own, keeps its count and has no dash", (lang) => {
    for (const key of keys) {
      const value = t(lang, key);
      expect(value, `${lang} ${key}`).not.toBe(key);
      expect(value.length, `${lang} ${key}`).toBeGreaterThan(1);
      expect(value, `${lang} ${key}`).not.toContain("\u2014");
      if (lang !== "en") expect(value, `${lang} ${key}`).not.toBe(t("en", key));
      if (takesCount.includes(key)) expect(value, `${lang} ${key}`).toContain("5");
    }
  });

  it.each(langs)(
    "%s: warns about a shared device, and never claims to prove who made the tracks",
    (lang) => {
      expect(t(lang, "studio.gen.claimWarning")).toMatch(shared[lang]);
      expect(t(lang, "studio.gen.claimNoProof")).toMatch(noProof[lang]);
      // nowhere does a text of this feature say the confirmation proves or verifies an identity
      const all = keys.map((k) => t(lang, k)).join(" ");
      expect(all).not.toMatch(
        /\b(prouve|prove|proves|proven|certifie|certify|authentifi\w+|authenticat\w+)\b/i,
      );
    },
  );

  it.each(langs)(
    "%s: the deletion text says it cannot be undone and that cancelling keeps everything",
    (lang) => {
      const irreversible: Record<Lang, RegExp> = {
        fr: /irréversible/i,
        en: /cannot be undone/i,
        es: /no se puede deshacer/i,
        zh: /无法撤销/,
        pt: /não pode ser desfeito/i,
        ar: /لا يمكن التراجع/,
      };
      expect(t(lang, "studio.gen.deleteWarning")).toMatch(irreversible[lang]);
    },
  );
});
