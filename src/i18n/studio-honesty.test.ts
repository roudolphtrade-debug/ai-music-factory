import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { authCopy } from "./auth";
import { LANGS, translate, translations, type Lang } from "./translations";
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

describe("lot A.3: the new texts exist in the six languages and keep their promises", () => {
  const keys = [
    "studio.gen.saveFailed",
    "studio.gen.pausedNoticeUnsaved",
    "studio.gen.signInFirstUnsaved",
    "studio.gen.accountsOffUnsaved",
    "studio.gen.prepSaved",
    "studio.gen.prepClearTitle",
    "studio.gen.prepClearWarning",
    "studio.gen.prepClearConfirm",
    "studio.gen.deleteDraftTitle",
    "studio.gen.deleteDraftWarning",
    "studio.gen.deleteDraftConfirm",
    "studio.gen.loadFailed",
    "studio.gen.prepExpiry",
    "studio.uploadTitle",
    "studio.uploadDesc",
    "studio.browseFiles",
    "studio.uploadSoon",
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

  const kept: Record<Lang, RegExp> = {
    fr: /conservée/,
    en: /is kept/,
    es: /se conserva/,
    zh: /已保留/,
    pt: /foi mantida/,
    ar: /محفوظ/,
  };
  it.each(langs)("%s: a text for a preparation that was not saved never says it is kept", (lang) => {
    for (const key of [
      "studio.gen.saveFailed",
      "studio.gen.pausedNoticeUnsaved",
      "studio.gen.signInFirstUnsaved",
      "studio.gen.accountsOffUnsaved",
    ]) {
      expect(t(lang, key), `${lang} ${key}`).not.toMatch(kept[lang]);
    }
  });

  it.each(langs)("%s: the texts that carry the usual message are still there beside the unsaved ones", (lang) => {
    expect(t(lang, "studio.gen.pausedNotice")).toMatch(kept[lang]);
    expect(t(lang, "studio.gen.signInFirst")).toMatch(kept[lang]);
  });

  it.each(langs)("%s: the seven days are written with their number", (lang) => {
    expect(t(lang, "studio.gen.prepExpiry")).toMatch(/7/);
  });

  const INVITATION: Record<Lang, RegExp> = {
    fr: /\b(générez|générer|lancez|lancer)\b/i,
    en: /\b(generate|start the generation|launch)\b/i,
    es: /\b(genera|generar|inicia la generación|iniciar la generación)\b/i,
    zh: /开始生成|再生成|请生成|在上方生成/,
    pt: /\b(gere|gerar|inicie a geração|iniciar a geração)\b/i,
    ar: /(^|\s)ولّد(\s|$)|للتوليد|ابدأ التوليد/,
  };
  it.each(langs)("%s: none of the new messages invites to generate", (lang) => {
    for (const key of keys) {
      if (key === "studio.gen.pausedNoticeUnsaved") continue; // it says that generation is unavailable
      expect(t(lang, key), `${lang} ${key}`).not.toMatch(INVITATION[lang]);
    }
  });

  it.each(langs)("%s: the upload zone says that the import is not available yet", (lang) => {
    const notYet: Record<Lang, RegExp> = {
      fr: /pas encore disponible/,
      en: /not available yet/,
      es: /aún no está disponible/,
      zh: /尚未开放/,
      pt: /ainda não está disponível/,
      ar: /غير متاح بعد/,
    };
    expect(t(lang, "studio.uploadDesc")).toMatch(notYet[lang]);
  });

  it("the old note and the old promise of a drop are gone from every language", () => {
    for (const lang of langs) {
      expect(t(lang, "studio.engineNote"), `${lang} engineNote`).toBe("studio.engineNote");
      expect(t(lang, "studio.uploadDesc"), `${lang} uploadDesc`).not.toMatch(/glissez|drag|arrastra|拖|arraste|اسحب/i);
    }
  });
});

describe("lot A.3: what the studio page shows is written in each language, not borrowed from English", () => {
  // translate() falls back to English for a missing key, which hides the gap: look in the language's own text.
  const own = (lang: Lang, key: string) =>
    key.split(".").reduce<unknown>(
      (acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined),
      translations[lang],
    );
  const visible = [
    "studio.newComposition",
    "studio.saveDraft",
    "studio.voice",
    "studio.voices.Warm tenor",
    "studio.voices.Soprano",
    "studio.voices.Alto",
    "studio.gen.duration",
    "studio.gen.durationUnknown",
    "studio.gen.newTrack",
    "studio.uploadTitle",
    "studio.uploadDesc",
    "studio.browseFiles",
    "studio.uploadSoon",
  ];

  it.each(langs)("%s: every text of the studio page exists in its own language", (lang) => {
    for (const key of visible) {
      expect(typeof own(lang, key), `${lang} ${key}`).toBe("string");
    }
  });

  it.each(langs.filter((l) => l !== "en"))("%s: the Save draft button and the new-composition label are not the English ones", (lang) => {
    for (const key of ["studio.saveDraft", "studio.newComposition"]) {
      expect(own(lang, key), `${lang} ${key}`).not.toBe(own("en", key));
    }
  });
});

// ------------------------------------------------------------------ lot P0
describe("lot P0: the studio does not claim mastering, singing registers or retired choices", () => {
  const MASTERING: Record<Lang, RegExp> = {
    fr: /master/i,
    en: /master/i,
    es: /master/i,
    zh: /母带/,
    pt: /master/i,
    ar: /ماستر|امستر/,
  };
  // A singing register promises a sung voice; the speech service reads the lyrics.
  const REGISTER: Record<Lang, RegExp> = {
    fr: /t[ée]nor|soprano|alto/i,
    en: /tenor|soprano|alto/i,
    es: /tenor|soprano|contralto/i,
    zh: /男高音|女高音|女低音/,
    pt: /tenor|soprano|contralto/i,
    ar: /تينور|سوبرانو|ألتو/,
  };

  it.each(langs)("%s: neither the description of the studio nor its progress mentions mastering", (lang) => {
    expect(t(lang, "studio.desc")).not.toMatch(MASTERING[lang]);
    expect(t(lang, "studio.gen.phases")).not.toMatch(MASTERING[lang]);
  });

  it.each(langs)("%s: the progress has three real steps, each written in the language", (lang) => {
    const steps = t(lang, "studio.gen.phases").split("|");
    expect(steps).toHaveLength(3);
    for (const step of steps) expect(step.trim().length).toBeGreaterThan(3);
    if (lang !== "en") expect(t(lang, "studio.gen.phases")).not.toBe(t("en", "studio.gen.phases"));
  });

  it.each(langs)("%s: the voices are named by timbre, the field says they are synthetic", (lang) => {
    for (const voice of ["Warm tenor", "Soprano", "Alto"]) {
      expect(t(lang, `studio.voices.${voice}`), `${lang} ${voice}`).not.toMatch(REGISTER[lang]);
    }
    const synthetic = { fr: /synth[eè]se/i, en: /synthetic/i, es: /sint[eé]tica/i, zh: /合成/, pt: /sint[eé]tica/i, ar: /اصطناعي/ }[lang];
    expect(t(lang, "studio.voice")).toMatch(synthetic);
    expect(t(lang, "studio.desc")).toMatch(synthetic);
  });

  it.each(langs)("%s: no text is left for the retired 'Instrumental' and 'Custom voice' choices", (lang) => {
    const voices = (translations[lang] as { studio: { voices: Record<string, string> } }).studio.voices;
    expect(Object.keys(voices).sort()).toEqual(["Alto", "Soprano", "Warm tenor"]);
  });

  it.each(langs)("%s: the length texts exist, fill their value and carry no dash", (lang) => {
    expect(translate(lang, "studio.gen.duration", { d: "1:23" })).toContain("1:23");
    for (const key of ["studio.gen.duration", "studio.gen.durationUnknown", "studio.desc", "studio.gen.phases"]) {
      expect(t(lang, key), `${lang} ${key}`).not.toContain("—");
    }
  });

  it("the page description given to search engines and previews says what the studio does", () => {
    const route = readFileSync("src/routes/_app.studio.tsx", "utf8");
    expect(route).not.toMatch(/master|publish|version/i);
    expect(route).toMatch(/synthetic voice/);
  });
});

describe("lot P0: where each part of a track is made", () => {
  const ONLINE: Record<Lang, RegExp> = {
    fr: /service en ligne/,
    en: /online service/,
    es: /servicio en l[ií]nea/,
    zh: /在线服务/,
    pt: /servi[cç]o online/,
    ar: /خدمة عبر الإنترنت/,
  };
  it.each(langs)("%s: the notice says the voice comes from an online service, not from the device", (lang) => {
    expect(t(lang, "studio.rightsNotice")).toMatch(ONLINE[lang]);
  });
});

// ------------------------------------------------------------------ PR #17, legal review
describe("no unconditional promise of ownership, exclusivity or copyright on AI-generated content", () => {
  // A provider not claiming ownership is not a guarantee of copyright protection nor of exclusivity: no text
  // of the site may promise either, in any language. Rights are said to depend on the law and provider terms.
  const PROMISE: Record<Lang, RegExp> = {
    fr: /vous (conservez|gardez|d[ée]tenez|poss[ée]dez)[^.]*droits|droits? exclusifs?|exclusivit[ée]|vous appartien(t|nent)|(enti[èe]re|pleine) propri[ée]t[ée]|prot[ée]g[ée]e?s? par le droit d'auteur|droit d'auteur automatique/i,
    en: /you (retain|keep|own|hold)[^.]*(rights|copyright|ownership)|exclusive (rights|ownership|license)|exclusively yours|you own (it|them|the|your|what|all)|(full|complete) ownership|automatic(ally)? copyright|copyright(ed)? automatically/i,
    es: /(conservas|mantienes|tienes|posees)[^.]*derechos|derechos? exclusivos?|exclusividad|te pertenece|(plena|total) propiedad|protegid[oa]s? por derechos de autor autom[áa]ticamente/i,
    zh: /你(保留|拥有|享有)|您(保留|拥有|享有)|独家|专有权|归你所有|归您所有|完全所有权|自动(享有|获得)版权/,
    pt: /(voc[êe] )?(mant[ée]m|conserva|det[ée]m|possui)[^.]*direitos|direitos? exclusivos?|exclusividade|pertence a voc[êe]|(plena|total) propriedade|direitos autorais autom[áa]ticos/i,
    ar: /تحتفظ بحقوق|تملك (حقوق|جميع)|حقوق حصرية|حصري|ملك لك|ملكية كاملة|حقوق النشر تلقائي/,
  };
  const DEPENDS: Record<Lang, RegExp> = {
    fr: /d[ée]pendent de la l[ée]gislation et des conditions des fournisseurs/,
    en: /depend on applicable law and provider terms/,
    es: /dependen de la legislaci[óo]n aplicable y de las condiciones de los proveedores/,
    zh: /取决于适用法律和服务提供商的条款/,
    pt: /dependem da legisla[çc][ãa]o aplic[áa]vel e dos termos dos fornecedores/,
    ar: /على القوانين المعمول بها وشروط مزوّدي الخدمة/,
  };
  const everyText = (node: unknown, out: string[] = []): string[] => {
    if (typeof node === "string") out.push(node);
    else if (Array.isArray(node)) node.forEach((n) => everyText(n, out));
    else if (node && typeof node === "object") Object.values(node).forEach((n) => everyText(n, out));
    return out;
  };

  it.each(langs)("%s: no text of the site promises rights, ownership, exclusivity or automatic copyright", (lang) => {
    const offending = [...everyText(translations[lang]), ...everyText(authCopy[lang])].filter((text) =>
      PROMISE[lang].test(text),
    );
    expect(offending).toEqual([]);
  });

  it.each(langs)("%s: the studio notice says that rights depend on the law and the providers' terms", (lang) => {
    expect(t(lang, "studio.rightsNotice")).toMatch(DEPENDS[lang]);
    expect(t(lang, "studio.rightsNotice")).not.toContain("—");
  });

  it("the guard catches the promises that were on the page before this review", () => {
    const before: Record<Lang, string> = {
      fr: "Vous conservez les droits sur ce que vous créez ici.",
      en: "You retain the rights to what you create here.",
      es: "Conservas los derechos sobre lo que creas aquí.",
      zh: "你保留对在此创作内容的权利。",
      pt: "Você mantém os direitos sobre o que cria aqui.",
      ar: "تحتفظ بحقوق ما تنشئه هنا.",
    };
    for (const lang of langs) expect(before[lang], lang).toMatch(PROMISE[lang]);
    expect("You own exclusive rights to every track.").toMatch(PROMISE.en);
    expect("Vos titres sont protégés par le droit d'auteur.").toMatch(PROMISE.fr);
  });
});
