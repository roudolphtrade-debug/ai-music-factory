import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { LikeButton } from "@/components/premium/LikeButton";
import { DemoBadge } from "@/components/premium/DemoBadge";
import { EmptyState } from "@/components/premium/EmptyState";
import { RadioVinylStage } from "@/components/audio/RadioVinylStage";
import { radioVinylCopy } from "@/i18n/radio-vinyl";
import { Playlist } from "@/components/audio/Playlist";
import { VoicePrompt } from "@/components/voice/VoicePrompt";
import { Button } from "@/components/ui/button";
import { radioQueue, studioMasters } from "@/audio/tracks";
import { stations, catalogGenres, catalogMoods, filterTracks } from "@/audio/stations";
import { usePlayer } from "@/audio/PlayerProvider";
import { useLibrary } from "@/library/LibraryProvider";
import { useI18n } from "@/i18n/context";
import { useListening } from "@/i18n/listening";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/radio")({
  head: () => ({
    meta: [
      { property: "og:title", content: "AI Radio · Ai Music Factory" },
      { property: "og:description", content: "Editorial radio: genres, moods and themed demo stations built from the catalog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "AI Radio · Ai Music Factory" },
      { name: "description", content: "Editorial radio: genres, moods and themed demo stations built from the catalog." },
    ],
  }),
  component: RadioPage,
});

const chipBase =
  "min-h-10 rounded-full border px-4 py-2 text-sm transition-all duration-200 active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground";
const chipActive = "border-transparent bg-gold-gradient font-medium text-primary-foreground shadow-[0_8px_24px_-14px_var(--gold)]";
const chipIdle = "border-border text-muted-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground";

function RadioPage() {
  const { t } = useI18n();
  const { l, f, lang } = useListening();
  const { play } = usePlayer();
  const { recordPlay } = useLibrary();
  const [genres, setGenres] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [stationId, setStationId] = useState<string | null>(null);

  const station = stations.find((s) => s.id === stationId) ?? null;
  const selection = useMemo(() => (station ? station.tracks : filterTracks(genres, moods)), [station, genres, moods]);
  const filtered = !!station || genres.length > 0 || moods.length > 0;
  const heroQueue = selection.length ? selection : radioQueue;

  const flip = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const reset = () => { setGenres([]); setMoods([]); setStationId(null); };
  const startQueue = (q: typeof selection) => { if (q[0]) { recordPlay(q[0].id); play(q[0], q); } };
  const moodLabel = (m: string) => { const v = t(`moods.${m}`); return v === `moods.${m}` ? m : v; };

  const label = station ? station.name : filtered ? l.selection : l.allTracks;

  return (
    <div className="radio-signature space-y-10">
      <SectionHeading eyebrow={t("radio.eyebrow")} title={t("radio.title")} description={l.radioIntro} />

      <RadioVinylStage station={label} queue={heroQueue} />

      {/* SELECTION BENTO */}
      <section className="radio-discovery space-y-7">
        <div className="min-w-0 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-foreground">{l.stations}</h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-muted-foreground">{l.stationsNote}</p>
            <div className="radio-stations">
              {stations.map((s) => {
                const on = s.id === stationId;
                return (
                  <Button
                    variant="ghost"
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setGenres([]); setMoods([]);
                      setStationId(on ? null : s.id);
                      if (!on) startQueue(s.tracks);
                    }}
                    className={cn(
                      "radio-station group relative h-auto whitespace-normal overflow-hidden rounded-lg border p-0 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                      on ? "border-[color-mix(in_oklab,var(--gold)_60%,transparent)] shadow-[var(--shadow-glow)]" : "border-border hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)]",
                    )}
                  >
                    <div className="radio-station-art grid aspect-square grid-cols-2 overflow-hidden">
                      {s.tracks.slice(0, 4).map((tr, i) => (
                        <img key={`${tr.id}-${i}`} src={tr.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="font-display text-lg font-semibold leading-tight text-foreground">{s.name}</p>
                      <p className="mt-1 text-[0.7rem] text-foreground/80">{f("tracksCount", s.tracks.length)} · {s.tags.map(moodLabel).join(" · ")}</p>
                    </div>
                    {on && <span className="absolute end-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-gold-gradient text-primary-foreground"><Play className="h-3.5 w-3.5" /></span>}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-2xl font-semibold text-foreground">{radioVinylCopy[lang].explore}</h2>
            <h3 className="text-sm text-muted-foreground">{l.genres}</h3>
            <div className="flex flex-wrap gap-2">
              {catalogGenres.map((g) => (
                <Button variant="ghost" key={g} type="button" aria-pressed={genres.includes(g)}
                  onClick={() => { setStationId(null); setGenres((c) => flip(c, g)); }}
                  className={cn(chipBase, genres.includes(g) ? chipActive : chipIdle)}>{g}</Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-2xl font-semibold text-foreground">{l.moods}</h2>
            <div className="flex flex-wrap gap-2">
              {catalogMoods.map((m) => (
                <Button variant="ghost" key={m} type="button" aria-pressed={moods.includes(m)}
                  onClick={() => { setStationId(null); setMoods((c) => flip(c, m)); }}
                  className={cn(chipBase, moods.includes(m) ? chipActive : chipIdle)}>{moodLabel(m)}</Button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">{label}</p>
              <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="radio-results">{f("results", selection.length)}</p>
            </div>
            <div className="flex gap-2">
              {filtered && (
                <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-4 w-4" /> {l.reset}</Button>
              )}
              <Button variant="ghost-gold" size="sm" disabled={!selection.length} onClick={() => startQueue(selection)}>
                <Play className="h-4 w-4" /> {l.playSelection}
              </Button>
            </div>
          </div>
          {selection.length === 0 ? (
            <EmptyState icon={<RotateCcw className="h-6 w-6" />} title={l.noResults} description="" action={<Button variant="ghost-gold" size="sm" onClick={reset}>{l.reset}</Button>} />
          ) : (
            <Playlist
              tracks={selection}
              subtitleFor={(track) => [track.artist, track.genre, track.mood && moodLabel(track.mood)].filter(Boolean).join(" · ")}
              trailing={(track) => <LikeButton trackId={track.id} size="sm" />}
            />
          )}
        </div>
      </section>

      <VoicePrompt />

      {/* STUDIO MASTERS */}
      <section className="space-y-4">
        <SectionHeading eyebrow={t("radio.freshDrops")} title={t("radio.studioMasters")} />
        <Playlist tracks={studioMasters} subtitleFor={(track) => track.artist} trailing={(track) => <LikeButton trackId={track.id} size="sm" />} />
      </section>
    </div>
  );
}
