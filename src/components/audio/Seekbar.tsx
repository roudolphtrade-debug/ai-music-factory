import { useRef } from "react";
import { cn } from "@/lib/utils";
import { usePlayer, formatTime } from "@/audio/PlayerProvider";

/**
 * Seekable progress bar bound to the global player. Shows elapsed / total time.
 */
export function Seekbar({
  showTimes = true,
  className,
  fallbackDuration,
}: {
  showTimes?: boolean;
  className?: string;
  /** Mock "3:48" style label shown before real metadata loads. */
  fallbackDuration?: string;
}) {
  const { currentTime, duration, seekRatio } = usePlayer();
  const trackRef = useRef<HTMLDivElement>(null);
  const ratio = duration > 0 ? currentTime / duration : 0;

  const handleSeek = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    seekRatio((clientX - rect.left) / rect.width);
  };

  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      {showTimes && (
        <span className="w-10 text-right text-[0.7rem] tabular-nums text-muted-foreground">
          {formatTime(currentTime)}
        </span>
      )}
      <div
        ref={trackRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          handleSeek(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) handleSeek(e.clientX);
        }}
        className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-secondary"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gold-gradient"
          style={{ width: `${ratio * 100}%` }}
        />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold opacity-0 shadow-[0_0_0_4px_color-mix(in_oklab,var(--gold)_25%,transparent)] transition-opacity group-hover:opacity-100"
          style={{ left: `${ratio * 100}%` }}
        />
      </div>
      {showTimes && (
        <span className="w-10 text-[0.7rem] tabular-nums text-muted-foreground">
          {duration > 0 ? formatTime(duration) : fallbackDuration ?? "0:00"}
        </span>
      )}
    </div>
  );
}
