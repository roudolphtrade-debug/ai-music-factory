import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Play,
  AudioWaveform,
  Users,
  Building2,
  Swords,
  ArrowUpRight,
  Trophy,
  Calendar,
  Radio,
  TrendingUp,
  TrendingDown,
  Minus,
  ListMusic,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatModule } from "@/components/premium/StatModule";
import { ArtistCard } from "@/components/premium/ArtistCard";
import { RankingRow } from "@/components/premium/RankingRow";
import { GoldBadge, StatusChip } from "@/components/premium/Chips";
import { VoteButton } from "@/components/premium/VoteButton";
import { Equalizer } from "@/components/premium/Equalizer";
import { Reveal } from "@/components/premium/Reveal";
import { OnboardingChecklist } from "@/components/premium/OnboardingChecklist";
import { LikeButton } from "@/components/premium/LikeButton";
import { useI18n } from "@/i18n/context";
import { PlayButton } from "@/components/audio/PlayButton";
import { playableById, playableTracks, radioQueue } from "@/audio/tracks";
import { useLibrary } from "@/library/LibraryProvider";
import { cn } from "@/lib/utils";
import {
  platformStats,
  topCreators,
  artists,
  battles,
  nowPlaying,
  activityFeed,
  hallOfFame,
  artistImages,
  globalCharts,
  chartGenres,
  chartRegions,
  type ChartRegion,
  type Battle,
} from "@/data/mock";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Home — Ai Music Factory" },
      {
        name: "description",
        content:
          "The control room for AI-native artists: live charts, top creators, trending virtual artists, battles and AI radio.",
      },
    ],
  }),
  component: HomePage,
});

const statIcons = [
  <AudioWaveform className="h-5 w-5" key="1" />,
  <Users className="h-5 w-5" key="2" />,
  <Building2 className="h-5 w-5" key="3" />,
  <Swords className="h-5 w-5" key="4" />,
];

