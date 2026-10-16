// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { LibraryProvider, useLibrary, type HistoryEntry } from "./LibraryProvider";
import { parseHistory, parseIdList } from "./storage";

const wrapper = ({ children }: { children: ReactNode }) => (
  <LibraryProvider>{children}</LibraryProvider>
);
const setup = () => renderHook(() => useLibrary(), { wrapper });
const stored = <T,>(key: string) => JSON.parse(window.localStorage.getItem(key) ?? "null") as T;

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

describe("favorites", () => {
  it("starts empty", () => {
    const { result } = setup();
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite("t-1")).toBe(false);
  });

  it("adds a favorite first and removes it on the second toggle", () => {
    const { result } = setup();
    act(() => {
      result.current.toggleFavorite("t-1");
    });
    act(() => {
      result.current.toggleFavorite("t-2");
    });
    expect(result.current.favorites).toEqual(["t-2", "t-1"]);
    expect(result.current.isFavorite("t-1")).toBe(true);

    act(() => {
      result.current.toggleFavorite("t-1");
    });
    expect(result.current.favorites).toEqual(["t-2"]);
    expect(result.current.isFavorite("t-1")).toBe(false);
  });

  it("persists favorites, newest first, under the existing storage key", () => {
    const { result } = setup();
    act(() => {
      result.current.toggleFavorite("t-1");
    });
    act(() => {
      result.current.toggleFavorite("t-2");
    });
    expect(stored<string[]>("afm-favorites")).toEqual(["t-2", "t-1"]);
  });

  it("hydrates from storage after mounting", () => {
    window.localStorage.setItem("afm-favorites", JSON.stringify(["t-9", "t-3"]));
    const { result } = setup();
    expect(result.current.favorites).toEqual(["t-9", "t-3"]);
    expect(result.current.isFavorite("t-9")).toBe(true);
  });

  it("survives an unmount and a fresh mount", () => {
    const first = setup();
    act(() => {
      first.result.current.toggleFavorite("t-4");
    });
    first.unmount();
    const second = setup();
    expect(second.result.current.favorites).toEqual(["t-4"]);
  });

  it("falls back to empty when the stored value is not valid JSON", () => {
    window.localStorage.setItem("afm-favorites", "{not json");
    window.localStorage.setItem("afm-history", "also not json");
    const { result } = setup();
    expect(result.current.favorites).toEqual([]);
    expect(result.current.history).toEqual([]);
  });

  it("falls back to empty, without throwing, when the stored favorites are not a list", () => {
    for (const value of [{}, { a: 1 }, 5, 0, "abc", null, true, false]) {
      cleanup();
      window.localStorage.setItem("afm-favorites", JSON.stringify(value));
      const { result } = setup();
      expect(result.current.favorites, JSON.stringify(value)).toEqual([]);
      expect(result.current.isFavorite("t-1")).toBe(false);
    }
  });

  it("keeps only the non-empty strings, in order and without duplicates", () => {
    window.localStorage.setItem(
      "afm-favorites",
      JSON.stringify([
        "t-3",
        7,
        "",
        null,
        "t-1",
        { id: "t-9" },
        ["t-8"],
        "t-3",
        "t-2",
        false,
        "t-1",
      ]),
    );
    const { result } = setup();
    expect(result.current.favorites).toEqual(["t-3", "t-1", "t-2"]);
  });

  it("keeps ids that are not in the music catalog, such as generated tracks", () => {
    const ids = ["gen-draft-1f3a", "studio-result-9", "t-1", "chart-1-Not In Catalog"];
    window.localStorage.setItem("afm-favorites", JSON.stringify(ids));
    const { result } = setup();
    expect(result.current.favorites).toEqual(ids);
    expect(result.current.isFavorite("gen-draft-1f3a")).toBe(true);
  });

  it("reads a valid stored list back unchanged", () => {
    const ids = ["t-4", "t-2", "t-9"];
    window.localStorage.setItem("afm-favorites", JSON.stringify(ids));
    const { result } = setup();
    expect(result.current.favorites).toEqual(ids);
  });

  it("works normally after recovering from an invalid stored value", () => {
    window.localStorage.setItem("afm-favorites", JSON.stringify({ broken: true }));
    const { result } = setup();
    expect(result.current.favorites).toEqual([]);
    act(() => {
      result.current.toggleFavorite("t-1");
    });
    act(() => {
      result.current.toggleFavorite("t-2");
    });
    expect(result.current.favorites).toEqual(["t-2", "t-1"]);
    expect(stored<string[]>("afm-favorites")).toEqual(["t-2", "t-1"]);
    act(() => {
      result.current.toggleFavorite("t-1");
    });
    expect(result.current.favorites).toEqual(["t-2"]);
  });

  it("does not rewrite the stored value when it loads", () => {
    const raw = JSON.stringify({ not: "a list" });
    window.localStorage.setItem("afm-favorites", raw);
    window.localStorage.setItem("afm-history", JSON.stringify([null, { id: "t-1" }]));
    const write = vi.spyOn(Storage.prototype, "setItem");
    try {
      const { result } = setup();
      expect(result.current.favorites).toEqual([]);
      expect(write).not.toHaveBeenCalled();
      expect(window.localStorage.getItem("afm-favorites")).toBe(raw);
    } finally {
      write.mockRestore();
    }
  });
});

