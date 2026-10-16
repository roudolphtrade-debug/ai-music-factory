// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { PlaylistCard } from "./PlaylistCard";
import { usePlaylists, type Playlist } from "@/library/PlaylistsProvider";
import { playableTracks } from "@/audio/tracks";
import { listening } from "@/i18n/listening";
import { installFakeAudio } from "@/test/fakeAudio";
import { AllProviders } from "@/test/providers";

// Real catalog tracks (the card resolves ids through the catalog), with distinct titles so
// that buttons can be addressed by name.
const [A, B, C] = playableTracks.filter(
  (t, i, all) => all.findIndex((x) => x.title === t.title) === i,
);
const MISSING_1 = "no-such-track-1";
const MISSING_2 = "no-such-track-2";
const l = listening.fr;

const storedIds = () =>
  (JSON.parse(window.localStorage.getItem("afm-playlists") ?? "[]") as Playlist[])[0].trackIds;

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("afm-lang", "fr");
  installFakeAudio();
});
afterEach(() => cleanup());

const playQueue = vi.fn();

/** Renders the card from the live provider state, so it follows every move. */
function Host() {
  const { playlists } = usePlaylists();
  return (
    <>
      {playlists.map((pl) => (
        <PlaylistCard key={pl.id} pl={pl} playQueue={playQueue} />
      ))}
    </>
  );
}

/** Seeds one playlist with the given raw ids, renders its card and opens the edit mode. */
async function renderCard(trackIds: string[], { edit = true } = {}) {
  window.localStorage.setItem(
    "afm-playlists",
    JSON.stringify([{ id: "pl-test", name: "Mix", trackIds, createdAt: 1 }]),
  );
  render(
    <AllProviders>
      <Host />
    </AllProviders>,
  );
  await act(async () => {}); // providers hydrate from storage in an effect
  if (edit) fireEvent.click(screen.getByRole("button", { name: `${l.edit} · Mix` }));
}

const visibleTitles = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((li) => li.querySelector("p")?.textContent);
const control = (verb: string, title: string, nth = 0) =>
  screen.getAllByRole("button", { name: `${verb} · ${title}` })[nth] as HTMLButtonElement;
const click = (verb: string, title: string, nth = 0) => fireEvent.click(control(verb, title, nth));

describe("PlaylistCard: playlist whose ids are all in the catalog", () => {
  it("shows the tracks in order and moves them down and up", async () => {
    await renderCard([A.id, B.id, C.id]);
    expect(visibleTitles()).toEqual([A.title, B.title, C.title]);

    click(l.moveDown, A.title);
    expect(visibleTitles()).toEqual([B.title, A.title, C.title]);
    expect(storedIds()).toEqual([B.id, A.id, C.id]);

    click(l.moveUp, C.title);
    expect(visibleTitles()).toEqual([B.title, C.title, A.title]);
    expect(storedIds()).toEqual([B.id, C.id, A.id]);
  });

  it("disables moving the first track up and the last track down", async () => {
    await renderCard([A.id, B.id, C.id]);
    expect(control(l.moveUp, A.title).disabled).toBe(true);
    expect(control(l.moveDown, C.title).disabled).toBe(true);
    expect(control(l.moveUp, B.title).disabled).toBe(false);
    expect(control(l.moveDown, B.title).disabled).toBe(false);
  });
});

