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

interface PlayerContextValue {
  current: PlayableTrack | null;
  queue: PlayableTrack[];
  isPlaying: boolean;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Refs to avoid stale closures inside audio event handlers.
  const queueRef = useRef<PlayableTrack[]>([]);
  const indexRef = useRef(0);
  const nextRef = useRef<() => void>(() => {});
  queueRef.current = queue;

  // Create a single audio element on mount (client only).
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volume;
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => nextRef.current();

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback((track: PlayableTrack, q?: PlayableTrack[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newQueue = q && q.length ? q : [track];
    const idx = Math.max(0, newQueue.findIndex((t) => t.id === track.id));
    setQueue(newQueue);
    queueRef.current = newQueue;
    indexRef.current = idx;
    setCurrent(track);
    setHasStarted(true);
    setCurrentTime(0);
    setDuration(0);
    audio.src = track.src;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }, []);

  const toggle = useCallback(
    (track?: PlayableTrack, q?: PlayableTrack[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (!track || track.id === current?.id) {
        if (!current && track) {
          play(track, q);
          return;
        }
        if (audio.paused) void audio.play().catch(() => {});
        else audio.pause();
        return;
      }
      play(track, q);
    },
    [current, play],
  );

  const next = useCallback(() => {
    const q = queueRef.current;
    if (!q.length) return;
    const ni = (indexRef.current + 1) % q.length;
    play(q[ni], q);
  }, [play]);
  nextRef.current = next;

  const prev = useCallback(() => {
    const audio = audioRef.current;
    const q = queueRef.current;
    if (!q.length || !audio) return;
    // Restart current track if more than 3s in.
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const pi = (indexRef.current - 1 + q.length) % q.length;
    play(q[pi], q);
  }, [play]);

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
      current,
      queue,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      hasStarted,
      play,
      toggle,
      next,
      prev,
      seekRatio,
      setVolume,
      toggleMute,
      isActive: (id: string) => current?.id === id,
      isTrackPlaying: (id: string) => current?.id === id && isPlaying,
    }),
    [
      current,
      queue,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      hasStarted,
      play,
      toggle,
      next,
      prev,
      seekRatio,
      setVolume,
      toggleMute,
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