function HomePage() {
  const { t, relTime } = useI18n();
  const { favorites, history } = useLibrary();
  const liveBattle = battles[0];
  const [region, setRegion] = useState<ChartRegion>("Global");
  const charts = globalCharts.filter((c) => c.regions.includes(region));

  const historyTracks = history.map((h) => playableById[h.id]).filter(Boolean).slice(0, 4);
  const favTracks = favorites.map((id) => playableById[id]).filter(Boolean).slice(0, 4);

  return (
    <div className="space-y-12">
      <OnboardingChecklist />
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-noir-gradient">
        <div className="absolute inset-0 bg-spot" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_22%,transparent),transparent_70%)]" />
        <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <GoldBadge variant="outline" className="mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-gold" />
              {t("home.hero.badge")}
            </GoldBadge>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("home.hero.titleLead")}{" "}
              <span className="gold-text">{t("home.hero.titleAccent")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              {t("home.hero.subtitle")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="xl">
                <Link to="/studio">
                  <Play className="h-4 w-4" />
                  {t("home.hero.startCreating")}
                </Link>
              </Button>
              <Button asChild variant="ghost-gold" size="xl">
                <Link to="/artists">{t("home.hero.exploreArtists")}</Link>
              </Button>
            </div>
          </div>

          {/* AI Radio now playing */}
          <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-card/70 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Radio className="h-4 w-4 text-gold" />
                <span className="eyebrow text-gold">{nowPlaying.station}</span>
              </div>
              <StatusChip status="Live" />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative">
                <img
                  src={artistImages[nowPlaying.track.artistId]}
                  alt={nowPlaying.track.artist}
                  className="h-20 w-20 rounded-xl object-cover ring-1 ring-border"
                />
                <div className="absolute inset-0 grid place-items-center">
                  <PlayButton track={playableById[nowPlaying.track.id]} queue={radioQueue} size="sm" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-semibold text-foreground">
                  {nowPlaying.track.title}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {nowPlaying.track.artist}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Equalizer />
                  {t("common.listeningNow", { n: nowPlaying.listeners })}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>
                {t("common.upNext")} ·{" "}
                <span className="text-foreground">{nowPlaying.upNext.title}</span>
              </span>
              <Link to="/radio" className="inline-flex items-center gap-1 text-gold hover:underline">
                {t("common.openRadio")} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <Reveal as="section" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {platformStats.map((s, i) => (
          <StatModule
            key={s.key}
            label={t(`home.stats.${s.key}`)}
            value={s.value}
            delta={t(`home.stats.${s.deltaKey}`, { n: s.deltaN })}
            icon={statIcons[i]}
          />
        ))}
      </Reveal>


      {/* TOP CHARTS */}
      <Reveal as="section" className="space-y-6">

        <SectionHeading
          eyebrow={t("home.charts.eyebrow")}
          title={t("home.charts.title")}
          description={t("home.charts.desc")}
        />
        <div className="flex flex-wrap gap-2">
          {chartRegions.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                region === r
                  ? "bg-gold-gradient text-primary-foreground"
                  : "border border-border text-muted-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground",
              )}
            >
              {t(`charts.regions.${r}`)}
            </button>
          ))}
        </div>
        <div key={region} className="animate-list-fade overflow-hidden rounded-2xl border border-border surface-premium">
          {charts.map((c, i) => (
            <div
              key={`${c.rank}-${c.title}`}
              className={cn(
                "group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/40",
                i !== charts.length - 1 && "border-b border-border/60",
              )}
            >
              <span className="w-6 text-center font-display text-lg font-semibold tabular-nums text-foreground">
                {c.rank}
              </span>
              <ChartChange change={c.change} isNew={c.isNew} newLabel={t("charts.new")} />
              <img
                src={artistImages[c.artistId]}
                alt={c.artist}
                loading="lazy"
                className="h-11 w-11 rounded-lg object-cover ring-1 ring-border"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{c.title}</p>
                <p className="truncate text-xs text-muted-foreground">{c.artist}</p>
              </div>
              <GoldBadge variant="outline" className="hidden sm:inline-flex">
                {c.genre}
              </GoldBadge>
              <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                {c.plays}
              </span>
            </div>
          ))}
        </div>
      </Reveal>


      {/* GENRES */}
      <Reveal as="section" className="space-y-6">

        <SectionHeading
          eyebrow={t("home.genres.eyebrow")}
          title={t("home.genres.title")}
          description={t("home.genres.desc")}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {chartGenres.map((g) => (
            <Link
              key={g.name}
              to="/radio"
              className="group flex items-center gap-3 rounded-xl border border-border surface-premium px-4 py-3.5 transition-colors hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)]"
            >
              <span className="icon-tile h-10 w-10">
                <ListMusic className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground">{t("home.genres.tracks", { n: g.tracks })}</p>
              </div>
            </Link>
          ))}
        </div>
      </Reveal>


      {/* TRENDING ARTISTS */}
      <Reveal as="section" className="space-y-6">

        <SectionHeading
          eyebrow={t("home.trending.eyebrow")}
          title={t("home.trending.title")}
          description={t("home.trending.desc")}
          action={
            <Button asChild variant="ghost-gold" size="sm">
              <Link to="/artists">{t("common.viewAll")}</Link>
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {artists.slice(0, 4).map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      </Reveal>


      {/* TWO COLUMN: TOP CREATORS + ACTIVITY */}
      <Reveal as="section" className="grid gap-6 lg:grid-cols-3">

        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <SectionHeading eyebrow={t("home.leaderboard.eyebrow")} title={t("home.leaderboard.title")} />
          <div className="mt-4 divide-y divide-border/60">
            {topCreators.map((c) => (
              <RankingRow
                key={c.artistId}
                rank={c.rank}
                artistId={c.artistId}
                name={c.name}
                meta={t("home.leaderboard.meta", { n: c.listeners })}
                reputation={c.reputation}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <SectionHeading eyebrow={t("home.activity.eyebrow")} title={t("home.activity.title")} />
          <ul className="mt-4 space-y-4">
            {activityFeed.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    {a.who} {t(`home.activity.${a.actionKey}`, a.actionVars)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(a.detailKey ? t(`home.activity.${a.detailKey}`) : a.detail)} · {relTime(a.time)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>


      {/* CURRENT BATTLES + CONTEST */}
      <Reveal as="section" className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <SectionHeading
            eyebrow={t("home.arena.eyebrow")}
            title={t("home.arena.title")}
            action={
              <Button asChild variant="ghost-gold" size="sm">
                <Link to="/battles">{t("home.arena.allBattles")}</Link>
              </Button>
            }
          />
          <div className="mt-5 rounded-2xl border border-border bg-noir-gradient p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{roundLabel(liveBattle, t)}</span>
              <StatusChip status={liveBattle.status} />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <BattleSide side={liveBattle.a} align="left" />
              <span className="font-display text-2xl font-semibold text-muted-foreground">
                {t("common.vs")}
              </span>
              <BattleSide side={liveBattle.b} align="right" />
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">{endsLabel(liveBattle, t)}</p>
          </div>
        </div>

        {/* Monthly contest */}
        <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--gold)_28%,transparent)] bg-card p-6">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-spot" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gold" />
              <span className="eyebrow text-gold">{t("home.contest.eyebrow")}</span>
            </div>
            <h3 className="mt-3 font-display text-2xl font-semibold text-foreground">
              {t("home.contest.title")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("home.contest.desc")}</p>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
              <div>
                <p className="font-display text-xl font-semibold text-foreground">312</p>
                <p className="text-xs text-muted-foreground">{t("home.contest.entries")}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-semibold text-foreground">6</p>
                <p className="text-xs text-muted-foreground">{t("home.contest.remaining")}</p>
              </div>
            </div>
            <Button
              variant="gold"
              className="mt-5 w-full"
              onClick={() => toast.success(t("home.contest.submitted"))}
            >
              {t("home.contest.submit")}
            </Button>
          </div>
        </div>
      </Reveal>


      {/* HALL OF FAME PREVIEW */}
      <Reveal as="section" className="space-y-6">
        <SectionHeading
          eyebrow={t("home.fame.eyebrow")}
          title={t("home.fame.title")}
          description={t("home.fame.desc")}
          action={
            <Button asChild variant="ghost-gold" size="sm">
              <Link to="/hall-of-fame">{t("home.fame.enterHall")}</Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hallOfFame.map((h) => (
            <Link
              key={h.id}
              to="/hall-of-fame"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 card-hover"
            >
              <div className="flex items-center gap-2 text-gold">
                <Trophy className="h-4 w-4" />
                <span className="eyebrow">{t(`hallOfFame.items.${h.id}.crown`)}</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{t(`hallOfFame.items.${h.id}.title`)}</p>
              <p className="font-display text-xl font-semibold text-foreground">{h.winner}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t(`hallOfFame.items.${h.id}.note`)}</p>
            </Link>
          ))}
        </div>
      </Reveal>

    </div>
  );
}

function roundLabel(b: Battle, t: (k: string, v?: Record<string, string | number>) => string) {
  return `${t(`battles.${b.round.phase}`)} · ${t("battles.bracket")} ${b.round.bracket}`;
}

function endsLabel(b: Battle, t: (k: string, v?: Record<string, string | number>) => string) {
  return t(b.ends.key === "left" ? "time.left" : "time.startsIn", { t: b.ends.text });
}

function ChartChange({ change, isNew, newLabel }: { change: number; isNew?: boolean; newLabel: string }) {
  if (isNew) {
    return (
      <span className="w-10 text-center text-[0.6rem] font-bold tracking-wider text-gold">
        {newLabel}
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="flex w-10 items-center justify-center gap-0.5 text-xs font-semibold text-[var(--success)]">
        <TrendingUp className="h-3.5 w-3.5" /> {change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="flex w-10 items-center justify-center gap-0.5 text-xs font-semibold text-destructive">
        <TrendingDown className="h-3.5 w-3.5" /> {Math.abs(change)}
      </span>
    );
  }
  return (
    <span className="flex w-10 items-center justify-center text-muted-foreground/60">
      <Minus className="h-3.5 w-3.5" />
    </span>
  );
}

function BattleSide({
  side,
  align,
}: {
  side: { artistId: keyof typeof artistImages; name: string; track: string; votes: number };
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 text-center ${
        align === "right" ? "sm:items-end sm:text-right" : "sm:items-start sm:text-left"
      }`}
    >
      <img
        src={artistImages[side.artistId]}
        alt={side.name}
        className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
      />
      <div>
        <p className="text-sm font-semibold text-foreground">{side.name}</p>
        <p className="text-xs text-muted-foreground">{side.track}</p>
      </div>
      <VoteButton initialVotes={side.votes} size="sm" />
    </div>
  );
}
