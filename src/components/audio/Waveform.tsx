import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/audio/PlayerProvider";

/**
 * Deterministic pseudo-random height so SSR and client render identically.
 */
function barHeight(i: number, total: number): number {
  const seed = Math.sin(i * 12.9898) * 43758.5453;
  const frac = seed - Math.floor(seed);
  // Gentle envelope so the middle of the waveform is taller.
  const envelope = 0.55 + 0.45 * Math.sin((i / total) * Math.PI);
  return 0.25 + frac * 0.75 * envelope;
}

/**
 * Live, seekable waveform bound to the global player. Played bars glow gold,
 * the bar at the playhead pulses, upcoming bars stay muted.
 */
export function Waveform({
  bars = 56,
  active = false,
  className,
}: {
  /** Number of bars to render. */
  bars?: number;
  /** Whether this waveform represents the currently playing track. */
  active?: boolean;
  className?: string;
}) {
  const { currentTime, duration, seekRatio } = usePlayer();
  const trackRef = useRef<HTMLDivElement>(null);

  const heights = useMemo(
    () => Array.from({ length: bars }, (_, i) => barHeight(i, bars)),
    [bars],
  );

  const ratio = active && duration > 0 ? currentTime / duration : 0;
  const playedIndex = Math.round(ratio * bars);

  const seek = (clientX: number) => {
    const el = trackRef.current;
    if (!el || !active) return;
    const rect = el.getBoundingClientRect();
    seekRatio((clientX - rect.left) / rect.width);
  };

  return (
    <div
      ref={trackRef}
      role={active ? "slider" : undefined}
      aria-label={active ? "Seek" : undefined}
      aria-valuemin={active ? 0 : undefined}
      aria-valuemax={active ? 100 : undefined}
      aria-valuenow={active ? Math.round(ratio * 100) : undefined}
      tabIndex={active ? 0 : undefined}
      onPointerDown={
        active
          ? (e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              seek(e.clientX);
            }
          : undefined
      }
      onPointerMove={active ? (e) => e.buttons === 1 && seek(e.clientX) : undefined}
      className={cn(
        "flex h-12 items-center gap-[3px]",
        active && "cursor-pointer",
        className,
      )}
      aria-hidden={!active}
    >
      {heights.map((h, i) => {
        const played = active && i < playedIndex;
        const atHead = active && Math.abs(i - playedIndex) <= 1;
        return (
          <span
            key={i}
            className={cn(
              "min-w-0 flex-1 origin-center rounded-full transition-colors duration-150",
              played ? "bg-gold-gradient" : "bg-[color-mix(in_oklab,var(--gold)_18%,transparent)]",
            )}
            style={{
              height: `${h * 100}%`,
              animation: atHead
                ? `equalize ${0.6 + (i % 3) * 0.15}s ease-in-out infinite`
                : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
