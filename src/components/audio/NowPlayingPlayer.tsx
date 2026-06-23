import { Radio as RadioIcon, Heart, SkipBack, SkipForward, Shuffle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusChip, GoldBadge } from "@/components/premium/Chips";
import { VoteButton } from "@/components/premium/VoteButton";
import { usePlayer } from "@/audio/PlayerProvider";
import type { PlayableTrack } from "@/audio/tracks";
import { PlayButton } from "./PlayButton";
import { WaveBars } from "./WaveBars";
import { Seekbar } from "./Seekbar";
import { VolumeControl } from "./VolumeControl";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

/**
 * The flagship "Now Playing" radio player.
 */
export function NowPlayingPlayer({
  station,
  listeners,
  queue,
}: {
  station: string;
  listeners: string;
  queue: PlayableTrack[];
}) {
  const { t } = useI18n();
  const { current, isActive, prev, next } = usePlayer();
  const [liked, setLiked] = useState(false);

  // Show the live track if one belongs to this queue, else the lead track.
  const display = current && queue.some((q) => q.id === current.id) ? current : queue[0];
  const live = isActive(display.id);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[color-mix(in_oklab,var(--gold)_28%,transparent)] bg-noir-gradient p-7 shadow-[var(--shadow-card)] sm:p-10">
      <div className="absolute inset-0 bg-spot" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(115deg,var(--gold)_0,var(--gold)_1px,transparent_1px,transparent_22px)]" />

      <div className="relative grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
        {/* Artwork */}
        <div className="relative mx-auto shrink-0 lg:mx-0">
          <span className="pointer-events-none absolute -inset-3 rounded-[1.6rem] border border-[color-mix(in_oklab,var(--gold)_20%,transparent)]" />
          <img
            src={display.cover}
            alt={display.artist}
            className={cn(
              "relative h-48 w-48 rounded-2xl object-cover ring-1 ring-[color-mix(in_oklab,var(--gold)_35%,transparent)] transition-shadow sm:h-56 sm:w-56",
              live ? "shadow-[var(--shadow-glow)]" : "shadow-[var(--shadow-card)]",
            )}
          />
          {live && (
            <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-background/70 px-2.5 py-1 backdrop-blur-sm">
              <WaveBars active className="h-3" /> <span className="text-[0.65rem] text-foreground">{t("audio.onAir")}</span>
            </span>
          )}
        </div>

        {/* Meta + controls */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <GoldBadge variant="outline">
              <RadioIcon className="h-3.5 w-3.5" /> {station}
            </GoldBadge>
            <StatusChip status="Live" />
          </div>

          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            {display.title}
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">{display.artist}</p>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <WaveBars active={live} /> {listeners} {t("radio.votesShaping")}
          </div>

          {/* Transport */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous"
              className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <PlayButton track={display} queue={queue} size="xl" label={t("audio.play")} />
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Shuffle"
              className="hidden h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:grid"
            >
              <Shuffle className="h-4 w-4" />
            </button>
          </div>

          {/* Seek */}
          <div className="mt-5 max-w-xl">
            <Seekbar fallbackDuration={display.duration} />
          </div>

          {/* Secondary actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <VoteButton initialVotes={3420} />
            <Button
              variant="ghost-gold"
              onClick={() => setLiked((l) => !l)}
              className={cn(liked && "text-gold")}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} /> {t("radio.save")}
            </Button>
            <VolumeControl className="ml-auto hidden sm:flex" />
          </div>
        </div>
      </div>
    </section>
  );
}
