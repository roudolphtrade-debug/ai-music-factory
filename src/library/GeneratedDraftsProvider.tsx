import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/auth/context";
import {
  deleteDraft as idbDelete,
  deleteDraftsOf,
  getAllDrafts,
  putDraft,
  type GeneratedDraftMeta,
  type GeneratedDraftRecord,
} from "@/library/generatedDrafts";
import { emitDraftsErased } from "@/library/draftEvents";

/** A draft with a live object URL for playback. */
export interface GeneratedDraft extends GeneratedDraftMeta {
  url: string;
}

/**
 * Thrown by `addDraft` when the answer comes too late: the member signed out (or another account took
 * over) while the track was being generated. Nothing is kept, in memory or on disk.
 */
export class DraftDiscardedError extends Error {
  constructor() {
    super("draft discarded: the account changed while it was being generated");
    this.name = "DraftDiscardedError";
  }
}

interface DraftsValue {
  drafts: GeneratedDraft[];
  ready: boolean;
  addDraft: (meta: GeneratedDraftMeta, blob: Blob) => Promise<GeneratedDraft>;
  removeDraft: (id: string) => Promise<void>;
  /** Makes a temporary address (a track the device could not keep) subject to the same erasure. */
  keepUrl: (url: string) => string;
  /** Erases this account's drafts: disk, memory, temporary addresses. Late answers are discarded. */
  eraseMine: () => Promise<void>;
}

const DraftsContext = createContext<DraftsValue | null>(null);

/**
 * The member's generated tracks (prompt, lyrics, audio), kept on this device and belonging to the
 * signed-in account only:
 *  - another account never sees them, even when the first session ended without a sign-out;
 *  - a deliberate sign-out erases them (`eraseMine`), with their in-memory references and their
 *    temporary object URLs, and tells the player to let those tracks go;
 *  - an answer that arrives after the account changed is dropped, and what it had written is deleted.
 * Limit: it is the application that separates accounts, not the browser (see studio/prep.ts).
 */
export function GeneratedDraftsProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const userId = status === "signedIn" ? (user?.id ?? null) : null;
  const [drafts, setDrafts] = useState<GeneratedDraft[]>([]);
  const [ready, setReady] = useState(false);
  // Every temporary address created here, so that all of them can be revoked.
  const urls = useRef<Set<string>>(new Set());
  // Who the drafts in memory belong to, and a counter that changes whenever that must be forgotten.
  const owner = useRef<string | null>(null);
  const epoch = useRef(0);

  const toDraft = useCallback((rec: GeneratedDraftRecord): GeneratedDraft => {
    const url = URL.createObjectURL(rec.blob);
    urls.current.add(url);
    const { blob: _blob, ...meta } = rec;
    void _blob;
    return { ...meta, url };
  }, []);

  /** Forgets everything held in memory and revokes the addresses; the player is told. */
  const dropMemory = useCallback(() => {
    const gone = [...urls.current];
    gone.forEach((u) => URL.revokeObjectURL(u));
    urls.current.clear();
    setDrafts([]);
    emitDraftsErased(gone);
  }, []);

  // The account changed (signed in, signed out, another account): load its drafts, and nothing else.
  useEffect(() => {
    owner.current = userId;
    const mine = ++epoch.current;
    dropMemory();
    if (status === "loading") {
      setReady(false);
      return;
    }
    if (!userId) {
      setReady(true);
      return;
    }
    setReady(false);
    getAllDrafts()
      .then(async (records) => {
        if (epoch.current !== mine) return;
        const own: GeneratedDraftRecord[] = [];
        for (const rec of records) {
          if (rec.ownerId === userId) own.push(rec);
          else if (rec.ownerId === undefined) {
            // A draft from before accounts existed on this device: the first account takes it over.
            const adopted = { ...rec, ownerId: userId };
            try {
              await putDraft(adopted);
            } catch {
              /* kept in memory only */
            }
            own.push(adopted);
          }
        }
        if (epoch.current !== mine) return;
        setDrafts(own.map(toDraft));
      })
      .catch(() => {})
      .finally(() => {
        if (epoch.current === mine) setReady(true);
      });
  }, [status, userId, dropMemory, toDraft]);

  useEffect(
    () => () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current.clear();
    },
    [],
  );

  const addDraft = useCallback(
    async (meta: GeneratedDraftMeta, blob: Blob) => {
      const startedFor = owner.current;
      const mine = epoch.current;
      if (!startedFor) throw new DraftDiscardedError();
      const record: GeneratedDraftRecord = { ...meta, ownerId: startedFor, blob };
      await putDraft(record);
      if (epoch.current !== mine || owner.current !== startedFor) {
        // too late: the account changed while this was being written. Undo it.
        await idbDelete(meta.id).catch(() => {});
        throw new DraftDiscardedError();
      }
      const draft = toDraft(record);
      setDrafts((prev) => [draft, ...prev]);
      return draft;
    },
    [toDraft],
  );

  const removeDraft = useCallback(async (id: string) => {
    await idbDelete(id);
    setDrafts((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        urls.current.delete(target.url);
      }
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  const keepUrl = useCallback((url: string) => {
    urls.current.add(url);
    return url;
  }, []);

  const eraseMine = useCallback(async () => {
    const who = owner.current;
    epoch.current++; // from now on, any answer still on its way is discarded
    dropMemory();
    if (who) await deleteDraftsOf(who).catch(() => {});
  }, [dropMemory]);

  const value = useMemo<DraftsValue>(
    () => ({ drafts, ready, addDraft, removeDraft, keepUrl, eraseMine }),
    [drafts, ready, addDraft, removeDraft, keepUrl, eraseMine],
  );

  return <DraftsContext.Provider value={value}>{children}</DraftsContext.Provider>;
}

export function useGeneratedDrafts() {
  const ctx = useContext(DraftsContext);
  if (!ctx) throw new Error("useGeneratedDrafts must be used within GeneratedDraftsProvider");
  return ctx;
}

/** The same store, or `null` where there is none (the account menu is rendered in tests without it). */
export function useGeneratedDraftsOptional() {
  return useContext(DraftsContext);
}
