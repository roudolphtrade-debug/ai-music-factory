import { Link } from "@tanstack/react-router";
import { artistImages } from "@/data/mock";
import { ReputationChip } from "./Chips";
import { cn } from "@/lib/utils";

export function RankingRow({
  rank,
  artistId,
  name,
  meta,
  reputation,
  trailing,
}: {
  rank: number;
  artistId: keyof typeof artistImages;
  name: string;
  meta: string;
  reputation?: number;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      to="/artists/$artistId"
      params={{ artistId }}
      className="group flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/50"
    >
      <span
        className={cn(
          "w-6 text-center font-display text-lg font-semibold tabular-nums",
          rank <= 3 ? "text-gold" : "text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <img
        src={artistImages[artistId]}
        alt={name}
        loading="lazy"
        className="h-11 w-11 rounded-lg object-cover ring-1 ring-border"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground group-hover:text-gold">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      {reputation !== undefined && <ReputationChip score={reputation} />}
      {trailing}
    </Link>
  );
}
