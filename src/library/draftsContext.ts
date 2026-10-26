import { createContext, useContext } from "react";
import type { GeneratedDraftMeta } from "@/library/generatedDrafts";

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

/**
 * What a recovery of the unassigned titles did. It is all or nothing:
 *  - `moved` titles attached, none failed, not cancelled;
 *  - `failed`: the write could not be completed and NOTHING was attached;
 *  - `cancelled`: the account changed (or signed out) while it was being written, so everything was put back
 *    to unassigned. Either way no title is ever left half attached, or attached to an account that has gone.
 */
export interface ClaimResult {
  moved: number;
  failed: boolean;
  cancelled: boolean;
}

export interface DraftsValue {
  /** The signed-in account's own tracks. Never anyone else's, never an unassigned one. */
  drafts: GeneratedDraft[];
  ready: boolean;
  /**
   * How many tracks on this device belong to nobody (made before accounts existed). They are hidden,
   * not played, not held in memory, and left exactly as they are until the member confirms what to do.
   */
  unassignedCount: number;
  addDraft: (meta: GeneratedDraftMeta, blob: Blob) => Promise<GeneratedDraft>;
  /** Deletes one of this account's tracks. Resolves to false (and deletes nothing) if it is not this account's. */
  removeDraft: (id: string) => Promise<boolean>;
  /** Makes a temporary address (a track the device could not keep) subject to the same erasure. */
  keepUrl: (url: string) => string;
  /** Erases this account's drafts: disk, memory, temporary addresses. Late answers are discarded. */
  eraseMine: () => Promise<void>;
  /**
   * Attaches the unassigned tracks to the signed-in account. To be called only after an explicit
   * confirmation: it does not check who made them (nothing on a device can).
   */
  claimUnassigned: () => Promise<ClaimResult>;
  /** Deletes the unassigned tracks for good, after an explicit confirmation. Returns how many went. */
  deleteUnassigned: () => Promise<number>;
}

export const DraftsContext = createContext<DraftsValue | null>(null);

export function useGeneratedDrafts() {
  const ctx = useContext(DraftsContext);
  if (!ctx) throw new Error("useGeneratedDrafts must be used within GeneratedDraftsProvider");
  return ctx;
}

/** The same store, or `null` where there is none (the account menu is rendered in tests without it). */
export function useGeneratedDraftsOptional() {
  return useContext(DraftsContext);
}
