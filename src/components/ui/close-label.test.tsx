// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/context";
import { LANGS, translate, type Lang } from "@/i18n/translations";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

const hidden = () =>
  Array.from(document.querySelectorAll(".sr-only")).map((e) => e.textContent?.trim());

const inDialog = (lang: Lang | null) => {
  if (lang) localStorage.setItem("afm-lang", lang);
  const tree = (
    <Dialog open>
      <DialogContent>
        <DialogTitle>t</DialogTitle>
        <DialogDescription>d</DialogDescription>
      </DialogContent>
    </Dialog>
  );
  return render(lang ? <LanguageProvider>{tree}</LanguageProvider> : tree);
};
const inSheet = (lang: Lang | null) => {
  if (lang) localStorage.setItem("afm-lang", lang);
  const tree = (
    <Sheet open>
      <SheetContent>
        <SheetTitle>t</SheetTitle>
        <SheetDescription>d</SheetDescription>
      </SheetContent>
    </Sheet>
  );
  return render(lang ? <LanguageProvider>{tree}</LanguageProvider> : tree);
};

describe("the hidden label of the close button is read in the language of the interface", () => {
  it.each(LANGS.map((l) => l.code))("%s: dialog and sheet", async (lang) => {
    inDialog(lang);
    await waitFor(() => expect(hidden()).toContain(translate(lang, "common.close")));
    cleanup();
    inSheet(lang);
    await waitFor(() => expect(hidden()).toContain(translate(lang, "common.close")));
    if (lang !== "en") expect(hidden()).not.toContain("Close");
  });

  it("without any language provider (a bare test, a library use) it still says Close and does not fail", () => {
    expect(() => inDialog(null)).not.toThrow();
    expect(hidden()).toContain("Close");
    cleanup();
    expect(() => inSheet(null)).not.toThrow();
    expect(hidden()).toContain("Close");
  });
});
