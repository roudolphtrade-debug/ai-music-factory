// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { AllProviders } from "@/test/providers";
import { installFakeAudio } from "@/test/fakeAudio";
import { CreditsProvider } from "@/library/CreditsProvider";
import { GeneratedDraftsProvider } from "@/library/GeneratedDraftsProvider";
import { translate } from "@/i18n/translations";
import { StudioComposer } from "./StudioComposer";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const en = (key: string) => translate("en", key);
let upstream: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("afm-lang", "en");
  installFakeAudio();
  upstream = vi.fn();
  vi.stubGlobal("fetch", upstream);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function generateWith(status: number) {
  upstream.mockResolvedValue(Response.json({ error: "RAW SERVER TEXT" }, { status }));
  render(
    <AllProviders>
      <CreditsProvider>
        <GeneratedDraftsProvider>
          <StudioComposer />
        </GeneratedDraftsProvider>
      </CreditsProvider>
    </AllProviders>,
  );
  fireEvent.click(screen.getByRole("button", { name: en("studio.generate") }));
}

describe("Studio generation errors", () => {
  it.each([
    [402, "studio.gen.errorCredits"],
    [429, "studio.gen.errorRate"],
    [503, "aiErrors.paused"],
    [413, "aiErrors.tooLarge"],
    [500, "studio.gen.errorGeneric"],
  ])("HTTP %i shows %s", async (status, key) => {
    generateWith(status);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(en(key)));
    expect(String(upstream.mock.calls[0][0])).toBe("/api/studio/generate");
  });
});
