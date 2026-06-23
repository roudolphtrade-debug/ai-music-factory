import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, History, Radio, Trash2 } from "lucide-react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { EmptyState } from "@/components/premium/EmptyState";
import { LikeButton } from "@/components/premium/LikeButton";
import { PlayButton } from "@/components/audio/PlayButton";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/library/LibraryProvider";
import { playableById, playableTracks } from "@/audio/tracks";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/library")({
  head: () => ({
    meta: [
      { title: "Library — Ai Music Factory" },
      { name: "description", content: "Your favorite tracks and listening history in one place." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { t } = useI18n();
  const { favorites, history, clearHistory } = useLibrary();

  const favTracks = favorites.map((id) => playableById[id]).filter(Boolean);
  const historyTracks = history.map((h) => playableById[h.id]).filter(Boolean);

  return (
    <div className="space-y-12">
      <SectionHeading
        eyebrow={t("library.eyebrow")}
        title={t("library.title")}
        description={t("library.desc")}
      />

      {/* FAVORITES */}
      <section className="space-y-6">
        <SectionHeading eyebrow={t("library.favorites")} title={t("library.favoritesDesc")} />
        {favTracks.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-6 w-6" />}
            title={t("library.emptyFavTitle")}
            description={t("library.emptyFavDesc")}
            action={
              <Button asChild variant="ghost-gold" size="sm">
                <Link to="/radio">{t("library.explore")}</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {favTracks.map((track) => (
              <div
                key={track.id}
                className="group relative overflow-hidden rounded-2xl border border-border surface-premium card-hover"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={track.cover}
                    alt={track.artist}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                  <div className="absolute right-3 top-3">
                    <LikeButton trackId={track.id} size="sm" />
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <PlayButton track={track} queue={favTracks} size="sm" />
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <p className="truncate font-medium text-foreground">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HISTORY */}
      <section className="space-y-6">
        <SectionHeading
          eyebrow={t("library.history")}
          title={t("library.historyDesc")}
          action={
            historyTracks.length > 0 ? (
              <Button variant="ghost-gold" size="sm" onClick={clearHistory}>
                <Trash2 className="h-4 w-4" />
                {t("library.clearHistory")}
              </Button>
            ) : undefined
          }
        />
        {historyTracks.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title={t("library.emptyHistoryTitle")}
            description={t("library.emptyHistoryDesc")}
            action={
              <Button asChild variant="ghost-gold" size="sm">
                <Link to="/radio">
                  <Radio className="h-4 w-4" />
                  {t("library.explore")}
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border surface-premium">
            {historyTracks.map((track, i) => (
              <div
                key={`${track.id}-${i}`}
                className={`group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/40 ${
                  i !== historyTracks.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <span className="w-5 text-center font-display text-sm font-semibold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <img
                  src={track.cover}
                  alt={track.artist}
                  loading="lazy"
                  className="h-11 w-11 rounded-lg object-cover ring-1 ring-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                </div>
                <LikeButton trackId={track.id} size="sm" />
                <PlayButton track={track} queue={playableTracks} size="sm" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
