import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const PLAYLISTS_KEY = "afm-playlists";

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

interface PlaylistsValue {
  playlists: Playlist[];
  createPlaylist: (name: string, trackIds?: string[]) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addToPlaylist: (id: string, trackId: string) => boolean;
  removeFromPlaylist: (id: string, trackId: string) => void;
  isInPlaylist: (id: string, trackId: string) => boolean;
}

const PlaylistsContext = createContext<PlaylistsValue | null>(null);

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function makeId() {
  return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    setPlaylists(readJSON<Playlist[]>(PLAYLISTS_KEY, []));
  }, []);

  const persist = useCallback((value: Playlist[]) => {
    try {
      window.localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, []);

  const createPlaylist = useCallback(
    (name: string, trackIds: string[] = []) => {
      const playlist: Playlist = {
        id: makeId(),
        name: name.trim() || "Playlist",
        trackIds: [...new Set(trackIds)],
        createdAt: Date.now(),
      };
      setPlaylists((prev) => {
        const next = [playlist, ...prev];
        persist(next);
        return next;
      });
      return playlist;
    },
    [persist],
  );

  const deletePlaylist = useCallback(
    (id: string) => {
      setPlaylists((prev) => {
        const next = prev.filter((p) => p.id !== id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const renamePlaylist = useCallback(
    (id: string, name: string) => {
      setPlaylists((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const addToPlaylist = useCallback(
    (id: string, trackId: string) => {
      let added = false;
      setPlaylists((prev) => {
        const next = prev.map((p) => {
          if (p.id !== id || p.trackIds.includes(trackId)) return p;
          added = true;
          return { ...p, trackIds: [...p.trackIds, trackId] };
        });
        if (added) persist(next);
        return next;
      });
      return added;
    },
    [persist],
  );

  const removeFromPlaylist = useCallback(
    (id: string, trackId: string) => {
      setPlaylists((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
        );
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo<PlaylistsValue>(
    () => ({
      playlists,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      isInPlaylist: (id: string, trackId: string) =>
        playlists.find((p) => p.id === id)?.trackIds.includes(trackId) ?? false,
    }),
    [playlists, createPlaylist, deletePlaylist, renamePlaylist, addToPlaylist, removeFromPlaylist],
  );

  return <PlaylistsContext.Provider value={value}>{children}</PlaylistsContext.Provider>;
}

export function usePlaylists() {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) throw new Error("usePlaylists must be used within PlaylistsProvider");
  return ctx;
}
