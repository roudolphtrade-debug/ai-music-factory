import { playableTracks, studioMasters, type PlayableTrack } from "./tracks";

/** Demo stations: local programming derived from the catalog (never live broadcasts). */
export interface Station {
  id: string;
  name: string;
  tags: string[];
  tracks: PlayableTrack[];
}

const byGenre = (...g: string[]) => playableTracks.filter((t) => t.genre && g.includes(t.genre));
const byMood = (...m: string[]) => playableTracks.filter((t) => t.mood && m.includes(t.mood));

export const stations: Station[] = [
  { id: "golden-hour", name: "Golden Hour", tags: ["Euphoric", "Triumphant"], tracks: byMood("Euphoric", "Triumphant") },
  { id: "trap-mansion", name: "Trap Mansion", tags: ["Trap", "Hip-Hop", "Drill"], tracks: byGenre("Trap", "Hip-Hop", "Drill", "UK Drill", "Phonk") },
  { id: "velvet-lounge", name: "Velvet Lounge", tags: ["Neo-Soul", "R&B"], tracks: byGenre("Neo-Soul", "R&B") },
  { id: "night-circuit", name: "Night Circuit", tags: ["Techno", "Synthwave", "Electronica"], tracks: byGenre("Techno", "Synthwave", "Electronica") },
  { id: "ethereal-drift", name: "Ethereal Drift", tags: ["Ethereal", "Reflective", "Intimate"], tracks: byMood("Ethereal", "Reflective", "Intimate") },
  { id: "studio-masters", name: "Studio Masters", tags: ["Studio"], tracks: studioMasters },
].filter((s) => s.tracks.length > 0);

export const catalogGenres = [...new Set(playableTracks.map((t) => t.genre).filter(Boolean))] as string[];
export const catalogMoods = [...new Set(playableTracks.map((t) => t.mood).filter(Boolean))] as string[];

export function filterTracks(genres: string[], moods: string[]): PlayableTrack[] {
  return playableTracks.filter(
    (t) => (genres.length === 0 || (t.genre && genres.includes(t.genre))) && (moods.length === 0 || (t.mood && moods.includes(t.mood))),
  );
}
