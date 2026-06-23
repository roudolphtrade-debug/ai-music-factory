import { cn } from "@/lib/utils";
import { usePlayer } from "@/audio/PlayerProvider";
import type { PlayableTrack } from "@/audio/tracks";
import { PlayButton } from "./PlayButton";
import { WaveBars } from "./WaveBars";

interface PlaylistProps {
  tracks: PlayableTrack[];
  subtitleFor?: (track: PlayableTrack) => string;
  trailing?: (track: PlayableTrack, index: number) => React.ReactNode;
  className?: string;
}

/**
 * Reusable, elegant track list with active-track highlight and inline play.
 */
export function Playlist({ tracks, subtitleFor, trailing, className }: PlaylistProps) {
  const { isActive, isTrackPlaying } = usePlayer();

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border surface-premium", className)}>
      {tracks.map((track, i) => {
        const active = isActive(track.id);
        const playing = isTrackPlaying(track.id);
        return (
          <div
            key={track.id}
            className={cn(
              "group flex items-center gap-4 px-3 py-2.5 transition-colors sm:px-4",
              i !== tracks.length - 1 && "border-b border-border/60",
              active ? "bg-[color-mix(in_oklab,var(--gold)_8%,transparent)]" : "hover:bg-secondary/40",
            )}
          >
            {/* Rank / play toggle */}
            <div className="relative grid h-9 w-9 shrink-0 place-items-center">
              {playing ? (
                <WaveBars active className="h-4" />
              ) : (
                <span
                  className={cn(
                    "font-display text-base font-semibold tabular-nums transition-opacity group-hover:opacity-0",
                    active ? "text-gold" : "text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
              )}
              {!playing && (
                <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                  <PlayButton track={track} queue={tracks} size="sm" variant="ghost" />
                </div>
              )}
            </div>

            <img
              src={track.cover}
              alt={track.artist}
              loading="lazy"
              className={cn(
                "h-11 w-11 rounded-lg object-cover ring-1 ring-border transition-shadow",
                active && "ring-[color-mix(in_oklab,var(--gold)_45%,transparent)] shadow-[var(--shadow-glow)]",
              )}
            />

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate font-medium",
                  active ? "text-gold" : "text-foreground",
                )}
              >
                {track.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {subtitleFor ? subtitleFor(track) : track.artist}
              </p>
            </div>

            {trailing ? (
              trailing(track, i)
            ) : (
              <span className="text-xs tabular-nums text-muted-foreground">{track.duration}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
