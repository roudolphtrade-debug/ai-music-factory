import artist1 from "@/assets/artist-1.webp";
import artist2 from "@/assets/artist-2.webp";
import artist3 from "@/assets/artist-3.webp";
import artist4 from "@/assets/artist-4.webp";
import artist5 from "@/assets/artist-5.webp";
import artist6 from "@/assets/artist-6.webp";
import labelMaisonNoir from "@/assets/label-maison-noir.webp";
import labelHaloAtelier from "@/assets/label-halo-atelier.webp";
import labelGoldhouse from "@/assets/label-goldhouse.webp";

export const artistImages = {
  "art-1": artist1,
  "art-2": artist2,
  "art-3": artist3,
  "art-4": artist4,
  "art-5": artist5,
  "art-6": artist6,
} as const;

export type ArtistId = keyof typeof artistImages;

export type RelTime = { n?: number; u: "m" | "h" | "d" | "yesterday" };

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
  {
    id: "t-1",
    title: "Amber Cathedral",
    artistId: "art-1",
    artist: "SØL Aurelius",
    genre: "Ambient Pop",
    mood: "Euphoric",
    duration: "3:48",
    plays: "1.2M",
  },
  {
    id: "t-2",
    title: "Porcelain Halo",
    artistId: "art-2",
    artist: "Seraphine 9",
    genre: "Hyperpop",
    mood: "Ethereal",
    duration: "2:54",
    plays: "2.8M",
  },
  {
    id: "t-3",
    title: "Server Prayer",
    artistId: "art-3",
    artist: "ORACLE",
    genre: "Techno",
    mood: "Hypnotic",
    duration: "5:12",
    plays: "920K",
  },
  {
    id: "t-4",
    title: "Gilded",
    artistId: "art-4",
    artist: "MIDAS PRIME",
    genre: "Trap",
    mood: "Triumphant",
    duration: "3:21",
    plays: "4.0M",
  },
  {
    id: "t-5",
    title: "Gold Thread",
    artistId: "art-5",
    artist: "Nyla Solenne",
    genre: "Neo-Soul",
    mood: "Intimate",
    duration: "4:03",
    plays: "1.7M",
  },
  {
    id: "t-6",
    title: "Mirror Highway",
    artistId: "art-6",
    artist: "VISR",
    genre: "Synthwave",
    mood: "Nostalgic",
    duration: "4:30",
    plays: "660K",
  },
  {
    id: "t-8",
    title: "Chrome Aria",
    artistId: "art-2",
    artist: "Seraphine 9",
    genre: "Art Pop",
    mood: "Dramatic",
    duration: "3:09",
    plays: "1.5M",
  },
  // ---- Studio masters (real uploaded audio, ordered 1 → 9) ----
  {
    id: "t-101",
    title: "Aurora Doré",
    artistId: "art-1",
    artist: "SØL Aurelius",
    genre: "Ambient Pop",
    mood: "Euphoric",
    duration: "3:38",
    plays: "612K",
  },
  {
    id: "t-102",
    title: "Nuit de Saphir",
    artistId: "art-2",
    artist: "Seraphine 9",
    genre: "Hyperpop",
    mood: "Ethereal",
    duration: "2:42",
    plays: "498K",
  },
  {
    id: "t-103",
    title: "Échos du Vide",
    artistId: "art-3",
    artist: "ORACLE",
    genre: "Techno",
    mood: "Hypnotic",
    duration: "4:08",
    plays: "377K",
  },
  {
    id: "t-104",
    title: "Couronne d'Or",
    artistId: "art-4",
    artist: "MIDAS PRIME",
    genre: "Trap",
    mood: "Triumphant",
    duration: "2:59",
    plays: "1.1M",
  },
  {
    id: "t-105",
    title: "Mirage Néon",
    artistId: "art-6",
    artist: "VISR",
    genre: "Synthwave",
    mood: "Nostalgic",
    duration: "4:34",
    plays: "284K",
  },

  {
    id: "t-107",
    title: "Soleil de Minuit",
    artistId: "art-5",
    artist: "Nyla Solenne",
    genre: "Neo-Soul",
    mood: "Intimate",
    duration: "4:45",
    plays: "356K",
  },
  {
    id: "t-108",
    title: "Royaume Pourpre",
    artistId: "art-4",
    artist: "MIDAS PRIME",
    genre: "Hip-Hop",
    mood: "Triumphant",
    duration: "4:24",
    plays: "742K",
  },
  {
    id: "t-109",
    title: "Or Liquide",
    artistId: "art-2",
    artist: "Seraphine 9",
    genre: "Art Pop",
    mood: "Ethereal",
    duration: "3:52",
    plays: "529K",
  },
];

