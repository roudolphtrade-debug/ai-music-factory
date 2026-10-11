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
import type { PlayableTrack } from "./tracks";
import { moveItem, nextIndex, shuffleKeepingFirst, REPEAT_CYCLE, type RepeatMode } from "./queue";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

interface PlayerContextValue {
  current: PlayableTrack | null;
  queue: PlayableTrack[];
  /** Position of the current track inside `queue`. */
  index: number;
  isPlaying: boolean;
  status: PlayerStatus;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Audio reported, falls back to 0 before metadata loads. */
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  /** True once the user has interacted with the player at least once. */
  hasStarted: boolean;
  play: (track: PlayableTrack, queue?: PlayableTrack[]) => void;
  toggle: (track?: PlayableTrack, queue?: PlayableTrack[]) => void;
  next: () => void;
  prev: () => void;
  playAt: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  removeFromQueue: (index: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  retry: () => void;
  seekRatio: (ratio: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  isActive: (id: string) => boolean;
  isTrackPlaying: (id: string) => boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [current, setCurrent] = useState<PlayableTrack | null>(null);
  const [queue, setQueue] = useState<PlayableTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [shuffle, setShuffle] = useState(false);
  // "all" keeps the historical wrap-around at the end of a queue.
  const [repeat, setRepeat] = useState<RepeatMode>("all");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Refs to avoid stale closures inside audio event handlers.
  const queueRef = useRef<PlayableTrack[]>([]);
  const originalRef = useRef<PlayableTrack[]>([]);
  const indexRef = useRef(0);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<RepeatMode>("all");
  const endedRef = useRef<() => void>(() => {});
  queueRef.current = queue;
  shuffleRef.current = shuffle;
  repeatRef.current = repeat;

  const setPos = (q: PlayableTrack[], i: number) => {
    queueRef.current = q;
    indexRef.current = i;
    setQueue(q);
    setIndex(i);
  };

  // Create a single audio element on mount (client only).
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volume;
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPlaying = () => setStatus("playing");
    const onPause = () => {
      setIsPlaying(false);
      setStatus((s) => (s === "error" ? s : "paused"));
    };
    const onWaiting = () => setStatus("loading");
    const onError = () => {
      if (!audio.src) return;
      setIsPlaying(false);
      setStatus("error");
    };
    const onEnded = () => endedRef.current();

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Load and start a track without touching the queue. */
  const load = useCallback((track: PlayableTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(track);
    setHasStarted(true);
    setCurrentTime(0);
    setDuration(0);
    setStatus("loading");
    audio.src = track.src;
    audio.currentTime = 0;
    void audio.play().catch((err: unknown) => {
      // Autoplay refusals are not load errors; real failures arrive via "error".
      if ((err as { name?: string })?.name === "NotAllowedError") setStatus("paused");
    });
  }, []);

  const play = useCallback(
    (track: PlayableTrack, q?: PlayableTrack[]) => {
      const base = q && q.length ? q : [track];
      const idx = Math.max(0, base.findIndex((t) => t.id === track.id));
      originalRef.current = base;
      if (shuffleRef.current) setPos(shuffleKeepingFirst(base, idx), 0);
      else setPos(base, idx);
      load(track);
    },
    [load],
  );

  const playAt = useCallback(
    (i: number) => {
      const q = queueRef.current;
      if (!q[i]) return;
      setPos(q, i);
      load(q[i]);
    },
    [load],
  );

  const toggle = useCallback(
    (track?: PlayableTrack, q?: PlayableTrack[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (!track || track.id === current?.id) {
        if (!current && track) {
          play(track, q);
          return;
        }
        if (status === "error" && current) {
          load(current);
          return;
        }
        if (audio.paused) void audio.play().catch(() => {});
        else audio.pause();
        return;
      }
      play(track, q);
    },
    [current, play, load, status],
  );

  const next = useCallback(() => {
    const ni = nextIndex(queueRef.current.length, indexRef.current, repeatRef.current, true);
    if (ni !== null) playAt(ni);
  }, [playAt]);

  endedRef.current = () => {
    const ni = nextIndex(queueRef.current.length, indexRef.current, repeatRef.current);
    if (ni === null) {
      setStatus("paused");
      return;
    }
    playAt(ni);
  };

  const prev = useCallback(() => {
    const audio = audioRef.current;
    const q = queueRef.current;
    if (!q.length || !audio) return;
    // Restart current track if more than 3s in.
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    playAt((indexRef.current - 1 + q.length) % q.length);
  }, [playAt]);

  const moveInQueue = useCallback((from: number, to: number) => {
    const q = queueRef.current;
    const moved = moveItem(q, from, to);
    if (moved === q) return;
    const curId = q[indexRef.current]?.id;
    setPos(moved, Math.max(0, moved.findIndex((t) => t.id === curId)));
  }, []);

  const removeFromQueue = useCallback((i: number) => {
    const q = queueRef.current;
    if (i === indexRef.current || !q[i]) return; // never remove the playing track
    const nq = q.filter((_, k) => k !== i);
    setPos(nq, i < indexRef.current ? indexRef.current - 1 : indexRef.current);
  }, []);

  const toggleShuffle = useCallback(() => {
    const q = queueRef.current;
    const curId = q[indexRef.current]?.id;
    if (!shuffleRef.current) {
      originalRef.current = q;
      if (q.length) setPos(shuffleKeepingFirst(q, indexRef.current), 0);
      setShuffle(true);
    } else {
      const orig = originalRef.current.length ? originalRef.current : q;
      setPos(orig, Math.max(0, orig.findIndex((t) => t.id === curId)));
      setShuffle(false);
    }
  }, []);

  const cycleRepeat = useCallback(() => setRepeat((r) => REPEAT_CYCLE[r]), []);

  const retry = useCallback(() => {
    if (current) load(current);
  }, [current, load]);

  const seekRatio = useCallback(
    (ratio: number) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const time = Math.min(Math.max(ratio, 0), 1) * duration;
      audio.currentTime = time;
      setCurrentTime(time);
    },
    [duration],
  );

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current;
    const clamped = Math.min(Math.max(v, 0), 1);
    setVolumeState(clamped);
    if (audio) {
      audio.volume = clamped;
      audio.muted = clamped === 0;
    }
    setMuted(clamped === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setMuted(nextMuted);
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      current, queue, index, isPlaying, status, shuffle, repeat, currentTime, duration, volume, muted, hasStarted,
      play, toggle, next, prev, playAt, moveInQueue, removeFromQueue, toggleShuffle, cycleRepeat, retry,
      seekRatio, setVolume, toggleMute,
      isActive: (id: string) => current?.id === id,
      isTrackPlaying: (id: string) => current?.id === id && isPlaying,
    }),
    [
      current, queue, index, isPlaying, status, shuffle, repeat, currentTime, duration, volume, muted, hasStarted,
      play, toggle, next, prev, playAt, moveInQueue, removeFromQueue, toggleShuffle, cycleRepeat, retry,
      seekRatio, setVolume, toggleMute,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
