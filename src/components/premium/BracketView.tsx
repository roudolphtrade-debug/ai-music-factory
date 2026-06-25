import { Trophy, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoldBadge } from "@/components/premium/Chips";
import {
  BATTLE_TRACKS,
  displayVotes,
  matchesByRound,
  votePercent,
  type Competitor,
  type Match,
  type RoundKey,
} from "@/library/bracket";
import { useBattles } from "@/library/BattlesProvider";
import { artistImages } from "@/data/mock";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

const ROUND_LABEL: Record<RoundKey, string> = {
  quarterFinal: "battles.quarterFinal",
  semiFinal: "battles.semiFinal",
  final: "battles.final",
};

function Side({
  match,
  side,
  competitor,
  onVote,
}: {
  match: Match;
  side: "a" | "b";
  competitor: Competitor | null;
  onVote: () => void;
}) {
  const { t } = useI18n();
  if (!competitor) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 px-3 py-2.5 text-sm text-muted-foreground">
        {t("bracket.awaiting")}
      </div>
    );
  }
  const pct = votePercent(match)[side];
  const isWinner = match.votedFor === competitor.artistId;
  const decided = !!match.votedFor;
  return (
    <button
      type="button"
      onClick={onVote}
      className={cn(
        "group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors",
        isWinner ? "border-gold/60 bg-[color-mix(in_oklab,var(--gold)_8%,transparent)]" : "border-border hover:bg-secondary/40",
      )}
    >
      <span
        className="absolute inset-y-0 left-0 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] transition-all duration-500"
        style={{ width: decided ? `${pct}%` : "0%" }}
        aria-hidden
      />
      <img
        src={artistImages[competitor.artistId]}
        alt={competitor.name}
        className="relative h-9 w-9 shrink-0 rounded-lg object-cover"
      />
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
          {competitor.name}
          {isWinner && <Check className="h-3.5 w-3.5 text-gold" />}
        </span>
        <span className="truncate text-xs text-muted-foreground">{BATTLE_TRACKS[competitor.artistId]}</span>
      </span>
      <span className="relative shrink-0 text-right">
        {decided ? (
          <span className="text-sm font-semibold tabular-nums text-foreground">{pct}%</span>
        ) : (
          <span className="text-[11px] font-medium uppercase tracking-wide text-gold opacity-0 transition-opacity group-hover:opacity-100">
            {t("bracket.vote")}
          </span>
        )}
        <span className="block text-[11px] tabular-nums text-muted-foreground">
          {formatNumber(displayVotes(match, competitor))}
        </span>
      </span>
    </button>
  );
}

function MatchCard({ match }: { match: Match }) {
  const { t } = useI18n();
  const { vote } = useBattles();
  const open = !!match.a && !!match.b;
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between px-1">
        <span className="eyebrow text-muted-foreground/70">
          {t(ROUND_LABEL[match.round])} · {match.slot + 1}
        </span>
        {open && !match.votedFor && <GoldBadge variant="outline">{t("bracket.open")}</GoldBadge>}
        {match.votedFor && <GoldBadge variant="outline">{t("bracket.voted")}</GoldBadge>}
      </div>
      <Side match={match} side="a" competitor={match.a} onVote={() => match.a && vote(match.id, match.a.artistId)} />
      <Side match={match} side="b" competitor={match.b} onVote={() => match.b && vote(match.id, match.b.artistId)} />
    </div>
  );
}

export function BracketView() {
  const { t } = useI18n();
  const { bracket, reset } = useBattles();
  const final = bracket.matches.find((m) => m.id === "m-f-0");
  const champ = final && final.votedFor
    ? final.a?.artistId === final.votedFor
      ? final.a
      : final.b
    : null;

  const rounds: RoundKey[] = ["quarterFinal", "semiFinal", "final"];

  return (
    <div className="space-y-6">
      {champ && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold/50 bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] p-6 text-center sm:flex-row sm:text-left">
          <img src={artistImages[champ.artistId]} alt={champ.name} className="h-16 w-16 rounded-xl object-cover" />
          <div className="flex-1">
            <p className="eyebrow flex items-center justify-center gap-2 text-gold sm:justify-start">
              <Crown className="h-4 w-4" /> {t("bracket.championEyebrow", { season: bracket.season })}
            </p>
            <p className="font-display text-2xl font-semibold text-foreground">{champ.name}</p>
            <p className="text-sm text-muted-foreground">{BATTLE_TRACKS[champ.artistId]}</p>
          </div>
          <Button variant="ghost-gold" size="sm" onClick={reset}>
            <Trophy className="h-4 w-4" /> {t("bracket.newSeason")}
          </Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {rounds.map((round) => (
          <div key={round} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-foreground">{t(ROUND_LABEL[round])}</h3>
              <span className="text-xs text-muted-foreground">
                {t("bracket.matchCount", { n: matchesByRound(bracket, round).length })}
              </span>
            </div>
            <div className="space-y-3">
              {matchesByRound(bracket, round).map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {!champ && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
            <Trophy className="h-4 w-4" /> {t("bracket.reset")}
          </Button>
        </div>
      )}
    </div>
  );
}
