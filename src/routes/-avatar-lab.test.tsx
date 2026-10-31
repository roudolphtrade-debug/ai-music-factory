// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/context";
import { LANGS, translate, type Lang } from "@/i18n/translations";
import { pageOf } from "@/test/authHarness";

vi.mock("@tanstack/react-router", async () => (await import("@/test/routerMock")).routerModule);

import { Route } from "./_app.avatar-lab";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

async function open(lang: Lang) {
  localStorage.setItem("afm-lang", lang);
  const Page = pageOf(Route);
  render(
    <LanguageProvider>
      <Page />
    </LanguageProvider>,
  );
  await waitFor(() => expect(screen.getByText(translate(lang, "avatarLab.title"))).toBeTruthy());
}

describe("the Avatar Lab sliders have a name that a screen reader can read", () => {
  it.each(LANGS.map((l) => l.code))("%s: each of the four sliders is named by the label shown next to it", async (lang) => {
    await open(lang);
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(4);
    const names = ["charisma", "futuristicEdge", "warmth", "auraIntensity"].map((k) => translate(lang, `avatarLab.${k}`));
    expect(sliders.map((s) => s.getAttribute("aria-label"))).toEqual(names);
  });

  it("the page is written in the language, in the six languages (title, description, the four labels)", async () => {
    for (const { code } of LANGS) {
      await open(code);
      for (const key of ["avatarLab.title", "avatarLab.desc", "avatarLab.generate", "avatarLab.persona"]) {
        expect(screen.getAllByText(translate(code, key)).length, `${code} ${key}`).toBeGreaterThan(0);
      }
      cleanup();
    }
  });
});
