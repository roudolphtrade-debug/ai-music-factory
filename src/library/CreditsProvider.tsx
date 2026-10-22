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
  applyMonthlyGrant,
  initialState,
  makeEntry,
  type ActionKind,
  type CreditsState,
} from "./credits";

const CREDITS_KEY = "afm-credits";

interface CreditsValue extends CreditsState {
  canAfford: (kind: ActionKind) => boolean;
  spend: (kind: ActionKind) => boolean;
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

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CreditsState>(initialState);

  useEffect(() => {
    // Every month brings the free allowance, whatever plan an old wallet still records.
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

  const value = useMemo<CreditsValue>(
    () => ({ ...state, canAfford, spend }),
    [state, canAfford, spend],
  );

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used within CreditsProvider");
  return ctx;
}

export { PACKS };
