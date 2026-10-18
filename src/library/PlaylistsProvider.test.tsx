// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { PlaylistsProvider, usePlaylists, type Playlist } from "./PlaylistsProvider";
import { parsePlaylists } from "./storage";

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

/** Calls addToPlaylist once per track inside one act() and returns what each call answered. */
function addAll(result: ReturnType<typeof setup>["result"], id: string, trackIds: string[]) {
  const answers: boolean[] = [];
  act(() => {
    for (const trackId of trackIds) answers.push(result.current.addToPlaylist(id, trackId));
  });
  return answers;
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

  it("returns true when it adds a track that was not in the playlist, at the end", () => {
    const { result } = setup();
    const id = create(result, "Mix", ["t-1"]);
    expect(addAll(result, id, ["t-2"])).toEqual([true]);
    expect(result.current.playlists[0].trackIds).toEqual(["t-1", "t-2"]);
    expect(stored()?.[0].trackIds).toEqual(["t-1", "t-2"]);
    expect(result.current.isInPlaylist(id, "t-2")).toBe(true);
  });

  it("returns false for a track already in the playlist and writes nothing", () => {
    const { result } = setup();
    const id = create(result, "Mix", ["t-1", "t-2"]);
    const write = vi.spyOn(Storage.prototype, "setItem");
    try {
      expect(addAll(result, id, ["t-1"])).toEqual([false]);
      expect(write).not.toHaveBeenCalled();
    } finally {
      write.mockRestore();
    }
    expect(result.current.playlists[0].trackIds).toEqual(["t-1", "t-2"]);
    expect(stored()?.[0].trackIds).toEqual(["t-1", "t-2"]);
  });

  it("returns false for a playlist that does not exist and changes nothing", () => {
    const { result } = setup();
    const id = create(result, "Mix", ["t-1"]);
    const write = vi.spyOn(Storage.prototype, "setItem");
    try {
      expect(addAll(result, "pl-unknown", ["t-2"])).toEqual([false]);
      expect(write).not.toHaveBeenCalled();
    } finally {
      write.mockRestore();
    }
    expect(result.current.playlists.map((p) => p.trackIds)).toEqual([["t-1"]]);
    expect(result.current.isInPlaylist(id, "t-2")).toBe(false);
  });

  it("returns false on an empty library and after the playlist was deleted", () => {
    const { result } = setup();
    expect(addAll(result, "pl-none", ["t-1"])).toEqual([false]);
    const id = create(result, "Mix");
    act(() => result.current.deletePlaylist(id));
    expect(addAll(result, id, ["t-1"])).toEqual([false]);
    expect(result.current.playlists).toEqual([]);
  });

  it("answers [true, false] for the same track added twice in one act", () => {
    const { result } = setup();
    const id = create(result, "Mix");
    expect(addAll(result, id, ["t-1", "t-1"])).toEqual([true, false]);
    expect(result.current.playlists[0].trackIds).toEqual(["t-1"]);
    expect(stored()?.[0].trackIds).toEqual(["t-1"]);
  });

  it("adds different tracks in one act, in call order", () => {
    const { result } = setup();
    const id = create(result, "Mix", ["t-0"]);
    expect(addAll(result, id, ["t-3", "t-1", "t-3", "t-2", "t-0"])).toEqual([
      true,
      true,
      false,
      true,
      false,
    ]);
    expect(result.current.playlists[0].trackIds).toEqual(["t-0", "t-3", "t-1", "t-2"]);
    expect(stored()?.[0].trackIds).toEqual(["t-0", "t-3", "t-1", "t-2"]);
  });

  it("keeps ids that are not in the music catalog, such as generated tracks", () => {
    const { result } = setup();
    const id = create(result, "Mix");
    expect(addAll(result, id, ["gen-draft-1f3a", "studio-result-9"])).toEqual([true, true]);
    expect(addAll(result, id, ["gen-draft-1f3a"])).toEqual([false]);
    expect(stored()?.[0].trackIds).toEqual(["gen-draft-1f3a", "studio-result-9"]);
  });

  it("answers correctly for a playlist loaded from storage, even a repaired one", () => {
    window.localStorage.setItem(
      "afm-playlists",
      JSON.stringify([
        { id: "pl-a", name: "Saved", trackIds: ["t-5"], createdAt: 1 },
        { id: "pl-b", name: "No tracks field" },
      ]),
    );
    const { result } = setup();
    expect(addAll(result, "pl-a", ["t-5", "t-6"])).toEqual([false, true]);
    expect(addAll(result, "pl-b", ["t-5", "t-5"])).toEqual([true, false]);
    expect(stored()?.map((p) => p.trackIds)).toEqual([["t-5", "t-6"], ["t-5"]]);
  });

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

  it("ignores a source index outside the list and never inserts a hole", () => {
    const { result } = setup();
    const id = create(result, "Mix", ["t-1", "t-2", "t-3"]);
    const untouched = ["t-1", "t-2", "t-3"];
    for (const from of [3, 7, -1, -3]) {
      act(() => result.current.moveInPlaylist(id, from, 0));
      act(() => result.current.moveInPlaylist(id, from, 2));
      expect(result.current.playlists[0].trackIds, `from=${from}`).toEqual(untouched);
    }
  });

  it("ignores a non-integer or non-finite source index", () => {
    const { result } = setup();
    const id = create(result, "Mix", ["t-1", "t-2", "t-3"]);
    for (const from of [0.5, 1.2, Number.NaN, Number.POSITIVE_INFINITY]) {
      act(() => result.current.moveInPlaylist(id, from, 2));
      expect(result.current.playlists[0].trackIds, `from=${from}`).toEqual(["t-1", "t-2", "t-3"]);
    }
  });

  it("leaves the persisted list free of null after an invalid move", () => {
    const { result } = setup();
    const id = create(result, "Mix", ["t-1", "t-2", "t-3"]);
    act(() => result.current.moveInPlaylist(id, 5, 0));
    act(() => result.current.moveInPlaylist(id, -1, 0));
    const saved = stored()?.[0].trackIds;
    expect(saved).toEqual(["t-1", "t-2", "t-3"]);
    expect(saved?.every((t) => typeof t === "string")).toBe(true);
    // a valid move still persists normally afterwards
    act(() => result.current.moveInPlaylist(id, 2, 0));
    expect(stored()?.[0].trackIds).toEqual(["t-3", "t-1", "t-2"]);
  });

  it("keeps the other playlists and the boundary moves intact", () => {
    const { result } = setup();
    const other = create(result, "Other", ["t-9", "t-8"]);
    const id = create(result, "Mix", ["t-1", "t-2", "t-3"]);
    act(() => result.current.moveInPlaylist(id, 9, 1));
    act(() => result.current.moveInPlaylist(id, 0, 0)); // same slot: no change
    act(() => result.current.moveInPlaylist(id, 2, 2));
    const byId = (p: string) => result.current.playlists.find((x) => x.id === p)!.trackIds;
    expect(byId(id)).toEqual(["t-1", "t-2", "t-3"]);
    expect(byId(other)).toEqual(["t-9", "t-8"]);
    act(() => result.current.moveInPlaylist(id, 2, 0)); // last to first
    expect(byId(id)).toEqual(["t-3", "t-1", "t-2"]);
    act(() => result.current.moveInPlaylist(id, 0, 2)); // first to last
    expect(byId(id)).toEqual(["t-1", "t-2", "t-3"]);
    expect(byId(other)).toEqual(["t-9", "t-8"]);
  });
});