export const nowPlaying = {
  station: "AI Radio · Golden Hour",
  track: tracks[0],
  listeners: "12,408",
  upNext: tracks[1],
};

// ---- Charts & genres (real-world music categories) ----

export const chartRegions = ["Global", "US", "UK", "France", "Nigeria", "Brazil"] as const;
export type ChartRegion = (typeof chartRegions)[number];

export interface ChartEntry {
  rank: number;
  change: number; // >0 up, <0 down, 0 steady
  isNew?: boolean;
  title: string;
  artist: string;
  artistId: ArtistId;
  genre: string;
  plays: string;
  regions: ChartRegion[];
}

export const globalCharts: ChartEntry[] = [
  {
    rank: 1,
    change: 0,
    title: "Midas Touch",
    artist: "MIDAS PRIME",
    artistId: "art-4",
    genre: "Trap",
    plays: "12.4M",
    regions: ["Global", "US", "UK", "Brazil"],
  },
  {
    rank: 2,
    change: 2,
    title: "Lagos Gold",
    artist: "Nyla Solenne",
    artistId: "art-5",
    genre: "Afrobeats",
    plays: "9.8M",
    regions: ["Global", "UK", "Nigeria", "France"],
  },
  {
    rank: 3,
    change: 1,
    title: "Opp Block",
    artist: "ORACLE",
    artistId: "art-3",
    genre: "UK Drill",
    plays: "8.1M",
    regions: ["Global", "UK"],
  },
  {
    rank: 4,
    change: -2,
    title: "Porcelain Halo",
    artist: "Seraphine 9",
    artistId: "art-2",
    genre: "Hyperpop",
    plays: "7.6M",
    regions: ["Global", "US", "France"],
  },
  {
    rank: 5,
    change: 0,
    isNew: true,
    title: "Brick by Brick",
    artist: "MIDAS PRIME",
    artistId: "art-4",
    genre: "Drill",
    plays: "6.9M",
    regions: ["Global", "UK", "US"],
  },
  {
    rank: 6,
    change: 3,
    title: "Amapiano Mirage",
    artist: "VISR",
    artistId: "art-6",
    genre: "Amapiano",
    plays: "6.2M",
    regions: ["Global", "Nigeria", "Brazil"],
  },
  {
    rank: 7,
    change: -1,
    title: "Amber Cathedral",
    artist: "SØL Aurelius",
    artistId: "art-1",
    genre: "Electronica",
    plays: "5.8M",
    regions: ["Global", "France", "US"],
  },
  {
    rank: 8,
    change: 1,
    title: "Corazón de Oro",
    artist: "Nyla Solenne",
    artistId: "art-5",
    genre: "Reggaeton",
    plays: "5.1M",
    regions: ["Global", "Brazil", "US"],
  },
  {
    rank: 9,
    change: 0,
    isNew: true,
    title: "Server Phonk",
    artist: "ORACLE",
    artistId: "art-3",
    genre: "Phonk",
    plays: "4.7M",
    regions: ["Global", "US", "Brazil"],
  },
  {
    rank: 10,
    change: -3,
    title: "Gold Dust",
    artist: "Seraphine 9",
    artistId: "art-2",
    genre: "R&B",
    plays: "4.2M",
    regions: ["Global", "UK", "France"],
  },
];

export const chartGenres = [
  { name: "Hip-Hop", tracks: "31.4K" },
  { name: "Trap", tracks: "24.7K" },
  { name: "R&B", tracks: "19.5K" },
  { name: "Afrobeats", tracks: "18.2K" },
  { name: "Reggaeton", tracks: "15.6K" },
  { name: "Drill", tracks: "12.1K" },
  { name: "UK Drill", tracks: "9.8K" },
  { name: "Phonk", tracks: "8.9K" },
  { name: "Amapiano", tracks: "7.3K" },
  { name: "Hyperpop", tracks: "6.2K" },
  { name: "Dancehall", tracks: "5.7K" },
  { name: "Jersey Club", tracks: "4.1K" },
];

export interface CreatorProject {
  id: string;
  title: string;
  genre: string;
  mood: string;
  voice: string;
  prompt: string;
  status: "Published" | "Draft" | "Mastering" | "Review";
  updated: RelTime;
  versions: number;
  stems: number;
}

