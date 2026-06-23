import { Link } from "@tanstack/react-router";
import { artistImages, type VirtualArtist } from "@/data/mock";
import { GoldBadge, ReputationChip } from "./Chips";

export function ArtistCard({ artist }: { artist: VirtualArtist }) {
  return (
    <Link
      to="/artists/$artistId"
      params={{ artistId: artist.id }}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-card card-hover"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={artistImages[artist.id]}
          alt={artist.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {artist.genres.slice(0, 1).map((g) => (
            <GoldBadge key={g} variant="outline">
              {g}
            </GoldBadge>
          ))}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
            {artist.name}
          </h3>
          <p className="text-xs text-muted-foreground">{artist.handle}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="text-xs text-muted-foreground">
          <span className="text-foreground">{artist.monthlyListeners}</span> listeners
        </div>
        <ReputationChip score={artist.reputation} />
      </div>
    </Link>
  );
}
