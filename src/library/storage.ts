/**
 * Pure validators for values read back from localStorage.
 *
 * `JSON.parse` only guarantees valid JSON, not the shape the app expects. These functions keep
 * what is usable and drop the rest, so that a stale or hand-edited value can never reach React
 * state in a form that makes a component throw. They never look at the music catalog: an id is
 * kept even when no catalog track matches it (generated drafts and studio results are favorited
 * too).
 */

/** A non-empty string list, in its original order and without duplicates. */
export function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item === "" || seen.has(item)) continue;
    seen.add(item);
    ids.push(item);
  }
  return ids;
}

/**
 * Entries made of a non-empty string `id` and a finite numeric `at`, newest first as stored,
 * one entry per id (the first one wins) and at most `limit` entries. Valid entries are returned
 * as they are, so a valid stored history is read back unchanged.
 */
export function parseHistory<T extends { id: string; at: number }>(
  value: unknown,
  limit: number,
): T[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const entries: T[] = [];
  for (const item of value) {
    if (entries.length >= limit) break;
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const { id, at } = item as Record<string, unknown>;
    if (typeof id !== "string" || id === "" || seen.has(id)) continue;
    if (typeof at !== "number" || !Number.isFinite(at)) continue;
    seen.add(id);
    entries.push(item as T);
  }
  return entries;
}
