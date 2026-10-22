import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COSTS,
  FREE_MONTHLY_CREDITS,
  PACKS,
  PLANS,
  applyMonthlyGrant,
  currentMonth,
  initialState,
  makeEntry,
  planById,
  type CreditsState,
} from "./credits";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-21T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

function wallet(overrides: Partial<CreditsState> = {}): CreditsState {
  return {
    balance: 100,
    plan: "free",
    lastGrant: "2026-09",
    ledger: [makeEntry(-5, "credits.ledger.spentTrack")],
    ...overrides,
  };
}

describe("monthly allowance", () => {
  it("is 20 credits, which is what the free plan already recorded", () => {
    expect(FREE_MONTHLY_CREDITS).toBe(20);
    expect(planById("free").monthlyCredits).toBe(20);
    expect(initialState().balance).toBe(20);
  });

  it("adds 20 credits once the month changes and records it in the ledger", () => {
    const before = wallet();
    const after = applyMonthlyGrant(before);
    expect(after.balance).toBe(120);
    expect(after.lastGrant).toBe("2026-10");
    expect(after.ledger[0]).toMatchObject({ amount: 20, reasonKey: "credits.ledger.monthly" });
    expect(after.ledger.slice(1)).toEqual(before.ledger);
  });

  it.each(["studio", "label"] as const)(
    "gives 20, not the old %s amount, to a wallet saved on that simulated plan",
    (plan) => {
      const after = applyMonthlyGrant(wallet({ plan }));
      expect(after.balance).toBe(100 + 20);
      expect(after.ledger[0].amount).toBe(20);
    },
  );

  it("keeps the balance, the stored plan field and the earlier ledger entries untouched", () => {
    const old = wallet({
      plan: "label",
      balance: 1234,
      ledger: [
        makeEntry(1200, "credits.ledger.subscribed"),
        makeEntry(170, "credits.ledger.pack"),
        makeEntry(-5, "credits.ledger.spentTrack"),
      ],
    });
    const snapshot = JSON.parse(JSON.stringify(old));
    const after = applyMonthlyGrant(old);
    expect(old).toEqual(snapshot); // the input is not mutated
    expect(after.plan).toBe("label");
    expect(after.balance).toBe(1234 + 20);
    expect(after.ledger.slice(1)).toEqual(snapshot.ledger);
    expect(Object.keys(after).sort()).toEqual(["balance", "ledger", "lastGrant", "plan"].sort());
  });

  it("adds nothing twice in the same month", () => {
    const once = applyMonthlyGrant(wallet());
    const twice = applyMonthlyGrant(once);
    expect(twice).toBe(once);
    expect(twice.balance).toBe(120);
    expect(twice.ledger.filter((e) => e.reasonKey === "credits.ledger.monthly")).toHaveLength(1);
  });

  it("adds nothing when the grant already belongs to the current month", () => {
    const current = wallet({ lastGrant: currentMonth() });
    expect(applyMonthlyGrant(current)).toBe(current);
  });

  it("gives one allowance after several skipped months, not one per month", () => {
    const after = applyMonthlyGrant(wallet({ lastGrant: "2026-01" }));
    expect(after.balance).toBe(120);
  });

  it("grants again the next month", () => {
    const october = applyMonthlyGrant(wallet());
    vi.setSystemTime(new Date("2026-11-02T08:00:00Z"));
    const november = applyMonthlyGrant(october);
    expect(november.balance).toBe(140);
    expect(november.lastGrant).toBe("2026-11");
  });

  it("keeps the ledger to its 50 most recent entries", () => {
    const long = wallet({ ledger: Array.from({ length: 50 }, () => makeEntry(-1, "x")) });
    const after = applyMonthlyGrant(long);
    expect(after.ledger).toHaveLength(50);
    expect(after.ledger[0].reasonKey).toBe("credits.ledger.monthly");
  });
});

describe("what stays for compatibility", () => {
  it("still describes the three plans so that old wallets read correctly", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["free", "studio", "label"]);
    expect(planById("studio").monthlyCredits).toBe(250);
    expect(planById("label").monthlyCredits).toBe(1200);
    expect(planById("nonsense" as never).id).toBe("free");
  });

  it("keeps the planned packs and the action costs", () => {
    expect(PACKS.map((p) => p.credits)).toEqual([50, 150, 500]);
    expect(COSTS).toEqual({ track: 5, voice: 1, transcribe: 1 });
  });
});
