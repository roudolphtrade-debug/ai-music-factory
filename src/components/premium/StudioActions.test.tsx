// @vitest-environment jsdom
// Lot A.3: the buttons of the studio page do what they say, or say that they cannot yet.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/context";
import { LANGS, translate, type Lang } from "@/i18n/translations";
import { NewTrackButton, StudioUploadZone } from "./StudioActions";

const scroll = vi.fn();
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("afm-lang", "en");
  Element.prototype.scrollIntoView = scroll;
  scroll.mockClear();
});
afterEach(() => cleanup());

const en = (key: string) => translate("en", key);
const inLanguage = (lang: Lang, node: React.ReactNode) => {
  localStorage.setItem("afm-lang", lang);
  return render(<LanguageProvider>{node}</LanguageProvider>);
};

describe("Create a track", () => {
  it("takes the member to the prompt: scrolls to it and puts the cursor in it", () => {
    inLanguage(
      "en",
      <>
        <NewTrackButton />
        <textarea id="studio-prompt" aria-label="prompt" />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: en("studio.createNew") }));
    expect(document.activeElement).toBe(document.getElementById("studio-prompt"));
    expect(scroll).toHaveBeenCalled();
  });

  it("changes nothing in what was written", () => {
    inLanguage(
      "en",
      <>
        <NewTrackButton />
        <textarea id="studio-prompt" aria-label="prompt" defaultValue="my words" />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: en("studio.createNew") }));
    expect((document.getElementById("studio-prompt") as HTMLTextAreaElement).value).toBe("my words");
  });

  it("does not fail when the prompt is not on the page, or cannot be edited yet", () => {
    inLanguage(
      "en",
      <>
        <NewTrackButton />
        <textarea id="studio-prompt" aria-label="prompt" disabled />
      </>,
    );
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: en("studio.createNew") })),
    ).not.toThrow();
    expect(document.activeElement).not.toBe(document.getElementById("studio-prompt"));
    cleanup();
    inLanguage("en", <NewTrackButton />);
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: en("studio.createNew") })),
    ).not.toThrow();
  });

  it("scrolls without animation when the member asked for less motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      addEventListener() {},
      removeEventListener() {},
    }));
    inLanguage(
      "en",
      <>
        <NewTrackButton />
        <textarea id="studio-prompt" aria-label="prompt" />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: en("studio.createNew") }));
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
    vi.unstubAllGlobals();
  });
});

describe("the audio import zone says that it is not available yet", () => {
  it("has a browse button that cannot be used, and says why", () => {
    inLanguage("en", <StudioUploadZone />);
    const browse = screen.getByRole("button", { name: en("studio.browseFiles") });
    expect(browse.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(en("studio.uploadSoon"))).toBeTruthy();
    expect(screen.getByText(en("studio.uploadDesc"))).toBeTruthy();
  });

  it("accepts nothing: no file field, no drop handling, nothing is sent", () => {
    inLanguage("en", <StudioUploadZone />);
    expect(document.querySelectorAll("input[type=file]")).toHaveLength(0);
    const zone = screen.getByTestId("upload-zone");
    const dropped = new Event("drop", { bubbles: true, cancelable: true });
    zone.dispatchEvent(dropped);
    expect(dropped.defaultPrevented).toBe(false); // the browser keeps its own behaviour: nothing is taken
  });

  it("makes no promise of a drop that would not work", () => {
    inLanguage("en", <StudioUploadZone />);
    expect(document.body.textContent).not.toMatch(/drag|glissez|drop here/i);
    expect(document.body.textContent).not.toContain("—");
  });

  it.each(LANGS.map((l) => l.code))("%s: every text of the zone exists in that language", (lang) => {
    for (const key of ["studio.uploadTitle", "studio.uploadDesc", "studio.browseFiles", "studio.uploadSoon"]) {
      const text = translate(lang, key);
      expect(text, `${lang} ${key}`).not.toBe(key);
      expect(text, `${lang} ${key}`).not.toContain("—");
      if (lang !== "en") expect(text, `${lang} ${key} is not English`).not.toBe(translate("en", key));
    }
  });
});
