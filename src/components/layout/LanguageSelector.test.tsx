// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/context";
import { LanguageSelector } from "./LanguageSelector";

// jsdom has no scrollIntoView, which Radix calls: stub it per test, then put things back.
const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: () => {},
  });
});
afterEach(() => {
  cleanup();
  if (originalScrollIntoView) {
    Object.defineProperty(Element.prototype, "scrollIntoView", originalScrollIntoView);
  } else {
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  }
});

function mount() {
  return render(
    <LanguageProvider>
      <LanguageSelector />
    </LanguageProvider>,
  );
}
function open() {
  fireEvent.keyDown(screen.getByTestId("language-selector"), { key: "Enter" });
}

describe("global language selection", () => {
  it.each(["fr", "en", "es", "zh", "pt", "ar"])(
    "selects and restores %s without changing storage identifiers",
    (code) => {
      const view = mount();
      open();
      const options = screen.getAllByRole("menuitemradio");
      expect(options).toHaveLength(6);
      const index = ["fr", "en", "es", "zh", "pt", "ar"].indexOf(code);
      fireEvent.click(options[index]);
      expect(localStorage.getItem("afm-lang")).toBe(code);
      expect(document.documentElement.lang).toBe(code);
      expect(document.documentElement.dir).toBe(code === "ar" ? "rtl" : "ltr");
      view.unmount();
      mount();
      expect(document.documentElement.lang).toBe(code);
      expect(document.documentElement.dir).toBe(code === "ar" ? "rtl" : "ltr");
      open();
      expect(
        screen
          .getAllByRole("menuitemradio")
          .filter((item) => item.getAttribute("aria-checked") === "true"),
      ).toHaveLength(1);
      expect(screen.getAllByRole("menuitemradio")[index].getAttribute("aria-checked")).toBe("true");
    },
  );

  it("closing with Escape does not change the persisted choice", () => {
    localStorage.setItem("afm-lang", "pt");
    mount();
    open();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(localStorage.getItem("afm-lang")).toBe("pt");
  });
});

describe("language selector button", () => {
  const nativeNames = {
    fr: "Français",
    en: "English",
    es: "Español",
    zh: "中文",
    pt: "Português (Brasil)",
    ar: "العربية",
  };

  it("has an accessible name that starts with its visible label and names the language", () => {
    for (const code of Object.keys(nativeNames) as (keyof typeof nativeNames)[]) {
      cleanup();
      localStorage.setItem("afm-lang", code);
      mount();
      const visible = screen.getByTestId("language-selector").textContent?.trim() ?? "";
      expect(visible, code).toBe(code.toUpperCase());
      expect(
        screen.getByRole("button", {
          name: (name) => name.startsWith(`${visible} `) && name.includes(nativeNames[code]),
        }),
        code,
      ).toBe(screen.getByTestId("language-selector"));
    }
  });

  it("gives the focus back to the button after Escape", async () => {
    mount();
    const button = screen.getByTestId("language-selector");
    button.focus();
    open();
    fireEvent.keyDown(await screen.findByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it("gives the focus back to the button after a language is chosen", async () => {
    mount();
    const button = screen.getByTestId("language-selector");
    button.focus();
    open();
    fireEvent.click((await screen.findAllByRole("menuitemradio"))[1]);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(button));
    expect(localStorage.getItem("afm-lang")).toBe("en");
  });
});
