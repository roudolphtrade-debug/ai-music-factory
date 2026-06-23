import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";
import artist4 from "@/assets/artist-4.jpg";
import artist5 from "@/assets/artist-5.jpg";
import artist6 from "@/assets/artist-6.jpg";

export const artistImages = {
  "art-1": artist1,
  "art-2": artist2,
  "art-3": artist3,
  "art-4": artist4,
  "art-5": artist5,
  "art-6": artist6,
} as const;

export type ArtistId = keyof typeof artistImages;

export interface VirtualArtist {
  id: ArtistId;
  name: string;
  handle: string;
  tagline: string;
  bio: string;
  genres: string[];
  reputation: number;
  followers: string;
  monthlyListeners: string;
  tracks: number;
  label: string;
  badges: string[];
  trending: number;
  aesthetic: string;
}

export const artists: VirtualArtist[] = [
  {
    id: "art-1",
    name: "SØL Aurelius",
    handle: "@solaurelius",
    tagline: "Golden-hour electronica from a machine that dreams in amber.",
    bio: "SØL Aurelius is a generative artist forged in the space between dawn and data. Each release is a meditation on warmth, decay, and the quiet luminance of analogue memory rendered through neural synthesis.",
    genres: ["Ambient Pop", "Electronica"],
    reputation: 9.4,
    followers: "248K",
    monthlyListeners: "1.9M",
    tracks: 42,
    label: "Maison Noir",
    badges: ["Verified", "Top 1% Reputation", "Radio Favorite"],
    trending: 1,
    aesthetic: "Amber minimalism · sculptural lighting",
  },
  {
    id: "art-2",
    name: "Seraphine 9",
    handle: "@seraphine9",
    tagline: "Porcelain vocals wrapped in liquid chrome.",
    bio: "A virtual diva engineered for the avant-garde stage. Seraphine 9 blends hyperpop precision with operatic restraint — a halo of sound built for the era of the post-human pop icon.",
    genres: ["Hyperpop", "Art Pop"],
    reputation: 9.1,
    followers: "412K",
    monthlyListeners: "3.2M",
    tracks: 38,
    label: "Halo Atelier",
    badges: ["Verified", "Battle Champion", "Discovery Crown"],
    trending: 2,
    aesthetic: "Liquid chrome · couture futurism",
  },
  {
    id: "art-3",
    name: "ORACLE",
    handle: "@oracle",
    tagline: "Faceless techno from the deep machine.",
    bio: "ORACLE never reveals a face — only frequency. A masked electronic entity broadcasting hypnotic, club-ready compositions from an undisclosed server farm somewhere beyond the grid.",
    genres: ["Techno", "Industrial"],
    reputation: 8.7,
    followers: "187K",
    monthlyListeners: "1.4M",
    tracks: 56,
    label: "Maison Noir",
    badges: ["Verified", "Underground Icon"],
    trending: 3,
    aesthetic: "Anonymous · monastic black",
  },
  {
    id: "art-4",
    name: "MIDAS PRIME",
    handle: "@midasprime",
    tagline: "Trap royalty plated in 24-karat sound.",
    bio: "MIDAS PRIME turns every beat to gold. A larger-than-life virtual rap persona built on heavyweight 808s, opulent ad-libs, and a self-mythology as gilded as his chains.",
    genres: ["Trap", "Hip-Hop"],
    reputation: 8.9,
    followers: "534K",
    monthlyListeners: "4.1M",
    tracks: 61,
    label: "Goldhouse Collective",
    badges: ["Verified", "Top Creator", "Platinum Prompt"],
    trending: 4,
    aesthetic: "Maximalist gold · luxury trap",
  },
  {
    id: "art-5",
    name: "Nyla Solenne",
    handle: "@nylasolenne",
    tagline: "Future-soul woven in gold thread.",
    bio: "Nyla Solenne is a regal virtual songstress channelling neo-soul through a lens of ancient futurism. Her catalogue is intimate, warm, and impossibly poised.",
    genres: ["Neo-Soul", "R&B"],
    reputation: 9.0,
    followers: "321K",
    monthlyListeners: "2.6M",
    tracks: 33,
    label: "Halo Atelier",
    badges: ["Verified", "Rising Star", "Fan Favorite"],
    trending: 5,
    aesthetic: "Golden regalia · warm soul",
  },
  {
    id: "art-6",
    name: "VISR",
    handle: "@visr",
    tagline: "Synthwave transmissions from a gilded horizon.",
    bio: "VISR is a retro-futurist producer hidden behind a mirrored visor. Neon nostalgia meets pristine modern production in widescreen, cinematic synthwave.",
    genres: ["Synthwave", "Retro"],
    reputation: 8.4,
    followers: "146K",
    monthlyListeners: "980K",
    tracks: 29,
    label: "Goldhouse Collective",
    badges: ["Verified", "Night Drive Icon"],
    trending: 6,
    aesthetic: "Mirrored visor · neon noir",
  },
];

export interface Track {
  id: string;
  title: string;
  artistId: ArtistId;
  artist: string;
  genre: string;
  mood: string;
  duration: string;
  plays: string;
  status?: "Published" | "Draft" | "Mastering" | "Review";
}

