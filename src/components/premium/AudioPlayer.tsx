import { SkipBack, SkipForward, Heart, Shuffle, Repeat } from "lucide-react";
import { useState } from "react";
import { usePlayer, formatTime } from "@/audio/PlayerProvider";
import { radioQueue } from "@/audio/tracks";
import { PlayButton } from "@/components/audio/PlayButton";
import { WaveBars } from "@/components/audio/WaveBars";
import { Seekbar } from "@/components/audio/Seekbar";
import { VolumeControl } from "@/components/audio/VolumeControl";
import { cn } from "@/lib/utils";

/**
 * Persistent global player bar. Reflects the single active audio track.
 */
export function AudioPlayer() {
  const { current, isPlaying, prev, next, currentTime, duration } = usePlayer();
  const [liked, setLiked] = useState(false);

  // Idle state: show the lead radio track as a ready-to-play preview.
  const track = current ?? radioQueue[0];
  const elapsed = current ? formatTime(currentTime) : "0:00";
  const total = current && duration > 0 ? formatTime(duration) : track.duration;

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-xl">
      {/* Slim seek line (clickable) */}
      <div className="hidden px-4 pt-2 sm:block">
        <Seekbar showTimes={false} />
      </div>

      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        {/* Track meta */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative">
            <img
              loading="eager"
              src={track.cover}
              alt={track.artist}
              className={cn(
                "h-12 w-12 rounded-lg object-cover ring-1 ring-border transition-shadow duration-[var(--duration-slow)]",
                isPlaying &&
                  "ring-[color-mix(in_oklab,var(--gold)_45%,transparent)] animate-glow-breathe",
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
          </div>
          <button
            type="button"
            onClick={() => setLiked((l) => !l)}
            className={cn(
              "ml-1 hidden rounded-full p-2 transition-colors sm:inline-flex",
              liked ? "text-gold" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Like track"
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          </button>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-1.5">
          <PlayerIcon className="hidden md:inline-flex" aria-label="Shuffle">
            <Shuffle className="h-4 w-4" />
          </PlayerIcon>
          <PlayerIcon onClick={prev} aria-label="Previous">
            <SkipBack className="h-4 w-4" />
          </PlayerIcon>
          <PlayButton track={track} queue={radioQueue} size="md" />
          <PlayerIcon onClick={next} aria-label="Next">
            <SkipForward className="h-4 w-4" />
          </PlayerIcon>
          <PlayerIcon className="hidden md:inline-flex" aria-label="Repeat">
            <Repeat className="h-4 w-4" />
          </PlayerIcon>
        </div>

        {/* Right: time + volume + equalizer */}
        <div className="hidden flex-1 items-center justify-end gap-4 lg:flex">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {elapsed} / {total}
          </span>
          <WaveBars active={isPlaying} />
          <VolumeControl />
        </div>
      </div>
    </div>
  );
}

function PlayerIcon({
  children,
  className,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:h-9 sm:w-9",
        className,
      )}
    >
      {children}
    </button>
  );
}
