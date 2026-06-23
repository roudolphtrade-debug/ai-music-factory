import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";

type Size = "sm" | "md";

const sizes: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
};

const icon: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-[18px] w-[18px]",
};

/**
 * Share a track via the Web Share API, falling back to clipboard copy.
 * Purely presentational — builds a shareable link from the current origin.
 */
export function ShareButton({
  title,
  artist,
  trackId,
  size = "md",
  className,
}: {
  title: string;
  artist?: string;
  trackId?: string;
  size?: Size;
  className?: string;
}) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = trackId ? `${origin}/radio?track=${encodeURIComponent(trackId)}` : origin;
    const text = artist ? `${title} — ${artist}` : title;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} · ${url}`);
      setDone(true);
      toast.success(t("library.shareCopied"));
      window.setTimeout(() => setDone(false), 1600);
    } catch (err) {
      // User-cancelled share dialogs reject — stay silent for those.
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(t("library.shareFailed"));
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("library.share")}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border backdrop-blur-sm transition-all duration-200 active:scale-[0.88] motion-reduce:active:scale-100",
        "border-[color-mix(in_oklab,var(--gold)_28%,transparent)] bg-background/50 text-muted-foreground hover:text-gold hover:border-[color-mix(in_oklab,var(--gold)_50%,transparent)]",
        sizes[size],
        className,
      )}
    >
      {done ? (
        <Check className={cn(icon[size], "text-gold")} />
      ) : (
        <Share2 className={icon[size]} />
      )}
    </button>
  );
}
