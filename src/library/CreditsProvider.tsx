import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  COSTS,
  PACKS,
  initialState,
  makeEntry,
  planById,
  currentMonth,
  type ActionKind,
  type CreditPack,
  type CreditsState,
  type PlanId,
} from "./credits";

const CREDITS_KEY = "afm-credits";

interface CreditsValue extends CreditsState {
  canAfford: (kind: ActionKind) => boolean;
  spend: (kind: ActionKind) => boolean;
  subscribe: (plan: PlanId) => void;
  buyPack: (pack: CreditPack) => void;
}

const CreditsContext = createContext<CreditsValue | null>(null);

function readState(): CreditsState {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = window.localStorage.getItem(CREDITS_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as CreditsState;
    if (typeof parsed.balance !== "number" || !parsed.plan) return initialState();
    return parsed;
  } catch {
    return initialState();
  }
}

/** Apply the monthly credit grant if a new calendar month has started. */
function applyMonthlyGrant(state: CreditsState): CreditsState {
  const month = currentMonth();
  if (state.lastGrant === month) return state;
  const plan = planById(state.plan);
  return {
    ...state,
    balance: state.balance + plan.monthlyCredits,
    lastGrant: month,
    ledger: [makeEntry(plan.monthlyCredits, "credits.ledger.monthly"), ...state.ledger].slice(0, 50),
  };
}

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CreditsState>(initialState);

  useEffect(() => {
    setState(applyMonthlyGrant(readState()));
  }, []);

  const persist = useCallback((next: CreditsState) => {
    setState(next);
    try {
      window.localStorage.setItem(CREDITS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const canAfford = useCallback(
    (kind: ActionKind) => state.balance >= COSTS[kind],
    [state.balance],
  );

  const spend = useCallback(
    (kind: ActionKind) => {
      const cost = COSTS[kind];
      if (state.balance < cost) return false;
      const reasonKey =
        kind === "track"
          ? "credits.ledger.spentTrack"
          : kind === "voice"
            ? "credits.ledger.spentVoice"
            : "credits.ledger.spentTranscribe";
      persist({
        ...state,
        balance: state.balance - cost,
        ledger: [makeEntry(-cost, reasonKey), ...state.ledger].slice(0, 50),
      });
      return true;
    },
    [state, persist],
  );

  const subscribe = useCallback(
    (plan: PlanId) => {
      if (plan === state.plan) return;
      const p = planById(plan);
      persist({
        ...state,
        plan,
        balance: state.balance + p.monthlyCredits,
        lastGrant: currentMonth(),
        ledger: [makeEntry(p.monthlyCredits, "credits.ledger.subscribed"), ...state.ledger].slice(0, 50),
      });
    },
    [state, persist],
  );

  const buyPack = useCallback(
    (pack: CreditPack) => {
      const total = pack.credits + (pack.bonus ?? 0);
      persist({
        ...state,
        balance: state.balance + total,
        ledger: [makeEntry(total, "credits.ledger.pack"), ...state.ledger].slice(0, 50),
      });
    },
    [state, persist],
  );

  const value = useMemo<CreditsValue>(
    () => ({ ...state, canAfford, spend, subscribe, buyPack }),
    [state, canAfford, spend, subscribe, buyPack],
  );

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used within CreditsProvider");
  return ctx;
}

export { PACKS };
