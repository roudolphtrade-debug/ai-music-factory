// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueuePanel } from "./QueuePanel";
import { usePlayer } from "@/audio/PlayerProvider";
import { listening } from "@/i18n/listening";
import { LANGS, type Lang } from "@/i18n/translations";
import { installFakeAudio } from "@/test/fakeAudio";
import { track } from "@/test/fixtures";
import { AllProviders } from "@/test/providers";

const [A, B, C, D] = ["a", "b", "c", "d"].map(track);
const ALL_LANGS: Lang[] = LANGS.map((l) => l.code);

function matchMediaStub(query: string) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = matchMediaStub; // useIsMobile reads it; jsdom has no implementation
  installFakeAudio();
});
afterEach(() => cleanup());

function Harness({ autoStart = true }: { autoStart?: boolean }) {
  const player = usePlayer();
  return (
    <div>
      {autoStart && (
        <button type="button" onClick={() => player.play(A, [A, B, C, D])}>
          start
        </button>
      )}
      <QueuePanel />
    </div>
  );
}

/** Renders, optionally starts playback, and opens the panel. Returns the dialog. */
async function openPanel(lang: Lang = "fr", autoStart = true) {
  window.localStorage.setItem("afm-lang", lang);
  render(
    <AllProviders>
      <Harness autoStart={autoStart} />
    </AllProviders>,
  );
  await act(async () => {}); // let LanguageProvider apply the stored language
  if (autoStart) fireEvent.click(screen.getByText("start"));
  fireEvent.click(screen.getByRole("button", { name: listening[lang].queue }));
  return await screen.findByRole("dialog");
}

const upNext = (dialog: HTMLElement, lang: Lang = "fr") =>
  within(dialog).getByRole("list", { name: listening[lang].upNext });
const rows = (dialog: HTMLElement, lang: Lang = "fr") =>
  within(upNext(dialog, lang)).getAllByRole("listitem");
const rowTitles = (dialog: HTMLElement, lang: Lang = "fr") =>
  rows(dialog, lang).map((li) => within(li).getByText(/^Title /).textContent);

describe("QueuePanel: content and navigation", () => {
  it("opens as a named dialog and says so when nothing is queued", async () => {
    const dialog = await openPanel("fr", false);
    expect(within(dialog).getByRole("heading", { name: listening.fr.queue })).toBeTruthy();
    expect(within(dialog).getByText(listening.fr.emptyQueue)).toBeTruthy();
  });

  it("shows the playing track and lists only what comes next", async () => {
    const dialog = await openPanel();
    expect(within(dialog).getByText(listening.fr.nowPlaying)).toBeTruthy();
    expect(rowTitles(dialog)).toEqual(["Title b", "Title c", "Title d"]);
  });

  it("names each track button with its title and artist and jumps to it", async () => {
    const dialog = await openPanel();
    const l = listening.fr;
    const jump = within(dialog).getByRole("button", { name: `${l.playTrack} Title c · Artist c` });
    fireEvent.click(jump);
    expect(rowTitles(dialog)).toEqual(["Title d"]); // c is now the playing track
  });
});

describe("QueuePanel: move and remove controls", () => {
  it("names every control after its action and its track", async () => {
    const dialog = await openPanel();
    const l = listening.fr;
    for (const title of ["Title b", "Title c", "Title d"]) {
      for (const verb of [l.moveUp, l.moveDown, l.remove]) {
        expect(within(dialog).getByRole("button", { name: `${verb} · ${title}` })).toBeTruthy();
      }
    }
  });

  it("moves a track down and up, disabling the moves that are not possible", async () => {
    const dialog = await openPanel();
    const l = listening.fr;
    const button = (verb: string, title: string) =>
      within(dialog).getByRole("button", { name: `${verb} · ${title}` }) as HTMLButtonElement;

    expect(button(l.moveUp, "Title b").disabled).toBe(true); // first of the list
    expect(button(l.moveDown, "Title d").disabled).toBe(true); // last of the list

    fireEvent.click(button(l.moveDown, "Title b"));
    expect(rowTitles(dialog)).toEqual(["Title c", "Title b", "Title d"]);
    expect(button(l.moveUp, "Title c").disabled).toBe(true);

    fireEvent.click(button(l.moveUp, "Title b"));
    expect(rowTitles(dialog)).toEqual(["Title b", "Title c", "Title d"]);
  });

  it("removes only the chosen upcoming track and offers no removal of the playing one", async () => {
    const dialog = await openPanel();
    const l = listening.fr;
    expect(within(dialog).queryByRole("button", { name: `${l.remove} · Title a` })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: `${l.remove} · Title c` }));
    expect(rowTitles(dialog)).toEqual(["Title b", "Title d"]);
    expect(within(dialog).queryByText("Title c")).toBeNull();
  });
});

