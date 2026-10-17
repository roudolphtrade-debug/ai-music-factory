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
import { parsePlaylists } from "./storage";

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
  moveInPlaylist: (id: string, from: number, to: number) => void;
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
  // The playlists, always up to date: every change goes through `commit`, which writes it before
  // anything else. Mutations read it instead of waiting for React to apply state updates, so
  // that several calls in a row see each other's result and each can report what it did.
  const playlistsRef = useRef<Playlist[]>([]);

  useEffect(() => {
    // Stored values are untrusted: keep only what has the expected shape (nothing is rewritten here).
    const loaded = parsePlaylists<Playlist>(readJSON<unknown>(PLAYLISTS_KEY, []));
    playlistsRef.current = loaded;
    setPlaylists(loaded);
  }, []);

  const persist = useCallback((value: Playlist[]) => {
    try {
      window.localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, []);

  const commit = useCallback(
    (next: Playlist[]) => {
      playlistsRef.current = next;
      setPlaylists(next);
      persist(next);
    },
    [persist],
  );

  const createPlaylist = useCallback(
    (name: string, trackIds: string[] = []) => {
      const playlist: Playlist = {
        id: makeId(),
        name: name.trim() || "Playlist",
        trackIds: [...new Set(trackIds)],
        createdAt: Date.now(),
      };
      commit([playlist, ...playlistsRef.current]);
      return playlist;
    },
    [commit],
  );

  const deletePlaylist = useCallback(
    (id: string) => {
      commit(playlistsRef.current.filter((p) => p.id !== id));
    },
    [commit],
  );

  const renamePlaylist = useCallback(
    (id: string, name: string) => {
      commit(
        playlistsRef.current.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
      );
    },
    [commit],
  );

  const addToPlaylist = useCallback(
    (id: string, trackId: string) => {
      const prev = playlistsRef.current;
      const target = prev.find((p) => p.id === id);
      if (!target || target.trackIds.includes(trackId)) return false;
      commit(prev.map((p) => (p === target ? { ...p, trackIds: [...p.trackIds, trackId] } : p)));
      return true;
    },
    [commit],
  );

  const removeFromPlaylist = useCallback(
    (id: string, trackId: string) => {
      commit(
        playlistsRef.current.map((p) =>
          p.id === id ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
        ),
      );
    },
    [commit],
  );

  const moveInPlaylist = useCallback(
    (id: string, from: number, to: number) => {
      commit(
        playlistsRef.current.map((p) => {
          if (p.id !== id || to < 0 || to >= p.trackIds.length) return p;
          if (!Number.isInteger(from) || from < 0 || from >= p.trackIds.length) return p;
          const ids = [...p.trackIds];
          const [m] = ids.splice(from, 1);
          ids.splice(to, 0, m);
          return { ...p, trackIds: ids };
        }),
      );
    },
    [commit],
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
      moveInPlaylist,
    }),
    [playlists, createPlaylist, deletePlaylist, renamePlaylist, addToPlaylist, removeFromPlaylist, moveInPlaylist],
  );

  return <PlaylistsContext.Provider value={value}>{children}</PlaylistsContext.Provider>;
}

export function usePlaylists() {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) throw new Error("usePlaylists must be used within PlaylistsProvider");
  return ctx;
}
