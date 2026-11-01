// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { LanguageProvider } from "@/i18n/context";
import { LANGS, translate, type Lang } from "@/i18n/translations";
import { CreditsProvider } from "@/library/CreditsProvider";
import { NotificationsProvider } from "@/library/NotificationsProvider";
import { makeEntry } from "@/library/credits";
import { Route } from "./_app.credits";

const Page = (Route as unknown as { options: { component: ComponentType } }).options.component;
const langs = LANGS.map((l) => l.code);
const tr = (lang: Lang, key: string, vars?: Record<string, string | number>) =>
  translate(lang, key, vars);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-21T10:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount(lang: Lang = "fr") {
  localStorage.setItem("afm-lang", lang);
  return render(
    <LanguageProvider>
      <NotificationsProvider>
        <CreditsProvider>
          <Page />
        </CreditsProvider>
      </NotificationsProvider>
    </LanguageProvider>,
  );
}

describe("Credits page · no payment, no subscription", () => {
  it("has no field at all: no card number, name, expiry or CVC", () => {
    const { container } = mount();
    expect(container.querySelectorAll("input, textarea, select, form")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(container.querySelector("[autocomplete]")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows no subscription offer, no plan price and no way to choose a plan", () => {
    for (const lang of ["fr", "en"] as const) {
      cleanup();
      const { container } = mount(lang);
      const text = container.textContent ?? "";
      expect(text, lang).not.toMatch(/\$\s?\d/); // no $19, $79, $5
      expect(text, lang).not.toContain(tr(lang, "credits.plansTitle"));
      expect(text, lang).not.toContain(tr(lang, "credits.choosePlan"));
      expect(text, lang).not.toContain(tr(lang, "credits.currentPlan"));
      expect(text, lang).not.toContain(tr(lang, "credits.popular"));
      // No plan card: no heading carries a plan name, and no "N credits / month" plan line remains.
      for (const plan of ["free", "studio", "label"]) {
        const name = tr(lang, `credits.plans.${plan}.name`);
        expect(screen.queryByRole("heading", { name }), `${lang}:${plan}`).toBeNull();
      }
      expect(text, lang).not.toContain(tr(lang, "credits.perMonth", { n: 20 }));
      expect(text, lang).not.toContain(tr(lang, "credits.perks.studio2"));
      expect(text, lang).not.toMatch(/250|1\s?200/); // the old Studio and Label allowances
    }
  });

  it("states that payments are unavailable and that no card is requested, exactly", () => {
    mount("fr");
    const note = screen.getByRole("note");
    expect(note.textContent).toBe(
      "Les paiements ne sont pas encore disponibles. Aucune carte n'est demandée.",
    );
    cleanup();
    mount("en");
    expect(screen.getByRole("note").textContent).toBe(
      "Payments are not available yet. No card is requested.",
    );
  });

  it("presents a local demo counter, not a real monthly allocation", () => {
    mount("fr");
    expect(
      screen.getByRole("heading", { name: "Compteur de démonstration, sans allocation réelle" }),
    ).toBeTruthy();
    expect(screen.getByText(/affiche 20 crédits par mois à titre d'exemple/)).toBeTruthy();
    expect(screen.getByText(/Aucun crédit réel n'est attribué automatiquement/)).toBeTruthy();
    expect(screen.getByText("Compteur de démo, par mois")).toBeTruthy();
  });

  it("does not turn 20 credits into a number of free tracks", () => {
    for (const lang of langs) {
      cleanup();
      const { container } = mount(lang);
      const offer = within(container).getByRole("heading", {
        name: tr(lang, "credits.freeOfferTitle"),
      }).parentElement!;
      expect(offer.textContent, lang).not.toMatch(/\b(10|dix|ten|diez|dez)\b|十|عشر/i);
    }
  });

  it("keeps the three packs, each with a disabled 'coming soon' button tied to the notice", () => {
    mount("fr");
    const note = screen.getByRole("note");
    const buttons = screen.getAllByRole("button", { name: /Bientôt disponible/ });
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
      expect(button.textContent).toBe("Bientôt disponible");
      expect(button.getAttribute("aria-describedby")).toBe(note.id);
      // The accessible name starts with the visible label (WCAG 2.5.3) and names the pack.
      expect(button.getAttribute("aria-label")).toMatch(/^Bientôt disponible : pack de \d+/);
    }
    expect(note.id).not.toBe("");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Bientôt disponible : pack de 50 crédits",
      "Bientôt disponible : pack de 170 crédits",
      "Bientôt disponible : pack de 620 crédits",
    ]);
    expect(screen.queryByRole("button", { name: /Acheter|Choisir|Payer/i })).toBeNull();
  });

  it("changes nothing and notifies nothing when the pack buttons are clicked", () => {
    const wallet = {
      balance: 42,
      plan: "free",
      lastGrant: "2026-10",
      ledger: [makeEntry(-5, "credits.ledger.spentTrack")],
    };
    localStorage.setItem("afm-credits", JSON.stringify(wallet));
    mount("fr");
    for (const button of screen.getAllByRole("button", { name: /Bientôt disponible/ })) {
      fireEvent.click(button);
    }
    expect(JSON.parse(localStorage.getItem("afm-credits")!)).toEqual(wallet);
    expect(localStorage.getItem("afm-notifications")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Paiement confirmé|Payment confirmed/);
  });

  it("shows the balance of an old wallet saved on a simulated plan, plus the 20 monthly credits", () => {
    localStorage.setItem(
      "afm-credits",
      JSON.stringify({
        balance: 500,
        plan: "label",
        lastGrant: "2026-09",
        ledger: [makeEntry(1200, "credits.ledger.subscribed")],
      }),
    );
    const { container } = mount("en");
    expect(container.textContent).toContain("520");
    expect(container.textContent).not.toContain("1,700");
    // The old history is still listed.
    expect(container.textContent).toContain(tr("en", "credits.ledger.subscribed"));
    expect(container.textContent).toContain(tr("en", "credits.ledger.monthly"));
  });
});

describe("Credits page · nothing falls back to English", () => {
  const reasons = [
    "welcome",
    "monthly",
    "subscribed",
    "pack",
    "spentTrack",
    "spentVoice",
    "spentTranscribe",
  ];

  it.each(["zh", "pt", "ar"] as const)(
    "%s shows its own text for the 14 former fallbacks",
    (lang) => {
      localStorage.setItem(
        "afm-credits",
        JSON.stringify({
          balance: 50,
          plan: "free",
          lastGrant: "2026-10",
          ledger: reasons.map((r) =>
            makeEntry(r.startsWith("spent") ? -1 : 5, `credits.ledger.${r}`),
          ),
        }),
      );
      const { container } = mount(lang);
      const text = container.textContent ?? "";
      for (const key of [
        "credits.costTrack",
        "credits.costVoice",
        "credits.packsEyebrow",
        "credits.packsTitle",
        "credits.ledgerEyebrow",
        "credits.ledgerTitle",
        ...reasons.map((r) => `credits.ledger.${r}`),
      ]) {
        expect(text, `${lang}:${key}`).toContain(tr(lang, key));
        expect(tr(lang, key), `${lang}:${key}`).not.toBe(tr("en", key));
      }
    },
  );

  it.each(["zh", "pt", "ar"] as const)("%s shows its empty-history text", (lang) => {
    localStorage.setItem(
      "afm-credits",
      JSON.stringify({ balance: 5, plan: "free", lastGrant: "2026-10", ledger: [] }),
    );
    const { container } = mount(lang);
    expect(container.textContent).toContain(tr(lang, "credits.ledgerEmpty"));
    expect(tr(lang, "credits.ledgerEmpty")).not.toBe(tr("en", "credits.ledgerEmpty"));
  });
});

describe("Credits page · six languages and right-to-left", () => {
  it.each(langs)("%s shows its own texts and no untranslated key", (lang) => {
    const { container } = mount(lang);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\b(credits|aiErrors|notif|payment)\.[a-zA-Z]+/);
    expect(screen.getByRole("note").textContent).toBe(tr(lang, "credits.paymentsUnavailable"));
    expect(screen.getByRole("heading", { name: tr(lang, "credits.freeOfferTitle") })).toBeTruthy();
    const buttons = screen.getAllByRole("button", {
      name: new RegExp(tr(lang, "credits.comingSoon")),
    });
    expect(buttons).toHaveLength(3);
    for (const b of buttons) expect((b as HTMLButtonElement).disabled).toBe(true);
    expect(document.documentElement.lang).toBe(lang);
    expect(document.documentElement.dir).toBe(lang === "ar" ? "rtl" : "ltr");
  });

  it("uses the same wording for the notice and the button in every language, never English by default", () => {
    for (const lang of langs.filter((l) => l !== "en")) {
      expect(tr(lang, "credits.paymentsUnavailable"), lang).not.toBe(
        tr("en", "credits.paymentsUnavailable"),
      );
      expect(tr(lang, "credits.comingSoon"), lang).not.toBe(tr("en", "credits.comingSoon"));
    }
  });
});

describe("Credits page · layout fixes found at the local recette", () => {
  it("lets the heading wrap under 640 px so the balance box never pushes the page wider", () => {
    const { container } = mount("es");
    // The balance box is the heading's action; its row may wrap on narrow screens.
    const row = container.querySelector("h2")?.closest("div.flex");
    expect(row?.className).toContain("max-sm:flex-wrap");
    expect(row?.className).toContain("justify-between");
  });

  it.each(langs)("%s: signed amounts are isolated left to right", (lang) => {
    localStorage.setItem(
      "afm-credits",
      JSON.stringify({
        balance: 50,
        plan: "free",
        lastGrant: "2026-10",
        ledger: [
          makeEntry(20, "credits.ledger.monthly"),
          makeEntry(-5, "credits.ledger.spentTrack"),
        ],
      }),
    );
    const { container } = mount(lang);
    const signed = [...container.querySelectorAll("span.font-mono")].filter((el) =>
      /^[+-]\d/.test(el.textContent ?? ""),
    );
    expect(signed.map((el) => el.textContent)).toEqual(["+20", "-5"]);
    for (const el of signed) expect(el.getAttribute("dir"), lang).toBe("ltr");
    // The pack bonuses (+20, +120) are isolated too, inside a span that keeps the page direction
    // so that its margin stays on the side facing the figure.
    const bonuses = [...container.querySelectorAll("span.ms-2 > bdi")];
    expect(bonuses.map((el) => el.textContent)).toEqual(["+20", "+120"]);
    for (const el of bonuses) {
      expect(el.getAttribute("dir"), lang).toBe("ltr");
      expect(el.parentElement?.getAttribute("dir")).toBeNull();
    }
  });

  it("does not turn the page itself left to right: only the amounts are isolated", () => {
    const { container } = mount("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(container.firstElementChild?.getAttribute("dir")).toBeNull();
  });
});

describe("Credits page · the history is shown as fictional demo operations", () => {
  it.each(langs)(
    "%s: the first visit lists the +20 line as a demo, not as real credits",
    (lang) => {
      const { container } = mount(lang);
      const welcome = tr(lang, "credits.ledger.welcome");
      expect(container.textContent).toContain(welcome);
      expect(welcome).toMatch(/^(Démo|Demo|演示|عرض تجريبي)/);
      expect(container.textContent).not.toMatch(
        /Crédits de bienvenue|Welcome credits|Créditos de bienvenida|欢迎积分|boas-vindas|أرصدة الترحيب/,
      );
    },
  );
});
