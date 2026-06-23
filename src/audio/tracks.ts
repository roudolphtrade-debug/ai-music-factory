import { tracks, artistImages, type ArtistId } from "@/data/mock";

/**
 * Mock but real, royalty-free audio sources (HTML5 <audio> compatible).
 * Used only to make the front-end audio experience feel credible.
 */
const SOURCES = [
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
];

export function sourceAt(index: number): string {
  return SOURCES[((index % SOURCES.length) + SOURCES.length) % SOURCES.length];
}

export interface PlayableTrack {
  id: string;
  title: string;
  artist: string;
  artistId: ArtistId;
  src: string;
  cover: string;
  /** Human readable mock duration shown before audio metadata loads. */
  duration: string;
}

export const playableTracks: PlayableTrack[] = tracks.map((t, i) => ({
  id: t.id,
  title: t.title,
  artist: t.artist,
  artistId: t.artistId,
  src: sourceAt(i),
  cover: artistImages[t.artistId],
  duration: t.duration,
}));

export const playableById: Record<string, PlayableTrack> = Object.fromEntries(
  playableTracks.map((p) => [p.id, p]),
);

/** Full radio rotation queue. */
export const radioQueue = playableTracks;

/** All releases for a given artist. */
export function releasesFor(artistId: string): PlayableTrack[] {
  return playableTracks.filter((p) => p.artistId === artistId);
}

/**
 * Build a custom playable (battles, studio projects, etc.) with a stable id
 * so the UI can derive an "active / playing" state per card.
 */
export function makePlayable(opts: {
  id: string;
  title: string;
  artist: string;
  artistId: ArtistId;
  index: number;
  duration?: string;
}): PlayableTrack {
  const match = playableTracks.find((p) => p.title === opts.title);
  return {
    id: opts.id,
    title: opts.title,
    artist: opts.artist,
    artistId: opts.artistId,
    src: match ? match.src : sourceAt(opts.index),
    cover: artistImages[opts.artistId],
    duration: opts.duration ?? match?.duration ?? "0:30",
  };
}
