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
import { onDraftsErased } from "@/library/draftEvents";
import type { PlayableTrack } from "./tracks";
import {
  indexAfterMove,
  moveItem,
  nextIndex,
  removeById,
  resolvePlayQueue,
  shuffleKeepingFirst,
  REPEAT_CYCLE,
  type RepeatMode,
} from "./queue";

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
  /** Drops the tracks whose temporary address is gone (erased drafts); stops playback if one is playing. */
  forgetSources: (sources: readonly string[]) => void;
  seekRatio: (ratio: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  isActive: (id: string) => boolean;
  isTrackPlaying: (id: string) => boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const DEFAULT_VOLUME = 0.8;

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
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [muted, setMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Refs to avoid stale closures inside audio event handlers.
  const queueRef = useRef<PlayableTrack[]>([]);
  const originalRef = useRef<PlayableTrack[]>([]);
  const indexRef = useRef(0);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<RepeatMode>("all");
  const endedRef = useRef<() => void>(() => {});
  // Last non-zero level, so that unmuting from zero does not stay silent.
  const lastAudibleRef = useRef(DEFAULT_VOLUME);
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
      // A track outside the supplied queue is placed first: queue[index] === track.
      const { queue: base, index: idx } = resolvePlayQueue(track, q);
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
    // Position-based: stays correct even when two queue items share the same id.
    setPos(moved, indexAfterMove(indexRef.current, from, to));
  }, []);

  const removeFromQueue = useCallback((i: number) => {
    const q = queueRef.current;
    if (i === indexRef.current || !q[i]) return; // never remove the playing track
    // Keep the pre-shuffle order in sync, otherwise the track returns when shuffle is turned off.
    originalRef.current = removeById(originalRef.current, q[i].id);
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

  const forgetSources = useCallback((sources: readonly string[]) => {
    const gone = new Set(sources);
    const q = queueRef.current;
    const playing = q[indexRef.current];
    const keep = q.filter((t) => !gone.has(t.src));
    originalRef.current = originalRef.current.filter((t) => !gone.has(t.src));
    if (playing && gone.has(playing.src)) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      setCurrent(null);
      setIsPlaying(false);
      setStatus("idle");
      setCurrentTime(0);
      setDuration(0);
      setPos(keep, 0);
    } else if (keep.length !== q.length) {
      setPos(
        keep,
        Math.max(0, keep.findIndex((t) => t.id === playing?.id)),
      );
    }
  }, []);

  // Erased drafts (a member signed out): their addresses are revoked, so the player lets them go.
  useEffect(() => onDraftsErased(forgetSources), [forgetSources]);

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
    if (clamped > 0) lastAudibleRef.current = clamped;
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
    if (!nextMuted && audio.volume === 0) {
      audio.volume = lastAudibleRef.current;
      setVolumeState(lastAudibleRef.current);
    }
    audio.muted = nextMuted;
    setMuted(nextMuted);
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      current, queue, index, isPlaying, status, shuffle, repeat, currentTime, duration, volume, muted, hasStarted,
      play, toggle, next, prev, playAt, moveInQueue, removeFromQueue, toggleShuffle, cycleRepeat, retry,
      forgetSources, seekRatio, setVolume, toggleMute,
      isActive: (id: string) => current?.id === id,
      isTrackPlaying: (id: string) => current?.id === id && isPlaying,
    }),
    [
      current, queue, index, isPlaying, status, shuffle, repeat, currentTime, duration, volume, muted, hasStarted,
      play, toggle, next, prev, playAt, moveInQueue, removeFromQueue, toggleShuffle, cycleRepeat, retry,
      forgetSources, seekRatio, setVolume, toggleMute,
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
