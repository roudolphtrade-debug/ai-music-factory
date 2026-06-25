import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { artists, type ArtistId } from "@/data/mock";
import {
  archiveSeason,
  buildBracket,
  castVote,
  champion,
  type BracketState,
} from "./bracket";
import { useNotifications } from "./NotificationsProvider";

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
    // Backfill history for brackets saved before season archiving existed.
    if (!Array.isArray(parsed.history)) parsed.history = [];
    return parsed;
  } catch {
    return buildBracket();
  }
}

function artistName(id: ArtistId): string {
  return artists.find((a) => a.id === id)?.name ?? id;
}

export function BattlesProvider({ children }: { children: ReactNode }) {
  const [bracket, setBracket] = useState<BracketState>(buildBracket);
  const { notify } = useNotifications();

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
      const before = champion(bracket);
      const next = castVote(bracket, matchId, artistId);
      persist(next);
      notify("vote", "notif.voteCast", { artist: artistName(artistId) });
      const after = champion(next);
      if (!before && after) {
        notify("champion", "notif.championCrowned", {
          artist: after.name,
          season: next.season,
        });
      }
    },
    [bracket, persist, notify],
  );

  const reset = useCallback(() => {
    const record = archiveSeason(bracket);
    if (record) {
      const history = [record, ...(bracket.history ?? [])].slice(0, 12);
      persist(buildBracket(bracket.season + 1, history));
      notify("season", "notif.newSeason", { season: bracket.season + 1 });
    } else {
      persist(buildBracket(bracket.season, bracket.history ?? []));
    }
  }, [bracket, persist, notify]);

  const value = useMemo<BattlesValue>(() => ({ bracket, vote, reset }), [bracket, vote, reset]);

  return <BattlesContext.Provider value={value}>{children}</BattlesContext.Provider>;
}

export function useBattles() {
  const ctx = useContext(BattlesContext);
  if (!ctx) throw new Error("useBattles must be used within BattlesProvider");
  return ctx;
}
