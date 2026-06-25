import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ArtistId } from "@/data/mock";
import { buildBracket, castVote, type BracketState } from "./bracket";

const BRACKET_KEY = "afm-bracket";

interface BattlesValue {
  bracket: BracketState;
  vote: (matchId: string, artistId: ArtistId) => void;
  reset: () => void;
}

const BattlesContext = createContext<BattlesValue | null>(null);

function readBracket(): BracketState {
  if (typeof window === "undefined") return buildBracket();
  try {
    const raw = window.localStorage.getItem(BRACKET_KEY);
    if (!raw) return buildBracket();
    const parsed = JSON.parse(raw) as BracketState;
    if (!parsed.matches || !Array.isArray(parsed.matches)) return buildBracket();
    return parsed;
  } catch {
    return buildBracket();
  }
}

export function BattlesProvider({ children }: { children: ReactNode }) {
  const [bracket, setBracket] = useState<BracketState>(buildBracket);

  useEffect(() => {
    setBracket(readBracket());
  }, []);

  const persist = useCallback((next: BracketState) => {
    setBracket(next);
    try {
      window.localStorage.setItem(BRACKET_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const vote = useCallback(
    (matchId: string, artistId: ArtistId) => {
      persist(castVote(bracket, matchId, artistId));
    },
    [bracket, persist],
  );

  const reset = useCallback(() => persist(buildBracket(bracket.season)), [bracket.season, persist]);

  const value = useMemo<BattlesValue>(() => ({ bracket, vote, reset }), [bracket, vote, reset]);

  return <BattlesContext.Provider value={value}>{children}</BattlesContext.Provider>;
}

export function useBattles() {
  const ctx = useContext(BattlesContext);
  if (!ctx) throw new Error("useBattles must be used within BattlesProvider");
  return ctx;
}
