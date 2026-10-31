/**
 * IndexedDB store for AI-generated track drafts.
 * Audio blobs are too large for localStorage, so we persist the full record
 * (metadata + MP3 Blob) in IndexedDB and rebuild object URLs on load.
 */

export interface GeneratedDraftMeta {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  mood: string;
  voice: string;
  lyrics: string;
  duration: string;
  createdAt: number;
  /**
   * The account the draft belongs to. The prompt, the lyrics and the audio are the member's own data:
   * only that account sees them, and they are erased when it signs out. Drafts from before accounts
   * existed have no owner. They are never attached to an account automatically: they stay hidden and
   * untouched until a member confirms, on purpose, to take them over or to delete them.
   */
  ownerId?: string;
}

export interface GeneratedDraftRecord extends GeneratedDraftMeta {
  blob: Blob;
}

const DB_NAME = "afm-studio";
const STORE = "drafts";
const VERSION = 1;

function hasIDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

/**
 * This device has no IndexedDB (an old or restricted browser). Saving and reading must say so: resolving
 * as if the track was saved, or as if there were none, would lose it at the next reload without a word.
 */
export class IndexedDbUnavailableError extends Error {
  constructor() {
    super("IndexedDB is not available on this device");
    this.name = "IndexedDbUnavailableError";
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putDraft(record: GeneratedDraftRecord): Promise<void> {
  if (!hasIDB()) throw new IndexedDbUnavailableError();
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getAllDrafts(): Promise<GeneratedDraftRecord[]> {
  if (!hasIDB()) throw new IndexedDbUnavailableError();
  const db = await openDB();
  const records = await new Promise<GeneratedDraftRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as GeneratedDraftRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return records.sort((a, b) => b.createdAt - a.createdAt);
}

/** Deletes every draft of one account (and only that account's) in a single transaction. */
export async function deleteDraftsOf(ownerId: string): Promise<void> {
  if (!hasIDB()) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const cursorRequest = tx.objectStore(STORE).openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      if ((cursor.value as GeneratedDraftMeta).ownerId === ownerId) cursor.delete();
      cursor.continue();
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Deletes every draft that belongs to nobody, in a single transaction. Returns how many went. */
export async function deleteUnownedDrafts(): Promise<number> {
  if (!hasIDB()) return 0;
  const db = await openDB();
  let removed = 0;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const cursorRequest = tx.objectStore(STORE).openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      if ((cursor.value as GeneratedDraftMeta).ownerId === undefined) {
        cursor.delete();
        removed++;
      }
      cursor.continue();
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return removed;
}

/**
 * Attaches EVERY unowned draft to `ownerId` in ONE transaction: all of them or none. If any write fails the
 * transaction aborts and nothing is attached, so there is never a half-attached state. Returns the drafts
 * that were attached (empty when there was nothing to attach).
 */
export async function claimUnownedDrafts(ownerId: string): Promise<GeneratedDraftRecord[]> {
  if (!hasIDB()) return [];
  const db = await openDB();
  const claimed: GeneratedDraftRecord[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const cursorRequest = tx.objectStore(STORE).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const value = cursor.value as GeneratedDraftRecord;
        if (value.ownerId === undefined) {
          const next = { ...value, ownerId };
          cursor.update(next);
          claimed.push(next);
        }
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("transaction aborted"));
    });
  } finally {
    db.close();
  }
  return claimed;
}

/**
 * Puts drafts back to "unowned", but only those that are still owned by `ownerId`, in one transaction.
 * Used to undo an attachment that finished after the account had changed.
 */
export async function releaseDrafts(ids: readonly string[], ownerId: string): Promise<number> {
  if (!hasIDB() || ids.length === 0) return 0;
  const wanted = new Set(ids);
  const db = await openDB();
  let released = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const cursorRequest = tx.objectStore(STORE).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const value = cursor.value as GeneratedDraftRecord;
        if (wanted.has(value.id) && value.ownerId === ownerId) {
          const { ownerId: _owner, ...unowned } = value;
          void _owner;
          cursor.update(unowned);
          released++;
        }
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("transaction aborted"));
    });
  } finally {
    db.close();
  }
  return released;
}

/**
 * Deletes one draft, and only if it belongs to `ownerId`: the owner is checked INSIDE the transaction, at
 * the moment of the deletion, so a stale call can never remove another account's track (nor an unowned one,
 * nor a missing one). Returns whether something was deleted.
 */
export async function deleteDraftIfOwned(id: string, ownerId: string): Promise<boolean> {
  if (!hasIDB()) return false;
  const db = await openDB();
  let deleted = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const value = getRequest.result as GeneratedDraftRecord | undefined;
        if (value && value.ownerId === ownerId) {
          store.delete(id);
          deleted = true;
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("transaction aborted"));
    });
  } finally {
    db.close();
  }
  return deleted;
}
