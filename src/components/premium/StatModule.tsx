import { cn } from "@/lib/utils";

export function StatModule({
  label,
  value,
  delta,
  icon,
  className,
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border surface-premium p-5 card-hover sm:p-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold-gradient opacity-50 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <p className="eyebrow text-muted-foreground/70">{label}</p>
        {icon && (
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-border/70 bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] text-gold/90 transition-colors duration-500 group-hover:border-[color-mix(in_oklab,var(--gold)_35%,transparent)]">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {value}
      </p>
      {delta && <p className="mt-1.5 text-xs text-muted-foreground">{delta}</p>}
    </div>
  );
}
