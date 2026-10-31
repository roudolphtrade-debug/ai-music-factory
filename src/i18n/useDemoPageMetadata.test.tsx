// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider, useI18n } from "./context";
import { LANGS } from "./translations";
import { demoPageHead, demoDetails, type DemoPage } from "./demo-details";
import { useDemoPageMetadata } from "./useDemoPageMetadata";

function Page({ page }: { page: DemoPage }) {
  useDemoPageMetadata(page);
  const { setLang } = useI18n();
  return (
    <>
      {LANGS.map(({ code }) => (
        <button key={code} onClick={() => setLang(code)}>
          {code}
        </button>
      ))}
    </>
  );
}
afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
  localStorage.clear();
});
for (const page of ["artists", "artist", "labels", "label", "community"] as const) {
  it(`${page}: updates existing title and share descriptions on language changes, then restores them`, () => {
    document.title = "Original";
    for (const meta of demoPageHead(page).meta) {
      if (!meta.content) continue;
      const element = document.createElement("meta");
      element.setAttribute(meta.property ? "property" : "name", meta.property ?? meta.name!);
      element.content = meta.content;
      document.head.appendChild(element);
    }
    const before = document.head.innerHTML;
    const { unmount } = render(
      <LanguageProvider>
        <Page page={page} />
      </LanguageProvider>,
    );
    for (const { code } of LANGS) {
      fireEvent.click(screen.getByRole("button", { name: code }));
      expect(document.title).toBe(`${demoDetails[code].pages[page].title} · AI Music Factory`);
      for (const selector of [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
      ]) {
        expect(document.head.querySelectorAll(selector)).toHaveLength(1);
        expect(document.head.querySelector(selector)?.getAttribute("content")).toBe(
          demoDetails[code].pages[page].description,
        );
      }
    }
    unmount();
    expect(document.head.innerHTML).toBe(before);
  });
}
it("does not overwrite metadata already changed by navigation", () => {
  document.title = "Original";
  const { unmount } = render(
    <LanguageProvider>
      <Page page="artist" />
    </LanguageProvider>,
  );
  document.title = "Next route";
  unmount();
  expect(document.title).toBe("Next route");
});
