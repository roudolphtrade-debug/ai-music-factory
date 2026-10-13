import { describe, expect, it } from "vitest";
import {
  indexAfterMove,
  moveItem,
  nextIndex,
  removeById,
  resolvePlayQueue,
  shuffleKeepingFirst,
  REPEAT_CYCLE,
} from "./queue";

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

describe("play queue resolution", () => {
  const item = (id: string) => ({ id });

  it("keeps the queue and finds the index when the track belongs to it", () => {
    const q = [item("a"), item("b"), item("c")];
    expect(resolvePlayQueue(q[1], q)).toEqual({ queue: q, index: 1 });
  });

  it("places a track that is not in the queue first, so queue[index] is the played track", () => {
    const out = resolvePlayQueue(item("x"), [item("a"), item("b")]);
    expect(out.index).toBe(0);
    expect(out.queue.map((i) => i.id)).toEqual(["x", "a", "b"]);
    expect(out.queue[out.index].id).toBe("x");
  });

  it("falls back to a single-track queue when none is supplied", () => {
    expect(resolvePlayQueue(item("x"))).toEqual({ queue: [item("x")], index: 0 });
    expect(resolvePlayQueue(item("x"), [])).toEqual({ queue: [item("x")], index: 0 });
  });
});

describe("queue removal", () => {
  const item = (id: string) => ({ id });

  it("removes the first item with the given id", () => {
    expect(removeById([item("a"), item("b"), item("a")], "a")).toEqual([item("b"), item("a")]);
  });

  it("returns the very same array when the id is absent", () => {
    const items = [item("a"), item("b")];
    expect(removeById(items, "z")).toBe(items);
  });
});

describe("index tracking after a move", () => {
  it("follows the item that was moved", () => {
    expect(indexAfterMove(2, 2, 0)).toBe(0);
    expect(indexAfterMove(0, 0, 4)).toBe(4);
  });

  it("shifts back when an earlier item moves past the current one", () => {
    expect(indexAfterMove(3, 0, 4)).toBe(2);
    expect(indexAfterMove(3, 1, 3)).toBe(2);
  });

  it("shifts forward when a later item moves before the current one", () => {
    expect(indexAfterMove(1, 4, 0)).toBe(2);
    expect(indexAfterMove(1, 3, 1)).toBe(2);
  });

  it("is unchanged for moves that stay on one side of the current item", () => {
    expect(indexAfterMove(3, 0, 1)).toBe(3);
    expect(indexAfterMove(1, 3, 4)).toBe(1);
  });

  it("always points at the same item as moveItem, even with duplicate ids", () => {
    const items = ["b", "a", "b", "c", "b"].map((id, n) => ({ id, n }));
    for (let current = 0; current < items.length; current++) {
      for (let from = 0; from < items.length; from++) {
        for (let to = 0; to < items.length; to++) {
          const moved = moveItem(items, from, to);
          expect(moved[indexAfterMove(current, from, to)]).toBe(items[current]);
        }
      }
    }
  });
});
