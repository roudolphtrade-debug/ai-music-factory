// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { LikeButton } from "./LikeButton";
import { translate } from "@/i18n/translations";
import { AllProviders } from "@/test/providers";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const added = translate("fr", "library.added");
const removed = translate("fr", "library.removed");
const stored = () => JSON.parse(window.localStorage.getItem("afm-favorites") ?? "null");

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("afm-lang", "fr");
  vi.mocked(toast.success).mockClear();
});
afterEach(() => cleanup());

async function renderButton(trackId: string) {
  render(
    <AllProviders>
      <LikeButton trackId={trackId} />
    </AllProviders>,
  );
  await act(async () => {}); // providers hydrate from storage in an effect
  return screen.getByRole("button");
}

const messages = () => vi.mocked(toast.success).mock.calls.map(([message]) => message);

describe("LikeButton notifications", () => {
  it("says what really happened, click after click", async () => {
    const button = await renderButton("t-1");
    const expected: string[] = [];
    for (let i = 0; i < 8; i++) {
      const wasPressed = button.getAttribute("aria-pressed") === "true";
      fireEvent.click(button);
      expected.push(wasPressed ? removed : added);
      expect(button.getAttribute("aria-pressed"), `click ${i + 1}`).toBe(String(!wasPressed));
    }
    expect(messages()).toEqual(expected);
    expect(messages().slice(0, 4)).toEqual([added, removed, added, removed]);
  });

  it("keeps the notification, the pressed state and the storage in agreement", async () => {
    const button = await renderButton("t-1");
    fireEvent.click(button);
    expect(messages().at(-1)).toBe(added);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(stored()).toEqual(["t-1"]);
    fireEvent.click(button);
    expect(messages().at(-1)).toBe(removed);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(stored()).toEqual([]);
  });

  it("announces a removal first for a track that is already a favorite", async () => {
    window.localStorage.setItem("afm-favorites", JSON.stringify(["t-1"]));
    const button = await renderButton("t-1");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(messages()).toEqual([removed, added]);
  });

  it("works for a generated track that is not in the catalog", async () => {
    const button = await renderButton("gen-draft-1f3a");
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(messages()).toEqual([added, removed, added]);
    expect(stored()).toEqual(["gen-draft-1f3a"]);
  });
});
