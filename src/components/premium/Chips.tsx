import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/context";

export function GoldBadge({
  children,
  variant = "soft",
  className,
}: {
  children: React.ReactNode;
  variant?: "soft" | "solid" | "outline";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.66rem] font-medium tracking-[0.04em]",
        variant === "soft" &&
          "bg-[color-mix(in_oklab,var(--gold)_9%,transparent)] text-gold",
        variant === "solid" && "bg-gold-gradient text-primary-foreground",
        variant === "outline" &&
          "border border-[color-mix(in_oklab,var(--gold)_24%,transparent)] text-foreground/75",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ReputationChip({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--gold)_22%,transparent)] bg-[color-mix(in_oklab,var(--gold)_5%,transparent)] px-2.5 py-1 text-xs font-semibold text-gold",
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      {score.toFixed(1)}
      <span className="font-normal tracking-[0.12em] text-muted-foreground">REP</span>
    </span>
  );
}

const statusStyles: Record<string, string> = {
  Published: "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[var(--success)]",
  Live: "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[var(--success)]",
  Mastering: "bg-[color-mix(in_oklab,var(--gold)_16%,transparent)] text-gold",
  Review: "bg-[color-mix(in_oklab,var(--gold)_16%,transparent)] text-gold",
  Upcoming: "bg-secondary text-muted-foreground",
  Draft: "bg-secondary text-muted-foreground",
  Closed: "bg-secondary text-muted-foreground",
};

export function StatusChip({ status }: { status: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium",
        statusStyles[status] ?? "bg-secondary text-muted-foreground",
      )}
    >
      {(status === "Live" || status === "Published") && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-gold" />
      )}
      {t(`status.${status.toLowerCase()}`)}
    </span>
  );
}
