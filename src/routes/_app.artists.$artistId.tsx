import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  UserPlus,
  Check,
  Users,
  Sparkles,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoldBadge, ReputationChip, StatusChip } from "@/components/premium/Chips";
import { VoteButton } from "@/components/premium/VoteButton";
import { Playlist } from "@/components/audio/Playlist";
import { ReadAloudButton } from "@/components/voice/ReadAloudButton";
import { releasesFor } from "@/audio/tracks";
import { getArtist, artistImages, tracks } from "@/data/mock";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/artists/$artistId")({
  head: () => ({
    meta: [{ title: "Artist — Ai Music Factory" }],
  }),
  component: ArtistProfilePage,
  notFoundComponent: ArtistNotFound,
});

function ArtistProfilePage() {
  const { t } = useI18n();
  const { artistId } = Route.useParams();
  const artist = getArtist(artistId);
  const [following, setFollowing] = useState(false);

  if (!artist) return <ArtistNotFound />;

  const releases = tracks.filter((track) => track.artistId === artist.id);
  const playableReleases = releasesFor(artist.id);

  return (
    <div className="space-y-8">
      <Link
        to="/artists"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("artistProfile.allArtists")}
      </Link>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid gap-0 md:grid-cols-[0.8fr_1.2fr]">
          <div className="relative aspect-[4/5] md:aspect-auto">
            <img
              src={artistImages[artist.id]}
              alt={artist.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card md:to-card" />
          </div>
          <div className="relative flex flex-col justify-center gap-4 p-7 sm:p-10">
            <div className="flex flex-wrap items-center gap-2">
              {artist.genres.map((g) => (
                <GoldBadge key={g} variant="outline">
                  {g}
                </GoldBadge>
              ))}
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {artist.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{artist.handle}</p>
            </div>
            <p className="max-w-xl text-base text-muted-foreground">{artist.tagline}</p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <ReputationChip score={artist.reputation} />
              <Link
                to="/labels"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Building2 className="h-3.5 w-3.5 text-gold" /> {artist.label}
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant={following ? "noir" : "gold"}
                onClick={() => setFollowing((f) => !f)}
              >
                {following ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {following ? t("artistProfile.following") : t("artistProfile.follow")}
              </Button>
              <VoteButton initialVotes={artist.reputation > 9 ? 12400 : 8900} />
              <Button variant="ghost-gold">
                <Users className="h-4 w-4" />
                {t("artistProfile.joinFanCircle")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ProfileStat label={t("artistProfile.monthlyListeners")} value={artist.monthlyListeners} />
        <ProfileStat label={t("artistProfile.followers")} value={artist.followers} />
        <ProfileStat label={t("artistProfile.tracks")} value={`${artist.tracks}`} />
        <ProfileStat label={t("artistProfile.reputation")} value={artist.reputation.toFixed(1)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* RELEASES */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="font-display text-2xl font-semibold text-foreground">{t("artistProfile.releases")}</h2>
          <Playlist
            tracks={playableReleases}
            subtitleFor={(p) => {
              const meta = releases.find((r) => r.id === p.id);
              return meta ? `${meta.genre} · ${t(`moods.${meta.mood}`)}` : p.artist;
            }}
            trailing={(p) => {
              const meta = releases.find((r) => r.id === p.id);
              return (
                <div className="flex items-center gap-4">
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {meta?.plays} {t("artistProfile.plays")}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{p.duration}</span>
                </div>
              );
            }}
          />
        </div>


        {/* SIDE: bio, badges, community */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl font-semibold text-foreground">{t("artistProfile.about")}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{artist.bio}</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> {artist.aesthetic}
            </p>
            <div className="mt-4">
              <ReadAloudButton text={`${artist.name}. ${artist.bio}`} size="sm" />
            </div>
          </div>


          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl font-semibold text-foreground">{t("artistProfile.badges")}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {artist.badges.map((b) => (
                <GoldBadge key={b}>{b}</GoldBadge>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-foreground">{t("artistProfile.community")}</h3>
              <StatusChip status="Live" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("artistProfile.followersLine", { f: artist.followers, c: "4.2K" })}
            </p>
            <Button variant="ghost-gold" className="mt-4 w-full">
              {t("artistProfile.enterCommunity")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">{value}</p>
    </div>
  );
}

function ArtistNotFound() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
      <h2 className="font-display text-2xl font-semibold text-foreground">{t("artistProfile.notFoundTitle")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("artistProfile.notFoundDesc")}</p>
      <div className="mt-5 flex gap-3">
        <Button variant="ghost-gold" onClick={() => router.history.back()}>
          {t("artistProfile.goBack")}
        </Button>
        <Button asChild variant="gold">
          <Link to="/artists">{t("artistProfile.browse")}</Link>
        </Button>
      </div>
    </div>
  );
}
