import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Check, ChevronUp } from "lucide-react";
import { StatusChip } from "@/components/premium/Chips";
import { makePlayable } from "@/audio/tracks";
import { usePlayer } from "@/audio/PlayerProvider";
import { PlayButton } from "./PlayButton";
import { WaveBars } from "./WaveBars";
import { useI18n } from "@/i18n/context";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Battle } from "@/data/mock";

type SideKey = "a" | "b";

/**
 * Head-to-head audio battle: two independent audio previews + live voting
 * with a temporary "leader" visual state.
 */
export function BattleAudioCard({ battle, index = 0 }: { battle: Battle; index?: number }) {
  const { t } = useI18n();
  const live = battle.status === "Live";

  const trackA = makePlayable({
    id: `${battle.id}-a`,
    title: battle.a.track,
    artist: battle.a.name,
    artistId: battle.a.artistId,
    index: index * 2,
  });
  const trackB = makePlayable({
    id: `${battle.id}-b`,
    title: battle.b.track,
    artist: battle.b.name,
    artistId: battle.b.artistId,
    index: index * 2 + 1,
  });
  const queue = [trackA, trackB];

  const [votes, setVotes] = useState({ a: battle.a.votes, b: battle.b.votes });
  const [voted, setVoted] = useState<SideKey | null>(null);

  const total = votes.a + votes.b || 1;
  const aPct = Math.round((votes.a / total) * 100);
  const leader: SideKey | null = votes.a === votes.b ? null : votes.a > votes.b ? "a" : "b";

  const castVote = (side: SideKey) => {
    if (!live || voted) return;
    setVotes((v) => ({ ...v, [side]: v[side] + 1 }));
    setVoted(side);
  };

  const round = `${t(`battles.${battle.round.phase}`)} · ${t("battles.bracket")} ${battle.round.bracket}`;
  const ends = t(battle.ends.key === "left" ? "time.left" : "time.startsIn", {
    t: battle.ends.text,
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-noir-gradient p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{round}</span>
        <StatusChip status={battle.status} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 sm:gap-4">
        <Contender
          track={trackA}
          queue={queue}
          votes={votes.a}
          leading={leader === "a"}
          voted={voted === "a"}
          canVote={live && !voted}
          onVote={() => castVote("a")}
          live={live}
        />
        <div className="flex items-center justify-center">
          <span className="font-display text-2xl font-semibold text-muted-foreground sm:text-3xl">
            {t("common.vs")}
          </span>
        </div>
        <Contender
          track={trackB}
          queue={queue}
          votes={votes.b}
          leading={leader === "b"}
          voted={voted === "b"}
          canVote={live && !voted}
          onVote={() => castVote("b")}
          live={live}
        />
      </div>

      {live && (
        <div className="mt-5">
          <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-gold-gradient transition-[width] duration-500"
              style={{ width: `${aPct}%` }}
            />
            <div
              className="bg-foreground/25 transition-[width] duration-500"
              style={{ width: `${100 - aPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>
              {aPct}% · {formatNumber(votes.a)}
            </span>
            <span>
              {formatNumber(votes.b)} · {100 - aPct}%
            </span>
          </div>
        </div>
      )}

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        {voted ? (
          <span className="inline-flex items-center gap-1.5 text-gold">
            <Check className="h-3.5 w-3.5" /> {t("audio.voteCast")}
          </span>
        ) : (
          ends
        )}
      </p>
    </article>
  );
}

function Contender({
  track,
  queue,
  votes,
  leading,
  voted,
  canVote,
  onVote,
  live,
}: {
  track: ReturnType<typeof makePlayable>;
  queue: ReturnType<typeof makePlayable>[];
  votes: number;
  leading: boolean;
  voted: boolean;
  canVote: boolean;
  onVote: () => void;
  live: boolean;
}) {
  const { t } = useI18n();
  const { isTrackPlaying } = usePlayer();
  const playing = isTrackPlaying(track.id);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border p-4 text-center transition-all duration-300",
        leading
          ? "border-[color-mix(in_oklab,var(--gold)_55%,transparent)] bg-[color-mix(in_oklab,var(--gold)_7%,transparent)] shadow-[var(--shadow-glow)]"
          : "border-border/60 bg-card/40",
      )}
    >
      <div className="relative">
        <img
          loading="eager"
          src={track.cover}
          alt={track.artist}
          className={cn(
            "h-20 w-20 rounded-2xl object-cover ring-1 ring-border sm:h-24 sm:w-24",
            playing && "ring-[color-mix(in_oklab,var(--gold)_50%,transparent)]",
          )}
        />
        <div className="absolute inset-0 grid place-items-center">
          <PlayButton track={track} queue={queue} size="md" />
        </div>
        {leading && live && (
          <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-[var(--shadow-glow)]">
            <Crown className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <div className="min-w-0">
        <Link
          to="/artists/$artistId"
          params={{ artistId: track.artistId }}
          className="block truncate font-semibold text-foreground transition-colors hover:text-gold"
        >
          {track.artist}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{track.title}</p>
        <p className="mt-0.5 text-[0.7rem] tabular-nums text-muted-foreground/70">
          {track.duration}
        </p>
      </div>

      {playing && <WaveBars active className="h-3" />}

      {live ? (
        <button
          type="button"
          onClick={onVote}
          disabled={!canVote}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
            voted
              ? "bg-gold-gradient text-primary-foreground"
              : canVote
                ? "border border-[color-mix(in_oklab,var(--gold)_45%,transparent)] text-gold hover:bg-[color-mix(in_oklab,var(--gold)_12%,transparent)]"
                : "border border-border text-muted-foreground",
          )}
        >
          {voted ? <Check className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          {formatNumber(votes)}
        </button>
      ) : (
        <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
          {t("common.votingSoon")}
        </span>
      )}
    </div>
  );
}
