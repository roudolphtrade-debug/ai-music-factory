// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { CreditsProvider, useCredits } from "./CreditsProvider";
import { makeEntry, type CreditsState } from "./credits";

const KEY = "afm-credits";
const wrapper = ({ children }: { children: ReactNode }) => (
  <CreditsProvider>{children}</CreditsProvider>
);
const mount = () => renderHook(() => useCredits(), { wrapper });
const stored = (): CreditsState => JSON.parse(localStorage.getItem(KEY)!);
const save = (state: CreditsState) => localStorage.setItem(KEY, JSON.stringify(state));

function oldWallet(plan: CreditsState["plan"], balance: number): CreditsState {
  return {
    balance,
    plan,
    lastGrant: "2026-09",
    ledger: [
      makeEntry(plan === "label" ? 1200 : 250, "credits.ledger.subscribed"),
      makeEntry(170, "credits.ledger.pack"),
    ],
  };
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

describe("CreditsProvider after the removal of subscriptions and purchases", () => {
  it("no longer offers subscribe or buyPack", () => {
    const { result } = mount();
    expect(Object.keys(result.current).sort()).toEqual(
      ["balance", "canAfford", "lastGrant", "ledger", "plan", "spend"].sort(),
    );
    expect("subscribe" in result.current).toBe(false);
    expect("buyPack" in result.current).toBe(false);
  });

  it("a first visit gets the 20 welcome credits and nothing else", () => {
    const { result } = mount();
    expect(result.current.balance).toBe(20);
    expect(result.current.plan).toBe("free");
    expect(result.current.ledger.map((e) => e.reasonKey)).toEqual(["credits.ledger.welcome"]);
  });

  it.each([
    ["studio", 250],
    ["label", 1200],
  ] as const)(
    "a wallet saved on the old %s plan gets 20 credits, not %i, and keeps everything else",
    (plan, oldAmount) => {
      const wallet = oldWallet(plan, 777);
      save(wallet);
      const { result } = mount();
      expect(result.current.balance).toBe(777 + 20);
      expect(result.current.balance).not.toBe(777 + oldAmount);
      expect(result.current.plan).toBe(plan); // the stored field is not rewritten
      expect(result.current.lastGrant).toBe("2026-10");
      expect(result.current.ledger[0]).toMatchObject({
        amount: 20,
        reasonKey: "credits.ledger.monthly",
      });
      expect(result.current.ledger.slice(1)).toEqual(wallet.ledger);
    },
  );

  it("does not give the allowance a second time in the same month, across spends and reloads", () => {
    save(oldWallet("studio", 100));
    const first = mount();
    expect(first.result.current.balance).toBe(120);

    act(() => void first.result.current.spend("voice")); // persists the wallet, grant included
    expect(stored().balance).toBe(119);
    expect(stored().lastGrant).toBe("2026-10");
    expect(stored().plan).toBe("studio");

    first.unmount();
    const second = mount();
    expect(second.result.current.balance).toBe(119); // no second +20
    expect(
      second.result.current.ledger.filter((e) => e.reasonKey === "credits.ledger.monthly"),
    ).toHaveLength(1);

    act(() => void second.result.current.spend("track"));
    second.unmount();
    expect(mount().result.current.balance).toBe(114);
  });

  it("does not stack the allowance when the page is opened again before anything is spent", () => {
    save(oldWallet("free", 100));
    mount().unmount();
    mount().unmount();
    const third = mount();
    expect(third.result.current.balance).toBe(120); // never 140 or 160
  });

  it("gives a new allowance when the next month starts", () => {
    save(oldWallet("studio", 100));
    const october = mount();
    act(() => void october.result.current.spend("voice"));
    october.unmount();

    vi.setSystemTime(new Date("2026-11-03T09:00:00Z"));
    const november = mount();
    expect(november.result.current.balance).toBe(119 + 20); // 100 + 20 - 1, then a new 20
  });

  it("falls back to a fresh wallet for unreadable storage", () => {
    for (const raw of ["not json", "{}", '{"balance":"12","plan":"free"}', "null"]) {
      localStorage.setItem(KEY, raw);
      const { result, unmount } = mount();
      expect(result.current.balance, raw).toBe(20);
      unmount();
    }
  });

  it("keeps spending behaviour: costs, refusal when short, ledger entry", () => {
    save({ ...oldWallet("free", 4), lastGrant: "2026-10" });
    const { result } = mount();
    expect(result.current.canAfford("track")).toBe(false);
    let ok = true;
    act(() => {
      ok = result.current.spend("track");
    });
    expect(ok).toBe(false);
    expect(result.current.balance).toBe(4);
    act(() => void result.current.spend("voice"));
    expect(result.current.balance).toBe(3);
    expect(result.current.ledger[0]).toMatchObject({
      amount: -1,
      reasonKey: "credits.ledger.spentVoice",
    });
  });
});
