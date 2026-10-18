// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/context";
import { LanguageSelector } from "./LanguageSelector";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

function mount() {
  return render(<LanguageProvider><LanguageSelector /></LanguageProvider>);
}
function open() {
  fireEvent.keyDown(screen.getByTestId("language-selector"), { key: "Enter" });
}

describe("global language selection", () => {
  it.each(["fr", "en", "es", "zh", "pt", "ar"])("selects and restores %s without changing storage identifiers", (code) => {
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
    expect(screen.getAllByRole("menuitemradio").filter((item) => item.getAttribute("aria-checked") === "true")).toHaveLength(1);
    expect(screen.getAllByRole("menuitemradio")[index].getAttribute("aria-checked")).toBe("true");
  });

  it("closing with Escape does not change the persisted choice", () => {
    localStorage.setItem("afm-lang", "pt");
    mount();
    open();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(localStorage.getItem("afm-lang")).toBe("pt");
  });
});