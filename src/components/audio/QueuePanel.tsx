import { ArrowDown, ArrowUp, ListOrdered, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePlayer } from "@/audio/PlayerProvider";
import { useListening } from "@/i18n/listening";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { WaveBars } from "./WaveBars";

/** Up-next panel: inspect, jump to, reorder and remove queued tracks. */
export function QueuePanel({ className }: { className?: string }) {
  const { l } = useListening();
  const isMobile = useIsMobile();
  const { queue, index, current, isPlaying, playAt, moveInQueue, removeFromQueue } = usePlayer();
  const upcoming = queue.map((t, i) => ({ t, i })).filter(({ i }) => i > index);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={l.queue}
          className={cn(
            "grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground sm:h-9 sm:w-9",
            className,
          )}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side={isMobile ? "bottom" : "right"} className={cn("flex flex-col gap-0 p-0", isMobile && "max-h-[85vh]")}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="font-display text-2xl">{l.queue}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {!current ? (
            <p className="px-2 text-sm text-muted-foreground">{l.emptyQueue}</p>
          ) : (
            <>
              <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">{l.nowPlaying}</p>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-secondary/40 p-2">
                <img src={current.cover} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{current.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{current.artist}</p>
                </div>
                <WaveBars active={isPlaying} className="h-3" />
              </div>

              <p className="mt-6 px-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {l.upNext} · {upcoming.length}
              </p>
              <ol className="mt-2 space-y-1" aria-label={l.upNext}>
                {upcoming.map(({ t, i }, pos) => (
                  <li key={`${t.id}-${i}`} className="group flex items-center gap-2 rounded-xl p-1.5 hover:bg-secondary/40">
                    <button
                      type="button"
                      onClick={() => playAt(i)}
                      aria-label={`${l.playTrack} ${t.title} · ${t.artist}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                    >
                      <img src={t.cover} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-foreground">{t.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{t.artist}</span>
                      </span>
                    </button>
                    <QBtn label={`${l.moveUp} · ${t.title}`} disabled={pos === 0} onClick={() => moveInQueue(i, i - 1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </QBtn>
                    <QBtn label={`${l.moveDown} · ${t.title}`} disabled={pos === upcoming.length - 1} onClick={() => moveInQueue(i, i + 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </QBtn>
                    <QBtn label={`${l.remove} · ${t.title}`} onClick={() => removeFromQueue(i)}>
                      <X className="h-3.5 w-3.5" />
                    </QBtn>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function QBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}
