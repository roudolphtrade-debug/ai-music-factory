import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="space-y-2">
        {eyebrow && (
          <p className="eyebrow flex items-center gap-2 text-gold">
            <span className="inline-block h-px w-6 bg-gold-gradient" />
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
          {title}
        </h2>
        {description && (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
