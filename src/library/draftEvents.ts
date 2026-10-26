/**
 * A small notice between the drafts store and the player: "these object URLs are gone". The store
 * revokes the temporary URLs of the generated tracks when a member signs out (or another account takes
 * over); the player listens, so that it stops and forgets those tracks instead of holding addresses
 * that no longer point at anything.
 */
type Listener = (urls: readonly string[]) => void;
const listeners = new Set<Listener>();

export function onDraftsErased(listener: Listener): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function emitDraftsErased(urls: readonly string[]): void {
  if (urls.length === 0) return;
  for (const listener of [...listeners]) listener(urls);
}
