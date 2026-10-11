import { describe, expect, it } from "vitest";
import { moveItem, nextIndex, shuffleKeepingFirst, REPEAT_CYCLE } from "./queue";

describe("queue rules", () => {
  it("shuffle keeps the current track first and every track once", () => {
    const out = shuffleKeepingFirst(["a", "b", "c", "d", "e"], 2);
    expect(out[0]).toBe("c");
    expect([...out].sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("repeat one replays the same track when it ends", () => {
    expect(nextIndex(5, 2, "one")).toBe(2);
  });

  it("repeat all wraps to the first track after the last", () => {
    expect(nextIndex(5, 4, "all")).toBe(0);
  });

  it("repeat off stops after the last track", () => {
    expect(nextIndex(5, 4, "off")).toBeNull();
  });

  it("manual next always moves forward and wraps", () => {
    expect(nextIndex(5, 2, "one", true)).toBe(3);
    expect(nextIndex(5, 4, "off", true)).toBe(0);
  });

  it("moves an item to a new position", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("repeat button cycles all → one → off", () => {
    expect(REPEAT_CYCLE.all).toBe("one");
    expect(REPEAT_CYCLE.one).toBe("off");
    expect(REPEAT_CYCLE.off).toBe("all");
  });
});
