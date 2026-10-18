import type { PlayableTrack } from "@/audio/tracks";

/** A deterministic playable track for tests (no network, no catalog dependency). */
export function track(id: string): PlayableTrack {
  return {
    id,
    title: `Title ${id}`,
    artist: `Artist ${id}`,
    artistId: "art-1" as never,
    src: `/${id}.mp3`,
    cover: "/cover.jpg",
    duration: "0:30",
  };
}
