import { createFileRoute } from "@tanstack/react-router";
import { Play, TrendingUp, Headphones, Heart, DollarSign } from "lucide-react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatModule } from "@/components/premium/StatModule";
import { tracks, artistImages } from "@/data/mock";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Ai Music Factory" },
      {
        name: "description",
        content: "Track plays, listeners, reputation and revenue across your catalogue.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const weekly = [42, 58, 51, 73, 64, 88, 96];

function AnalyticsPage() {
  const { t, ta } = useI18n();
  const days = ta("analytics.days");
  const max = Math.max(...weekly);
  const top = tracks.slice(0, 5);

  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow={t("analytics.eyebrow")}
        title={t("analytics.title")}
        description={t("analytics.desc")}
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatModule
          label={t("analytics.totalPlays")}
          value="9.4M"
          delta={t("analytics.vsLastMonth", { v: "+12.4%" })}
          icon={<Play className="h-5 w-5" />}
        />
        <StatModule
          label={t("analytics.monthlyListeners")}
          value="1.9M"
          delta={t("analytics.thisMonth", { v: "+88K" })}
          icon={<Headphones className="h-5 w-5" />}
        />
        <StatModule
          label={t("analytics.saves")}
          value="312K"
          delta={t("analytics.vsLastMonth", { v: "+6.1%" })}
          icon={<Heart className="h-5 w-5" />}
        />
        <StatModule
          label={t("analytics.estRevenue")}
          value="$28.6K"
          delta={t("analytics.thisMonth", { v: "+$3.2K" })}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* CHART */}
        <section className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <SectionHeading
            eyebrow={t("analytics.last7days")}
            title={t("analytics.playsTrend")}
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
          <SectionHeading eyebrow={t("analytics.audience")} title={t("analytics.topRegions")} />
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
                  <span className="text-foreground">{t(`analytics.regions.${r.region}`)}</span>
                  <span className="font-mono text-muted-foreground tabular-nums">{r.pct}%</span>
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
        <SectionHeading eyebrow={t("analytics.catalogue")} title={t("analytics.topTracks")} />
        <div className="mt-4 divide-y divide-border/60">
          {top.map((track, i) => (
            <div key={track.id} className="flex items-center gap-4 py-3">
              <span className="w-5 text-center font-display text-base font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <img
                loading="lazy"
                src={artistImages[track.artistId]}
                alt={track.artist}
                className="h-10 w-10 rounded-lg object-cover ring-1 ring-border"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{track.title}</p>
                <p className="truncate text-xs text-muted-foreground">{track.genre}</p>
              </div>
              <span className="font-mono text-sm tabular-nums text-foreground">{track.plays}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
