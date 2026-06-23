import { cn } from "@/lib/utils";

/**
 * Animated audio bars. Purely decorative — reflects whether audio is active.
 */
export function WaveBars({
  active = true,
  bars = 5,
  className,
  barClassName,
}: {
  active?: boolean;
  bars?: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <span className={cn("flex h-4 items-end gap-[2px]", className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn("w-[2px] origin-bottom rounded-full bg-gold", barClassName)}
          style={{
            height: "100%",
            animation: active
              ? `equalize ${0.7 + (i % 3) * 0.18}s ease-in-out ${i * 0.12}s infinite`
              : "none",
            transform: active ? undefined : "scaleY(0.25)",
            opacity: active ? undefined : 0.5,
          }}
        />
      ))}
    </span>
  );
}
