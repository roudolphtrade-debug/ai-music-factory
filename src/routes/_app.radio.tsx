import { createFileRoute } from "@tanstack/react-router";
import { Radio as RadioIcon, ListMusic } from "lucide-react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatusChip } from "@/components/premium/Chips";
import { VoteButton } from "@/components/premium/VoteButton";
import { NowPlayingPlayer } from "@/components/audio/NowPlayingPlayer";
import { Playlist } from "@/components/audio/Playlist";
import { radioQueue } from "@/audio/tracks";
import { nowPlaying, radioStations, moods, chartGenres } from "@/data/mock";
import { useI18n } from "@/i18n/context";

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

  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow={t("radio.eyebrow")}
        title={t("radio.title")}
        description={t("radio.desc")}
      />

      {/* MAIN PLAYER */}
      <NowPlayingPlayer station={nowPlaying.station} listeners={nowPlaying.listeners} queue={radioQueue} />

      {/* GENRES */}
      <section className="space-y-4">
        <SectionHeading eyebrow={t("radio.categories")} title={t("radio.browseGenre")} />
        <div className="flex flex-wrap gap-2">
          {chartGenres.map((g) => (
            <button
              key={g.name}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground"
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
              className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground"
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
            trailing={(track, i) => <VoteButton initialVotes={1200 + i * 240} size="sm" />}
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
