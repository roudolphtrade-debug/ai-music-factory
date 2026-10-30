// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/context";
import { translate, LANGS, type Lang } from "@/i18n/translations";
import { projects } from "@/data/mock";
import { StudioExamples } from "./StudioExamples";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const mount = (lang: Lang = "en") => {
  localStorage.setItem("afm-lang", lang);
  return render(
    <LanguageProvider>
      <StudioExamples />
    </LanguageProvider>,
  );
};
const cards = () => Array.from(document.querySelectorAll<HTMLElement>("[data-example]"));

describe("the demonstration projects are named as examples, not shown as the member's creations", () => {
  it("every card carries the example badge, and there is one card per demonstration project", () => {
    mount();
    expect(cards()).toHaveLength(projects.length);
    for (const card of cards()) {
      expect(within(card).getByText(translate("en", "studio.examples.badge"))).toBeTruthy();
    }
  });

  it("the section says that these are not the member's creations", () => {
    mount();
    expect(screen.getByText(translate("en", "studio.examples.desc"))).toBeTruthy();
    expect(screen.getByRole("region", { name: translate("en", "studio.examples.title") })).toBeTruthy();
  });

  it("the old personal heading is gone: the section no longer presents itself as the member's drafts", () => {
    mount();
    expect(document.body.textContent).not.toContain("Your drafts");
  });

  it("no invented history: no status, no date, no version or stem count", () => {
    mount();
    const text = document.body.textContent ?? "";
    for (const status of ["Published", "Mastering", "Review", "Draft"]) {
      expect(text).not.toContain(status);
    }
    expect(text).not.toMatch(/updated|\bago\b|yesterday|\d+ versions|\d+ stems/i);
  });

  it("nothing to play, open or edit: the examples have no audio and no action", () => {
    mount();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(document.querySelector("audio")).toBeNull();
  });

  it("no dash in what is shown", () => {
    mount();
    expect(document.body.textContent).not.toContain("—");
  });

  it.each(LANGS.map((l) => l.code))("%s: the heading and the badge exist in that language", async (lang) => {
    mount(lang);
    await waitFor(() => expect(screen.getByText(translate(lang, "studio.examples.title"))).toBeTruthy());
    for (const key of ["eyebrow", "title", "desc", "badge"]) {
      const k = `studio.examples.${key}`;
      expect(translate(lang, k)).not.toBe(k);
      if (lang !== "en") expect(translate(lang, k)).not.toBe(translate("en", k));
    }
    expect(within(cards()[0]).getByText(translate(lang, "studio.examples.badge"))).toBeTruthy();
  });
});
