import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, History, ListMusic, Play, Plus, Radio, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { EmptyState } from "@/components/premium/EmptyState";
import { LikeButton } from "@/components/premium/LikeButton";
import { AddToPlaylistButton } from "@/components/premium/AddToPlaylistButton";
import { PlayButton } from "@/components/audio/PlayButton";
import { PlaylistCard } from "@/components/library/PlaylistCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLibrary } from "@/library/LibraryProvider";
import { usePlaylists } from "@/library/PlaylistsProvider";
import { usePlayer } from "@/audio/PlayerProvider";
import { shuffleKeepingFirst } from "@/audio/queue";
import { playableById, playableTracks, type PlayableTrack } from "@/audio/tracks";
import { useI18n } from "@/i18n/context";
import { useListening } from "@/i18n/listening";

export const Route = createFileRoute("/_app/library")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Library · Ai Music Factory" },
      { property: "og:description", content: "Your favorite tracks, playlists and listening history in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Library · Ai Music Factory" },
      { name: "description", content: "Your favorite tracks, playlists and listening history in one place." },
    ],
  }),
  component: LibraryPage,
});

function usePlayQueue() {
  const { play } = usePlayer();
  const { recordPlay } = useLibrary();
  return (q: PlayableTrack[], shuffled = false) => {
    if (!q.length) return;
    const list = shuffled ? shuffleKeepingFirst(q, Math.floor(Math.random() * q.length)) : q;
    recordPlay(list[0].id);
    play(list[0], list);
  };
}

function LibraryPage() {
  const { t } = useI18n();
  const { l, f } = useListening();
  const { favorites, history, clearHistory } = useLibrary();
  const { playlists, createPlaylist } = usePlaylists();
  const playQueue = usePlayQueue();
  const [newName, setNewName] = useState("");

  const favTracks = favorites.map((id) => playableById[id]).filter(Boolean);
  const historyTracks = history.map((h) => playableById[h.id]).filter(Boolean);

  const stats = [
    { label: l.favorites, value: favTracks.length },
    { label: l.playlists, value: playlists.length },
    { label: l.plays, value: historyTracks.length },
  ];

  return (
    <div className="space-y-12">
      <SectionHeading eyebrow={t("library.eyebrow")} title={t("library.title")} description={t("library.desc")} />

      {/* OVERVIEW */}
      <section className="grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-stretch">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-3 rounded-2xl border border-border surface-premium px-5 py-4 sm:block">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{s.label}</p>
            <p className="font-display text-3xl font-semibold tabular-nums text-foreground sm:mt-1">{s.value}</p>
          </div>
        ))}
        <div className="flex flex-col justify-center gap-2">
          <Button variant="gold" disabled={!favTracks.length} onClick={() => playQueue(favTracks)}><Play className="h-4 w-4" /> {l.playAll}</Button>
          <p className="text-center text-[0.65rem] text-muted-foreground">{l.localNote}</p>
        </div>
      </section>

      {/* FAVORITES */}
      <section className="space-y-6">
        <SectionHeading
          eyebrow={t("library.favorites")}
          title={t("library.favoritesDesc")}
          action={favTracks.length > 1 ? <Button variant="ghost-gold" size="sm" onClick={() => playQueue(favTracks, true)}><Shuffle className="h-4 w-4" /> {l.shufflePlay}</Button> : undefined}
        />
        {favTracks.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-6 w-6" />}
            title={t("library.emptyFavTitle")}
            description={t("library.emptyFavDesc")}
            action={<Button asChild variant="ghost-gold" size="sm"><Link to="/radio">{t("library.explore")}</Link></Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {favTracks.map((track) => (
              <div key={track.id} className="group relative overflow-hidden rounded-2xl border border-border surface-premium card-hover">
                <div className="relative aspect-square overflow-hidden">
                  <img src={track.cover} alt={track.artist} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                  <div className="absolute end-2 top-2 flex flex-col gap-2">
                    <LikeButton trackId={track.id} size="sm" />
                    <AddToPlaylistButton trackId={track.id} size="sm" />
                  </div>
                  <div className="absolute bottom-3 start-3">
                    <PlayButton track={track} queue={favTracks} size="sm" />
                  </div>
                </div>
                <div className="px-3 py-3 sm:px-4">
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
        <form
          className="flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            createPlaylist(newName);
            setNewName("");
            toast.success(newName.trim());
          }}
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={l.namePlaceholder} aria-label={l.newPlaylist} maxLength={60} />
          <Button type="submit" variant="ghost-gold" disabled={!newName.trim()}><Plus className="h-4 w-4" /> {l.create}</Button>
        </form>
        {playlists.length === 0 ? (
          <EmptyState icon={<ListMusic className="h-6 w-6" />} title={t("playlists.emptyTitle")} description={t("playlists.emptyDesc")} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {playlists.map((pl) => <PlaylistCard key={pl.id} pl={pl} playQueue={playQueue} />)}
          </div>
        )}
      </section>

      {/* HISTORY */}
      <section className="space-y-6">
        <SectionHeading
          eyebrow={t("library.history")}
          title={t("library.historyDesc")}
          action={historyTracks.length > 0 ? <Button variant="ghost-gold" size="sm" onClick={clearHistory}><Trash2 className="h-4 w-4" />{t("library.clearHistory")}</Button> : undefined}
        />
        {historyTracks.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title={t("library.emptyHistoryTitle")}
            description={t("library.emptyHistoryDesc")}
            action={<Button asChild variant="ghost-gold" size="sm"><Link to="/radio"><Radio className="h-4 w-4" />{t("library.explore")}</Link></Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border surface-premium">
            {historyTracks.map((track, i) => (
              <div key={`${track.id}-${i}`} className={`group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-secondary/40 sm:gap-4 sm:px-4 ${i !== historyTracks.length - 1 ? "border-b border-border/60" : ""}`}>
                <span className="hidden w-5 text-center font-display text-sm font-semibold tabular-nums text-muted-foreground sm:block">{i + 1}</span>
                <img src={track.cover} alt={track.artist} loading="lazy" className="h-11 w-11 rounded-lg object-cover ring-1 ring-border" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                </div>
                <span className="hidden sm:inline-flex"><AddToPlaylistButton trackId={track.id} size="sm" /></span>
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
