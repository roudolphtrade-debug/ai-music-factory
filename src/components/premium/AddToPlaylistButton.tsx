import { useState } from "react";
import { ListPlus, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePlaylists } from "@/library/PlaylistsProvider";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

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
 * Adds a track to one or more personal playlists (built from favorites),
 * with inline playlist creation. Persists via PlaylistsProvider.
 */
export function AddToPlaylistButton({
  trackId,
  size = "md",
  className,
}: {
  trackId: string;
  size?: Size;
  className?: string;
}) {
  const { t } = useI18n();
  const { playlists, createPlaylist, addToPlaylist, removeFromPlaylist, isInPlaylist } =
    usePlaylists();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const create = () => {
    if (!name.trim()) return;
    createPlaylist(name, [trackId]);
    setName("");
    toast.success(t("playlists.created"));
  };

  const toggle = (id: string, inList: boolean) => {
    if (inList) {
      removeFromPlaylist(id, trackId);
      toast.success(t("playlists.removedFromPlaylist"));
    } else {
      addToPlaylist(id, trackId);
      toast.success(t("playlists.addedToPlaylist"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={t("playlists.addTo")}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "grid shrink-0 place-items-center rounded-full border border-[color-mix(in_oklab,var(--gold)_28%,transparent)] bg-background/50 text-muted-foreground backdrop-blur-sm transition-all duration-200 hover:border-[color-mix(in_oklab,var(--gold)_50%,transparent)] hover:text-gold active:scale-[0.88] motion-reduce:active:scale-100",
            sizes[size],
            className,
          )}
        >
          <ListPlus className={icon[size]} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("playlists.addTo")}</DialogTitle>
          <DialogDescription>{t("playlists.addToDesc")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder={t("playlists.newPlaceholder")}
            maxLength={40}
          />
          <Button variant="gold" size="sm" onClick={create} disabled={!name.trim()}>
            <Plus className="h-4 w-4" />
            {t("playlists.create")}
          </Button>
        </div>

        <div className="mt-1 max-h-64 space-y-1 overflow-y-auto">
          {playlists.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("playlists.emptyHint")}
            </p>
          ) : (
            playlists.map((p) => {
              const inList = isInPlaylist(p.id, trackId);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id, inList)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    inList
                      ? "border-[color-mix(in_oklab,var(--gold)_45%,transparent)] bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] text-foreground"
                      : "border-border text-foreground hover:bg-secondary/50",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {p.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t("playlists.count", { n: p.trackIds.length })}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                      inList ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {inList ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
