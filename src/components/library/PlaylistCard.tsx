import { useState } from "react";
import { ArrowDown, ArrowUp, ListMusic, Pencil, Play, Shuffle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PlayButton } from "@/components/audio/PlayButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePlaylists, type Playlist } from "@/library/PlaylistsProvider";
import { playableById, type PlayableTrack } from "@/audio/tracks";
import { useI18n } from "@/i18n/context";
import { useListening } from "@/i18n/listening";

export function PlaylistCard({
  pl,
  playQueue,
}: {
  pl: Playlist;
  playQueue: (queue: PlayableTrack[], shuffled?: boolean) => void;
}) {
  const { t } = useI18n();
  const { l, f } = useListening();
  const { deletePlaylist, renamePlaylist, removeFromPlaylist, moveInPlaylist } = usePlaylists();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pl.name);
  // Ids missing from the catalog are not shown, but they keep their slot in `pl.trackIds`.
  // Every visible entry therefore remembers its real index, which is what the provider expects.
  const entries = pl.trackIds
    .map((id, rawIndex) => ({ track: playableById[id], rawIndex }))
    .filter((e): e is { track: PlayableTrack; rawIndex: number } => Boolean(e.track));
  const plTracks = entries.map((e) => e.track);
  const covers = plTracks.slice(0, 4);

  return (
    <div className="rounded-2xl border border-border surface-premium p-4" data-testid="playlist-card">
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 grid-cols-2 overflow-hidden rounded-xl ring-1 ring-border">
          {covers.length ? covers.map((c, i) => (
            <img key={`${c.id}-${i}`} src={c.cover} alt="" loading="lazy" className={covers.length === 1 ? "col-span-2 row-span-2 h-full w-full object-cover" : "h-full w-full object-cover"} />
          )) : (
            <span className="col-span-2 row-span-2 grid place-items-center bg-secondary/50 text-muted-foreground"><ListMusic className="h-6 w-6" /></span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); renamePlaylist(pl.id, name); setEditing(false); }}>
              <Input value={name} onChange={(e) => setName(e.target.value)} aria-label={l.rename} maxLength={60} autoFocus />
              <Button type="submit" size="sm" variant="ghost-gold">{l.save}</Button>
            </form>
          ) : (
            <p className="truncate font-display text-xl font-semibold text-foreground">{pl.name}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("playlists.count", { n: pl.trackIds.length })}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button size="sm" variant="ghost-gold" disabled={!plTracks.length} onClick={() => playQueue(plTracks)}><Play className="h-4 w-4" /> {l.playTrack}</Button>
            <Button size="sm" variant="ghost" disabled={plTracks.length < 2} onClick={() => playQueue(plTracks, true)} aria-label={`${l.shufflePlay} · ${pl.name}`}><Shuffle className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => { setName(pl.name); setEditing((e) => !e); }} aria-pressed={editing} aria-label={`${editing ? l.done : l.edit} · ${pl.name}`}>
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" aria-label={`${l.delete} · ${pl.name}`}><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{pl.name}</AlertDialogTitle>
                  <AlertDialogDescription>{l.deleteConfirm}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{l.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { deletePlaylist(pl.id); toast.success(t("playlists.deleted")); }}>{l.delete}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {plTracks.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{l.emptyPlaylist}</p>
      ) : (
        <ol className="mt-4 space-y-1 border-t border-border/60 pt-3">
          {plTracks.map((tr, i) => (
            <li key={`${tr.id}-${i}`} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-secondary/40">
              <PlayButton track={tr} queue={plTracks} size="sm" variant="ghost" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{tr.title}</p>
                <p className="truncate text-xs text-muted-foreground">{tr.artist}</p>
              </div>
              {editing && (
                <>
                  <IconBtn label={`${l.moveUp} · ${tr.title}`} disabled={i === 0} onClick={() => moveInPlaylist(pl.id, entries[i].rawIndex, entries[i - 1].rawIndex)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label={`${l.moveDown} · ${tr.title}`} disabled={i === plTracks.length - 1} onClick={() => moveInPlaylist(pl.id, entries[i].rawIndex, entries[i + 1].rawIndex)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label={`${l.remove} · ${tr.title}`} onClick={() => removeFromPlaylist(pl.id, tr.id)}><X className="h-3.5 w-3.5" /></IconBtn>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
      {!editing && plTracks.length > 0 && <span className="sr-only">{f("tracksCount", plTracks.length)}</span>}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-30">
      {children}
    </button>
  );
}
