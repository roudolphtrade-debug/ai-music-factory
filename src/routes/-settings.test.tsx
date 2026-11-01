// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { LanguageProvider } from "@/i18n/context";
import { AuthProvider } from "@/auth/AuthProvider";
import { authCopy } from "@/i18n/auth";
import { demoHonesty } from "@/i18n/demo-honesty";
import { LANGS, translate, translations, type Lang } from "@/i18n/translations";
import { ThemeProvider } from "@/theme/context";
import { makeProfile, makeSession, type FakeSupabase } from "@/test/fakeSupabase";
import { setUpAccounts } from "@/test/authHarness";
import type { AuthHolder } from "@/test/clientMock";

const holder = vi.hoisted(
  () => ({ fake: null, configured: false, startWithClient: true, snapshot: null }) as AuthHolder,
);
vi.mock("@tanstack/react-router", async () => (await import("@/test/routerMock")).routerModule);
vi.mock("@/integrations/supabase/client", async () =>
  (await import("@/test/clientMock")).clientModule(holder),
);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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

let fake: FakeSupabase;
beforeEach(() => {
  fake = setUpAccounts(holder);
  holder.configured = false; // the first groups below are about the page with accounts off
});
afterEach(cleanup);

function mount(lang: Lang) {
  localStorage.setItem("afm-lang", lang);
  return render(
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <Page />
        </AuthProvider>
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

  it("has dropped the tier badge text and the three plan texts from every dictionary", () => {
    for (const lang of langs) {
      const settings = translations[lang].settings as Record<string, unknown>;
      for (const key of ["platinumTier", "plan", "planDesc", "managePlan"])
        expect(settings[key], `${lang}.${key}`).toBeUndefined();
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
      "settings.discard",
      "settings.saveChanges",
    ]) {
      expect(text, `${lang}:${key}`).toContain(translate(lang, key));
    }
    // Genre, location and bio remain as the preview fields they were.
    expect(
      container.querySelectorAll("input[type=text], input:not([type]), textarea").length,
    ).toBeGreaterThanOrEqual(3);
    // The five on/off settings are buttons with aria-pressed.
    expect(container.querySelectorAll("button[aria-pressed]")).toHaveLength(5);
  });

  it("starts no payment notification and writes no wallet when it is opened", () => {
    mount("fr");
    expect(localStorage.getItem("afm-notifications")).toBeNull();
    expect(localStorage.getItem("afm-credits")).toBeNull();
  });
});

describe("Settings page · accounts not configured", () => {
  it.each(langs)(
    "%s no longer invents a profile: no 'Studio A', no handle, no avatar card",
    (lang) => {
      const { container } = mount(lang);
      const text = container.textContent ?? "";
      expect(text).not.toContain("Studio A");
      expect(text).not.toContain("studio-a");
      expect(container.querySelector("span.h-20.w-20")).toBeNull();
      expect(screen.queryByRole("link", { name: /sign in|connecter/i })).toBeNull();
    },
  );

  it("keeps the earlier notice that accounts are not there yet", () => {
    mount("fr");
    expect(screen.getByText(translate("fr", "settings.accountsTitle"))).toBeTruthy();
  });
});

describe("Settings page · a visitor, with accounts on", () => {
  beforeEach(() => {
    holder.configured = true;
  });

  it.each(langs)("%s invites the visitor to sign in instead of showing a profile", async (lang) => {
    mount(lang);
    const copy = authCopy[lang];
    expect(await screen.findByText(copy.settingsGuestTitle)).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.signIn }).getAttribute("href")).toContain(
      "/auth/sign-in",
    );
    expect(screen.getByRole("link", { name: copy.signUp }).getAttribute("href")).toBe(
      "/auth/sign-up",
    );
    expect(document.body.textContent).not.toContain("Studio A");
    expect(screen.getByText(copy.settingsNoticeTitle)).toBeTruthy();
  });

  it("remembers that the visitor came from Settings", async () => {
    mount("en");
    const link = await screen.findByRole("link", { name: "Sign in" });
    expect(link.getAttribute("href")).toContain("redirect=%2Fsettings");
  });
});

