import { createFileRoute } from "@tanstack/react-router";
import { Play, Radio as RadioIcon, ListMusic, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatusChip, GoldBadge } from "@/components/premium/Chips";
import { VoteButton } from "@/components/premium/VoteButton";
import { Equalizer } from "@/components/premium/Equalizer";
import { nowPlaying, tracks, radioStations, moods, artistImages } from "@/data/mock";

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
  const queue = tracks.slice(0, 6);

  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="AI Radio"
        title="Always-on, community curated"
        description="Tune into living stations shaped by the votes of the community in real time."
      />

      {/* MAIN PLAYER */}
      <section className="relative overflow-hidden rounded-3xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-noir-gradient p-7 sm:p-10">
        <div className="absolute inset-0 bg-spot" />
        <div className="relative grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <img
            src={artistImages[nowPlaying.track.artistId]}
            alt={nowPlaying.track.artist}
            className="h-44 w-44 rounded-2xl object-cover ring-1 ring-[color-mix(in_oklab,var(--gold)_30%,transparent)] sm:h-52 sm:w-52"
          />
          <div>
            <div className="flex items-center gap-3">
              <GoldBadge variant="outline">
                <RadioIcon className="h-3.5 w-3.5" /> {nowPlaying.station}
              </GoldBadge>
              <StatusChip status="Live" />
            </div>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {nowPlaying.track.title}
            </h2>
            <p className="mt-1 text-lg text-muted-foreground">{nowPlaying.track.artist}</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Equalizer /> {nowPlaying.listeners} listening · live votes shaping rotation
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="gold" size="lg">
                <Play className="h-4 w-4" /> Tune in
              </Button>
              <VoteButton initialVotes={3420} />
              <Button variant="ghost-gold" size="lg">
                <Heart className="h-4 w-4" /> Save
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* MOODS */}
      <section className="space-y-4">
        <SectionHeading eyebrow="Categories" title="Browse by mood" />
        <div className="flex flex-wrap gap-2">
          {moods.map((m) => (
            <button
              key={m}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground"
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* QUEUE / TOP ROTATION */}
        <div className="space-y-4 lg:col-span-2">
          <SectionHeading eyebrow="On air" title="Top rotation" />
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {queue.map((t, i) => (
              <div
                key={t.id}
                className={`group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/40 ${
                  i !== queue.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <span className="w-5 text-center font-display text-base font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <img
                  src={artistImages[t.artistId]}
                  alt={t.artist}
                  className="h-11 w-11 rounded-lg object-cover ring-1 ring-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.artist} · {t.mood}</p>
                </div>
                <VoteButton initialVotes={1200 + i * 240} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* STATIONS */}
        <div className="space-y-4">
          <SectionHeading eyebrow="Stations" title="Thematic" />
          <div className="space-y-3">
            {radioStations.map((s) => (
              <button
                key={s.id}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary/60 text-gold">
                  <ListMusic className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.mood}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {s.live ? <StatusChip status="Live" /> : <span>Scheduled</span>}
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
