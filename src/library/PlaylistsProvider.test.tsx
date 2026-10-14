// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { PlaylistsProvider, usePlaylists, type Playlist } from "./PlaylistsProvider";

const wrapper = ({ children }: { children: ReactNode }) => (
  <PlaylistsProvider>{children}</PlaylistsProvider>
);
const setup = () => renderHook(() => usePlaylists(), { wrapper });
const stored = () =>
  JSON.parse(window.localStorage.getItem("afm-playlists") ?? "null") as Playlist[] | null;

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

/** Creates a playlist and returns its id, so tests can address it afterwards. */
function create(result: ReturnType<typeof setup>["result"], name: string, trackIds?: string[]) {
  let id = "";
  act(() => {
    id = result.current.createPlaylist(name, trackIds).id;
  });
  return id;
}

describe("create, rename, delete", () => {
  it("starts with no playlist", () => {
    const { result } = setup();
    expect(result.current.playlists).toEqual([]);
  });

  it("creates playlists newest first with a trimmed name and a stable shape", () => {
    const { result } = setup();
    create(result, "  Morning  ");
    create(result, "Evening");
    expect(result.current.playlists.map((p) => p.name)).toEqual(["Evening", "Morning"]);
    const created = result.current.playlists[1];
    expect(created.id).toMatch(/^pl-/);
    expect(created.trackIds).toEqual([]);
    expect(typeof created.createdAt).toBe("number");
  });

  it("falls back to a default name and removes duplicate initial tracks", () => {
    const { result } = setup();
    create(result, "   ", ["t-1", "t-2", "t-1"]);
    expect(result.current.playlists[0].name).toBe("Playlist");
    expect(result.current.playlists[0].trackIds).toEqual(["t-1", "t-2"]);
  });

  it("renames a playlist and ignores a blank name", () => {
    const { result } = setup();
    const id = create(result, "Old");
    act(() => result.current.renamePlaylist(id, "  New  "));
    expect(result.current.playlists[0].name).toBe("New");
    act(() => result.current.renamePlaylist(id, "   "));
    expect(result.current.playlists[0].name).toBe("New");
  });

  it("deletes only the targeted playlist", () => {
    const { result } = setup();
    const first = create(result, "One");
    create(result, "Two");
    act(() => result.current.deletePlaylist(first));
    expect(result.current.playlists.map((p) => p.name)).toEqual(["Two"]);
  });
});

describe("tracks", () => {
  it("appends tracks in order and refuses duplicates", () => {
    const { result } = setup();
    const id = create(result, "Mix");
    act(() => {
      result.current.addToPlaylist(id, "t-1");
    });
    act(() => {
      result.current.addToPlaylist(id, "t-1");
    });
    act(() => {
      result.current.addToPlaylist(id, "t-2");
    });
    expect(result.current.playlists[0].trackIds).toEqual(["t-1", "t-2"]);
    expect(result.current.isInPlaylist(id, "t-2")).toBe(true);
    expect(result.current.isInPlaylist(id, "t-9")).toBe(false);
  });

  it("changes nothing for an unknown playlist", () => {
    const { result } = setup();
    const id = create(result, "Mix");
    act(() => {
      result.current.addToPlaylist("pl-missing", "t-1");
    });
    expect(result.current.playlists[0].trackIds).toEqual([]);
    expect(result.current.isInPlaylist(id, "t-1")).toBe(false);
  });

  it.todo(
    "R13: addToPlaylist must return true when the track was added, whatever React's timing " +
      "(same pattern as toggleFavorite: the boolean is set inside the state updater, so it is " +
      "false under act() and when updates are batched)",
  );

  it("removes a track and tolerates one that is not there", () => {
    const { result } = setup();
    const id = create(result, "Mix", ["t-1", "t-2", "t-3"]);
    act(() => result.current.removeFromPlaylist(id, "t-2"));
    expect(result.current.playlists[0].trackIds).toEqual(["t-1", "t-3"]);
    act(() => result.current.removeFromPlaylist(id, "t-9"));
    expect(result.current.playlists[0].trackIds).toEqual(["t-1", "t-3"]);
  });

  it("moves a track within bounds and ignores a destination outside the list", () => {
    const { result } = setup();
    const id = create(result, "Mix", ["t-1", "t-2", "t-3"]);
    act(() => result.current.moveInPlaylist(id, 0, 2));
    expect(result.current.playlists[0].trackIds).toEqual(["t-2", "t-3", "t-1"]);
    act(() => result.current.moveInPlaylist(id, 2, 0));
    expect(result.current.playlists[0].trackIds).toEqual(["t-1", "t-2", "t-3"]);
    act(() => result.current.moveInPlaylist(id, 0, 7));
    act(() => result.current.moveInPlaylist(id, 1, -1));
    expect(result.current.playlists[0].trackIds).toEqual(["t-1", "t-2", "t-3"]);
  });

  it.todo(
    "R11: moveInPlaylist must ignore a source index outside the list (today it inserts undefined)",
  );
  it.todo(
    "R11: the Library UI must move the right track when a playlist holds ids missing from the catalog",
  );
});

describe("persistence", () => {
  it("writes every change under the existing storage key", () => {
    const { result } = setup();
    const id = create(result, "Mix", ["t-1"]);
    act(() => {
      result.current.addToPlaylist(id, "t-2");
    });
    expect(stored()?.[0].trackIds).toEqual(["t-1", "t-2"]);
  });

  it("hydrates from storage and survives an unmount and a fresh mount", () => {
    window.localStorage.setItem(
      "afm-playlists",
      JSON.stringify([{ id: "pl-x", name: "Saved", trackIds: ["t-5"], createdAt: 1 }]),
    );
    const first = setup();
    expect(first.result.current.playlists.map((p) => p.name)).toEqual(["Saved"]);
    act(() => {
      first.result.current.addToPlaylist("pl-x", "t-6");
    });
    first.unmount();
    const second = setup();
    expect(second.result.current.playlists[0].trackIds).toEqual(["t-5", "t-6"]);
  });

  it("falls back to no playlist when the stored value is not valid JSON", () => {
    window.localStorage.setItem("afm-playlists", "{broken");
    const { result } = setup();
    expect(result.current.playlists).toEqual([]);
  });
});
