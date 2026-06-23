import { Volume2, Volume1, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/audio/PlayerProvider";

/**
 * Compact volume control with a draggable level bar.
 */
export function VolumeControl({ className }: { className?: string }) {
  const { volume, muted, setVolume, toggleMute } = usePlayer();
  const level = muted ? 0 : volume;

  const Icon = level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2;

  const handle = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setVolume((clientX - rect.left) / rect.width);
  };

  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="transition-colors hover:text-foreground"
      >
        <Icon className="h-4 w-4" />
      </button>
      <div
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level * 100)}
        tabIndex={0}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          handle(e.clientX, e.currentTarget);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) handle(e.clientX, e.currentTarget);
        }}
        className="group relative h-1 w-24 cursor-pointer rounded-full bg-secondary"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/70 group-hover:bg-gold"
          style={{ width: `${level * 100}%` }}
        />
      </div>
    </div>
  );
}
