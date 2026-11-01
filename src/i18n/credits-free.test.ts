import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LANGS, translate, translations, type Lang } from "./translations";

const KEYS = [
  "credits.giftMonthly",
  "credits.freeOfferTitle",
  "credits.freeOfferDesc",
  "credits.paymentsUnavailable",
  "credits.packsSoonDesc",
  "credits.comingSoon",
  "credits.comingSoonPack",
  "credits.title",
  "credits.desc",
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

describe("Credits page texts exist in the six languages", () => {
  it.each(KEYS)("%s is a non-empty string of its own in every language", (key) => {
    for (const lang of codes) {
      const value = own(lang, key);
      expect(typeof value, `${lang}:${key}`).toBe("string");
      expect((value as string).trim().length, `${lang}:${key}`).toBeGreaterThanOrEqual(2);
    }
    // The one-word title is legitimately the same in Spanish and Portuguese ("Créditos").
    if (key !== "credits.title") {
      expect(new Set(codes.map((lang) => own(lang, key))).size).toBe(codes.length);
    }
  });

  it("uses the requested wording for the notice, the free offer and the button", () => {
    expect(own("fr", "credits.paymentsUnavailable")).toBe(
      "Les paiements ne sont pas encore disponibles. Aucune carte n'est demandée.",
    );
    expect(own("fr", "credits.freeOfferTitle")).toBe(
      "Compteur de démonstration, sans allocation réelle",
    );
    expect(own("fr", "credits.comingSoon")).toBe("Bientôt disponible");
  });

  it("fills its placeholders and leaves none open", () => {
    for (const lang of codes) {
      expect(translate(lang, "credits.freeOfferDesc", { n: 20 }), lang).toContain("20");
      expect(translate(lang, "credits.comingSoonPack", { n: 170 }), lang).toContain("170");
      for (const key of KEYS) {
        const filled = translate(lang, key, { n: 20 });
        expect(filled, `${lang}:${key}`).not.toMatch(/[{}]/);
      }
    }
  });

  it("never promises real credits, a free offer or a subscription, in any language", () => {
    for (const lang of codes) {
      for (const key of [
        "credits.desc",
        "credits.giftMonthly",
        "credits.freeOfferTitle",
        "credits.freeOfferDesc",
      ]) {
        const text = own(lang, key) as string;
        expect(text, `${lang}:${key}`).not.toMatch(
          /offerts?|gratuit|abonnement|free|gift|gratis|grátis|oferta|免费|赠送|مجان|عرض مجاني/i,
        );
      }
    }
  });

  it("states no number of free tracks: the only figure is the credit amount given as a variable", () => {
    for (const lang of codes) {
      for (const key of [
        "credits.freeOfferTitle",
        "credits.freeOfferDesc",
        "credits.giftMonthly",
      ]) {
        expect(own(lang, key) as string, `${lang}:${key}`).not.toMatch(/\d/);
      }
    }
  });

  it("uses the right script for Chinese and Arabic", () => {
    for (const key of KEYS) {
      expect(own("zh", key)).toMatch(/[一-鿿]/);
      expect(own("ar", key)).toMatch(/[؀-ۿ]/);
    }
  });

  it("no longer talks about a subscription to choose in the page title and description", () => {
    for (const lang of codes) {
      expect(own(lang, "credits.title") as string, lang).not.toMatch(
        /abonnement|subscription|suscripci|assinatura|订阅|اشتراك/i,
      );
    }
  });

  it("keeps no em dash in the new texts", () => {
    for (const key of KEYS) for (const lang of codes) expect(own(lang, key)).not.toContain("—");
  });
});

describe("old data still reads", () => {
  it("keeps the ledger and notification texts that earlier simulated purchases refer to", () => {
    for (const lang of ["fr", "en"] as const) {
      for (const key of [
        "credits.ledger.subscribed",
        "credits.ledger.pack",
        "credits.ledger.monthly",
        "notif.paymentPlan",
        "notif.paymentPack",
      ]) {
        expect(translate(lang, key), `${lang}:${key}`).not.toBe(key);
      }
    }
  });
});

describe("the card form is gone", () => {
  const root = join(process.cwd(), "src");
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });
  }

  it("has no payment dictionary in any language", () => {
    for (const lang of codes) expect(own(lang, "payment"), lang).toBeUndefined();
  });

  it("has no PaymentDialog file and no source that refers to it or to the card texts", () => {
    expect(existsSync(join(root, "components/premium/PaymentDialog.tsx"))).toBe(false);
    const forbidden = [
      "PaymentDialog",
      "PaymentIntent",
      '"payment.',
      "`payment.",
      "cardNumber",
      ".buyPack",
      ".subscribe(",
    ];
    // One assertion at the end: thousands of expect() calls made this test slow under load.
    const offenders: string[] = [];
    for (const file of sources(root)) {
      if (file.endsWith("routeTree.gen.ts")) continue;
      const text = readFileSync(file, "utf8");
      for (const word of forbidden)
        if (text.includes(word)) offenders.push(`${file} mentions ${word}`);
    }
    expect(offenders).toEqual([]);
  });
});

