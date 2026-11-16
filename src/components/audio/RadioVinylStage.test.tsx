// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RadioVinylStage } from "./RadioVinylStage";
import { usePlayer } from "@/audio/PlayerProvider";
import { radioVinylCopy } from "@/i18n/radio-vinyl";
import { LANGS, type Lang } from "@/i18n/translations";
import { installFakeAudio } from "@/test/fakeAudio";
import { track } from "@/test/fixtures";
import { AllProviders } from "@/test/providers";
import { deckLayout } from "./radio-deck-layout";

const A = { ...track("a"), cover: "/artist-a.webp" };
const B = { ...track("b"), cover: "/artist-b.webp" };
const ALL_LANGS: Lang[] = LANGS.map((l) => l.code);

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
  installFakeAudio();
});
afterEach(() => cleanup());

function Harness() {
  const player = usePlayer();
  return (
    <div>
      <button type="button" onClick={() => player.play(B, [A, B])}>play b</button>
      <button type="button" onClick={() => player.toggle()}>toggle</button>
      <RadioVinylStage station="Demo" queue={[A, B]} />
    </div>
  );
}

describe("Radio vinyl stage, photoreal layers (lot 2B)", () => {
  it("stacks the deck, turning record, still sheen and tonearm, all decorative", () => {
    render(<AllProviders><Harness /></AllProviders>);
    const turntable = screen.getByRole("img", { name: new RegExp(radioVinylCopy.fr.turntable) });
    const layers = turntable.querySelectorAll("img");
    expect(layers.length).toBeGreaterThanOrEqual(5);
    layers.forEach((img) => expect(img.getAttribute("alt")).toBe(""));
    expect(turntable.querySelector(".radio-deck")?.getAttribute("srcset")).toMatch(/640w.*1080w/);
    // The sheen is a sibling of the record, so the light does not turn with it.
    expect(screen.getByTestId("radio-record").querySelector(".radio-sheen")).toBeNull();
    expect(turntable.querySelector(".radio-record-layer > .radio-sheen")).not.toBeNull();
  });

  it("shows the artist photo of the displayed track and follows the track being played", () => {
    render(<AllProviders><Harness /></AllProviders>);
    expect(screen.getByTestId("radio-label-cover").getAttribute("src")).toBe(A.cover);
    fireEvent.click(screen.getByText("play b"));
    expect(screen.getByTestId("radio-label-cover").getAttribute("src")).toBe(B.cover);
  });

  it("turns the record and lowers the arm only during confirmed playback", async () => {
    render(<AllProviders><Harness /></AllProviders>);
    const stage = screen.getByTestId("radio-stage");
    expect(stage.dataset.running).toBe("false");
    await act(async () => { fireEvent.click(screen.getByText("play b")); });
    expect(stage.dataset.running).toBe("true");
    await act(async () => { fireEvent.click(screen.getByText("toggle")); });
    expect(stage.dataset.running).toBe("false");
  });

  it("places the arm around its rendered pivot and rests it off the record", () => {
    render(<AllProviders><Harness /></AllProviders>);
    const layer = screen.getByTestId("radio-arm").parentElement as HTMLElement;
    expect(layer.style.getPropertyValue("--radio-arm-origin")).toBe(`${deckLayout.arm.originX}% ${deckLayout.arm.originY}%`);
    expect(deckLayout.armRestDeg).toBeLessThan(0);
    expect(deckLayout.labelPct).toBeGreaterThan(20);
    expect(deckLayout.labelPct).toBeLessThan(40);
  });

  it.each(ALL_LANGS)("names the turntable and its state in %s", (lang) => {
    window.localStorage.setItem("afm-lang", lang);
    render(<AllProviders><Harness /></AllProviders>);
    expect(screen.getByRole("img", { name: new RegExp(radioVinylCopy[lang].turntable) })).toBeTruthy();
  });
});
