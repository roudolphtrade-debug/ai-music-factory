import { createFileRoute } from "@tanstack/react-router";
import { Play, TrendingUp, Headphones, Heart, DollarSign } from "lucide-react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatModule } from "@/components/premium/StatModule";
import { tracks, artistImages } from "@/data/mock";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Ai Music Factory" },
      { name: "description", content: "Track plays, listeners, reputation and revenue across your catalogue." },
    ],
  }),
  component: AnalyticsPage,
});

const weekly = [42, 58, 51, 73, 64, 88, 96];
const days = ["M", "T", "W", "T", "F", "S", "S"];

function AnalyticsPage() {
  const max = Math.max(...weekly);
  const top = tracks.slice(0, 5);

  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Analytics"
        title="Performance"
        description="A premium read on how your catalogue moves through the platform."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatModule label="Total plays" value="9.4M" delta="+12.4% vs last month" icon={<Play className="h-5 w-5" />} />
        <StatModule label="Monthly listeners" value="1.9M" delta="+88K this month" icon={<Headphones className="h-5 w-5" />} />
        <StatModule label="Saves" value="312K" delta="+6.1% vs last month" icon={<Heart className="h-5 w-5" />} />
        <StatModule label="Est. revenue" value="$28.6K" delta="+$3.2K this month" icon={<DollarSign className="h-5 w-5" />} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* CHART */}
        <section className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <SectionHeading
            eyebrow="Last 7 days"
            title="Plays trend"
            action={
              <span className="inline-flex items-center gap-1.5 text-sm text-[var(--success)]">
                <TrendingUp className="h-4 w-4" /> +18.2%
              </span>
            }
          />
          <div className="mt-8 flex h-56 items-end justify-between gap-3">
            {weekly.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-3">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gold-gradient transition-all"
                    style={{ height: `${(v / max) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* AUDIENCE */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <SectionHeading eyebrow="Audience" title="Top regions" />
          <div className="mt-5 space-y-4">
            {[
              { region: "North America", pct: 38 },
              { region: "Europe", pct: 31 },
              { region: "Asia", pct: 19 },
              { region: "Latin America", pct: 8 },
              { region: "Other", pct: 4 },
            ].map((r) => (
              <div key={r.region} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{r.region}</span>
                  <span className="text-muted-foreground tabular-nums">{r.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-gold-gradient" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* TOP TRACKS */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <SectionHeading eyebrow="Catalogue" title="Top performing tracks" />
        <div className="mt-4 divide-y divide-border/60">
          {top.map((t, i) => (
            <div key={t.id} className="flex items-center gap-4 py-3">
              <span className="w-5 text-center font-display text-base font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <img
                src={artistImages[t.artistId]}
                alt={t.artist}
                className="h-10 w-10 rounded-lg object-cover ring-1 ring-border"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">{t.genre}</p>
              </div>
              <span className="text-sm tabular-nums text-foreground">{t.plays}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
