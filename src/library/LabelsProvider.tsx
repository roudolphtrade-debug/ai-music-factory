import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ArtistId } from "@/data/mock";
import { deriveMonogram, type LabelTier, type UserLabel } from "./labels";

const LABELS_KEY = "afm-labels";

export interface CreateLabelInput {
  name: string;
  specialty: string;
  tagline: string;
  tier: LabelTier;
  artistIds: ArtistId[];
  monogram?: string;
}

interface LabelsValue {
  labels: UserLabel[];
  getLabel: (id: string) => UserLabel | undefined;
  createLabel: (input: CreateLabelInput) => UserLabel;
  deleteLabel: (id: string) => void;
  renameLabel: (id: string, name: string) => void;
  signArtist: (id: string, artistId: ArtistId) => void;
  releaseArtist: (id: string, artistId: ArtistId) => void;
}

const LabelsContext = createContext<LabelsValue | null>(null);

function readLabels(): UserLabel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LABELS_KEY);
    return raw ? (JSON.parse(raw) as UserLabel[]) : [];
  } catch {
    return [];
  }
}

export function LabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<UserLabel[]>([]);

  useEffect(() => {
    setLabels(readLabels());
  }, []);

  const persist = useCallback((next: UserLabel[]) => {
    setLabels(next);
    try {
      window.localStorage.setItem(LABELS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const createLabel = useCallback(
    (input: CreateLabelInput) => {
      const label: UserLabel = {
        id: `ul-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        monogram: (input.monogram?.trim() || deriveMonogram(input.name)).slice(0, 2).toUpperCase(),
        specialty: input.specialty.trim(),
        tagline: input.tagline.trim(),
        tier: input.tier,
        artistIds: [...new Set(input.artistIds)],
        createdAt: Date.now(),
      };
      persist([label, ...labels]);
      return label;
    },
    [labels, persist],
  );

  const deleteLabel = useCallback(
    (id: string) => persist(labels.filter((l) => l.id !== id)),
    [labels, persist],
  );

  const renameLabel = useCallback(
    (id: string, name: string) =>
      persist(
        labels.map((l) =>
          l.id === id ? { ...l, name: name.trim(), monogram: deriveMonogram(name) } : l,
        ),
      ),
    [labels, persist],
  );

  const signArtist = useCallback(
    (id: string, artistId: ArtistId) =>
      persist(
        labels.map((l) =>
          l.id === id && !l.artistIds.includes(artistId)
            ? { ...l, artistIds: [...l.artistIds, artistId] }
            : l,
        ),
      ),
    [labels, persist],
  );

  const releaseArtist = useCallback(
    (id: string, artistId: ArtistId) =>
      persist(
        labels.map((l) =>
          l.id === id ? { ...l, artistIds: l.artistIds.filter((x) => x !== artistId) } : l,
        ),
      ),
    [labels, persist],
  );

  const value = useMemo<LabelsValue>(
    () => ({
      labels,
      getLabel: (id: string) => labels.find((l) => l.id === id),
      createLabel,
      deleteLabel,
      renameLabel,
      signArtist,
      releaseArtist,
    }),
    [labels, createLabel, deleteLabel, renameLabel, signArtist, releaseArtist],
  );

  return <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>;
}

export function useLabels() {
  const ctx = useContext(LabelsContext);
  if (!ctx) throw new Error("useLabels must be used within LabelsProvider");
  return ctx;
}
