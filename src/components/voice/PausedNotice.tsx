import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The AI is paused on purpose (503 `ai_paused`): a calm amber/gold notice, never the red of a real error.
 * It only carries a translated sentence; the status, the code and the server's text are never shown.
 * `compact` is a single line beside a small control; otherwise it is a boxed notice under a larger one.
 */
export function PausedNotice({
  children,
  compact = false,
  className,
}: {
  children: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <p
      role="status"
      data-ai-paused=""
      className={cn(
        compact
          ? "inline-flex items-start gap-1.5 text-xs text-gold"
          : "flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-secondary/30 px-4 py-3 text-sm text-foreground",
        className,
      )}
    >
      <Info
        className={cn("shrink-0 text-gold", compact ? "mt-px h-3.5 w-3.5" : "mt-0.5 h-4 w-4")}
        aria-hidden="true"
      />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