describe("QueuePanel: shuffle and repeat", () => {
  const repeatButton = (group: HTMLElement, lang: Lang = "fr") => {
    const l = listening[lang];
    const names = [l.repeatAll, l.repeatOne, l.repeatOff];
    return within(group)
      .getAllByRole("button")
      .find((b) => names.includes(b.textContent ?? ""))! as HTMLButtonElement;
  };

  it("exposes the modes as a named group, available even before anything plays", async () => {
    const dialog = await openPanel("fr", false);
    const group = within(dialog).getByRole("group", { name: listening.fr.playbackOptions });
    expect(within(group).getAllByRole("button")).toHaveLength(2);
  });

  it("reflects the shuffle state in aria-pressed and flags it on the trigger", async () => {
    const dialog = await openPanel();
    const l = listening.fr;
    const group = within(dialog).getByRole("group", { name: l.playbackOptions });
    const shuffle = within(group).getByRole("button", { name: l.shuffle });
    expect(shuffle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(shuffle);
    expect(shuffle.getAttribute("aria-pressed")).toBe("true");
    const trigger = screen.getByRole("button", { name: l.queue, hidden: true });
    expect(trigger.querySelector("span[aria-hidden='true']")).not.toBeNull();
    fireEvent.click(shuffle);
    expect(shuffle.getAttribute("aria-pressed")).toBe("false");
    expect(trigger.querySelector("span[aria-hidden='true']")).toBeNull();
  });

  it("cycles repeat all, one, off, then back to all, with matching pressed states", async () => {
    const dialog = await openPanel();
    const l = listening.fr;
    const group = within(dialog).getByRole("group", { name: l.playbackOptions });
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      const button = repeatButton(group);
      seen.push(`${button.textContent}|${button.getAttribute("aria-pressed")}`);
      fireEvent.click(button);
    }
    expect(seen).toEqual([
      `${l.repeatAll}|true`,
      `${l.repeatOne}|true`,
      `${l.repeatOff}|false`,
      `${l.repeatAll}|true`,
    ]);
  });
});

describe("QueuePanel: languages", () => {
  it("takes its labels from the dictionary in each of the six languages", async () => {
    expect(ALL_LANGS).toHaveLength(6);
    for (const lang of ALL_LANGS) {
      cleanup();
      window.localStorage.clear();
      const l = listening[lang];
      const dialog = await openPanel(lang, false);
      expect(within(dialog).getByRole("heading", { name: l.queue }), lang).toBeTruthy();
      expect(within(dialog).getByText(l.emptyQueue), lang).toBeTruthy();
      const group = within(dialog).getByRole("group", { name: l.playbackOptions });
      expect(within(group).getByRole("button", { name: l.shuffle }), lang).toBeTruthy();
      expect(within(group).getByRole("button", { name: l.repeatAll }), lang).toBeTruthy();
    }
  });

  it("works in Arabic with right-to-left layout and translated move controls", async () => {
    const dialog = await openPanel("ar");
    const l = listening.ar;
    expect(document.documentElement.dir).toBe("rtl");
    expect(rowTitles(dialog, "ar")).toEqual(["Title b", "Title c", "Title d"]);
    for (const verb of [l.moveUp, l.moveDown, l.remove]) {
      expect(within(dialog).getByRole("button", { name: `${verb} · Title c` })).toBeTruthy();
    }
    fireEvent.click(within(dialog).getByRole("button", { name: `${l.moveDown} · Title b` }));
    expect(rowTitles(dialog, "ar")).toEqual(["Title c", "Title b", "Title d"]);
  });
});