export const tracks: Track[] = [
  { id: "t-1", title: "Amber Cathedral", artistId: "art-1", artist: "SØL Aurelius", genre: "Ambient Pop", mood: "Euphoric", duration: "3:48", plays: "1.2M" },
  { id: "t-2", title: "Porcelain Halo", artistId: "art-2", artist: "Seraphine 9", genre: "Hyperpop", mood: "Ethereal", duration: "2:54", plays: "2.8M" },
  { id: "t-3", title: "Server Prayer", artistId: "art-3", artist: "ORACLE", genre: "Techno", mood: "Hypnotic", duration: "5:12", plays: "920K" },
  { id: "t-4", title: "Gilded", artistId: "art-4", artist: "MIDAS PRIME", genre: "Trap", mood: "Triumphant", duration: "3:21", plays: "4.0M" },
  { id: "t-5", title: "Gold Thread", artistId: "art-5", artist: "Nyla Solenne", genre: "Neo-Soul", mood: "Intimate", duration: "4:03", plays: "1.7M" },
  { id: "t-6", title: "Mirror Highway", artistId: "art-6", artist: "VISR", genre: "Synthwave", mood: "Nostalgic", duration: "4:30", plays: "660K" },
  { id: "t-7", title: "Slow Eclipse", artistId: "art-1", artist: "SØL Aurelius", genre: "Electronica", mood: "Reflective", duration: "3:36", plays: "840K" },
  { id: "t-8", title: "Chrome Aria", artistId: "art-2", artist: "Seraphine 9", genre: "Art Pop", mood: "Dramatic", duration: "3:09", plays: "1.5M" },
];

export const nowPlaying = {
  station: "AI Radio · Golden Hour",
  track: tracks[0],
  listeners: "12,408",
  upNext: tracks[1],
};

export interface CreatorProject {
  id: string;
  title: string;
  genre: string;
  mood: string;
  voice: string;
  prompt: string;
  status: "Published" | "Draft" | "Mastering" | "Review";
  updated: string;
  versions: number;
  stems: number;
}

export const projects: CreatorProject[] = [
  {
    id: "p-1",
    title: "Amber Cathedral",
    genre: "Ambient Pop",
    mood: "Euphoric",
    voice: "SØL — warm tenor",
    prompt: "Cinematic ambient pop with golden-hour pads, soft analogue tape warmth, and a slow euphoric build.",
    status: "Published",
    updated: "2 hours ago",
    versions: 4,
    stems: 12,
  },
  {
    id: "p-2",
    title: "Untitled — Nocturne 03",
    genre: "Electronica",
    mood: "Melancholic",
    voice: "Instrumental",
    prompt: "Late-night electronica, sparse piano, vinyl crackle, distant choir, restrained 90 BPM groove.",
    status: "Mastering",
    updated: "Yesterday",
    versions: 2,
    stems: 8,
  },
  {
    id: "p-3",
    title: "Gold Thread (Remix)",
    genre: "Neo-Soul",
    mood: "Intimate",
    voice: "Nyla — alto",
    prompt: "Re-imagine the original as a slow-burn neo-soul ballad with live drum feel and lush horns.",
    status: "Review",
    updated: "3 days ago",
    versions: 6,
    stems: 16,
  },
  {
    id: "p-4",
    title: "Working Idea — Chrome",
    genre: "Hyperpop",
    mood: "Frenetic",
    voice: "Seraphine — soprano",
    prompt: "Glitchy hyperpop sketch, pitched vocal chops, metallic percussion, sugar-rush energy.",
    status: "Draft",
    updated: "5 days ago",
    versions: 1,
    stems: 4,
  },
];

export interface Label {
  id: string;
  name: string;
  specialty: string;
  tagline: string;
  roster: number;
  reputation: number;
  mrr: string;
  monogram: string;
  tier: "Flagship House" | "Atelier" | "Collective";
}

export const labels: Label[] = [
  {
    id: "l-1",
    name: "Maison Noir",
    specialty: "Ambient · Techno · Experimental",
    tagline: "The house of shadow and signal.",
    roster: 14,
    reputation: 9.3,
    mrr: "$48.2K",
    monogram: "MN",
    tier: "Flagship House",
  },
  {
    id: "l-2",
    name: "Halo Atelier",
    specialty: "Hyperpop · Art Pop · R&B",
    tagline: "Couture sound for the post-human pop icon.",
    roster: 9,
    reputation: 9.1,
    mrr: "$39.7K",
    monogram: "HA",
    tier: "Atelier",
  },
  {
    id: "l-3",
    name: "Goldhouse Collective",
    specialty: "Trap · Synthwave · Hip-Hop",
    tagline: "Everything we touch turns platinum.",
    roster: 21,
    reputation: 8.8,
    mrr: "$61.5K",
    monogram: "GC",
    tier: "Collective",
  },
  {
    id: "l-4",
    name: "Velvet Frequency",
    specialty: "Neo-Soul · Jazz · Downtempo",
    tagline: "Warm rooms, golden tones.",
    roster: 7,
    reputation: 8.6,
    mrr: "$22.4K",
    monogram: "VF",
    tier: "Atelier",
  },
];