export const projects: CreatorProject[] = [
  {
    id: "p-1",
    title: "Amber Cathedral",
    genre: "Ambient Pop",
    mood: "Euphoric",
    voice: "Warm tenor",
    prompt:
      "Cinematic ambient pop with golden-hour pads, soft analogue tape warmth, and a slow euphoric build.",
    status: "Published",
    updated: { n: 2, u: "h" },
    versions: 4,
    stems: 12,
  },
  {
    id: "p-2",
    title: "Untitled — Nocturne 03",
    genre: "Electronica",
    mood: "Reflective",
    voice: "Instrumental",
    prompt:
      "Late-night electronica, sparse piano, vinyl crackle, distant choir, restrained 90 BPM groove.",
    status: "Mastering",
    updated: { u: "yesterday" },
    versions: 2,
    stems: 8,
  },
  {
    id: "p-3",
    title: "Gold Thread (Remix)",
    genre: "Neo-Soul",
    mood: "Intimate",
    voice: "Alto",
    prompt:
      "Re-imagine the original as a slow-burn neo-soul ballad with live drum feel and lush horns.",
    status: "Review",
    updated: { n: 3, u: "d" },
    versions: 6,
    stems: 16,
  },
  {
    id: "p-4",
    title: "Working Idea — Chrome",
    genre: "Hyperpop",
    mood: "Dramatic",
    voice: "Soprano",
    prompt: "Glitchy hyperpop sketch, pitched vocal chops, metallic percussion, sugar-rush energy.",
    status: "Draft",
    updated: { n: 5, u: "d" },
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
  cover?: string;
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
    cover: labelMaisonNoir,
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
    cover: labelHaloAtelier,
  },
  {
    id: "l-3",
    name: "Goldhouse Collective",
    specialty: "Trap · Hip-Hop · Drill",
    tagline: "Everything we touch turns platinum.",
    roster: 21,
    reputation: 8.8,
    mrr: "$61.5K",
    monogram: "GC",
    tier: "Collective",
    cover: labelGoldhouse,
  },
  {
    id: "l-4",
    name: "Velvet Frequency",
    specialty: "Neo-Soul · Afrobeats · Reggaeton",
    tagline: "Warm rooms, golden tones.",
    roster: 7,
    reputation: 8.6,
    mrr: "$22.4K",
    monogram: "VF",
    tier: "Atelier",
  },
];

export type BattlePhase = "quarterFinal" | "semiFinal" | "final";

export interface Battle {
  id: string;
  status: "Live" | "Upcoming" | "Closed";
  round: { phase: BattlePhase; bracket: string };
  a: { artistId: ArtistId; name: string; track: string; votes: number };
  b: { artistId: ArtistId; name: string; track: string; votes: number };
  ends: { key: "left" | "starts"; text: string };
}

export const battles: Battle[] = [
  {
    id: "b-1",
    status: "Live",
    round: { phase: "quarterFinal", bracket: "A" },
    a: { artistId: "art-2", name: "Seraphine 9", track: "Porcelain Halo", votes: 8420 },
    b: { artistId: "art-4", name: "MIDAS PRIME", track: "Gilded", votes: 7980 },
    ends: { key: "left", text: "4h 12m" },
  },
  {
    id: "b-2",
    status: "Live",
    round: { phase: "quarterFinal", bracket: "B" },
    a: { artistId: "art-1", name: "SØL Aurelius", track: "Amber Cathedral", votes: 6310 },
    b: { artistId: "art-3", name: "ORACLE", track: "Server Prayer", votes: 6890 },
    ends: { key: "left", text: "4h 12m" },
  },
  {
    id: "b-3",
    status: "Upcoming",
    round: { phase: "quarterFinal", bracket: "C" },
    a: { artistId: "art-5", name: "Nyla Solenne", track: "Gold Thread", votes: 0 },
    b: { artistId: "art-6", name: "VISR", track: "Mirror Highway", votes: 0 },
    ends: { key: "starts", text: "1d 6h" },
  },
];

export interface BattleHistoryEntry {
  id: string;
  winner: string;
  loser: string;
  round: { phase: BattlePhase; season: number };
  margin: string;
}

