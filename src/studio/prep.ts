/**
 * The studio preparation (prompt, genre, mood, voice), kept on this device.
 *
 *  - Kept for seven days after the last change, also after a successful generation.
 *  - Each account has its own slot, and visitors share an anonymous one, so one account never sees or
 *    resumes another account's preparation. A preparation made without an account is handed to the
 *    account that signs in or up through the Generate click that set the claim (valid 24 hours).
 *  - Erased on a deliberate sign-out, after a warning (see AccountMenu).
 *
 * LIMITS of local storage, said plainly: this separation is applicative, not a security boundary.
 * Anyone with the browser's developer tools on the same profile can read every slot. A session that
 * ends without a deliberate sign-out (expired, signed out from another tab) leaves the slot in place
 * until it expires; only its own account can resume it. It never leaves this browser: another device
 * or another browser starts empty. Private browsing or blocked storage means nothing is kept, and
 * the studio then behaves as before.
 */
export const PREP_PREFIX = "afm-studio-prep:";
export const PREP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const CLAIM_TTL_MS = 24 * 60 * 60 * 1000;
export const PREP_PROMPT_MAX = 600;
const FIELD_MAX = 60;

export interface PrepFields {
  prompt: string;
  genre: string;
  mood: string;
  voice: string;
}

export type PrepOwner = { kind: "anon" } | { kind: "member"; id: string };

export interface StoredPrep {
  fields: PrepFields;
  savedAt: number;
  /** Anonymous slot only: until when the account that signs in through Generate takes it over. */
  claimUntil?: number;
}

export const ANON: PrepOwner = { kind: "anon" };
export const memberOwner = (id: string): PrepOwner => ({ kind: "member", id });

const keyOf = (owner: PrepOwner) =>
  owner.kind === "anon" ? `${PREP_PREFIX}anon` : `${PREP_PREFIX}u:${owner.id}`;

function defaultStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function bounded(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

/** A stored value that has the expected shape and sizes, or `null`. Nothing else gets through. */
export function parsePrep(raw: unknown): StoredPrep | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1 || typeof r.savedAt !== "number" || !Number.isFinite(r.savedAt)) return null;
  const f = (r.fields ?? {}) as Record<string, unknown>;
  const prompt = bounded(f.prompt, PREP_PROMPT_MAX);
  const genre = bounded(f.genre, FIELD_MAX);
  const mood = bounded(f.mood, FIELD_MAX);
  const voice = bounded(f.voice, FIELD_MAX);
  if (prompt === null || genre === null || mood === null || voice === null) return null;
  const claimUntil =
    typeof r.claimUntil === "number" && Number.isFinite(r.claimUntil) ? r.claimUntil : undefined;
  return { fields: { prompt, genre, mood, voice }, savedAt: r.savedAt, claimUntil };
}

function read(key: string, now: number, storage: Storage | null): StoredPrep | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const prep = parsePrep(JSON.parse(raw));
    // Expired, from the future, or malformed: removed, never restored.
    if (prep && now - prep.savedAt >= 0 && now - prep.savedAt < PREP_TTL_MS) return prep;
    storage.removeItem(key);
  } catch {
    /* unreadable: treated as empty */
  }
  return null;
}

/** The owner's preparation, if one exists and is younger than seven days. */
export function readPrep(
  owner: PrepOwner,
  now = Date.now(),
  storage = defaultStorage(),
): StoredPrep | null {
  return read(keyOf(owner), now, storage);
}

/**
 * Saves the preparation. `claim` (anonymous slot only) marks it as the one a sign-in started from the
 * Generate click may take over; an earlier unexpired claim is kept by later edits. Returns whether it
 * was stored (false when the storage is blocked or full).
 */
export function savePrep(
  owner: PrepOwner,
  fields: PrepFields,
  options: { now?: number; claim?: boolean; storage?: Storage | null } = {},
): boolean {
  const now = options.now ?? Date.now();
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  if (!storage) return false;
  const previous = read(keyOf(owner), now, storage);
  let claimUntil: number | undefined;
  if (owner.kind === "anon") {
    claimUntil = options.claim ? now + CLAIM_TTL_MS : previous?.claimUntil;
    if (claimUntil !== undefined && claimUntil <= now) claimUntil = undefined;
  }
  const clean: PrepFields = {
    prompt: fields.prompt.slice(0, PREP_PROMPT_MAX),
    genre: fields.genre.slice(0, FIELD_MAX),
    mood: fields.mood.slice(0, FIELD_MAX),
    voice: fields.voice.slice(0, FIELD_MAX),
  };
  try {
    storage.setItem(
      keyOf(owner),
      JSON.stringify({ v: 1, savedAt: now, fields: clean, ...(claimUntil ? { claimUntil } : {}) }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearPrep(owner: PrepOwner, storage = defaultStorage()): void {
  try {
    storage?.removeItem(keyOf(owner));
  } catch {
    /* nothing to clear */
  }
}

export function hasPrep(owner: PrepOwner, now = Date.now(), storage = defaultStorage()): boolean {
  return readPrep(owner, now, storage) !== null;
}

/**
 * A member who has just signed in or up takes over the anonymous preparation, but only when its claim
 * (set by the Generate click) is still valid. The anonymous slot is emptied either way once taken, so
 * the next account cannot take it. Without a valid claim nothing moves.
 */
export function adoptAnonymousPrep(
  userId: string,
  now = Date.now(),
  storage = defaultStorage(),
): StoredPrep | null {
  const anon = read(keyOf(ANON), now, storage);
  if (!anon || anon.claimUntil === undefined || anon.claimUntil <= now || !storage) return null;
  const moved = savePrep(memberOwner(userId), anon.fields, { now: anon.savedAt, storage });
  if (!moved) return null;
  clearPrep(ANON, storage);
  return readPrep(memberOwner(userId), now, storage);
}

/** Removes every slot older than seven days (called when the studio opens). */
export function purgeExpiredPreps(now = Date.now(), storage = defaultStorage()): void {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(PREP_PREFIX)) keys.push(key);
    }
    for (const key of keys) read(key, now, storage);
  } catch {
    /* storage unreadable: nothing to purge */
  }
}
