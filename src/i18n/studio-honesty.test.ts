import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { authCopy } from "./auth";
import { LANGS, translate, type Lang } from "./translations";
import { PREP_PROMPT_MAX } from "@/studio/prep";
import { examplePromptFor, isExamplePrompt } from "@/studio/options";

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

describe("the recovery of a preparation made before signing in", () => {
  const keys = [
    "anonPrepTitle",
    "anonPrepDesc",
    "anonPrepClaim",
    "anonPrepDelete",
    "anonClaimTitle",
    "anonClaimWarning",
    "anonClaimNoProof",
    "anonClaimConfirm",
    "anonDeleteTitle",
    "anonDeleteWarning",
    "anonDeleteConfirm",
    "anonClaimed",
    "anonClaimFailed",
    "anonClaimGone",
    "anonClaimCancelled",
    "anonDeleted",
    "anonDeleteFailed",
    "anonLimits",
  ].map((k) => `studio.gen.${k}`);
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
  const irreversible: Record<Lang, RegExp> = {
    fr: /irréversible/i,
    en: /cannot be undone/i,
    es: /no se puede deshacer/i,
    zh: /无法撤销/,
    pt: /não pode ser desfeita/i,
    ar: /لا يمكن التراجع/,
  };
  const limits: Record<Lang, RegExp> = {
    fr: /fenêtre privée/i,
    en: /private window/i,
    es: /ventana privada/i,
    zh: /隐私窗口/,
    pt: /janela privada/i,
    ar: /نافذة خاصة/,
  };

  it.each(langs)("%s: every text exists, is its own, and has no dash and no raw key", (lang) => {
    for (const key of keys) {
      const value = t(lang, key);
      expect(value, `${lang} ${key}`).not.toBe(key);
      expect(value.length, `${lang} ${key}`).toBeGreaterThan(3);
      expect(value, `${lang} ${key}`).not.toContain("\u2014");
      if (lang !== "en") expect(value, `${lang} ${key}`).not.toBe(t("en", key));
    }
  });

  it.each(langs)("%s: warns about a shared device and never claims to prove who wrote it", (lang) => {
    expect(t(lang, "studio.gen.anonClaimWarning")).toMatch(shared[lang]);
    expect(t(lang, "studio.gen.anonClaimNoProof")).toMatch(noProof[lang]);
    const all = keys.map((k) => t(lang, k)).join(" ");
    expect(all).not.toMatch(/\b(prouve|prove|proves|proven|certifie|certify|authentifi\w+|authenticat\w+)\b/i);
  });

  it.each(langs)("%s: the erase text says it cannot be undone and that cancelling keeps it", (lang) => {
    expect(t(lang, "studio.gen.anonDeleteWarning")).toMatch(irreversible[lang]);
  });

  it.each(langs)("%s: the limits are said: another browser, a private window, profile or device", (lang) => {
    expect(t(lang, "studio.gen.anonLimits")).toMatch(limits[lang]);
    expect(authCopy[lang].checkPrepHint).toMatch(limits[lang]);
    expect(authCopy[lang].checkPrepHint).not.toBe("checkPrepHint");
    expect(authCopy[lang].checkPrepHint).not.toContain("\u2014");
    if (lang !== "en") expect(authCopy[lang].checkPrepHint).not.toBe(authCopy.en.checkPrepHint);
  });
});

