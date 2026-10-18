// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { PlayButton } from "./PlayButton";
import { Playlist } from "./Playlist";
import { Seekbar } from "./Seekbar";
import { Waveform } from "./Waveform";
import { formatTime, usePlayer } from "@/audio/PlayerProvider";
import { listening } from "@/i18n/listening";
import { LANGS, translate, type Lang } from "@/i18n/translations";
import { FakeAudio, installFakeAudio } from "@/test/fakeAudio";
import { track } from "@/test/fixtures";
import { AllProviders } from "@/test/providers";

const [A, B, C] = ["a", "b", "c"].map(track);
const ALL_LANGS: Lang[] = LANGS.map((l) => l.code);
const audio = () => FakeAudio.last!;

beforeEach(() => {
  window.localStorage.clear();
  installFakeAudio();
});
afterEach(() => cleanup());

/** Renders inside the real provider stack with the language read from storage. */
async function renderIn(lang: Lang, ui: ReactElement) {
  window.localStorage.setItem("afm-lang", lang);
  const view = render(<AllProviders>{ui}</AllProviders>);
  await act(async () => {}); // let LanguageProvider apply the stored language
  return view;
}

const playName = (lang: Lang, t: { title: string; artist: string }) =>
  translate(lang, "charts.playTrack", { title: t.title, artist: t.artist });

/** Starts track A and publishes a known duration, as the media element would. */
function Starter({ children }: { children: ReactElement }) {
  const player = usePlayer();
  return (
    <div>
      <button type="button" onClick={() => player.play(A, [A, B])}>
        start
      </button>
      {children}
    </div>
  );
}

function startWithDuration(duration: number) {
  fireEvent.click(screen.getByText("start"));
  act(() => {
    audio().duration = duration;
    audio().fire("durationchange");
  });
}

describe("PlayButton accessible name", () => {
  it("is contextual and distinct for every track of a list", async () => {
    await renderIn("fr", <Playlist tracks={[A, B, C]} />);
    const names = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual([A, B, C].map((t) => playName("fr", t)));
    expect(new Set(names).size).toBe(3);
  });

  it("names the pause action with the track title while it plays", async () => {
    await renderIn("fr", <PlayButton track={A} />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe(playName("fr", A));
    fireEvent.click(button);
    expect(button.getAttribute("aria-label")).toBe(
      `${translate("fr", "audio.pause")} · ${A.title}`,
    );
    fireEvent.click(button);
    expect(button.getAttribute("aria-label")).toBe(playName("fr", A));
  });

  it("keeps the explicit label given by the caller, idle and playing", async () => {
    await renderIn("fr", <PlayButton track={A} label="Explicit label" />);
    const button = screen.getByRole("button", { name: "Explicit label" });
    fireEvent.click(button);
    expect(button.getAttribute("aria-label")).toBe("Explicit label");
  });

  it("comes from the dictionary of each of the six languages", async () => {
    expect(ALL_LANGS).toHaveLength(6);
    for (const lang of ALL_LANGS) {
      window.localStorage.clear();
      const view = await renderIn(lang, <PlayButton track={A} />);
      const name = screen.getByRole("button").getAttribute("aria-label");
      expect(name, lang).toBe(playName(lang, A));
      if (lang !== "en") expect(name, lang).not.toBe(playName("en", A));
      view.unmount();
    }
  });

  it("switches the document to right-to-left for Arabic", async () => {
    await renderIn("ar", <PlayButton track={A} />);
    expect(document.documentElement.dir).toBe("rtl");
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe(playName("ar", A));
  });
});

describe("Seekbar", () => {
  it("has a translated accessible name in every language", async () => {
    for (const lang of ALL_LANGS) {
      window.localStorage.clear();
      const view = await renderIn(lang, <Seekbar />);
      const slider = screen.getByRole("slider");
      expect(slider.getAttribute("aria-label"), lang).toBe(listening[lang].seek);
      if (lang !== "en") expect(listening[lang].seek, lang).not.toBe(listening.en.seek);
      view.unmount();
    }
  });

  it("exposes bounds and values: 0 to 100 with a readable elapsed / total text", async () => {
    await renderIn(
      "fr",
      <Starter>
        <Seekbar />
      </Starter>,
    );
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("tabindex")).toBe("0");
    expect(slider.getAttribute("aria-valuemin")).toBe("0");
    expect(slider.getAttribute("aria-valuemax")).toBe("100");
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
    expect(slider.getAttribute("aria-valuetext")).toBe(`${formatTime(0)} / ${formatTime(0)}`);

    startWithDuration(100);
    act(() => {
      audio().currentTime = 25;
      audio().fire("timeupdate");
    });
    expect(slider.getAttribute("aria-valuenow")).toBe("25");
    expect(slider.getAttribute("aria-valuetext")).toBe(`${formatTime(25)} / ${formatTime(100)}`);
  });

  it("seeks by 5 seconds with the arrow keys and jumps to the start with Home", async () => {
    await renderIn(
      "fr",
      <Starter>
        <Seekbar />
      </Starter>,
    );
    startWithDuration(100);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(audio().currentTime).toBe(5);
    fireEvent.keyDown(slider, { key: "ArrowUp" });
    expect(audio().currentTime).toBe(10);
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(audio().currentTime).toBe(5);
    fireEvent.keyDown(slider, { key: "ArrowDown" });
    expect(audio().currentTime).toBe(0);
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyDown(slider, { key: "Home" });
    expect(audio().currentTime).toBe(0);
  });

  it("stays within the track at both ends", async () => {
    await renderIn(
      "fr",
      <Starter>
        <Seekbar />
      </Starter>,
    );
    startWithDuration(100);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(audio().currentTime).toBe(0);
    act(() => {
      audio().currentTime = 98;
      audio().fire("timeupdate");
    });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(audio().currentTime).toBe(100);
  });

  it("claims its arrow keys (no page scroll) and ignores them before the duration is known", async () => {
    await renderIn(
      "fr",
      <Starter>
        <Seekbar />
      </Starter>,
    );
    fireEvent.click(screen.getByText("start"));
    const slider = screen.getByRole("slider");
    expect(fireEvent.keyDown(slider, { key: "ArrowRight" })).toBe(true); // not prevented
    expect(audio().currentTime).toBe(0);
    startWithDuration(100);
    expect(fireEvent.keyDown(slider, { key: "ArrowRight" })).toBe(false); // default prevented
  });
});

