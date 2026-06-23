import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoteButton({
  initialVotes,
  className,
  size = "default",
}: {
  initialVotes: number;
  className?: string;
  size?: "default" | "sm";
}) {
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(false);

  const toggle = () => {
    setVoted((v) => {
      setVotes((c) => (v ? c - 1 : c + 1));
      return !v;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={voted}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border font-semibold transition-all",
        size === "default" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
        voted
          ? "border-transparent bg-gold-gradient text-primary-foreground shadow-[0_8px_24px_-12px_var(--gold)]"
          : "border-[color-mix(in_oklab,var(--gold)_35%,transparent)] text-foreground hover:bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]",
        className,
      )}
    >
      <ChevronUp
        className={cn("h-4 w-4 transition-transform", voted && "-translate-y-0.5")}
      />
      <span className="tabular-nums">{votes.toLocaleString()}</span>
    </button>
  );
}