// The texts of the Credits page that ZH, PT and AR used to show in English (they fell back to EN).
const PAGE_KEYS = [
  "credits.costTrack",
  "credits.costVoice",
  "credits.packsEyebrow",
  "credits.packsTitle",
  "credits.ledgerEyebrow",
  "credits.ledgerTitle",
  "credits.ledgerEmpty",
  "credits.ledger.welcome",
  "credits.ledger.monthly",
  "credits.ledger.subscribed",
  "credits.ledger.pack",
  "credits.ledger.spentTrack",
  "credits.ledger.spentVoice",
  "credits.ledger.spentTranscribe",
];

describe("Credits page · no text left to the English fallback", () => {
  it.each(PAGE_KEYS)("%s has its own text in all six languages", (key) => {
    for (const lang of codes) {
      expect(typeof own(lang, key), `${lang}:${key}`).toBe("string");
    }
  });

  it.each(PAGE_KEYS)("%s differs from English in ZH, PT and AR", (key) => {
    for (const lang of ["zh", "pt", "ar"] as const) {
      expect(own(lang, key), `${lang}:${key}`).not.toBe(own("en", key));
    }
  });

  it("uses the right script for Chinese and Arabic", () => {
    for (const key of PAGE_KEYS) {
      expect(own("zh", key)).toMatch(/[\u4e00-\u9fff]/);
      expect(own("ar", key)).toMatch(/[\u0600-\u06ff]/);
    }
  });

  it("keeps the translations that already existed", () => {
    expect(own("zh", "credits.balance")).toBe("积分余额");
    expect(own("pt", "credits.balance")).toBe("Saldo de créditos");
    expect(own("ar", "credits.creditsUnit")).toBe("أرصدة");
    expect(own("es", "credits.costTrack")).toBe("Coste por tema");
  });

  it("adds no dash and no open placeholder", () => {
    for (const key of PAGE_KEYS) {
      for (const lang of codes) {
        expect(own(lang, key) as string).not.toMatch(/—|[{}]/);
      }
    }
  });
});

describe("Credits history · every line is plainly a fictional demo operation", () => {
  const LEDGER = [
    "welcome",
    "monthly",
    "subscribed",
    "pack",
    "spentTrack",
    "spentVoice",
    "spentTranscribe",
  ];
  const DEMO = {
    fr: "Démo",
    en: "Demo",
    es: "Demo",
    zh: "演示",
    pt: "Demo",
    ar: "عرض تجريبي",
  } as const;
  const DISCLAIMER = {
    fr: /aucun|fictif|simulé/i,
    en: /no |fictional|simulated/i,
    es: /sin |ficticio|simulad/i,
    zh: /无|虚构|模拟/,
    pt: /sem |fictíci|simulad/i,
    ar: /دون|وهمي|محاكى|محاكاة/,
  } as const;
  it.each(LEDGER)(
    "credits.ledger.%s starts with the demo marker and denies any real effect",
    (key) => {
      for (const lang of codes) {
        const text = own(lang, `credits.ledger.${key}`) as string;
        expect(text.startsWith(DEMO[lang]), `${lang}:${key}`).toBe(true);
        expect(text, `${lang}:${key}`).toMatch(DISCLAIMER[lang]);
      }
    },
  );
  it("no longer says welcome credits or a plain monthly refill in French and English", () => {
    for (const key of LEDGER) {
      expect(own("fr", `credits.ledger.${key}`)).not.toMatch(
        /^(Crédits de bienvenue|Recharge mensuelle)/,
      );
      expect(own("en", `credits.ledger.${key}`)).not.toMatch(/^(Welcome credits|Monthly refill)/);
    }
  });
});