describe("Waveform", () => {
  it("is hidden from assistive technology and is not a focusable slider", async () => {
    for (const active of [true, false]) {
      const view = await renderIn("fr", <Waveform active={active} />);
      const wave = view.container.firstElementChild as HTMLElement;
      expect(wave.getAttribute("aria-hidden")).toBe("true");
      expect(wave.getAttribute("role")).toBeNull();
      expect(wave.getAttribute("tabindex")).toBeNull();
      expect(wave.getAttribute("aria-label")).toBeNull();
      expect(wave.getAttribute("aria-valuenow")).toBeNull();
      expect(screen.queryByRole("slider")).toBeNull();
      view.unmount();
    }
  });

  it("leaves the Seekbar as the only slider when both are shown", async () => {
    await renderIn(
      "fr",
      <Starter>
        <>
          <Waveform active />
          <Seekbar />
        </>
      </Starter>,
    );
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(1);
    expect(sliders[0].getAttribute("aria-label")).toBe(listening.fr.seek);
  });

  it("still seeks with the pointer while it is the active waveform", async () => {
    const view = await renderIn(
      "fr",
      <Starter>
        <Waveform active />
      </Starter>,
    );
    startWithDuration(100);
    const wave = view.container.querySelector("[aria-hidden='true']") as HTMLElement;
    wave.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
    fireEvent.pointerDown(wave, { clientX: 50 });
    expect(audio().currentTime).toBe(25);
    fireEvent.pointerMove(wave, { clientX: 150, buttons: 1 });
    expect(audio().currentTime).toBe(75);
    fireEvent.pointerMove(wave, { clientX: 20, buttons: 0 }); // hover without a pressed button
    expect(audio().currentTime).toBe(75);
  });

  it("ignores the pointer when it does not represent the playing track", async () => {
    const view = await renderIn(
      "fr",
      <Starter>
        <Waveform active={false} />
      </Starter>,
    );
    startWithDuration(100);
    const wave = view.container.querySelector("[aria-hidden='true']") as HTMLElement;
    wave.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
    fireEvent.pointerDown(wave, { clientX: 100 });
    expect(audio().currentTime).toBe(0);
  });
});

describe("Playlist", () => {
  const favButton = (id: string) => <button type="button" aria-label={`fav-${id}`} />;

  it("puts each play button in the keyboard order, before its row's trailing controls", async () => {
    await renderIn("fr", <Playlist tracks={[A, B]} trailing={(t) => favButton(t.id)} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      playName("fr", A),
      "fav-a",
      playName("fr", B),
      "fav-b",
    ]);
    for (const b of buttons) {
      expect(b.getAttribute("tabindex")).not.toBe("-1");
      expect((b as HTMLButtonElement).disabled).toBe(false);
    }
  });

  // Class contract only: jsdom does not compute Tailwind CSS, so the actual reveal on focus is
  // verified in the browser, not here.
  it("carries the classes that reveal the play button on focus and hide the rank for it", async () => {
    await renderIn("fr", <Playlist tracks={[A]} />);
    const play = screen.getByRole("button");
    const reveal = play.parentElement!;
    const cell = reveal.parentElement!;
    expect(reveal.className).toContain("opacity-0");
    expect(reveal.className).toContain("group-hover:opacity-100");
    expect(reveal.className).toContain("focus-within:opacity-100");
    expect(cell.className).toContain("group/play");
    const rank = within(cell).getByText("1");
    expect(rank.className).toContain("group-hover:opacity-0");
    expect(rank.className).toContain("group-focus-within/play:opacity-0");
  });

  it("numbers the rows in order", async () => {
    await renderIn("fr", <Playlist tracks={[A, B, C]} />);
    for (const rank of ["1", "2", "3"]) expect(screen.getByText(rank)).toBeTruthy();
  });
});

describe("no hard-coded English accessible names", () => {
  it("keeps every label of these controls out of the English dictionary in other languages", async () => {
    const english = new Set([
      translate("en", "audio.play"),
      translate("en", "audio.pause"),
      listening.en.seek,
      playName("en", A),
    ]);
    for (const lang of ALL_LANGS.filter((l) => l !== "en")) {
      window.localStorage.clear();
      const view = await renderIn(
        lang,
        <Starter>
          <>
            <Playlist tracks={[A]} />
            <PlayButton track={B} />
            <Seekbar />
            <Waveform active />
          </>
        </Starter>,
      );
      const labels = [...view.container.querySelectorAll("[aria-label]")].map((n) =>
        n.getAttribute("aria-label"),
      );
      expect(labels.length, lang).toBeGreaterThanOrEqual(3);
      for (const label of labels) expect(english.has(label ?? ""), `${lang}: ${label}`).toBe(false);
      view.unmount();
    }
  });
});
