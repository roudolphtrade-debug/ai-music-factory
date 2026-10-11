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
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { homeLaureates } from "@/i18n/home-editorial";
import labelMaisonNoir from "@/assets/label-maison-noir.webp";
import stageImage from "@/assets/hero-stage.jpg";
import { EditorialSelection, ArtistDiscovery, CreateAndConnect, DiscoveryCompanions } from "@/components/premium/HomeEditorial";
import { CinematicHero } from "@/components/premium/CinematicHero";
import { PillarBand } from "@/components/premium/PillarBand";
import { DemoBadge } from "@/components/premium/DemoBadge";
import { StatModule } from "@/components/premium/StatModule";
import { DailyJury } from "@/components/premium/DailyJury";
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
import { usePlayer } from "@/audio/PlayerProvider";
import { useLiveDemoData } from "@/hooks/useLiveDemoData";
import {
  playableById,
  playableTracks,
  radioQueue,
  makePlayable,
  chartTracks,
} from "@/audio/tracks";
import { useLibrary } from "@/library/LibraryProvider";
import { cn } from "@/lib/utils";
import {
  topCreators,
  artists,
  battles,
  nowPlaying,
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
      { title: "Discover music · AI Music Factory" },
      { property: "og:title", content: "Discover music · AI Music Factory" },
      { property: "og:description", content: "Explore editorial music selections, artists and creative possibilities at AI Music Factory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content:
          "Create, discover and share music in the age of AI: editorial selections, new talents, radio and creative challenges.",
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
  const { t, relTime, lang } = useI18n();
  const { favorites, history } = useLibrary();
  const { isActive } = usePlayer();
  const { stats: platformStats, activity: activityFeed } = useLiveDemoData();
  const liveBattle = battles[0];
  const [region, setRegion] = useState<ChartRegion>("Global");
  const charts = globalCharts.filter((c) => c.regions.includes(region));
  const chartQueue = charts.map((chart) => chartTracks.find((track) => track.id === `chart-${chart.rank}-${chart.title}`)).filter((track) => track !== undefined);

  const historyTracks = history
    .map((h) => playableById[h.id])
    .filter(Boolean)
    .slice(0, 4);
  const favTracks = favorites
    .map((id) => playableById[id])
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="space-y-8 sm:space-y-12">
      <CinematicHero featured={chartQueue[0]} queue={chartQueue} cover={artistImages[charts[0].artistId]} />
      <EditorialSelection />


      {/* CONTINUE LISTENING */}
      {historyTracks.length > 0 && (
        <Reveal as="section" className="space-y-6">
          <SectionHeading
            eyebrow={t("library.eyebrow")}
            title={t("library.continueListening")}
            action={
              <Button asChild variant="ghost-gold" size="sm">
                <Link to="/library">{t("library.seeLibrary")}</Link>
              </Button>
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {historyTracks.map((track) => (
              <PersonalTrackCard key={track.id} track={track} queue={playableTracks} />
            ))}
          </div>
        </Reveal>
      )}

      {/* YOUR FAVORITES */}
      {favTracks.length > 0 && (
        <Reveal as="section" className="space-y-6">
          <SectionHeading
            eyebrow={t("library.favorites")}
            title={t("library.yourFavorites")}
            action={
              <Button asChild variant="ghost-gold" size="sm">
                <Link to="/library">{t("library.seeLibrary")}</Link>
              </Button>
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {favTracks.map((track) => (
              <PersonalTrackCard key={track.id} track={track} queue={favTracks} />
            ))}
          </div>
        </Reveal>
      )}

      {/* DISCOVER — Charts, Genres, Trending Artists and Leaderboard/Activity
          used to be four separate stacked full-width sections back to back.
          Same content, same routes, same features — grouped under one set of
          tabs so the homepage has one scroll-stop here instead of four. */}
      <Reveal as="section" className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <Tabs defaultValue="charts" className="home-discovery-tabs min-w-0">
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="charts">{t("home.charts.eyebrow")}</TabsTrigger>
            <TabsTrigger value="genres">{t("home.genres.eyebrow")}</TabsTrigger>
            <TabsTrigger value="trending">{t("home.trending.eyebrow")}</TabsTrigger>
            <TabsTrigger value="leaderboard">{t("home.leaderboard.eyebrow")}</TabsTrigger>
          </TabsList>

          {/* CHARTS */}
          <TabsContent value="charts" className="space-y-4">
            <SectionHeading title={t("home.charts.title")} description={t("editorial.selectionDesc")} action={<DemoBadge />} className="grid grid-cols-[minmax(0,1fr)_auto]" />
            <div className="flex flex-wrap gap-2">
              {chartRegions.map((r) => (
                <Button variant={region === r ? "gold" : "outline"} size="sm"
                  key={r}
                  onClick={() => setRegion(r)}
                  className={cn(
                    "h-9 rounded-md px-3 text-xs font-medium transition-colors",
                    region === r
                      ? "bg-gold-gradient text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground",
                  )}
                >
                  {t(`charts.regions.${r}`)}
                </Button>
              ))}
            </div>
            <div
              key={region}
              className="home-chart-list animate-list-fade overflow-hidden rounded-lg border border-border bg-card"
            >
              {charts.map((c, i) => {
                const track = chartQueue[i];
                const active = isActive(track.id);
                return (
                  <div
                    key={`${c.rank}-${c.title}`}
                    className={cn(
                      "group grid grid-cols-[1.25rem_2.5rem_minmax(0,1fr)_2.75rem_2.75rem] items-center gap-1.5 px-2 py-2 transition-colors hover:bg-secondary/40 sm:gap-2 sm:px-3",
                      i !== charts.length - 1 && "border-b border-border/60",
                    )}
                  >
                    <span className="w-5 shrink-0 text-center font-display text-base font-semibold tabular-nums text-foreground sm:w-6 sm:text-lg">
                      {c.rank}
                    </span>
                    {/* Cover doubles as the play control. On mobile (no hover) the
                        control stays visible so users know the row is tappable; on
                        desktop it's revealed on hover, and always shown when active. */}
                    <div className="relative h-10 w-10 shrink-0 sm:h-11 sm:w-11">
                      <img
                        src={artistImages[c.artistId]}
                        alt={c.artist}
                        loading="lazy"
                        className="h-10 w-10 rounded-md object-cover ring-1 ring-border sm:h-11 sm:w-11"
                      />
                      <div
                        className={cn(
                          "absolute inset-0 hidden place-items-center rounded-lg bg-background/60 opacity-100 transition-opacity",
                          active && "opacity-100 sm:opacity-100",
                        )}
                      >
                        <PlayButton
                          track={track}
                          queue={chartQueue}
                          size="sm"
                          label={t("charts.playTrack", { title: c.title, artist: c.artist })}
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/artists/$artistId"
                        params={{ artistId: c.artistId }}
                        className="block truncate text-sm font-medium text-foreground transition-colors hover:text-gold sm:text-base"
                        title={c.title}
                      >
                        {c.title}
                      </Link>
                      <Link
                        to="/artists/$artistId"
                        params={{ artistId: c.artistId }}
                        className="block truncate text-xs text-muted-foreground transition-colors hover:text-gold"
                      >
                        {c.artist}
                      </Link>
                    </div>
                    <PlayButton track={track} queue={chartQueue} size="md" label={t("charts.playTrack", { title: c.title, artist: c.artist })} />
                    <LikeButton trackId={track.id} size="md" className="h-11 w-11 sm:h-11 sm:w-11" />
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* GENRES */}
          <TabsContent value="genres" className="space-y-6">
            <SectionHeading title={t("home.genres.title")} description={t("home.genres.desc")} action={<DemoBadge />} />
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
                    <p className="text-xs text-muted-foreground">
                      {t("home.genres.tracks", { n: g.tracks })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </TabsContent>

          {/* TRENDING ARTISTS */}
          <TabsContent value="trending" className="space-y-6">
            <SectionHeading
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
          </TabsContent>

          {/* LEADERBOARD + ACTIVITY */}
          <TabsContent value="leaderboard" className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6 lg:col-span-2">
              <SectionHeading title={t("home.leaderboard.title")} action={<DemoBadge />} />
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

            <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6">
              <SectionHeading title={t("home.activity.title")} action={<DemoBadge />} />
              <ul className="mt-4 space-y-4">
                {activityFeed.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        {a.who} {t(`home.activity.${a.actionKey}`, a.actionVars)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.detailKey ? t(`home.activity.${a.detailKey}`) : a.detail} ·{" "}
                        {relTime(a.time)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
        <DiscoveryCompanions />
      </Reveal>

      <ArtistDiscovery />
      <CreateAndConnect />
      <OnboardingChecklist />

      {/* CURRENT BATTLES + CONTEST */}
      <Reveal as="section" className="grid gap-6 border-y border-border py-8 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SectionHeading
            eyebrow={t("home.arena.eyebrow")}
            title={t("home.arena.title")}
            action={
              <Button asChild variant="ghost-gold" size="sm">
                <Link to="/battles">{t("home.arena.allBattles")}</Link>
              </Button>
            }
          />
          <div className="mt-5 border-t border-border pt-5">
            <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <span className="text-xs leading-relaxed text-muted-foreground">{roundLabel(liveBattle, t)} <DemoBadge /></span>
              <StatusChip status={liveBattle.status} />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
              <BattleSide side={liveBattle.a} align="left" />
              <span className="font-display text-2xl font-semibold text-muted-foreground">
                {t("common.vs")}
              </span>
              <BattleSide side={liveBattle.b} align="right" />
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {endsLabel(liveBattle, t)}
            </p>
          </div>
        </div>

        {/* Monthly contest */}
        <div className="relative isolate min-w-0 overflow-hidden border-s border-border p-6">
          <img src={stageImage} alt="" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/90 to-background/50" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gold" />
              <span className="eyebrow text-gold">{t("home.contest.eyebrow")} <DemoBadge /></span>
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
              asChild
            >
              <Link to="/battles">{t("editorial.challenges")}</Link>
            </Button>
          </div>
        </div>
      </Reveal>

      {/* HALL OF FAME PREVIEW */}
      <Reveal as="section" className="space-y-6">
        <SectionHeading
          eyebrow={t("home.fame.eyebrow")}
          className="grid grid-cols-1 items-start sm:flex sm:items-end"
          title={t("home.fame.title")}
          description={t("home.fame.desc")}
          action={
            <Button asChild variant="ghost-gold" size="sm">
              <Link to="/hall-of-fame">{t("home.fame.enterHall")}</Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hallOfFame.map((h, index) => (
            <Link
              key={h.id}
              to="/hall-of-fame"
              className="group relative min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <div className="relative aspect-[4/3] overflow-hidden"><img src={h.id === "hof-3" ? labelMaisonNoir : artistImages[h.artistId]} alt={h.winner} width={640} height={480} loading="lazy" className="h-full w-full object-cover object-[center_25%] transition-transform duration-500 motion-safe:group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" /><span className="absolute bottom-3 end-4 font-display text-4xl text-gold/70">{String(index + 1).padStart(2, "0")}</span></div>
              <div className="p-4 pt-1"><div className="flex flex-wrap items-center gap-2 text-gold">
                <Trophy className="h-4 w-4" /><DemoBadge />
                <span className="eyebrow">{lang in homeLaureates ? homeLaureates[lang as keyof typeof homeLaureates][index]?.[1] : t(`hallOfFame.items.${h.id}.crown`)}</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {lang in homeLaureates ? homeLaureates[lang as keyof typeof homeLaureates][index]?.[0] : t(`hallOfFame.items.${h.id}.title`)}
              </p>
              <p className="font-display text-xl font-semibold text-foreground">{h.winner}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {lang in homeLaureates ? homeLaureates[lang as keyof typeof homeLaureates][index]?.[2] : t(`hallOfFame.items.${h.id}.note`)}
              </p>
              </div>
            </Link>
          ))}
        </div>
      </Reveal>
      <PillarBand />
    </div>
  );
}

function PersonalTrackCard({
  track,
  queue,
}: {
  track: (typeof playableTracks)[number];
  queue: (typeof playableTracks)[number][];
}) {
  const { t } = useI18n();
  return (
    <div className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border surface-premium p-3 card-hover">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
        <img
          src={track.cover}
          alt={track.artist}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
      </div>
      <LikeButton trackId={track.id} size="sm" />
      <PlayButton track={track} queue={queue} size="sm" label={t("charts.playTrack", { title: track.title, artist: track.artist })} />
    </div>
  );
}

function roundLabel(b: Battle, t: (k: string, v?: Record<string, string | number>) => string) {
  return `${t(`battles.${b.round.phase}`)} · ${t("battles.bracket")} ${b.round.bracket}`;
}

function endsLabel(b: Battle, t: (k: string, v?: Record<string, string | number>) => string) {
  return t(b.ends.key === "left" ? "time.left" : "time.startsIn", { t: b.ends.text });
}

function ChartChange({
  change,
  isNew,
  newLabel,
}: {
  change: number;
  isNew?: boolean;
  newLabel: string;
}) {
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
    <div className="flex min-w-0 flex-col gap-3">
      <Link to="/artists/$artistId" params={{artistId: side.artistId}} aria-label={side.name} className="group relative block aspect-[4/3] overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
      <img
        src={artistImages[side.artistId]}
        alt={side.name}
        loading="lazy"
        className="h-full w-full object-cover object-[center_25%] transition-transform duration-500 motion-safe:group-hover:scale-105"
      />
      </Link>
      <div className={align === "right" ? "text-end" : "text-start"}>
        <Link to="/artists/$artistId" params={{artistId: side.artistId}} className="block break-words font-display text-xl font-semibold text-foreground hover:text-gold">{side.name}</Link>
        <p className="text-xs text-muted-foreground">{side.track}</p>
      </div>
      <div className={align === "right" ? "self-end" : "self-start"}><VoteButton initialVotes={side.votes} size="sm" /></div>
    </div>
  );
}
