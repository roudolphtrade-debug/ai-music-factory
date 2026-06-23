import { Link } from "@tanstack/react-router";
import { artistImages, type VirtualArtist } from "@/data/mock";
import { GoldBadge, ReputationChip } from "./Chips";

export function ArtistCard({ artist }: { artist: VirtualArtist }) {
  return (
    <Link
      to="/artists/$artistId"
      params={{ artistId: artist.id }}
      className="group relative block overflow-hidden rounded-2xl border border-border surface-premium card-hover"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={artistImages[artist.id]}
          alt={artist.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(120%_80%_at_50%_120%,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_60%)]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {artist.genres.slice(0, 1).map((g) => (
            <GoldBadge key={g} variant="outline" className="backdrop-blur-sm">
              {g}
            </GoldBadge>
          ))}
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
            {artist.name}
          </h3>
          <p className="text-xs text-muted-foreground">{artist.handle}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3.5">
        <div className="text-xs text-muted-foreground">
          <span className="font-display text-base font-semibold text-foreground">
            {artist.monthlyListeners}
          </span>{" "}
          listeners
        </div>
        <ReputationChip score={artist.reputation} />
      </div>
    </Link>
  );
}
