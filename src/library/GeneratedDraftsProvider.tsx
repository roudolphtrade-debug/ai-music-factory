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
import {
  deleteDraft as idbDelete,
  getAllDrafts,
  putDraft,
  type GeneratedDraftMeta,
  type GeneratedDraftRecord,
} from "@/library/generatedDrafts";

/** A draft with a live object URL for playback. */
export interface GeneratedDraft extends GeneratedDraftMeta {
  url: string;
}

interface DraftsValue {
  drafts: GeneratedDraft[];
  ready: boolean;
  addDraft: (meta: GeneratedDraftMeta, blob: Blob) => Promise<GeneratedDraft>;
  removeDraft: (id: string) => Promise<void>;
}

const DraftsContext = createContext<DraftsValue | null>(null);

export function GeneratedDraftsProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<GeneratedDraft[]>([]);
  const [ready, setReady] = useState(false);
  // Track created object URLs so we can revoke them on unmount.
  const urls = useRef<Set<string>>(new Set());

  const toDraft = useCallback((rec: GeneratedDraftRecord): GeneratedDraft => {
    const url = URL.createObjectURL(rec.blob);
    urls.current.add(url);
    const { blob: _blob, ...meta } = rec;
    void _blob;
    return { ...meta, url };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAllDrafts()
      .then((records) => {
        if (cancelled) return;
        setDrafts(records.map(toDraft));
      })
      .catch(() => {})
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [toDraft]);

  useEffect(
    () => () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current.clear();
    },
    [],
  );

  const addDraft = useCallback(
    async (meta: GeneratedDraftMeta, blob: Blob) => {
      await putDraft({ ...meta, blob });
      const draft = toDraft({ ...meta, blob });
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

  const value = useMemo<DraftsValue>(
    () => ({ drafts, ready, addDraft, removeDraft }),
    [drafts, ready, addDraft, removeDraft],
  );

  return <DraftsContext.Provider value={value}>{children}</DraftsContext.Provider>;
}

export function useGeneratedDrafts() {
  const ctx = useContext(DraftsContext);
  if (!ctx) throw new Error("useGeneratedDrafts must be used within GeneratedDraftsProvider");
  return ctx;
}