describe("toggleFavorite return value", () => {
  /** Calls toggleFavorite for each id inside one act() and returns what each call answered. */
  const toggleAll = (result: ReturnType<typeof setup>["result"], ids: string[]) => {
    const answers: boolean[] = [];
    act(() => {
      for (const id of ids) answers.push(result.current.toggleFavorite(id));
    });
    return answers;
  };

  it("returns true when it adds and false when it removes", () => {
    const { result } = setup();
    expect(toggleAll(result, ["t-1"])).toEqual([true]);
    expect(result.current.favorites).toEqual(["t-1"]);
    expect(toggleAll(result, ["t-1"])).toEqual([false]);
    expect(result.current.favorites).toEqual([]);
  });

  it("answers correctly for a favorite loaded from storage", () => {
    window.localStorage.setItem("afm-favorites", JSON.stringify(["t-1", "t-2"]));
    const { result } = setup();
    expect(toggleAll(result, ["t-1"])).toEqual([false]);
    expect(toggleAll(result, ["t-1"])).toEqual([true]);
    expect(result.current.favorites).toEqual(["t-1", "t-2"]);
  });

  it("stays coherent when it is called several times in the same act", () => {
    const { result } = setup();
    expect(toggleAll(result, ["t-1", "t-1"])).toEqual([true, false]);
    expect(result.current.favorites).toEqual([]);
    expect(toggleAll(result, ["t-1", "t-1", "t-1"])).toEqual([true, false, true]);
    expect(result.current.favorites).toEqual(["t-1"]);
    expect(stored<string[]>("afm-favorites")).toEqual(["t-1"]);
  });

  it("handles different tracks in the same act", () => {
    const { result } = setup();
    expect(toggleAll(result, ["t-1", "t-2", "t-1", "t-3"])).toEqual([true, true, false, true]);
    expect(result.current.favorites).toEqual(["t-3", "t-2"]);
    expect(stored<string[]>("afm-favorites")).toEqual(["t-3", "t-2"]);
  });

  it("keeps the answer, the state and the storage in agreement over a long series", () => {
    const { result } = setup();
    const ids = ["t-1", "t-2", "t-1", "t-3", "t-2", "t-2", "t-1", "t-3"];
    const model: string[] = [];
    for (const id of ids) {
      const wasFavorite = model.includes(id);
      if (wasFavorite) model.splice(model.indexOf(id), 1);
      else model.unshift(id);
      expect(toggleAll(result, [id]), id).toEqual([!wasFavorite]);
      expect(result.current.favorites).toEqual(model);
      expect(stored<string[]>("afm-favorites")).toEqual(model);
    }
  });

  it("works for generated tracks that are not in the catalog", () => {
    const { result } = setup();
    expect(toggleAll(result, ["gen-draft-1f3a"])).toEqual([true]);
    expect(result.current.isFavorite("gen-draft-1f3a")).toBe(true);
    expect(stored<string[]>("afm-favorites")).toEqual(["gen-draft-1f3a"]);
    expect(toggleAll(result, ["gen-draft-1f3a"])).toEqual([false]);
    expect(stored<string[]>("afm-favorites")).toEqual([]);
  });

  it("writes the favorites once per call, even when React runs updaters twice", () => {
    // StrictMode runs state updaters twice: a write made inside one would be repeated.
    const strict = ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <LibraryProvider>{children}</LibraryProvider>
      </StrictMode>
    );
    const { result } = renderHook(() => useLibrary(), { wrapper: strict });
    const write = vi.spyOn(Storage.prototype, "setItem");
    try {
      expect(toggleAll(result, ["t-1"])).toEqual([true]);
      expect(toggleAll(result, ["t-1"])).toEqual([false]);
      const favoriteWrites = write.mock.calls.filter(([key]) => key === "afm-favorites");
      expect(favoriteWrites).toHaveLength(2);
    } finally {
      write.mockRestore();
    }
  });

  it("keeps the other behaviors: history and a second mount are unaffected", () => {
    const first = setup();
    toggleAll(first.result, ["t-1", "t-2"]);
    act(() => {
      first.result.current.recordPlay("t-9");
    });
    first.unmount();
    const second = setup();
    expect(second.result.current.favorites).toEqual(["t-2", "t-1"]);
    expect(second.result.current.history.map((h) => h.id)).toEqual(["t-9"]);
    expect(toggleAll(second.result, ["t-2"])).toEqual([false]);
  });
});