describe("lot A.2: the texts exist in the six languages and keep their promises", () => {
  const keys = [
    "studio.examplePrompt",
    "studio.statDrafts",
    "studio.statVoices",
    "studio.examples.eyebrow",
    "studio.examples.title",
    "studio.examples.desc",
    "studio.examples.badge",
    "studio.gen.emptyHint",
  ];

  it.each(langs)("%s: every key has its own text, no dash, and no raw key left", (lang) => {
    for (const key of keys) {
      const value = t(lang, key);
      expect(value, `${lang} ${key}`).not.toBe(key);
      expect(value.length, `${lang} ${key}`).toBeGreaterThan(1);
      expect(value, `${lang} ${key}`).not.toContain("—");
      if (lang !== "en")
        expect(value, `${lang} ${key} is not the English text`).not.toBe(t("en", key));
    }
  });

  // A paused service must never be advertised by the texts that welcome a member back. These say what the
  // member can do with the preparation, or that their tracks will appear; none tells them to generate.
  const INVITATION: Record<Lang, RegExp> = {
    fr: /\b(générez|générer|lancez|lancer)\b/i,
    en: /\b(generate|start the generation|launch)\b/i,
    es: /\b(genera|generar|inicia la generación|iniciar la generación)\b/i,
    zh: /开始生成|再生成|请生成|在上方生成/,
    pt: /\b(gere|gerar|inicie a geração|iniciar a geração)\b/i,
    ar: /(^|\s)ولّد(\s|$)|للتوليد|ابدأ التوليد/,
  };

  it.each(langs)("%s: the resume, sign-in and empty-state messages never invite to generate", (lang) => {
    for (const key of ["studio.gen.prepResumed", "studio.gen.signInFirst", "studio.gen.emptyHint"]) {
      expect(t(lang, key), `${lang} ${key}`).not.toMatch(INVITATION[lang]);
    }
  });

  it.each(langs)("%s: the messages that stay say the preparation is kept or can be edited", (lang) => {
    const kept: Record<Lang, RegExp> = {
      fr: /conservée/,
      en: /is kept/,
      es: /se conserva/,
      zh: /已保留/,
      pt: /foi mantida/,
      ar: /محفوظ/,
    };
    expect(t(lang, "studio.gen.signInFirst")).toMatch(kept[lang]);
  });

  it("the example prompt: six different texts, the English one unchanged, each fits the preparation", () => {
    const texts = langs.map((l) => t(l, "studio.examplePrompt"));
    expect(new Set(texts).size).toBe(6);
    expect(t("en", "studio.examplePrompt")).toBe(
      "Cinematic ambient pop with golden-hour pads, warm analogue tape saturation, and a slow euphoric build toward a wordless choir.",
    );
    for (const text of texts) expect(text.length).toBeLessThanOrEqual(PREP_PROMPT_MAX);
  });

  it("an untouched example is recognised in any language, and words of the member's own are not", () => {
    for (const lang of langs) {
      expect(isExamplePrompt(examplePromptFor(lang))).toBe(true);
      expect(isExamplePrompt(examplePromptFor(lang) + " plus my own idea")).toBe(false);
    }
    expect(isExamplePrompt("")).toBe(false);
    expect(isExamplePrompt("A tender highlife about rain")).toBe(false);
  });

  it("the studio page shows no fixed figure and no demonstration project of its own", () => {
    const page = readFileSync("src/routes/_app.studio.tsx", "utf8");
    expect(page).not.toMatch(/value="\d+"/);
    expect(page).not.toContain("@/data/mock");
    expect(page).not.toContain("miniTracks");
    expect(page).not.toContain("miniVoices");
  });

  it("the old figures keys are gone from every language", () => {
    for (const lang of langs) {
      for (const key of ["studio.miniTracks", "studio.miniVoices", "studio.yourDrafts"]) {
        expect(t(lang, key), `${lang} ${key}`).toBe(key);
      }
    }
  });
});

describe("the idle status of the studio does not promise a generation that is not available", () => {
  const prepare: Record<Lang, RegExp> = {
    fr: /Préparez votre création/,
    en: /Prepare your creation/,
    es: /Prepara tu creación/,
    zh: /准备创作/,
    pt: /Prepare sua criação/,
    ar: /تحضير عملك/,
  };
  const notYet: Record<Lang, RegExp> = {
    fr: /n'est pas encore disponible/,
    en: /is not available yet/,
    es: /aún no está disponible/,
    zh: /尚未开放/,
    pt: /ainda não está disponível/,
    ar: /غير متاح بعد/,
  };
  const claimsSecurity: Record<Lang, RegExp> = {
    fr: /sécuris/i,
    en: /secure/i,
    es: /segura/i,
    zh: /安全/,
    pt: /segura/i,
    ar: /آمن/,
  };

  it.each(langs)("%s: says that the creation can be prepared and that AI generation is not available yet", (lang) => {
    const ready = t(lang, "studio.gen.ready");
    expect(ready).toMatch(prepare[lang]);
    expect(ready).toMatch(notYet[lang]);
  });

  it.each(langs)("%s: no longer presents the generation as secure, ready or connected", (lang) => {
    expect(t(lang, "studio.gen.ready")).not.toMatch(claimsSecurity[lang]);
  });

  it.each(langs)("%s: keeps the mention of the synthetic voice", (lang) => {
    const synthetic: Record<Lang, RegExp> = {
      fr: /voix de synthèse/,
      en: /synthetic voice/,
      es: /voz sintética/,
      zh: /合成人声/,
      pt: /voz sintética/,
      ar: /بصوت اصطناعي/,
    };
    expect(t(lang, "studio.gen.ready")).toMatch(synthetic[lang]);
  });
});
