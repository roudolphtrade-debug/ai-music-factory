import { artists, type ArtistId, type VirtualArtist } from "@/data/mock";

export type LabelTier = "Flagship House" | "Atelier" | "Collective";

export interface UserLabel {
  id: string;
  name: string;
  monogram: string;
  specialty: string;
  tagline: string;
  tier: LabelTier;
  artistIds: ArtistId[];
  createdAt: number;
}

/** Label cut of net revenue, plus a small reputation multiplier, per tier. */
export const TIER_CONFIG: Record<
  LabelTier,
  { labelShare: number; repBonus: number; pitch: string }
> = {
  "Flagship House": { labelShare: 0.2, repBonus: 0.6, pitch: "Prestige curation, full marketing machine." },
  Atelier: { labelShare: 0.15, repBonus: 0.4, pitch: "Boutique craftsmanship, artist-first splits." },
  Collective: { labelShare: 0.1, repBonus: 0.2, pitch: "Volume play, the lightest cut on the platform." },
};

export const TIERS: LabelTier[] = ["Flagship House", "Atelier", "Collective"];

/** Estimated revenue per monthly listener, in USD. */
const REVENUE_PER_LISTENER = 0.0046;

/** Parse compact strings like "1.9M" / "248K" into a number. */
export function parseCompact(value: string): number {
  const m = value.trim().match(/^([\d.]+)\s*([KMB]?)$/i);
  if (!m) return Number(value.replace(/[^\d.]/g, "")) || 0;
  const n = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === "B") return n * 1_000_000_000;
  if (unit === "M") return n * 1_000_000;
  if (unit === "K") return n * 1_000;
  return n;
}

/** Deterministic compact number formatting (SSR-safe). */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

/** Deterministic compact money formatting (SSR-safe). */
export function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export interface LabelSimulation {
  roster: VirtualArtist[];
  totalListeners: number;
  monthlyRevenue: number;
  labelShare: number;
  labelRevenue: number;
  artistPool: number;
  reputation: number;
  payouts: { artist: VirtualArtist; listeners: number; payout: number }[];
}

/**
 * Pure business logic: derive a label's revenue, royalty split and reputation
 * from its signed roster. No persistence, no React — easy to reason about.
 */
export function simulateLabel(label: Pick<UserLabel, "tier" | "artistIds">): LabelSimulation {
  const roster = label.artistIds
    .map((id) => artists.find((a) => a.id === id))
    .filter((a): a is VirtualArtist => Boolean(a));

  const config = TIER_CONFIG[label.tier];
  const totalListeners = roster.reduce((sum, a) => sum + parseCompact(a.monthlyListeners), 0);
  const monthlyRevenue = totalListeners * REVENUE_PER_LISTENER;
  const labelRevenue = monthlyRevenue * config.labelShare;
  const artistPool = monthlyRevenue - labelRevenue;

  // Reputation: weighted average of roster reputation by listeners,
  // plus a tier bonus that scales gently with roster size.
  const weightedRep =
    totalListeners > 0
      ? roster.reduce((sum, a) => sum + a.reputation * parseCompact(a.monthlyListeners), 0) / totalListeners
      : 0;
  const sizeBonus = Math.min(roster.length, 12) * 0.03 * config.repBonus;
  const reputation = roster.length === 0 ? 0 : Math.min(10, weightedRep + sizeBonus);

  // Each artist earns from the pool proportionally to their listeners.
  const payouts = roster.map((artist) => {
    const listeners = parseCompact(artist.monthlyListeners);
    const share = totalListeners > 0 ? listeners / totalListeners : 0;
    return { artist, listeners, payout: artistPool * share };
  });

  return {
    roster,
    totalListeners,
    monthlyRevenue,
    labelShare: config.labelShare,
    labelRevenue,
    artistPool,
    reputation,
    payouts,
  };
}

const MONOGRAM_FALLBACK = "AF";

/** Derive a 2-letter monogram from a label name. */
export function deriveMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return MONOGRAM_FALLBACK;
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
