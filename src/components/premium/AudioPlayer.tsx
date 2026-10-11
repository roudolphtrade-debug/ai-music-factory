import { SkipBack, SkipForward, Heart, Shuffle, Repeat, Repeat1, Loader2, AlertCircle, RotateCw } from "lucide-react";
import { useEffect } from "react";
import { usePlayer, formatTime } from "@/audio/PlayerProvider";
import { radioQueue } from "@/audio/tracks";
import { PlayButton } from "@/components/audio/PlayButton";
import { WaveBars } from "@/components/audio/WaveBars";
import { Seekbar } from "@/components/audio/Seekbar";
import { VolumeControl } from "@/components/audio/VolumeControl";
import { QueuePanel } from "@/components/audio/QueuePanel";
import { useLibrary } from "@/library/LibraryProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";
import { homeTransport } from "@/i18n/home-editorial";
import { useListening } from "@/i18n/listening";

/**
 * Persistent global player bar. Reflects the single active audio track.
 */
export function AudioPlayer({ compact = false }: { compact?: boolean }) {
  const { lang, t } = useI18n();
  const { l } = useListening();
  const { current, isPlaying, status, shuffle, repeat, prev, next, toggle, toggleShuffle, cycleRepeat, retry, currentTime, duration } = usePlayer();
  const { isFavorite, toggleFavorite } = useLibrary();

  // Idle state: show the lead radio track as a ready-to-play preview.
  const track = current ?? radioQueue[0];
  const elapsed = current ? formatTime(currentTime) : "0:00";
  const total = current && duration > 0 ? formatTime(duration) : track.duration;
  const liked = isFavorite(track.id);
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;
  const repeatLabel = repeat === "one" ? l.repeatOne : repeat === "all" ? l.repeatAll : l.repeatOff;
  const statusLabel = status === "loading" ? l.loading : status === "error" ? l.error : status === "playing" ? l.playing : status === "paused" ? l.paused : "";

  // Space toggles playback outside of form fields and buttons.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || !current) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.closest("input, textarea, select, button, a, [role=slider], [contenteditable=true], [role=dialog]"))) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, toggle]);

  return (
    <div data-testid="global-player" className={cn("border-t border-border backdrop-blur-xl", compact ? "home-mini-player bg-card" : "bg-card/80")}>
      <span className="sr-only" role="status" aria-live="polite">
        {current ? `${statusLabel} · ${track.title} · ${track.artist}` : ""}
      </span>
      {compact && <span className="sr-only" role="timer">{elapsed} / {total}</span>}
      {/* Slim seek line (clickable) */}
      <div className="hidden px-4 pt-2 sm:block">
        <Seekbar showTimes={false} />
      </div>

      {status === "error" && current && (
        <div role="alert" className="flex items-center gap-2 border-b border-border px-4 py-1.5 text-xs text-foreground sm:px-6">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-gold" />
          <span className="min-w-0 flex-1 truncate">{l.error}</span>
          <button type="button" onClick={retry} className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-gold hover:underline">
            <RotateCw className="h-3 w-3" /> {l.retry}
          </button>
          <button type="button" onClick={next} className="min-h-8 rounded-full px-2 text-muted-foreground hover:text-foreground">
            {l.skip}
          </button>
        </div>
      )}

      <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center sm:flex sm:gap-4 sm:px-6 sm:py-3", compact ? "gap-1 px-3 py-2" : "gap-4 px-4 py-3")}>
        {/* Track meta */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="relative shrink-0">
            <img
              loading="eager"
              src={track.cover}
              alt={track.artist}
              className={cn(
                compact ? "h-9 w-9 rounded-md object-cover ring-1 ring-border sm:h-12 sm:w-12" : "h-12 w-12 rounded-lg object-cover ring-1 ring-border transition-shadow duration-[var(--duration-slow)]",
                isPlaying &&
                  "ring-[color-mix(in_oklab,var(--gold)_45%,transparent)] animate-glow-breathe",
              )}
            />
            {status === "loading" && (
              <span className="absolute inset-0 grid place-items-center rounded-md bg-background/60">
                <Loader2 className="h-4 w-4 animate-spin text-gold" aria-hidden />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground" title={track.title}>{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
          </div>
          <button
            type="button"
            onClick={() => toggleFavorite(track.id)}
            aria-pressed={liked}
            className={cn(
              "ms-1 hidden h-9 w-9 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground sm:grid",
              liked ? "text-gold" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label={liked ? l.unlike : l.like}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          </button>
        </div>

        {/* Transport */}
        <div className={cn("flex shrink-0 items-center", compact ? "gap-0 sm:gap-1.5" : "gap-1.5")}>
          <PlayerIcon className="hidden md:inline-flex" aria-label={l.shuffle} pressed={shuffle} onClick={toggleShuffle}>
            <Shuffle className="h-4 w-4" />
          </PlayerIcon>
          <PlayerIcon onClick={prev} aria-label={homeTransport[lang].previous}>
            <SkipBack className="h-4 w-4 rtl:-scale-x-100" />
          </PlayerIcon>
          <PlayButton track={track} queue={radioQueue} size="md" label={t(isPlaying ? "audio.pause" : "audio.play")} />
          <PlayerIcon onClick={next} aria-label={homeTransport[lang].next}>
            <SkipForward className="h-4 w-4 rtl:-scale-x-100" />
          </PlayerIcon>
          <PlayerIcon className="hidden md:inline-flex" aria-label={repeatLabel} pressed={repeat !== "off"} onClick={cycleRepeat}>
            <RepeatIcon className="h-4 w-4" />
          </PlayerIcon>
          {!compact && <QueuePanel />}
          {compact && <QueuePanel className="hidden sm:grid" />}
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
  pressed,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  pressed?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Button variant="ghost" size="icon"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      className={cn(
        "relative grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:h-9 sm:w-9",
        pressed && "text-gold after:absolute after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-gold",
        className,
      )}
    >
      {children}
    </Button>
  );
}