describe("PlaylistCard: playlist holding ids missing from the catalog (R11b)", () => {
  it("moves the clicked track, not the one at the same raw position", async () => {
    await renderCard([MISSING_1, A.id, B.id, MISSING_2, C.id]);
    expect(visibleTitles()).toEqual([A.title, B.title, C.title]);

    click(l.moveUp, B.title);
    expect(visibleTitles()).toEqual([B.title, A.title, C.title]);
    expect(storedIds()).toEqual([MISSING_1, B.id, A.id, MISSING_2, C.id]);

    // the move that hops over a hidden id: A goes below C, past MISSING_2
    click(l.moveDown, A.title);
    expect(visibleTitles()).toEqual([B.title, C.title, A.title]);
    expect(storedIds()).toEqual([MISSING_1, B.id, MISSING_2, C.id, A.id]);
  });

  it("changes the visible order on every click, even next to a hidden id", async () => {
    await renderCard([A.id, MISSING_1, B.id, MISSING_2, C.id]);
    click(l.moveDown, A.title); // A and B are separated by a hidden id
    expect(visibleTitles()).toEqual([B.title, A.title, C.title]);
    click(l.moveUp, C.title); // C and A are separated by a hidden id
    expect(visibleTitles()).toEqual([B.title, C.title, A.title]);
  });

  it("keeps every missing id, in the same relative order", async () => {
    await renderCard([MISSING_1, A.id, MISSING_2, B.id, C.id]);
    click(l.moveDown, A.title);
    click(l.moveUp, C.title);
    click(l.moveDown, B.title);
    const ids = storedIds();
    expect(ids).toHaveLength(5);
    expect(ids.filter((id) => id.startsWith("no-such-track"))).toEqual([MISSING_1, MISSING_2]);
    expect([...ids].sort()).toEqual([A.id, B.id, C.id, MISSING_1, MISSING_2].sort());
  });

  it("bounds the moves on the visible list, whatever surrounds it", async () => {
    await renderCard([MISSING_1, A.id, B.id, MISSING_2]);
    expect(control(l.moveUp, A.title).disabled).toBe(true); // a hidden id precedes it
    expect(control(l.moveDown, B.title).disabled).toBe(true); // a hidden id follows it
    expect(control(l.moveDown, A.title).disabled).toBe(false);
    expect(control(l.moveUp, B.title).disabled).toBe(false);
  });

  it("shows the empty state when every id is missing", async () => {
    await renderCard([MISSING_1, MISSING_2]);
    expect(screen.getByText(l.emptyPlaylist)).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("PlaylistCard: duplicated ids", () => {
  it("moves the clicked occurrence, not the first one with the same id", async () => {
    await renderCard([A.id, B.id, A.id]);
    expect(visibleTitles()).toEqual([A.title, B.title, A.title]);
    click(l.moveUp, A.title, 1); // the second A
    expect(visibleTitles()).toEqual([A.title, A.title, B.title]);
    expect(storedIds()).toEqual([A.id, A.id, B.id]);
  });
});

describe("PlaylistCard: behaviour kept by the extraction", () => {
  it("removes the chosen track by id and leaves hidden ids alone", async () => {
    await renderCard([MISSING_1, A.id, B.id, MISSING_2]);
    click(l.remove, A.title);
    expect(visibleTitles()).toEqual([B.title]);
    expect(storedIds()).toEqual([MISSING_1, B.id, MISSING_2]);
  });

  it("plays and shuffles only the tracks that exist, through the given callback", async () => {
    playQueue.mockClear();
    await renderCard([MISSING_1, A.id, B.id, MISSING_2], { edit: false });
    fireEvent.click(screen.getByRole("button", { name: l.playTrack }));
    expect(playQueue).toHaveBeenLastCalledWith([A, B]);
    fireEvent.click(screen.getByRole("button", { name: `${l.shufflePlay} · Mix` }));
    expect(playQueue).toHaveBeenLastCalledWith([A, B], true);
  });

  it("offers no move or remove control until the edit mode is on", async () => {
    await renderCard([A.id, B.id], { edit: false });
    expect(screen.queryByRole("button", { name: `${l.moveUp} · ${B.title}` })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: `${l.edit} · Mix` }));
    expect(screen.getByRole("button", { name: `${l.moveUp} · ${B.title}` })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: `${l.done} · Mix` }));
    expect(screen.queryByRole("button", { name: `${l.moveUp} · ${B.title}` })).toBeNull();
  });
});