describe("Settings page · a signed-in member", () => {
  beforeEach(() => {
    holder.configured = true;
    fake.restore(makeSession("user-1", "amina@example.test"));
    fake.set("fetchProfile", {
      data: makeProfile({
        display_name: "Amina Okafor",
        handle: "amina_o",
        creator_roles: ["artist"],
      }),
      error: null,
    });
  });
  const inputs = () => [...document.querySelectorAll("input")];
  const field = (value: string) => inputs().find((i) => i.value === value);

  it.each(langs)("%s shows the real profile and no placeholder", async (lang) => {
    const { container } = mount(lang);
    await waitFor(() => expect(field("Amina Okafor")).toBeTruthy());
    expect(field("amina_o")).toBeTruthy();
    expect(field("amina@example.test")?.readOnly).toBe(true);
    expect(container.textContent).not.toContain("Studio A");
    expect(
      screen.getByRole("button", { name: authCopy[lang].roleArtist }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: authCopy[lang].roleLabel }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it.each(langs)("%s: the side card shows the member's initial, name and handle", async (lang) => {
    const { container } = mount(lang);
    await waitFor(() => expect(container.textContent).toContain("Amina Okafor"));
    expect(container.querySelector("span.h-20.w-20")?.textContent).toBe("A");
    expect(screen.getByRole("link", { name: authCopy[lang].avatarCta }).getAttribute("href")).toBe(
      "/avatar-lab",
    );
  });

  it.each(langs)(
    "%s: the handle is isolated left to right, in the card and in its field",
    async (lang) => {
      const { container } = mount(lang);
      await waitFor(() => expect(field("amina_o")).toBeTruthy());
      expect([...container.querySelectorAll("bdi[dir=ltr]")].map((e) => e.textContent)).toContain(
        "@amina_o",
      );
      expect(field("amina_o")?.getAttribute("dir")).toBe("ltr");
      expect(field("amina_o")?.className).toContain("rtl:text-right");
      // The name field follows the page direction.
      expect(field("Amina Okafor")?.getAttribute("dir")).toBeNull();
      expect(document.documentElement.dir).toBe(lang === "ar" ? "rtl" : "ltr");
    },
  );

  it("saves a change of name and roles to the member's own profile", async () => {
    mount("en");
    await waitFor(() => expect(field("Amina Okafor")).toBeTruthy());
    fireEvent.change(field("Amina Okafor")!, { target: { value: "Amina O." } });
    fireEvent.click(screen.getByRole("button", { name: "Label" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    await waitFor(() => expect(fake.profileQuery.update).toHaveBeenCalled());
    const [row] = fake.profileQuery.update.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(row).toMatchObject({
      display_name: "Amina O.",
      handle: "amina_o",
      creator_roles: ["artist", "label"],
    });
    expect("onboarding_completed_at" in row).toBe(false); // saving in Settings is not the welcome page
  });

  it("states what is real and what is still a preview", async () => {
    mount("en");
    expect(await screen.findByText(authCopy.en.settingsNoticeTitle)).toBeTruthy();
    expect(screen.getByText(authCopy.en.settingsNoticeDesc)).toBeTruthy();
  });
});

describe("Settings page · each fictional field value is marked and apart from the account", () => {
  it.each(langs)("%s: Afrobeats, Paris and the bio carry a demo badge and the notice", (lang) => {
    mount(lang);
    const demo = translate(lang, "nav.demo");
    const note = screen.getByText(demoHonesty[lang].demoProfile).parentElement!;
    expect(note.id).toBeTruthy();
    for (const value of ["Afrobeats", "Paris, FR", /Crafting cinematic/]) {
      const field = screen.getByDisplayValue(value);
      expect(field.getAttribute("aria-describedby")).toBe(note.id);
      const badge = within(field.closest("label")!).getByText(demo);
      expect(badge.getAttribute("title")).toBe(demoHonesty[lang].exampleField);
    }
  });
});
