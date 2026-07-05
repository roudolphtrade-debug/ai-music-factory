import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, History, ListMusic, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { EmptyState } from "@/components/premium/EmptyState";
import { LikeButton } from "@/components/premium/LikeButton";
import { AddToPlaylistButton } from "@/components/premium/AddToPlaylistButton";
import { PlayButton } from "@/components/audio/PlayButton";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/library/LibraryProvider";
import { usePlaylists } from "@/library/PlaylistsProvider";
import { playableById, playableTracks } from "@/audio/tracks";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/library")({
  head: () => ({
    meta: [
      { title: "Library — Ai Music Factory" },
      { name: "description", content: "Your favorite tracks, playlists and listening history in one place." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { t } = useI18n();
  const { favorites, history, clearHistory } = useLibrary();
  const { playlists, deletePlaylist } = usePlaylists();

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
                  <div className="absolute right-3 top-3 flex flex-col gap-2">
                    <LikeButton trackId={track.id} size="sm" />
                    <AddToPlaylistButton trackId={track.id} size="sm" />
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

      {/* PLAYLISTS */}
      <section className="space-y-6">
        <SectionHeading eyebrow={t("playlists.section")} title={t("playlists.sectionDesc")} />
        {playlists.length === 0 ? (
          <EmptyState
            icon={<ListMusic className="h-6 w-6" />}
            title={t("playlists.emptyTitle")}
            description={t("playlists.emptyDesc")}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {playlists.map((pl) => {
              const plTracks = pl.trackIds.map((id) => playableById[id]).filter(Boolean);
              const cover = plTracks[0]?.cover;
              return (
                <div
                  key={pl.id}
                  className="flex items-center gap-4 rounded-2xl border border-border surface-premium p-4"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-border">
                    {cover ? (
                      <img src={cover} alt={pl.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-secondary/50 text-muted-foreground">
                        <ListMusic className="h-6 w-6" />
                      </span>
                    )}
                    {plTracks.length > 0 && (
                      <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <PlayButton track={plTracks[0]} queue={plTracks} size="sm" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{pl.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("playlists.count", { n: pl.trackIds.length })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      deletePlaylist(pl.id);
                      toast.success(t("playlists.deleted"));
                    }}
                    aria-label={t("playlists.delete")}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
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
                <AddToPlaylistButton trackId={track.id} size="sm" />
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
