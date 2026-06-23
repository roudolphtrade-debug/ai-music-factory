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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatModule } from "@/components/premium/StatModule";
import { ArtistCard } from "@/components/premium/ArtistCard";
import { RankingRow } from "@/components/premium/RankingRow";
import { GoldBadge, StatusChip } from "@/components/premium/Chips";
import { VoteButton } from "@/components/premium/VoteButton";
import { Equalizer } from "@/components/premium/Equalizer";
import {
  platformStats,
  topCreators,
  artists,
  battles,
  nowPlaying,
  activityFeed,
  hallOfFame,
  artistImages,
} from "@/data/mock";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Home — Ai Music Factory" },
      {
        name: "description",
        content:
          "The control room for AI-native artists: live activity, top creators, trending virtual artists, battles and AI radio.",
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
  const liveBattle = battles[0];

  return (
    <div className="space-y-12">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-noir-gradient">
        <div className="absolute inset-0 bg-spot" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_22%,transparent),transparent_70%)]" />
        <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <GoldBadge variant="outline" className="mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-gold" />
              Season 7 · Now live
            </GoldBadge>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              The stage where{" "}
              <span className="gold-text">machines become icons.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Create music, forge a virtual identity, build a label, and rise through
              battles and reputation — the social operating system for AI-native artists.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="xl">
                <Link to="/studio">
                  <Play className="h-4 w-4" />
                  Start creating
                </Link>
              </Button>
              <Button asChild variant="ghost-gold" size="xl">
                <Link to="/artists">Explore artists</Link>
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
              <img
                src={artistImages[nowPlaying.track.artistId]}
                alt={nowPlaying.track.artist}
                className="h-20 w-20 rounded-xl object-cover ring-1 ring-border"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-semibold text-foreground">
                  {nowPlaying.track.title}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {nowPlaying.track.artist}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Equalizer />
                  {nowPlaying.listeners} listening now
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>
                Up next ·{" "}
                <span className="text-foreground">{nowPlaying.upNext.title}</span>
              </span>
              <Link to="/radio" className="inline-flex items-center gap-1 text-gold hover:underline">
                Open radio <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {platformStats.map((s, i) => (
          <StatModule key={s.label} {...s} icon={statIcons[i]} />
        ))}
      </section>

      {/* TRENDING ARTISTS */}
      <section className="space-y-6">
        <SectionHeading
          eyebrow="Discover"
          title="Trending virtual artists"
          description="The identities the community can't stop replaying this week."
          action={
            <Button asChild variant="ghost-gold" size="sm">
              <Link to="/artists">View all</Link>
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {artists.slice(0, 4).map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      </section>

      {/* TWO COLUMN: TOP CREATORS + ACTIVITY */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <SectionHeading eyebrow="Leaderboard" title="Top creators" />
          <div className="mt-4 divide-y divide-border/60">
            {topCreators.map((c) => (
              <RankingRow
                key={c.artistId}
                rank={c.rank}
                artistId={c.artistId}
                name={c.name}
                meta={`${c.listeners} monthly listeners`}
                reputation={c.reputation}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <SectionHeading eyebrow="Live" title="Platform activity" />
          <ul className="mt-4 space-y-4">
            {activityFeed.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.detail} · {a.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CURRENT BATTLES + CONTEST */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <SectionHeading
            eyebrow="Arena"
            title="Current battles"
            action={
              <Button asChild variant="ghost-gold" size="sm">
                <Link to="/battles">All battles</Link>
              </Button>
            }
          />
          <div className="mt-5 rounded-2xl border border-border bg-noir-gradient p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{liveBattle.round}</span>
              <StatusChip status={liveBattle.status} />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <BattleSide side={liveBattle.a} align="left" />
              <span className="font-display text-2xl font-semibold text-muted-foreground">VS</span>
              <BattleSide side={liveBattle.b} align="right" />
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">{liveBattle.ends}</p>
          </div>
        </div>

        {/* Monthly contest */}
        <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--gold)_28%,transparent)] bg-card p-6">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-spot" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gold" />
              <span className="eyebrow text-gold">Monthly contest</span>
            </div>
            <h3 className="mt-3 font-display text-2xl font-semibold text-foreground">
              The Golden Hour Challenge
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Submit your most cinematic ambient track. The winner takes the cover of AI
              Radio and a featured label slot.
            </p>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
              <div>
                <p className="font-display text-xl font-semibold text-foreground">312</p>
                <p className="text-xs text-muted-foreground">entries</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-semibold text-foreground">6 days</p>
                <p className="text-xs text-muted-foreground">remaining</p>
              </div>
            </div>
            <Button variant="gold" className="mt-5 w-full">
              Submit your track
            </Button>
          </div>
        </div>
      </section>

      {/* HALL OF FAME PREVIEW */}
      <section className="space-y-6">
        <SectionHeading
          eyebrow="Prestige"
          title="Hall of Fame"
          description="The most decorated artists, prompts and labels on the platform."
          action={
            <Button asChild variant="ghost-gold" size="sm">
              <Link to="/hall-of-fame">Enter the hall</Link>
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
                <span className="eyebrow">{h.crown}</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{h.title}</p>
              <p className="font-display text-xl font-semibold text-foreground">{h.winner}</p>
              <p className="mt-2 text-xs text-muted-foreground">{h.note}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
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
