import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ListMusic } from "lucide-react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatusChip } from "@/components/premium/Chips";
import { VoteButton } from "@/components/premium/VoteButton";
import { LikeButton } from "@/components/premium/LikeButton";
import { NowPlayingPlayer } from "@/components/audio/NowPlayingPlayer";
import { Playlist } from "@/components/audio/Playlist";
import { VoicePrompt } from "@/components/voice/VoicePrompt";
import { radioQueue, studioMasters } from "@/audio/tracks";
import { nowPlaying, radioStations, moods, chartGenres } from "@/data/mock";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/radio")({
  head: () => ({
    meta: [
      { title: "AI Radio — Ai Music Factory" },
      { name: "description", content: "Community-curated AI radio: live stations, moods, votes and top rotation." },
    ],
  }),
  component: RadioPage,
});

function RadioPage() {
  const { t } = useI18n();
  const queue = radioQueue.slice(0, 6);
  const [genre, setGenre] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);

  const chipBase =
    "rounded-full border px-4 py-2 text-sm transition-all duration-200 active:scale-[0.96] motion-reduce:active:scale-100";
  const chipActive =
    "border-transparent bg-gold-gradient font-medium text-primary-foreground shadow-[0_8px_24px_-14px_var(--gold)]";
  const chipIdle =
    "border-border text-muted-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground";


  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow={t("radio.eyebrow")}
        title={t("radio.title")}
        description={t("radio.desc")}
      />

      {/* MAIN PLAYER */}
      <NowPlayingPlayer station={nowPlaying.station} listeners={nowPlaying.listeners} queue={radioQueue} />

      {/* VOICE PROMPT */}
      <VoicePrompt />

      {/* STUDIO MASTERS — the real uploaded drops, in order */}
      <section className="space-y-4">
        <SectionHeading eyebrow={t("radio.freshDrops")} title={t("radio.studioMasters")} />
        <Playlist
          tracks={studioMasters}
          subtitleFor={(track) => `${track.artist}`}
          trailing={(track) => (
            <div className="flex items-center gap-2">
              <LikeButton trackId={track.id} size="sm" />
            </div>
          )}
        />
      </section>




      {/* GENRES */}
      <section className="space-y-4">
        <SectionHeading eyebrow={t("radio.categories")} title={t("radio.browseGenre")} />
        <div className="flex flex-wrap gap-2">
          {chartGenres.map((g) => (
            <button
              key={g.name}
              onClick={() => setGenre((cur) => (cur === g.name ? null : g.name))}
              aria-pressed={genre === g.name}
              className={cn(chipBase, genre === g.name ? chipActive : chipIdle)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </section>

      {/* MOODS */}
      <section className="space-y-4">
        <SectionHeading eyebrow={t("radio.categories")} title={t("radio.browseMood")} />
        <div className="flex flex-wrap gap-2">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => setMood((cur) => (cur === m ? null : m))}
              aria-pressed={mood === m}
              className={cn(chipBase, mood === m ? chipActive : chipIdle)}
            >
              {t(`moods.${m}`)}
            </button>
          ))}
        </div>
      </section>


      <div className="grid gap-6 lg:grid-cols-3">
        {/* QUEUE / TOP ROTATION */}
        <div className="space-y-4 lg:col-span-2">
          <SectionHeading eyebrow={t("radio.onAir")} title={t("radio.topRotation")} />
          <Playlist
            tracks={queue}
            subtitleFor={(track) => `${track.artist}`}
            trailing={(track, i) => (
              <div className="flex items-center gap-2">
                <LikeButton trackId={track.id} size="sm" />
                <VoteButton initialVotes={1200 + i * 240} size="sm" />
              </div>
            )}
          />
        </div>

        {/* STATIONS */}
        <div className="space-y-4">
          <SectionHeading eyebrow={t("radio.stations")} title={t("radio.thematic")} />
          <div className="space-y-3">
            {radioStations.map((s) => (
              <button
                key={s.id}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)]"
              >
                <span className="icon-tile h-11 w-11">
                  <ListMusic className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.mood}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {s.live ? <StatusChip status="Live" /> : <StatusChip status="Scheduled" />}
                  <p className="mt-1">{s.listeners}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
