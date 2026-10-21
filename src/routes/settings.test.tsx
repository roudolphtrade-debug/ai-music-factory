// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { LanguageProvider } from "@/i18n/context";
import { LANGS, translate, translations, type Lang } from "@/i18n/translations";
import { ThemeProvider } from "@/theme/context";
import { Route } from "./_app.settings";

const Page = (Route as unknown as { options: { component: ComponentType } }).options.component;
const langs = LANGS.map((l) => l.code);

// The wording the page used before the plan card was removed, in each language.
const REMOVED: Record<Lang, string[]> = {
  fr: ["Forfait", "Gérer le forfait", "Platine · stems illimités", "Niveau Platine"],
  en: ["Manage plan", "Platinum · unlimited stems", "Platinum tier"],
  es: ["Gestionar plan", "Platino · stems ilimitados", "Nivel Platino"],
  zh: ["管理订阅", "订阅方案", "白金 · 无限干声轨道", "白金等级"],
  pt: ["Gerenciar plano", "Platina · stems ilimitados", "Nível Platina"],
  ar: ["إدارة الخطة", "بلاتيني · مسارات غير محدودة", "المستوى البلاتيني"],
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function mount(lang: Lang) {
  localStorage.setItem("afm-lang", lang);
  return render(
    <LanguageProvider>
      <ThemeProvider>
        <Page />
      </ThemeProvider>
    </LanguageProvider>,
  );
}

describe("Settings page · the plan card and the tier badge are gone", () => {
  it.each(langs)("%s shows no plan, no Platinum plan text and no manage-plan button", (lang) => {
    const { container } = mount(lang);
    const text = container.textContent ?? "";
    for (const removed of REMOVED[lang]) expect(text, `${lang}: ${removed}`).not.toContain(removed);
    // "Plan"/"Forfait" must not survive as a button or a heading either.
    expect(
      screen.queryByRole("button", {
        name: /forfait|manage plan|gestionar plan|管理订阅|gerenciar plano|إدارة الخطة/i,
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: new RegExp(`^(${REMOVED[lang][0]})$`) }),
    ).toBeNull();
    expect(text).not.toMatch(/\bsettings\.[a-zA-Z]+/);
    // Nothing on the page claims a Platinum level, in any language.
    expect(text, lang).not.toMatch(/platin|白金|بلاتين/i);
  });

  it("has dropped the tier badge text from every dictionary", () => {
    for (const lang of langs) {
      const settings = translations[lang].settings as Record<string, unknown>;
      expect(settings.platinumTier, lang).toBeUndefined();
    }
  });

  it("has dropped the three plan texts from every dictionary", () => {
    for (const lang of langs) {
      const settings = translations[lang].settings as Record<string, unknown>;
      expect(settings.plan, lang).toBeUndefined();
      expect(settings.planDesc, lang).toBeUndefined();
      expect(settings.managePlan, lang).toBeUndefined();
    }
  });

  it.each(langs)("%s keeps the other settings and the page actions", (lang) => {
    const { container } = mount(lang);
    const text = container.textContent ?? "";
    for (const key of [
      "settings.studioProfile",
      "settings.preferences",
      "settings.battleInvites",
      "settings.lightMode",
      "settings.replayIntro",
      "settings.changeAvatar",
      "settings.discard",
      "settings.saveChanges",
    ]) {
      expect(text, `${lang}:${key}`).toContain(translate(lang, key));
    }
    // Four form fields plus the bio, as before.
    expect(
      container.querySelectorAll("input[type=text], input:not([type]), textarea").length,
    ).toBeGreaterThanOrEqual(5);
    // The five on/off settings are buttons with aria-pressed.
    expect(container.querySelectorAll("button[aria-pressed]")).toHaveLength(5);
  });

  it.each(langs)("%s keeps the rest of the profile card", (lang) => {
    const { container } = mount(lang);
    const text = container.textContent ?? "";
    expect(text).toContain("Studio A");
    expect(text).toContain("@studio-a");
    expect(
      screen.getByRole("button", { name: translate(lang, "settings.changeAvatar") }),
    ).toBeTruthy();
    // The monogram tile stays: the card still starts with the "A" avatar.
    expect(container.querySelector("span.h-20.w-20")?.textContent).toBe("A");
  });

  it("starts no payment notification and writes no wallet when it is opened", () => {
    mount("fr");
    expect(localStorage.getItem("afm-notifications")).toBeNull();
    expect(localStorage.getItem("afm-credits")).toBeNull();
  });
});
