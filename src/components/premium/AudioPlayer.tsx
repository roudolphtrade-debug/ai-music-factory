import { useEffect, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Shuffle, Repeat } from "lucide-react";
import { nowPlaying, artistImages } from "@/data/mock";
import { Equalizer } from "./Equalizer";
import { cn } from "@/lib/utils";

export function AudioPlayer() {
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(34);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.4));
    }, 400);
    return () => clearInterval(id);
  }, [playing]);

  const track = nowPlaying.track;

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="h-px w-full bg-secondary">
        <div
          className="h-full bg-gold-gradient transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <img
            src={artistImages[track.artistId]}
            alt={track.artist}
            className="h-12 w-12 rounded-lg object-cover ring-1 ring-border"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
          </div>
          <button
            type="button"
            onClick={() => setLiked((l) => !l)}
            className={cn(
              "ml-1 hidden rounded-full p-2 transition-colors sm:inline-flex",
              liked ? "text-gold" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Like track"
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <PlayerIcon icon={<Shuffle className="h-4 w-4" />} className="hidden md:inline-flex" />
          <PlayerIcon icon={<SkipBack className="h-4 w-4" />} />
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="grid h-11 w-11 place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-[0_8px_24px_-10px_var(--gold)] transition-transform hover:scale-105"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
          </button>
          <PlayerIcon icon={<SkipForward className="h-4 w-4" />} />
          <PlayerIcon icon={<Repeat className="h-4 w-4" />} className="hidden md:inline-flex" />
        </div>

        <div className="hidden flex-1 items-center justify-end gap-4 lg:flex">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Equalizer active={playing} />
            <span>{nowPlaying.listeners} listening</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Volume2 className="h-4 w-4" />
            <div className="h-1 w-24 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-2/3 bg-foreground/70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerIcon({ icon, className }: { icon: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {icon}
    </button>
  );
}
