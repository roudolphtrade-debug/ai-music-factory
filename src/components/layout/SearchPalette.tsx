import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Music4, Users, Building2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { artists, tracks, labels, artistImages } from "@/data/mock";
import { useI18n } from "@/i18n/context";

/**
 * Global search, triggered by the topbar button or Cmd/Ctrl+K from anywhere.
 * Works identically on mobile and desktop since it's a full dialog rather
 * than an inline dropdown — the previous input was `hidden` below `sm:`,
 * meaning search didn't exist at all on mobile. This does.
 */
export function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const go = (path: string, params?: Record<string, string>) => {
    onOpenChange(false);
    navigate({ to: path, params });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("topbar.searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("topbar.searchEmpty")}</CommandEmpty>

        <CommandGroup heading={t("nav.artists")}>
          {artists.slice(0, 8).map((a) => (
            <CommandItem
              key={a.id}
              value={`${a.name} ${a.handle} ${a.genres.join(" ")}`}
              onSelect={() => go("/artists/$artistId", { artistId: a.id })}
            >
              <img src={artistImages[a.id]} alt="" className="h-6 w-6 rounded-md object-cover" />
              <span>{a.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{a.handle}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading={t("artistProfile.tracks")}>
          {tracks.slice(0, 8).map((tr) => (
            <CommandItem
              key={tr.id}
              value={`${tr.title} ${tr.artist} ${tr.genre}`}
              onSelect={() => go("/artists/$artistId", { artistId: tr.artistId })}
            >
              <Music4 className="h-4 w-4 text-muted-foreground" />
              <span>{tr.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">{tr.artist}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading={t("nav.labels")}>
          {labels.map((l) => (
            <CommandItem
              key={l.id}
              value={`${l.name} ${l.specialty}`}
              onSelect={() => go("/labels/$labelId", { labelId: l.id })}
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{l.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{l.specialty}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading={t("nav.artists")}>
          <CommandItem value="all artists" onSelect={() => go("/artists")}>
            <Users className="h-4 w-4 text-muted-foreground" />
            {t("common.viewAll")} — {t("nav.artists")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
