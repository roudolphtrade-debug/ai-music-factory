// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/context";
import { translate } from "@/i18n/translations";
import { STUDIO_VOICES } from "@/studio/options";
import { StudioFigures } from "./StudioFigures";

const store = vi.hoisted(() => ({ drafts: [] as { id: string }[], ready: true }));
vi.mock("@/library/draftsContext", () => ({
  useGeneratedDrafts: () => ({ drafts: store.drafts, ready: store.ready }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  store.drafts = [];
  store.ready = true;
});

const mount = () =>
  render(
    <LanguageProvider>
      <StudioFigures />
    </LanguageProvider>,
  );
const drafts = () => screen.getByTestId("figure-drafts").textContent;
const voices = () => screen.getByTestId("figure-voices").textContent;

describe("the figures beside the studio form are real", () => {
  it("counts the tracks this account really has on this device", () => {
    store.drafts = [{ id: "a" }, { id: "b" }, { id: "c" }];
    mount();
    expect(drafts()).toBe("3");
  });

  it("shows zero when there is nothing, never an invented number", () => {
    mount();
    expect(drafts()).toBe("0");
  });

  it("does not pretend to know the count before the store has answered", () => {
    store.ready = false;
    store.drafts = [{ id: "a" }];
    mount();
    expect(drafts()).toBe("…");
  });

  it("counts the voice choices the form really offers", () => {
    mount();
    expect(voices()).toBe(String(STUDIO_VOICES.length));
  });

  it("follows the data: one more track, one more on the figure", () => {
    store.drafts = [{ id: "a" }];
    const view = mount();
    expect(drafts()).toBe("1");
    view.unmount();
    store.drafts = [{ id: "a" }, { id: "b" }];
    mount();
    expect(drafts()).toBe("2");
  });

  it("the old fixed figures are gone for good", () => {
    store.drafts = [{ id: "a" }];
    mount();
    expect(drafts()).not.toBe("42");
    expect(voices()).not.toBe("6");
  });

  it.each(["fr", "en", "es", "zh", "pt", "ar"] as const)(
    "%s: both labels exist in that language and say what is counted",
    (lang) => {
      localStorage.setItem("afm-lang", lang);
      mount();
      for (const key of ["studio.statDrafts", "studio.statVoices"]) {
        const text = translate(lang, key);
        expect(text).not.toBe(key);
        if (lang !== "en") expect(text).not.toBe(translate("en", key));
      }
    },
  );
});
