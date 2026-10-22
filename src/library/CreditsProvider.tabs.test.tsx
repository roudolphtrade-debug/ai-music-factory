// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { CreditsProvider, useCredits } from "./CreditsProvider";
import { makeEntry, type CreditsState } from "./credits";

// Two browser tabs share one localStorage but each has its own React state. Each `tab()` below is
// one such tab: it mounts a provider over the same storage, and `reload()` is a page refresh.
// These tests describe what the wallet does today. Where the result is a limitation rather than
// the wanted behaviour, the test name says "known limitation" so that a future fix changes it on
// purpose.
const KEY = "afm-credits";
const wrapper = ({ children }: { children: ReactNode }) => (
  <CreditsProvider>{children}</CreditsProvider>
);
function tab() {
  const view = renderHook(() => useCredits(), { wrapper });
  return {
    get wallet() {
      return view.result.current;
    },
    spend: (kind: "track" | "voice" | "transcribe") =>
      act(() => void view.result.current.spend(kind)),
    close: () => view.unmount(),
  };
}
const stored = (): CreditsState => JSON.parse(localStorage.getItem(KEY)!);
const monthly = (ledger: CreditsState["ledger"]) =>
  ledger.filter((e) => e.reasonKey === "credits.ledger.monthly");

function saveOldWallet() {
  const wallet: CreditsState = {
    balance: 100,
    plan: "studio",
    lastGrant: "2026-09",
    ledger: [makeEntry(250, "credits.ledger.subscribed"), makeEntry(170, "credits.ledger.pack")],
  };
  localStorage.setItem(KEY, JSON.stringify(wallet));
  return wallet;
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-21T10:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("two tabs · loading", () => {
  it("both tabs display the allowance, but nothing is persisted by loading", () => {
    const before = saveOldWallet();
    const a = tab();
    const b = tab();
    expect(a.wallet.balance).toBe(120); // displayed
    expect(b.wallet.balance).toBe(120); // displayed, not 140
    expect(stored()).toEqual(before); // persisted: still the September wallet, untouched
  });
});

describe("two tabs · first spend", () => {
  it("the first spend persists the allowance once, with the plan field and history kept", () => {
    const before = saveOldWallet();
    const a = tab();
    tab(); // a second tab, never spending
    a.spend("voice");
    const after = stored();
    expect(after.balance).toBe(119);
    expect(after.lastGrant).toBe("2026-10");
    expect(after.plan).toBe("studio");
    expect(monthly(after.ledger)).toHaveLength(1);
    expect(after.ledger.slice(-2)).toEqual(before.ledger);
  });

  it("no double allowance when both tabs spend: storage holds exactly one monthly entry", () => {
    saveOldWallet();
    const a = tab();
    const b = tab();
    a.spend("voice");
    b.spend("track");
    expect(monthly(stored().ledger)).toHaveLength(1);
    // 100 + one allowance of 20, never 140, whichever tab wrote last.
    expect(stored().balance).toBeLessThanOrEqual(119);
    expect(stored().balance).toBeGreaterThan(100);
  });

  it("known limitation: the second tab's spend overwrites the first tab's (lost update)", () => {
    saveOldWallet();
    const a = tab();
    const b = tab();
    a.spend("voice"); // persists 119
    b.spend("track"); // started from its own 120, persists 115
    expect(stored().balance).toBe(115); // 114 would be right: the 1 spent in tab A is lost
    expect(stored().ledger[0].reasonKey).toBe("credits.ledger.spentTrack");
    // Tab A's spend entry is gone from the persisted history.
    expect(stored().ledger.some((e) => e.reasonKey === "credits.ledger.spentVoice")).toBe(false);
  });

  it("known limitation: an open tab does not see the other tab's spend until it reloads", () => {
    saveOldWallet();
    const a = tab();
    const b = tab();
    a.spend("voice");
    expect(a.wallet.balance).toBe(119);
    expect(b.wallet.balance).toBe(120); // stale: no storage listener
  });
});

describe("two tabs · refresh", () => {
  it("a refresh after a persisted spend gives the persisted balance and no second allowance", () => {
    saveOldWallet();
    const a = tab();
    a.spend("voice");
    a.close();
    const reloaded = tab();
    expect(reloaded.wallet.balance).toBe(119);
    expect(monthly(reloaded.wallet.ledger)).toHaveLength(1);
  });

  it("a refresh of the stale tab shows the other tab's balance, so the display jumps", () => {
    saveOldWallet();
    const a = tab();
    const b = tab();
    a.spend("voice");
    b.spend("track"); // overwrites: stored 115
    a.close();
    expect(tab().wallet.balance).toBe(115); // tab A had displayed 119
  });

  it("known limitation: an allowance shown but never persisted is not kept for the next month", () => {
    saveOldWallet();
    const october = tab();
    expect(october.wallet.balance).toBe(120); // seen in October, nothing spent
    october.close();
    vi.setSystemTime(new Date("2026-11-02T09:00:00Z"));
    const november = tab();
    // One allowance for November only: the October one that was displayed never existed in storage.
    expect(november.wallet.balance).toBe(120);
    expect(monthly(november.wallet.ledger)).toHaveLength(1);
  });
});

describe("two tabs · change of month", () => {
  it("a tab left open across the month change grants nothing until it is reloaded", () => {
    saveOldWallet();
    const a = tab();
    a.spend("voice"); // October allowance persisted: 119
    vi.setSystemTime(new Date("2026-11-03T09:00:00Z"));
    a.spend("voice");
    expect(a.wallet.balance).toBe(118);
    expect(stored().lastGrant).toBe("2026-10");
  });

  it("after reloading in November, one new allowance, shown first and persisted by the next spend", () => {
    saveOldWallet();
    tab().spend("voice"); // 119, October
    vi.setSystemTime(new Date("2026-11-03T09:00:00Z"));
    const a = tab();
    const b = tab();
    expect(a.wallet.balance).toBe(139);
    expect(b.wallet.balance).toBe(139); // both display it
    expect(stored().lastGrant).toBe("2026-10"); // neither has persisted it yet
    a.spend("voice");
    expect(stored().lastGrant).toBe("2026-11");
    expect(stored().balance).toBe(138);
    b.spend("voice"); // writes its own copy: still one November allowance, a lost update again
    expect(monthly(stored().ledger).filter((e) => e.amount === 20)).toHaveLength(2); // October + November
    expect(stored().balance).toBe(138);
  });
});

describe("what the wallet never does", () => {
  it("keeps every stored field and old entry, and never creates a notification", () => {
    const before = saveOldWallet();
    const a = tab();
    a.spend("voice");
    const after = stored();
    expect(Object.keys(after).sort()).toEqual(["balance", "lastGrant", "ledger", "plan"]);
    expect(after.plan).toBe(before.plan);
    for (const entry of before.ledger) expect(after.ledger).toContainEqual(entry);
    expect(localStorage.getItem("afm-notifications")).toBeNull();
  });
});
