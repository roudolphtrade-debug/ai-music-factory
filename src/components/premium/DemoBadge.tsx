import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

/** Marks simulated content so fictional data is never presented as real. */
export function DemoBadge({ className, title }: { className?: string; title?: string }) {
  const { t } = useI18n();
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
        className,
      )}
    >
      {t("nav.demo")}
    </span>
  );
}
