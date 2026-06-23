import {
  createContext,
  useCallback,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const FAV_KEY = "afm-favorites";
const HIST_KEY = "afm-history";
const ONBOARD_KEY = "afm-onboarding-dismissed";
const HISTORY_LIMIT = 24;

export interface HistoryEntry {
  id: string;
  at: number;
}

interface LibraryValue {
  favorites: string[];
  history: HistoryEntry[];
  onboardingDismissed: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => boolean;
  recordPlay: (id: string) => void;
  clearHistory: () => void;
  dismissOnboarding: () => void;
}

const LibraryContext = createContext<LibraryValue | null>(null);

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe).
  useEffect(() => {
    setFavorites(readJSON<string[]>(FAV_KEY, []));
    setHistory(readJSON<HistoryEntry[]>(HIST_KEY, []));
    setOnboardingDismissed(
      typeof window !== "undefined" && window.localStorage.getItem(ONBOARD_KEY) === "1",
    );
  }, []);

  const persist = useCallback((key: string, value: unknown) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleFavorite = useCallback(
    (id: string) => {
      let added = false;
      setFavorites((prev) => {
        const exists = prev.includes(id);
        added = !exists;
        const next = exists ? prev.filter((x) => x !== id) : [id, ...prev];
        persist(FAV_KEY, next);
        return next;
      });
      return added;
    },
    [persist],
  );

  const recordPlay = useCallback(
    (id: string) => {
      setHistory((prev) => {
        const next = [{ id, at: Date.now() }, ...prev.filter((e) => e.id !== id)].slice(
          0,
          HISTORY_LIMIT,
        );
        persist(HIST_KEY, next);
        return next;
      });
    },
    [persist],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    persist(HIST_KEY, []);
  }, [persist]);

  const dismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
    try {
      window.localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LibraryValue>(
    () => ({
      favorites,
      history,
      onboardingDismissed,
      isFavorite: (id: string) => favorites.includes(id),
      toggleFavorite,
      recordPlay,
      clearHistory,
      dismissOnboarding,
    }),
    [favorites, history, onboardingDismissed, toggleFavorite, recordPlay, clearHistory, dismissOnboarding],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
