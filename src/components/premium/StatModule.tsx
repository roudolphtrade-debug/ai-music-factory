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
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 card-hover",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold-gradient opacity-40" />
      <div className="flex items-start justify-between">
        <p className="eyebrow text-muted-foreground">{label}</p>
        {icon && <span className="text-gold/80">{icon}</span>}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {value}
      </p>
      {delta && <p className="mt-1 text-xs text-muted-foreground">{delta}</p>}
    </div>
  );
}