export interface Battle {
  id: string;
  status: "Live" | "Upcoming" | "Closed";
  round: string;
  a: { artistId: ArtistId; name: string; track: string; votes: number };
  b: { artistId: ArtistId; name: string; track: string; votes: number };
  ends: string;
}

export const battles: Battle[] = [
  {
    id: "b-1",
    status: "Live",
    round: "Quarter-final · Bracket A",
    a: { artistId: "art-2", name: "Seraphine 9", track: "Porcelain Halo", votes: 8420 },
    b: { artistId: "art-4", name: "MIDAS PRIME", track: "Gilded", votes: 7980 },
    ends: "4h 12m left",
  },
  {
    id: "b-2",
    status: "Live",
    round: "Quarter-final · Bracket B",
    a: { artistId: "art-1", name: "SØL Aurelius", track: "Amber Cathedral", votes: 6310 },
    b: { artistId: "art-3", name: "ORACLE", track: "Server Prayer", votes: 6890 },
    ends: "4h 12m left",
  },
  {
    id: "b-3",
    status: "Upcoming",
    round: "Quarter-final · Bracket C",
    a: { artistId: "art-5", name: "Nyla Solenne", track: "Gold Thread", votes: 0 },
    b: { artistId: "art-6", name: "VISR", track: "Mirror Highway", votes: 0 },
    ends: "Starts in 1d 6h",
  },
];

export const battleHistory = [
  { id: "h-1", winner: "Seraphine 9", loser: "VISR", round: "Final · Season 6", margin: "62% · 38%" },
  { id: "h-2", winner: "MIDAS PRIME", loser: "Nyla Solenne", round: "Semi-final · Season 6", margin: "54% · 46%" },
  { id: "h-3", winner: "ORACLE", loser: "SØL Aurelius", round: "Semi-final · Season 6", margin: "51% · 49%" },
  { id: "h-4", winner: "Nyla Solenne", loser: "Seraphine 9", round: "Quarter-final · Season 6", margin: "58% · 42%" },
];

export const radioStations = [
  { id: "s-1", name: "Golden Hour", mood: "Warm · Ambient", listeners: "12.4K", live: true },
  { id: "s-2", name: "Chrome Cathedral", mood: "Hyperpop · Art", listeners: "9.1K", live: true },
  { id: "s-3", name: "Server Room", mood: "Techno · Industrial", listeners: "7.8K", live: true },
  { id: "s-4", name: "Velvet Lounge", mood: "Neo-Soul · Jazz", listeners: "5.2K", live: false },
  { id: "s-5", name: "Night Drive", mood: "Synthwave · Retro", listeners: "6.6K", live: false },
  { id: "s-6", name: "Community Curated", mood: "Voted by fans", listeners: "14.9K", live: true },
];

export const moods = ["Euphoric", "Hypnotic", "Intimate", "Dramatic", "Nostalgic", "Triumphant", "Ethereal", "Reflective"];

export const hallOfFame = [
  { id: "hof-1", title: "Best Virtual Artist", winner: "Seraphine 9", artistId: "art-2" as ArtistId, note: "3.2M monthly listeners · Battle Champion", crown: "Artist of the Year" },
  { id: "hof-2", title: "Best Prompt Creator", winner: "MIDAS PRIME", artistId: "art-4" as ArtistId, note: "Platinum Prompt · most-cloned style", crown: "Master of Craft" },
  { id: "hof-3", title: "Label of the Month", winner: "Maison Noir", artistId: "art-1" as ArtistId, note: "Highest reputation house · $48.2K MRR", crown: "House of Honour" },
  { id: "hof-4", title: "Discovery Crown", winner: "Nyla Solenne", artistId: "art-5" as ArtistId, note: "Fastest-rising new identity this season", crown: "Breakout" },
];

export const platformStats = [
  { label: "Tracks Published", value: "184,920", delta: "+2,140 this week" },
  { label: "Virtual Artists", value: "12,408", delta: "+312 this week" },
  { label: "Virtual Labels", value: "1,284", delta: "+18 this week" },
  { label: "Battles Live Now", value: "26", delta: "4 ending soon" },
];

export const topCreators = artists.slice(0, 5).map((a, i) => ({
  rank: i + 1,
  artistId: a.id,
  name: a.name,
  reputation: a.reputation,
  listeners: a.monthlyListeners,
}));

export const activityFeed = [
  { id: "a-1", text: "Seraphine 9 published a new release", detail: "Chrome Aria", time: "8m ago" },
  { id: "a-2", text: "MIDAS PRIME entered a live battle", detail: "vs Seraphine 9", time: "21m ago" },
  { id: "a-3", text: "Maison Noir signed a new artist", detail: "ORACLE", time: "1h ago" },
  { id: "a-4", text: "Nyla Solenne crossed 2.5M listeners", detail: "Milestone", time: "2h ago" },
  { id: "a-5", text: "VISR climbed to Top 10 Trending", detail: "Synthwave", time: "3h ago" },
];

export function getArtist(id: string) {
  return artists.find((a) => a.id === id);
}
