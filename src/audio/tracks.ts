import { tracks, artistImages, type ArtistId } from "@/data/mock";
import voice1 from "@/audio/sounds/voice-1.mp3.asset.json";
import voice2 from "@/audio/sounds/voice-2.mp3.asset.json";
import voice3 from "@/audio/sounds/voice-3.mp3.asset.json";
import voice4 from "@/audio/sounds/voice-4.mp3.asset.json";
import voice5 from "@/audio/sounds/voice-5.mp3.asset.json";
import voice6 from "@/audio/sounds/voice-6.mp3.asset.json";
import voice7 from "@/audio/sounds/voice-7.mp3.asset.json";
import voice8 from "@/audio/sounds/voice-8.mp3.asset.json";
import voice9 from "@/audio/sounds/voice-9.mp3.asset.json";
import voice10 from "@/audio/sounds/voice-10.mp3.asset.json";

/**
 * Real audio sources uploaded by the artist, served from the Lovable CDN.
 * These power the radio rotation, artist releases and battle previews.
 */
const SOURCES = [
  voice1.url,
  voice2.url,
  voice3.url,
  voice4.url,
  voice5.url,
  voice6.url,
  voice7.url,
  voice8.url,
  voice9.url,
  voice10.url,
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
