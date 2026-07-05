import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Mark />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight text-foreground">
            <span className="gold-sheen">Ai</span> Music{" "}
            <span className="font-normal italic text-muted-foreground">Factory</span>
          </span>
          <span className="eyebrow mt-1 text-[0.5rem] tracking-[0.32em] text-muted-foreground/70">
            Social OS for AI artists
          </span>
        </div>
      )}
    </div>
  );
}

function Mark() {
  return (
    <span className="group relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--gold)_32%,transparent)] bg-noir-gradient shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--gold)_22%,transparent),0_10px_28px_-12px_var(--gold)]">
      {/* top spotlight */}
      <span className="absolute inset-x-0 top-0 h-1/2 bg-spot" />
      {/* corner facets */}
      <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--gold)] opacity-70" />
      <svg viewBox="0 0 24 24" className="relative h-[1.45rem] w-[1.45rem]" aria-hidden>
        <defs>
          <linearGradient id="afm-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.93 0.08 90)" />
            <stop offset="100%" stopColor="oklch(0.66 0.13 70)" />
          </linearGradient>
        </defs>
        {/* monogram "A" as a sound peak */}
        <path
          d="M12 2.5 L21 21.5 L15.6 21.5 L12 12.6 L8.4 21.5 L3 21.5 Z"
          fill="currentColor"
          className="text-foreground"
        />
        {/* gold center pillar */}
        <rect x="11" y="13" width="2" height="7" rx="1" fill="url(#afm-gold)" />
        <circle cx="12" cy="10.4" r="1.05" fill="url(#afm-gold)" />
      </svg>
    </span>
  );
}
