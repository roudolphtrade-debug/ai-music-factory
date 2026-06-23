import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/context";

export function VoteButton({
  initialVotes,
  className,
  size = "default",
}: {
  initialVotes: number;
  className?: string;
  size?: "default" | "sm";
}) {
  const { t } = useI18n();
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(false);
  const [pop, setPop] = useState(false);

  const toggle = () => {
    setVoted((v) => {
      const next = !v;
      setVotes((c) => (v ? c - 1 : c + 1));
      if (next) {
        setPop(true);
        window.setTimeout(() => setPop(false), 420);
        toast.success(t("audio.voteCast"));
      }
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={voted}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border font-semibold transition-all duration-200 active:scale-[0.96] motion-reduce:active:scale-100",
        pop && "animate-vote-pop",
        size === "default" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
        voted
          ? "border-transparent bg-gold-gradient text-primary-foreground shadow-[0_8px_24px_-12px_var(--gold)]"
          : "border-[color-mix(in_oklab,var(--gold)_35%,transparent)] text-foreground hover:bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]",
        className,
      )}
    >
      <ChevronUp
        className={cn(
          "h-4 w-4 transition-transform duration-300",
          voted ? "-translate-y-0.5 scale-110" : "group-hover:-translate-y-0.5",
        )}
      />
      <span className="tabular-nums">{formatNumber(votes)}</span>
    </button>
  );
}
