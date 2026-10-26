import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/auth/context";
import {
  deleteDraft as idbDelete,
  deleteDraftsOf,
  deleteUnownedDrafts,
  getAllDrafts,
  putDraft,
  type GeneratedDraftMeta,
  type GeneratedDraftRecord,
} from "@/library/generatedDrafts";
import { emitDraftsErased } from "@/library/draftEvents";
import {
  DraftDiscardedError,
  DraftsContext,
  type ClaimResult,
  type DraftsValue,
  type GeneratedDraft,
} from "@/library/draftsContext";

/**
 * The member's generated tracks (prompt, lyrics, audio), kept on this device and belonging to the
 * signed-in account only:
 *  - another account never sees them, even when the first session ended without a sign-out;
 *  - a deliberate sign-out erases them (`eraseMine`), with their in-memory references and their
 *    temporary object URLs, and tells the player to let those tracks go;
 *  - an answer that arrives after the account changed is dropped, and what it had written is deleted;
 *  - tracks made before accounts existed belong to nobody. They are NEVER attached to an account by
 *    themselves: they stay on the disk, untouched and hidden, and only an explicit, confirmed action
 *    of the member (`claimUnassigned`, `deleteUnassigned`) changes them. A device may be shared:
 *    that confirmation does not prove who made them.
 * Limit: it is the application that separates accounts, not the browser (see studio/prep.ts).
 */
export function GeneratedDraftsProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const userId = status === "signedIn" ? (user?.id ?? null) : null;
  const [drafts, setDrafts] = useState<GeneratedDraft[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
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
    setUnassignedCount(0);
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
      .then((records) => {
        if (epoch.current !== mine) return;
        // Only this account's tracks are kept in memory. A track with no owner is only counted: no
        // address is made for it and it is not written to, so it stays exactly as it was.
        setDrafts(records.filter((rec) => rec.ownerId === userId).map(toDraft));
        setUnassignedCount(records.filter((rec) => rec.ownerId === undefined).length);
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
    // Only this account's tracks. The unassigned ones are not the member's to erase: they stay.
    if (who) await deleteDraftsOf(who).catch(() => {});
  }, [dropMemory]);

  const claimUnassigned = useCallback(async (): Promise<ClaimResult> => {
    const startedFor = owner.current;
    const mine = epoch.current;
    if (!startedFor) return { moved: 0, failed: 0 };
    const unowned = (await getAllDrafts()).filter((rec) => rec.ownerId === undefined);
    const moved: GeneratedDraftRecord[] = [];
    let failed = 0;
    for (const rec of unowned) {
      const attached = { ...rec, ownerId: startedFor };
      try {
        await putDraft(attached);
        moved.push(attached);
      } catch {
        failed++; // this one stays unassigned, as it was
      }
    }
    // The tracks now belong to the account that confirmed. They are shown only if that account is still
    // the one signed in; otherwise they simply wait, on the disk, for their owner's next visit.
    if (epoch.current === mine && owner.current === startedFor) {
      const added = moved.map(toDraft);
      setDrafts((prev) => [...added, ...prev].sort((a, b) => b.createdAt - a.createdAt));
      setUnassignedCount(failed);
    }
    return { moved: moved.length, failed };
  }, [toDraft]);

  const deleteUnassigned = useCallback(async () => {
    const startedFor = owner.current;
    const mine = epoch.current;
    const removed = await deleteUnownedDrafts();
    if (epoch.current === mine && owner.current === startedFor) setUnassignedCount(0);
    return removed;
  }, []);

  const value = useMemo<DraftsValue>(
    () => ({
      drafts,
      ready,
      unassignedCount,
      addDraft,
      removeDraft,
      keepUrl,
      eraseMine,
      claimUnassigned,
      deleteUnassigned,
    }),
    [
      drafts,
      ready,
      unassignedCount,
      addDraft,
      removeDraft,
      keepUrl,
      eraseMine,
      claimUnassigned,
      deleteUnassigned,
    ],
  );

  return <DraftsContext.Provider value={value}>{children}</DraftsContext.Provider>;
}
