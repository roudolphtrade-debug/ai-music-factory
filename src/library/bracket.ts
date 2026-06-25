/**
 * Single-elimination tournament bracket logic for Battles.
 *
 * Eight virtual artists are seeded into an 8-slot bracket (quarter-finals →
 * semi-finals → final). The community (the user) votes a winner in each open
 * match; winners advance automatically to the next round until a champion is
 * crowned. State persists client-side in localStorage.
 */

import { artists, type ArtistId } from "@/data/mock";

export type RoundKey = "quarterFinal" | "semiFinal" | "final";

export const ROUND_ORDER: RoundKey[] = ["quarterFinal", "semiFinal", "final"];

export interface Competitor {
  artistId: ArtistId;
  name: string;
  /** Seed-derived baseline community votes, blended with the user's pick. */
  baseVotes: number;
}

export interface Match {
  id: string;
  round: RoundKey;
  /** Position within the round (0-based). */
  slot: number;
  a: Competitor | null;
  b: Competitor | null;
  /** ArtistId the user voted for in this match, if any. */
  votedFor: ArtistId | null;
}

/** Archived record of a completed season. */
export interface SeasonRecord {
  season: number;
  championId: ArtistId;
  championName: string;
  championTrack: string;
  runnerUpId: ArtistId | null;
  runnerUpName: string | null;
  /** Final-match vote split, e.g. "61% · 39%". */
  margin: string;
  at: number;
}

export interface BracketState {
  season: number;
  matches: Match[];
  /** Champions of past seasons, most recent first. */
  history: SeasonRecord[];
}

/** Eight battle tracks, paired by competitor for flavour. */
export const BATTLE_TRACKS: Record<ArtistId, string> = {
  "art-1": "Amber Cathedral",
  "art-2": "Porcelain Halo",
  "art-3": "Server Prayer",
  "art-4": "Gilded",
  "art-5": "Gold Thread",
  "art-6": "Mirror Highway",
};

function competitor(artistId: ArtistId, seed: number): Competitor {
  const a = artists.find((x) => x.id === artistId);
  return {
    artistId,
    name: a?.name ?? artistId,
    // Higher seeds carry a slightly larger crowd baseline.
    baseVotes: 5200 + (8 - seed) * 540,
  };
}

/**
 * Build a fresh bracket. We only have six mock artists, so the quarter-final
 * fills its eight slots by reusing the roster in a fixed seeding order.
 */
export function buildBracket(season = 7): BracketState {
  const seeding: ArtistId[] = [
    "art-2",
    "art-4",
    "art-1",
    "art-3",
    "art-5",
    "art-6",
    "art-2",
    "art-4",
  ];

  const quarters: Match[] = [0, 1, 2, 3].map((slot) => ({
    id: `m-q-${slot}`,
    round: "quarterFinal" as RoundKey,
    slot,
    a: competitor(seeding[slot * 2], slot * 2 + 1),
    b: competitor(seeding[slot * 2 + 1], slot * 2 + 2),
    votedFor: null,
  }));

  const semis: Match[] = [0, 1].map((slot) => ({
    id: `m-s-${slot}`,
    round: "semiFinal" as RoundKey,
    slot,
    a: null,
    b: null,
    votedFor: null,
  }));

  const final: Match = {
    id: "m-f-0",
    round: "final",
    slot: 0,
    a: null,
    b: null,
    votedFor: null,
  };

  return { season, matches: [...quarters, ...semis, ...final ? [final] : []] };
}

function winnerOf(m: Match): Competitor | null {
  if (!m.votedFor) return null;
  if (m.a?.artistId === m.votedFor) return m.a;
  if (m.b?.artistId === m.votedFor) return m.b;
  return null;
}

/**
 * Apply a vote and propagate winners forward. Returns a new state object.
 */
export function castVote(state: BracketState, matchId: string, artistId: ArtistId): BracketState {
  const matches = state.matches.map((m) =>
    m.id === matchId ? { ...m, votedFor: artistId } : m,
  );

  const byId = (id: string) => matches.find((m) => m.id === id)!;

  // Feed quarter-final winners into the semis.
  const semi0 = byId("m-s-0");
  semi0.a = winnerOf(byId("m-q-0"));
  semi0.b = winnerOf(byId("m-q-1"));
  const semi1 = byId("m-s-1");
  semi1.a = winnerOf(byId("m-q-2"));
  semi1.b = winnerOf(byId("m-q-3"));

  // Clear stale semi votes if their competitors changed.
  for (const s of [semi0, semi1]) {
    if (s.votedFor && winnerOf(s) === null) s.votedFor = null;
  }

  // Feed semi-final winners into the final.
  const final = byId("m-f-0");
  final.a = winnerOf(semi0);
  final.b = winnerOf(semi1);
  if (final.votedFor && winnerOf(final) === null) final.votedFor = null;

  return { ...state, matches };
}

export function champion(state: BracketState): Competitor | null {
  const final = state.matches.find((m) => m.id === "m-f-0");
  return final ? winnerOf(final) : null;
}

/** Display votes for a competitor, nudged up when the user backs them. */
export function displayVotes(m: Match, c: Competitor | null): number {
  if (!c) return 0;
  return m.votedFor === c.artistId ? c.baseVotes + 1840 : c.baseVotes;
}

export function votePercent(m: Match): { a: number; b: number } {
  const va = displayVotes(m, m.a);
  const vb = displayVotes(m, m.b);
  const total = va + vb;
  if (total === 0) return { a: 50, b: 50 };
  return { a: Math.round((va / total) * 100), b: Math.round((vb / total) * 100) };
}

export function matchesByRound(state: BracketState, round: RoundKey): Match[] {
  return state.matches.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
}
