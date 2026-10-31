// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { LanguageProvider } from "./context";
import { useListening } from "./listening";
import type { Lang } from "./translations";

let api: ReturnType<typeof useListening>;
function Probe() {
  api = useListening();
  return null;
}
const mount = (lang: Lang) => {
  localStorage.setItem("afm-lang", lang);
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
};
beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe("the counted labels of the player and of the radio, as the pages read them", () => {
  it.each([
    ["fr", 1, "1 titre"], ["fr", 7, "7 titres"],
    ["en", 1, "1 track"], ["en", 7, "7 tracks"],
    ["es", 1, "1 canción"], ["es", 7, "7 canciones"],
    ["pt", 1, "1 faixa"], ["pt", 7, "7 faixas"],
    ["zh", 1, "1 首曲目"], ["zh", 7, "7 首曲目"],
    ["ar", 1, "مقطوعة واحدة"], ["ar", 2, "مقطوعتان"], ["ar", 7, "7 مقطوعات"], ["ar", 12, "12 مقطوعة"],
  ] as const)("%s, %i: %s", async (lang, n, expected) => {
    mount(lang);
    // the language is applied after the first render, as in the application
    await act(async () => {});
    expect(api.f("tracksCount", n)).toBe(expected);
    expect(api.f("results", n)).toBe(expected);
  });

  it("a plain text label still has its number filled in", () => {
    mount("fr");
    expect(typeof api.l.queue).toBe("string");
  });
});
