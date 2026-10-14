// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { LibraryProvider, useLibrary, type HistoryEntry } from "./LibraryProvider";

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

  it.todo(
    "R12: valid JSON of the wrong shape (e.g. an object) must fall back to empty instead of crashing",
  );
  it.todo(
    "R13: toggleFavorite must return true when it adds and false when it removes, whatever " +
      "React's timing: the boolean is set inside the state updater and read right after, so it " +
      "is false under act() and when updates are batched (a single browser click works today " +
      "because React runs the updater eagerly)",
  );
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
