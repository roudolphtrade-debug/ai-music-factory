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
  if (!hasIDB()) return;
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
  if (!hasIDB()) return [];
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

export async function deleteDraft(id: string): Promise<void> {
  if (!hasIDB()) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