export const battleHistory: BattleHistoryEntry[] = [
  {
    id: "h-1",
    winner: "Seraphine 9",
    loser: "VISR",
    round: { phase: "final", season: 6 },
    margin: "62% · 38%",
  },
  {
    id: "h-2",
    winner: "MIDAS PRIME",
    loser: "Nyla Solenne",
    round: { phase: "semiFinal", season: 6 },
    margin: "54% · 46%",
  },
  {
    id: "h-3",
    winner: "ORACLE",
    loser: "SØL Aurelius",
    round: { phase: "semiFinal", season: 6 },
    margin: "51% · 49%",
  },
  {
    id: "h-4",
    winner: "Nyla Solenne",
    loser: "Seraphine 9",
    round: { phase: "quarterFinal", season: 6 },
    margin: "58% · 42%",
  },
];

export const radioStations = [
  { id: "s-1", name: "Golden Hour", mood: "Warm · Ambient", listeners: "12.4K", live: true },
  { id: "s-2", name: "Trap Mansion", mood: "Trap · Hip-Hop", listeners: "18.9K", live: true },
  {
    id: "s-3",
    name: "Lagos After Dark",
    mood: "Afrobeats · Amapiano",
    listeners: "15.2K",
    live: true,
  },
  { id: "s-4", name: "Opp Block Radio", mood: "UK Drill · Drill", listeners: "11.7K", live: false },
  { id: "s-5", name: "Velvet Lounge", mood: "Neo-Soul · R&B", listeners: "5.2K", live: false },
  { id: "s-6", name: "Community Curated", mood: "Voted by fans", listeners: "14.9K", live: true },
];

export const moods = [
  "Euphoric",
  "Hypnotic",
  "Intimate",
  "Dramatic",
  "Nostalgic",
  "Triumphant",
  "Ethereal",
  "Reflective",
];

export interface HallOfFameEntry {
  id: string;
  winner: string;
  artistId: ArtistId;
}

export const hallOfFame: HallOfFameEntry[] = [
  { id: "hof-1", winner: "Seraphine 9", artistId: "art-2" },
  { id: "hof-2", winner: "MIDAS PRIME", artistId: "art-4" },
  { id: "hof-3", winner: "Maison Noir", artistId: "art-1" },
  { id: "hof-4", winner: "Nyla Solenne", artistId: "art-5" },
];

export interface PlatformStat {
  key: "tracksPublished" | "virtualArtists" | "virtualLabels" | "battlesLiveNow";
  value: string;
  deltaKey: "plusThisWeek" | "endingSoon";
  deltaN: string;
}

export const platformStats: PlatformStat[] = [
  { key: "tracksPublished", value: "184,920", deltaKey: "plusThisWeek", deltaN: "2,140" },
  { key: "virtualArtists", value: "12,408", deltaKey: "plusThisWeek", deltaN: "312" },
  { key: "virtualLabels", value: "1,284", deltaKey: "plusThisWeek", deltaN: "18" },
  { key: "battlesLiveNow", value: "26", deltaKey: "endingSoon", deltaN: "4" },
];

export const topCreators = artists.slice(0, 5).map((a, i) => ({
  rank: i + 1,
  artistId: a.id,
  name: a.name,
  reputation: a.reputation,
  listeners: a.monthlyListeners,
}));

export interface ActivityItem {
  id: string;
  who: string;
  actionKey:
    "publishedRelease" | "enteredBattle" | "signedArtist" | "crossedListeners" | "climbedTrending";
  actionVars?: Record<string, string>;
  detail?: string;
  detailKey?: string;
  time: RelTime;
}

export const activityFeed: ActivityItem[] = [
  {
    id: "a-1",
    who: "Seraphine 9",
    actionKey: "publishedRelease",
    detail: "Chrome Aria",
    time: { n: 8, u: "m" },
  },
  {
    id: "a-2",
    who: "MIDAS PRIME",
    actionKey: "enteredBattle",
    detail: "vs Seraphine 9",
    time: { n: 21, u: "m" },
  },
  {
    id: "a-3",
    who: "Maison Noir",
    actionKey: "signedArtist",
    detail: "ORACLE",
    time: { n: 1, u: "h" },
  },
  {
    id: "a-4",
    who: "Nyla Solenne",
    actionKey: "crossedListeners",
    actionVars: { n: "2.5M" },
    detailKey: "milestone",
    time: { n: 2, u: "h" },
  },
  {
    id: "a-5",
    who: "VISR",
    actionKey: "climbedTrending",
    detail: "Synthwave",
    time: { n: 3, u: "h" },
  },
];

export function getArtist(id: string) {
  return artists.find((a) => a.id === id);
}