describe("several mutations in a row", () => {
  it("lets each call see the result of the previous ones inside one act", () => {
    const { result } = setup();
    const answers: boolean[] = [];
    let first = "";
    let second = "";
    act(() => {
      const a = result.current.createPlaylist("Mix", ["t-1"]);
      const b = result.current.createPlaylist("Other");
      first = a.id;
      second = b.id;
      answers.push(result.current.addToPlaylist(first, "t-2"));
      answers.push(result.current.addToPlaylist(first, "t-1"));
      answers.push(result.current.addToPlaylist(second, "t-1"));
      result.current.moveInPlaylist(first, 0, 1);
      result.current.removeFromPlaylist(first, "t-1");
      result.current.renamePlaylist(second, "Renamed");
      result.current.deletePlaylist(first);
      answers.push(result.current.addToPlaylist(first, "t-3"));
    });
    expect(answers).toEqual([true, false, true, false]);
    expect(result.current.playlists.map((p) => [p.id, p.name, p.trackIds])).toEqual([
      [second, "Renamed", ["t-1"]],
    ]);
    expect(stored()?.map((p) => [p.id, p.name, p.trackIds])).toEqual([
      [second, "Renamed", ["t-1"]],
    ]);
  });

  it("does not lose a rename, a move or a removal made in the same act as an add", () => {
    const { result } = setup();
    const id = create(result, "Old", ["t-1", "t-2", "t-3"]);
    act(() => {
      result.current.renamePlaylist(id, "New");
      result.current.addToPlaylist(id, "t-4");
      result.current.moveInPlaylist(id, 3, 0);
      result.current.removeFromPlaylist(id, "t-2");
    });
    const [p] = result.current.playlists;
    expect(p.name).toBe("New");
    expect(p.trackIds).toEqual(["t-4", "t-1", "t-3"]);
    expect(stored()).toEqual(result.current.playlists);
  });

  it("keeps the answer, the state and the storage in agreement over a long series", () => {
    const { result } = setup();
    const id = create(result, "Mix");
    const model: string[] = [];
    const series = ["t-1", "t-2", "t-1", "t-3", "t-2", "t-4", "t-4", "t-1"];
    for (const trackId of series) {
      const expected = !model.includes(trackId);
      if (expected) model.push(trackId);
      expect(addAll(result, id, [trackId]), trackId).toEqual([expected]);
      expect(result.current.playlists[0].trackIds).toEqual(model);
      expect(stored()?.[0].trackIds).toEqual(model);
    }
  });

  it("writes the playlists once per mutation that changes something, even under StrictMode", () => {
    // StrictMode runs state updaters twice: a write made inside one would be repeated.
    const strict = ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <PlaylistsProvider>{children}</PlaylistsProvider>
      </StrictMode>
    );
    const { result } = renderHook(() => usePlaylists(), { wrapper: strict });
    const write = vi.spyOn(Storage.prototype, "setItem");
    const writes = () => write.mock.calls.filter(([key]) => key === "afm-playlists").length;
    try {
      let id = "";
      act(() => {
        id = result.current.createPlaylist("Mix", ["t-1"]).id;
      });
      expect(writes()).toBe(1);
      expect(addAll(result, id, ["t-2"])).toEqual([true]);
      expect(writes()).toBe(2);
      expect(addAll(result, id, ["t-2"])).toEqual([false]);
      expect(writes()).toBe(2); // refused: nothing to write
      act(() => result.current.moveInPlaylist(id, 0, 1));
      expect(writes()).toBe(3);
      act(() => result.current.removeFromPlaylist(id, "t-1"));
      expect(writes()).toBe(4);
      act(() => result.current.renamePlaylist(id, "Renamed"));
      expect(writes()).toBe(5);
      act(() => result.current.deletePlaylist(id));
      expect(writes()).toBe(6);
    } finally {
      write.mockRestore();
    }
    expect(stored()).toEqual([]);
  });

  it("rebuilds from storage after a remount without carrying anything over", () => {
    const first = setup();
    const id = create(first.result, "Mix");
    expect(addAll(first.result, id, ["t-1", "t-2"])).toEqual([true, true]);
    first.unmount();
    const second = setup();
    expect(second.result.current.playlists[0].trackIds).toEqual(["t-1", "t-2"]);
    expect(addAll(second.result, id, ["t-2", "t-3"])).toEqual([false, true]);
    expect(stored()?.[0].trackIds).toEqual(["t-1", "t-2", "t-3"]);
  });
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

describe("stored playlists that are not what the app expects", () => {
  const playlist = (extra: Record<string, unknown> = {}) => ({
    id: "pl-1",
    name: "Mix",
    trackIds: ["t-1", "t-2"],
    createdAt: 100,
    ...extra,
  });
  const load = (value: unknown) => {
    window.localStorage.setItem("afm-playlists", JSON.stringify(value));
    return setup().result.current.playlists;
  };

  it("falls back to no playlist, without throwing, when the stored value is not a list", () => {
    for (const value of [{}, { id: "pl-1", name: "Mix" }, 5, 0, "abc", null, true, false]) {
      cleanup();
      expect(load(value), JSON.stringify(value)).toEqual([]);
    }
  });

  it("drops entries that are null, primitive, a list or incomplete, and keeps the others", () => {
    const kept = playlist({ id: "pl-ok" });
    const lists = load([
      null,
      5,
      "pl-1",
      true,
      [],
      {},
      { name: "no id" },
      { id: "pl-2" },
      kept,
      { id: "pl-3", trackIds: ["t-1"] },
    ]);
    expect(lists).toEqual([kept]);
  });

  it("requires a non-empty string id and keeps the first playlist when an id repeats", () => {
    const first = playlist({ id: "pl-1", name: "First" });
    const second = playlist({ id: "pl-2", name: "Second" });
    const lists = load([
      playlist({ id: "" }),
      playlist({ id: 7 }),
      playlist({ id: null }),
      first,
      playlist({ id: "pl-1", name: "Repeated id" }),
      second,
    ]);
    expect(lists).toEqual([first, second]);
  });

  it("requires the name to be a string", () => {
    const lists = load([
      playlist({ id: "a", name: 12 }),
      playlist({ id: "b", name: null }),
      playlist({ id: "c", name: { text: "Mix" } }),
      playlist({ id: "d", name: ["Mix"] }),
      playlist({ id: "e", name: "Real name" }),
    ]);
    expect(lists.map((p) => p.id)).toEqual(["e"]);
    expect(lists[0].name).toBe("Real name");
  });

  it("keeps a playlist that has no usable trackIds, with an empty list", () => {
    const missing = { id: "a", name: "No tracks field", createdAt: 1 };
    const lists = load([
      missing,
      playlist({ id: "b", trackIds: null }),
      playlist({ id: "c", trackIds: "t-1" }),
      playlist({ id: "d", trackIds: { 0: "t-1" } }),
    ]);
    expect(lists.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
    for (const p of lists) expect(p.trackIds, p.id).toEqual([]);
  });

  it("keeps only non-empty strings in trackIds, in order", () => {
    const [p] = load([
      playlist({ trackIds: ["t-3", 4, "", null, "t-1", { id: "t-9" }, ["t-8"], "t-2", false] }),
    ]);
    expect(p.trackIds).toEqual(["t-3", "t-1", "t-2"]);
  });

  it("keeps ids that are not in the catalog, such as generated tracks", () => {
    const ids = ["gen-draft-1f3a", "studio-result-9", "t-1", "chart-1-Not In Catalog"];
    const [p] = load([playlist({ trackIds: ids })]);
    expect(p.trackIds).toEqual(ids);
  });

  it("does not remove repeated track ids: a stored list is read back as it is", () => {
    const [p] = load([playlist({ trackIds: ["t-1", "t-2", "t-1"] })]);
    expect(p.trackIds).toEqual(["t-1", "t-2", "t-1"]);
  });

  it("gives an invalid createdAt the fallback 0 and keeps a valid one", () => {
    const lists = load([
      playlist({ id: "a", createdAt: undefined }),
      playlist({ id: "b", createdAt: "yesterday" }),
      playlist({ id: "c", createdAt: null }),
      playlist({ id: "d", createdAt: { at: 1 } }),
      playlist({ id: "e", createdAt: 1700000000000 }),
      playlist({ id: "f", createdAt: 0 }),
    ]);
    expect(lists.map((p) => p.createdAt)).toEqual([0, 0, 0, 0, 1700000000000, 0]);
    expect(lists.every((p) => typeof p.createdAt === "number")).toBe(true);
  });

  it("reads valid playlists back unchanged, extra fields included, in their order", () => {
    const valid = [
      playlist({ id: "pl-2", name: "Second", trackIds: ["t-9"], cover: "x.jpg" }),
      playlist({ id: "pl-1", name: "First", trackIds: [] }),
    ];
    expect(load(valid)).toEqual(valid);
  });

  it("does not rewrite the stored value when it loads", () => {
    const raw = JSON.stringify([{ id: "pl-1", name: "Broken" }, null, 5]);
    window.localStorage.setItem("afm-playlists", raw);
    const write = vi.spyOn(Storage.prototype, "setItem");
    try {
      const { result } = setup();
      expect(result.current.playlists).toHaveLength(1);
      expect(write).not.toHaveBeenCalled();
      expect(window.localStorage.getItem("afm-playlists")).toBe(raw);
    } finally {
      write.mockRestore();
    }
  });

  it("lets every operation work on a playlist recovered from a bad stored value", () => {
    window.localStorage.setItem(
      "afm-playlists",
      JSON.stringify([{ id: "pl-1", name: "Broken" }, "junk", { id: "pl-1", name: "Twin" }]),
    );
    const { result } = setup();
    expect(result.current.playlists.map((p) => p.name)).toEqual(["Broken"]);

    act(() => {
      result.current.addToPlaylist("pl-1", "t-1");
    });
    act(() => {
      result.current.addToPlaylist("pl-1", "t-2");
    });
    expect(result.current.isInPlaylist("pl-1", "t-1")).toBe(true);
    expect(result.current.playlists[0].trackIds).toEqual(["t-1", "t-2"]);

    act(() => result.current.moveInPlaylist("pl-1", 0, 1));
    expect(result.current.playlists[0].trackIds).toEqual(["t-2", "t-1"]);
    act(() => result.current.removeFromPlaylist("pl-1", "t-2"));
    expect(result.current.playlists[0].trackIds).toEqual(["t-1"]);
    act(() => result.current.renamePlaylist("pl-1", "Fixed"));
    expect(result.current.playlists[0].name).toBe("Fixed");

    const id = create(result, "Another", ["t-5"]);
    expect(stored()?.map((p) => p.name)).toEqual(["Another", "Fixed"]);
    act(() => result.current.deletePlaylist(id));
    act(() => result.current.deletePlaylist("pl-1"));
    expect(result.current.playlists).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it("validates the shape of every playlist it returns", () => {
    const lists = load([
      { id: "a", name: "A" },
      { id: "b", name: "B", trackIds: [1, 2], createdAt: "x" },
      { id: "c", name: "C", trackIds: ["t-1"], createdAt: 5 },
    ]);
    for (const p of lists) {
      expect(typeof p.id).toBe("string");
      expect(typeof p.name).toBe("string");
      expect(Array.isArray(p.trackIds)).toBe(true);
      expect(p.trackIds.every((t) => typeof t === "string" && t !== "")).toBe(true);
      expect(Number.isFinite(p.createdAt)).toBe(true);
    }
  });
});

describe("parsePlaylists", () => {
  it("rejects a createdAt that JSON cannot carry (NaN and infinities)", () => {
    const input = [
      { id: "a", name: "A", trackIds: [], createdAt: Number.NaN },
      { id: "b", name: "B", trackIds: [], createdAt: Number.POSITIVE_INFINITY },
      { id: "c", name: "C", trackIds: [], createdAt: Number.NEGATIVE_INFINITY },
    ];
    expect(parsePlaylists<Playlist>(input).map((p) => p.createdAt)).toEqual([0, 0, 0]);
  });

  it("never mutates its input", () => {
    const input = [{ id: "a", name: "A", trackIds: ["t-1", 2, ""], createdAt: "x" }, null];
    const copy = JSON.stringify(input);
    parsePlaylists<Playlist>(input);
    expect(JSON.stringify(input)).toBe(copy);
  });
});
