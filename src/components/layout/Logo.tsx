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
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            <span className="gold-text">Ai</span> Music Factory
          </span>
          <span className="eyebrow text-[0.55rem] text-muted-foreground">
            Social OS for AI artists
          </span>
        </div>
      )}
    </div>
  );
}

function Mark() {
  return (
    <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--gold)_28%,transparent)] bg-noir-gradient shadow-[0_8px_24px_-12px_var(--gold)]">
      <span className="absolute inset-x-0 top-0 h-1/2 bg-spot" />
      <svg viewBox="0 0 24 24" className="relative h-5 w-5" aria-hidden>
        <path
          d="M12 3 L21 21 L15.5 21 L12 12.5 L8.5 21 L3 21 Z"
          fill="currentColor"
          className="text-foreground"
        />
        <rect x="11.1" y="13.5" width="1.8" height="6" rx="0.9" className="fill-[var(--gold)]" />
      </svg>
    </span>
  );
}
