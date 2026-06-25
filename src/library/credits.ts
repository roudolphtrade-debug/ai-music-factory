/**
 * Credits & subscription business logic.
 *
 * The platform spends AI credits whenever a user generates a track, a voice,
 * or a transcription. This module models a lightweight, persistent credit
 * wallet plus subscription tiers and one-off top-up packs. All state is kept
 * client-side (localStorage) — no backend required.
 */

export type PlanId = "free" | "studio" | "label";

export interface Plan {
  id: PlanId;
  /** Monthly credit grant included with the plan. */
  monthlyCredits: number;
  /** Price in USD per month (0 for free). */
  price: number;
  /** Highlighted as the recommended tier. */
  featured?: boolean;
  /** Translation keys for the perks list (resolved at render time). */
  perkKeys: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    monthlyCredits: 20,
    price: 0,
    perkKeys: ["credits.perks.free1", "credits.perks.free2", "credits.perks.free3"],
  },
  {
    id: "studio",
    monthlyCredits: 250,
    price: 19,
    featured: true,
    perkKeys: [
      "credits.perks.studio1",
      "credits.perks.studio2",
      "credits.perks.studio3",
      "credits.perks.studio4",
    ],
  },
  {
    id: "label",
    monthlyCredits: 1200,
    price: 79,
    perkKeys: [
      "credits.perks.label1",
      "credits.perks.label2",
      "credits.perks.label3",
      "credits.perks.label4",
    ],
  },
];

export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  /** Bonus credits added on top of the base amount. */
  bonus?: number;
}

export const PACKS: CreditPack[] = [
  { id: "pack-s", credits: 50, price: 5 },
  { id: "pack-m", credits: 150, price: 12, bonus: 20 },
  { id: "pack-l", credits: 500, price: 35, bonus: 120 },
];

/** Credit cost for each kind of AI action. */
export const COSTS = {
  track: 5,
  voice: 1,
  transcribe: 1,
} as const;

export type ActionKind = keyof typeof COSTS;

export interface LedgerEntry {
  id: string;
  /** Positive = credits added, negative = credits spent. */
  amount: number;
  /** Translation key describing the entry, e.g. "credits.ledger.spentTrack". */
  reasonKey: string;
  at: number;
}

export interface CreditsState {
  balance: number;
  plan: PlanId;
  /** ISO month string (YYYY-MM) of the last monthly grant applied. */
  lastGrant: string;
  ledger: LedgerEntry[];
}

export function planById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function makeEntry(amount: number, reasonKey: string): LedgerEntry {
  return {
    id: `le-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    amount,
    reasonKey,
    at: Date.now(),
  };
}

export function initialState(): CreditsState {
  const plan = planById("free");
  return {
    balance: plan.monthlyCredits,
    plan: "free",
    lastGrant: currentMonth(),
    ledger: [makeEntry(plan.monthlyCredits, "credits.ledger.welcome")],
  };
}