describe("history", () => {
  it("records plays newest first with a timestamp", () => {
    const { result } = setup();
    act(() => {
      result.current.recordPlay("t-1");
    });
    act(() => {
      result.current.recordPlay("t-2");
    });
    expect(result.current.history.map((h) => h.id)).toEqual(["t-2", "t-1"]);
    expect(typeof result.current.history[0].at).toBe("number");
  });

  it("moves a replayed track to the front instead of duplicating it", () => {
    const { result } = setup();
    act(() => {
      ["t-1", "t-2", "t-3", "t-1"].forEach((id) => result.current.recordPlay(id));
    });
    expect(result.current.history.map((h) => h.id)).toEqual(["t-1", "t-3", "t-2"]);
  });

  it("keeps at most 24 entries and drops the oldest", () => {
    const { result } = setup();
    act(() => {
      for (let i = 0; i < 30; i++) result.current.recordPlay(`t-${i}`);
    });
    const list = result.current.history.map((h) => h.id);
    expect(list).toHaveLength(24);
    expect(list[0]).toBe("t-29");
    expect(list[23]).toBe("t-6");
    expect(list).not.toContain("t-5");
    expect(stored<HistoryEntry[]>("afm-history")).toHaveLength(24);
  });

  it("clears the history in state and in storage", () => {
    const { result } = setup();
    act(() => {
      result.current.recordPlay("t-1");
    });
    act(() => result.current.clearHistory());
    expect(result.current.history).toEqual([]);
    expect(stored<HistoryEntry[]>("afm-history")).toEqual([]);
  });

  it("survives an unmount and a fresh mount", () => {
    const first = setup();
    act(() => {
      first.result.current.recordPlay("t-7");
    });
    first.unmount();
    const second = setup();
    expect(second.result.current.history.map((h) => h.id)).toEqual(["t-7"]);
  });
});

