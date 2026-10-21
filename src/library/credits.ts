/**
 * Credits business logic.
 *
 * The platform spends AI credits whenever a user generates a track, a voice,
 * or a transcription. This module models a lightweight, persistent credit
 * wallet. All state is kept client-side (localStorage) — no backend required.
 *
 * Payments are not available: nobody can subscribe or buy credits, and the only credits that
 * are added are the free monthly allowance. `PLANS` stays so that wallets saved while a
 * simulated "studio" or "label" plan existed still read correctly; `PACKS` only describes the
 * packs planned for when payments open.
 */

/** Credits given every calendar month to everyone, whatever plan an old wallet still records. */
export const FREE_MONTHLY_CREDITS = 20;

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
    monthlyCredits: FREE_MONTHLY_CREDITS,
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
  return {
    balance: FREE_MONTHLY_CREDITS,
    plan: "free",
    lastGrant: currentMonth(),
    ledger: [makeEntry(FREE_MONTHLY_CREDITS, "credits.ledger.welcome")],
  };
}

/**
 * Adds the free monthly allowance once per calendar month, so a second call in the same month
 * changes nothing. The stored `plan` is never read and never rewritten: a wallet saved with an old
 * "studio" or "label" plan keeps that field, its balance and its ledger, and gets
 * `FREE_MONTHLY_CREDITS` like everyone else.
 */
export function applyMonthlyGrant(state: CreditsState): CreditsState {
  const month = currentMonth();
  if (state.lastGrant === month) return state;
  return {
    ...state,
    balance: state.balance + FREE_MONTHLY_CREDITS,
    lastGrant: month,
    ledger: [makeEntry(FREE_MONTHLY_CREDITS, "credits.ledger.monthly"), ...state.ledger].slice(
      0,
      50,
    ),
  };
}
