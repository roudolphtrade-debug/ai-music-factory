/** Pure queue helpers shared by the player; kept side-effect free for tests. */
export type RepeatMode = "off" | "all" | "one";

/** Fisher-Yates shuffle keeping the item at `keepIndex` first. */
export function shuffleKeepingFirst<T>(items: T[], keepIndex: number, rng: () => number = Math.random): T[] {
  if (items.length === 0) return [];
  const safe = Math.min(Math.max(keepIndex, 0), items.length - 1);
  const first = items[safe];
  const rest = items.filter((_, i) => i !== safe);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [first, ...rest];
}

/**
 * Index to play after a track ends. `null` means stop.
 * Manual "next" always wraps (manual = true) to keep the historical behaviour.
 */
export function nextIndex(length: number, index: number, repeat: RepeatMode, manual = false): number | null {
  if (length === 0) return null;
  if (!manual && repeat === "one") return index;
  if (index + 1 < length) return index + 1;
  return manual || repeat === "all" ? 0 : null;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Queue and start index for playing `track` out of `queue`.
 * A track that is not part of the supplied queue is placed first, so that
 * `queue[index]` is always the track that is actually played.
 */
export function resolvePlayQueue<T extends { id: string }>(
  track: T,
  queue?: T[],
): { queue: T[]; index: number } {
  const base = queue && queue.length ? queue : [track];
  const found = base.findIndex((t) => t.id === track.id);
  return found === -1 ? { queue: [track, ...base], index: 0 } : { queue: base, index: found };
}

/** Removes the first item with the given id. Returns `items` itself when absent. */
export function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  const at = items.findIndex((t) => t.id === id);
  return at === -1 ? items : items.filter((_, i) => i !== at);
}

/**
 * Index of the item that sat at `current` once `moveItem(items, from, to)` was applied.
 * Position-based, so it stays correct when several items share the same id.
 */
export function indexAfterMove(current: number, from: number, to: number): number {
  if (current === from) return to;
  if (from < current && to >= current) return current - 1;
  if (from > current && to <= current) return current + 1;
  return current;
}

export const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = { all: "one", one: "off", off: "all" };