describe("history: stored values that are not what the app expects", () => {
  const entry = (id: string, at: number) => ({ id, at });

  it("falls back to empty, without throwing, when the stored history is not a list", () => {
    for (const value of [{}, { id: "t-1", at: 1 }, 5, "abc", null, true]) {
      cleanup();
      window.localStorage.setItem("afm-history", JSON.stringify(value));
      const { result } = setup();
      expect(result.current.history, JSON.stringify(value)).toEqual([]);
    }
  });

  it("keeps only complete entries and drops null, incomplete and mistyped ones", () => {
    window.localStorage.setItem(
      "afm-history",
      JSON.stringify([
        entry("t-1", 300),
        null,
        "t-2",
        [],
        { at: 250 },
        { id: "t-3" },
        { id: "", at: 240 },
        { id: 9, at: 230 },
        { id: "t-4", at: "230" },
        { id: "t-5", at: null },
        entry("t-6", 200),
        entry("t-7", 0),
      ]),
    );
    const { result } = setup();
    expect(result.current.history).toEqual([entry("t-1", 300), entry("t-6", 200), entry("t-7", 0)]);
  });

  it("keeps one entry per id, the first (most recent) one", () => {
    window.localStorage.setItem(
      "afm-history",
      JSON.stringify([entry("t-1", 30), entry("t-2", 20), entry("t-1", 10)]),
    );
    const { result } = setup();
    expect(result.current.history).toEqual([entry("t-1", 30), entry("t-2", 20)]);
  });

  it("keeps at most 24 entries when more are stored", () => {
    const many = Array.from({ length: 40 }, (_, i) => entry(`t-${i}`, 1000 - i));
    window.localStorage.setItem("afm-history", JSON.stringify(many));
    const { result } = setup();
    expect(result.current.history).toHaveLength(24);
    expect(result.current.history[0].id).toBe("t-0");
    expect(result.current.history[23].id).toBe("t-23");
  });

  it("keeps ids that are not in the music catalog", () => {
    window.localStorage.setItem("afm-history", JSON.stringify([entry("gen-draft-1f3a", 5)]));
    const { result } = setup();
    expect(result.current.history.map((h) => h.id)).toEqual(["gen-draft-1f3a"]);
  });

  it("reads a valid stored history back unchanged, extra fields included", () => {
    const valid = [{ id: "t-2", at: 22, source: "radio" }, entry("t-1", 11)];
    window.localStorage.setItem("afm-history", JSON.stringify(valid));
    const { result } = setup();
    expect(result.current.history).toEqual(valid);
  });

  it("records new plays normally after recovering from an invalid stored value", () => {
    window.localStorage.setItem("afm-history", JSON.stringify("corrupted"));
    const { result } = setup();
    act(() => {
      result.current.recordPlay("t-1");
    });
    expect(result.current.history.map((h) => h.id)).toEqual(["t-1"]);
    expect(stored<HistoryEntry[]>("afm-history").map((h) => h.id)).toEqual(["t-1"]);
  });
});

describe("storage validators", () => {
  it("rejects non-finite or non-numeric timestamps that JSON cannot carry", () => {
    const input = [
      { id: "a", at: Number.NaN },
      { id: "b", at: Number.POSITIVE_INFINITY },
      { id: "c", at: Number.NEGATIVE_INFINITY },
      { id: "d", at: 1 },
    ];
    expect(parseHistory<HistoryEntry>(input, 24).map((h) => h.id)).toEqual(["d"]);
  });

  it("applies the limit to the entries kept, not to the raw list", () => {
    const input = [null, entry0("a"), "x", entry0("b"), entry0("c")];
    expect(parseHistory<HistoryEntry>(input, 2).map((h) => h.id)).toEqual(["a", "b"]);
  });

  it("never touches the input values", () => {
    const ids = ["t-1", "t-1", 3];
    const copy = JSON.stringify(ids);
    parseIdList(ids);
    expect(JSON.stringify(ids)).toBe(copy);
  });
});

function entry0(id: string): HistoryEntry {
  return { id, at: 1 };
}

describe("onboarding", () => {
  it("remembers that the checklist was dismissed", () => {
    const first = setup();
    expect(first.result.current.onboardingDismissed).toBe(false);
    act(() => first.result.current.dismissOnboarding());
    expect(first.result.current.onboardingDismissed).toBe(true);
    expect(window.localStorage.getItem("afm-onboarding-dismissed")).toBe("1");
    first.unmount();
    const second = setup();
    expect(second.result.current.onboardingDismissed).toBe(true);
  });
});
