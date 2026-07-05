import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/audio/PlayerProvider";
import { useLibrary } from "@/library/LibraryProvider";
import type { PlayableTrack } from "@/audio/tracks";

type Size = "sm" | "md" | "lg" | "xl";
type Variant = "gold" | "outline" | "ghost";

const sizes: Record<Size, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-16 w-16",
};

const icon: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-7 w-7",
};

/**
 * Reusable play / pause control bound to a single playable track.
 * Derives its state from the global player so only one track ever plays.
 */
export function PlayButton({
  track,
  queue,
  size = "md",
  variant = "gold",
  className,
  label,
}: {
  track: PlayableTrack;
  queue?: PlayableTrack[];
  size?: Size;
  variant?: Variant;
  className?: string;
  label?: string;
}) {
  const { toggle, isActive, isTrackPlaying } = usePlayer();
  const { recordPlay } = useLibrary();
  const active = isActive(track.id);
  const playing = isTrackPlaying(track.id);

  const onClick = () => {
    if (!playing) recordPlay(track.id);
    toggle(track, queue);
  };

  const variants: Record<Variant, string> = {
    gold: cn(
      "bg-gold-gradient text-primary-foreground shadow-[0_10px_28px_-12px_var(--gold)]",
      "hover:scale-105",
    ),
    outline: cn(
      "border text-foreground",
      active
        ? "border-[color-mix(in_oklab,var(--gold)_55%,transparent)] text-gold"
        : "border-border hover:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]",
    ),
    ghost: cn(
      "bg-secondary/60 text-gold",
      "group-hover:bg-gold-gradient group-hover:text-primary-foreground",
    ),
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? (playing ? "Pause" : "Play")}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        sizes[size],
        variants[variant],
        className,
      )}
    >
      {playing ? (
        <Pause className={icon[size]} />
      ) : (
        <Play className={cn(icon[size], "translate-x-[1px]")} />
      )}
    </button>
  );
}
