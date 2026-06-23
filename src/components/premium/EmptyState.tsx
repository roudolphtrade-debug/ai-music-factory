import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-route-in relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-spot" />
      <div className="relative">
        <div className="animate-float grid h-14 w-14 place-items-center rounded-2xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-noir-gradient text-gold shadow-[0_0_30px_-12px_color-mix(in_oklab,var(--gold)_60%,transparent)]">
          {icon}
        </div>
      </div>
      <h3 className="relative mt-5 font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="relative mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}
