import { ArrowDown, ArrowUp, Check, ListOrdered, Repeat, Repeat1, Shuffle, X } from "lucide-react";
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
  const {
    queue,
    index,
    current,
    isPlaying,
    shuffle,
    repeat,
    playAt,
    moveInQueue,
    removeFromQueue,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();
  const upcoming = queue.map((t, i) => ({ t, i })).filter(({ i }) => i > index);
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;
  const repeatLabel = repeat === "one" ? l.repeatOne : repeat === "all" ? l.repeatAll : l.repeatOff;
  // Below `sm` the inline shuffle/repeat buttons are hidden; flag a non-default mode on the trigger.
  const modeActive = shuffle || repeat === "one";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={l.queue}
          className={cn(
            "relative grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground sm:h-9 sm:w-9",
            className,
          )}
        >
          <ListOrdered className="h-4 w-4" />
          {modeActive && (
            <span
              aria-hidden
              className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold sm:hidden"
            />
          )}
        </button>
      </SheetTrigger>
      <SheetContent side={isMobile ? "bottom" : "right"} className={cn("flex flex-col gap-0 p-0", isMobile && "max-h-[85vh]")}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="font-display text-2xl">{l.queue}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {/* Shuffle / repeat: inline in the player bar from `sm`, here below it. */}
          <div role="group" aria-label={l.playbackOptions} className="mb-6 sm:hidden">
            <p
              aria-hidden
              className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            >
              {l.playbackOptions}
            </p>
            <div className="mt-2 space-y-2">
              <ModeBtn label={l.shuffle} active={shuffle} onClick={toggleShuffle}>
                <Shuffle className="h-4 w-4" />
              </ModeBtn>
              <ModeBtn label={repeatLabel} active={repeat !== "off"} onClick={cycleRepeat}>
                <RepeatIcon className="h-4 w-4" />
              </ModeBtn>
            </div>
          </div>
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

function ModeBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 text-start text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
        active
          ? "border-[color-mix(in_oklab,var(--gold)_45%,transparent)] bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] text-foreground"
          : "border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
      )}
    >
      <span className={cn("shrink-0", active && "text-gold")}>{children}</span>
      <span className="min-w-0 flex-1">{label}</span>
      {active && <Check className="h-4 w-4 shrink-0 text-gold" aria-hidden />}
    </button>
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
