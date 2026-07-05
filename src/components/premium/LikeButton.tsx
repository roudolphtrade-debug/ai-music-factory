import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/library/LibraryProvider";
import { useI18n } from "@/i18n/context";

type Size = "sm" | "md";

const sizes: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-11 w-11 sm:h-9 sm:w-9",
};

const icon: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-[18px] w-[18px]",
};

/**
 * Heart toggle bound to the local library. Optimistic, persisted, and
 * announces state changes through the unified toast system.
 */
export function LikeButton({
  trackId,
  size = "md",
  className,
}: {
  trackId: string;
  size?: Size;
  className?: string;
}) {
  const { t } = useI18n();
  const { isFavorite, toggleFavorite } = useLibrary();
  const liked = isFavorite(trackId);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleFavorite(trackId);
    toast.success(added ? t("library.added") : t("library.removed"));
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? t("library.removeFavorite") : t("library.addFavorite")}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border backdrop-blur-sm transition-all duration-200 active:scale-[0.88] motion-reduce:active:scale-100",
        sizes[size],
        liked
          ? "border-transparent bg-gold-gradient text-primary-foreground shadow-[0_8px_22px_-12px_var(--gold)]"
          : "border-[color-mix(in_oklab,var(--gold)_28%,transparent)] bg-background/50 text-muted-foreground hover:text-gold hover:border-[color-mix(in_oklab,var(--gold)_50%,transparent)]",
        className,
      )}
    >
      <Heart
        className={cn(icon[size], "transition-transform", liked && "fill-current scale-110")}
      />
    </button>
  );
}
