import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import heroStage from "@/assets/hero-stage.jpg";
import { Button } from "@/components/ui/button";
import { PlayButton } from "@/components/audio/PlayButton";
import { LikeButton } from "@/components/premium/LikeButton";
import { DemoBadge } from "@/components/premium/DemoBadge";
import { Equalizer } from "@/components/premium/Equalizer";
import { usePlayer } from "@/audio/PlayerProvider";
import { useI18n } from "@/i18n/context";
import type { PlayableTrack } from "@/audio/tracks";

/** Full-bleed cinematic opening scene of the home page. */
export function CinematicHero({
  featured,
  queue,
  cover,
}: {
  featured: PlayableTrack;
  queue: PlayableTrack[];
  cover: string;
}) {
  const { t } = useI18n();
  const { isTrackPlaying } = usePlayer();
  const playing = isTrackPlaying(featured.id);
  const words = t("home.hero.titleAccent").split(" ");

  return (
    <section className="relative -mx-4 -mt-6 home-opening overflow-hidden sm:-mx-6 lg:-mx-10">
      <img
        src={heroStage}
        alt=""
        width={1920}
        height={1088}
        className="absolute inset-0 h-full w-full object-cover object-[70%_center] motion-safe:animate-[hero-zoom_24s_ease-out_forwards]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
      <div className="hero-grain pointer-events-none absolute inset-0" />

      <div className="relative flex home-opening flex-col justify-center gap-4 px-6 py-5 sm:px-10 lg:px-12">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3 flex items-center gap-3 text-muted-foreground">
            <span className="inline-block h-px w-10 bg-gold-gradient" />
            Ai Music Factory
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[0.95] tracking-normal text-foreground sm:text-6xl lg:text-6xl">
            {t("home.hero.titleLead")}{" "}
            <span className="italic">
              {words.map((w, i) => (
                <span
                  key={i}
                  className="gold-text inline-block motion-safe:animate-[word-in_0.9s_ease-out_both]"
                  style={{ animationDelay: `${0.25 + i * 0.18}s` }}
                >
                  {w}&nbsp;
                </span>
              ))}
            </span>
          </h1>
          <p className="mt-3 max-w-lg text-[0.8125rem] leading-relaxed text-foreground/85 sm:text-base">
            {t("home.hero.subtitle")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="lg">
              <Link to="/artists">
                {t("home.hero.exploreArtists")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-foreground/30 bg-transparent backdrop-blur-sm">
              <Link to="/studio">{t("home.hero.startCreating")}</Link>
            </Button>
          </div>
        </div>

        <div className="flex w-full max-w-sm items-center gap-4 self-start rounded-lg border border-foreground/15 bg-background/50 p-3 backdrop-blur-xl">
          <div className="relative shrink-0">
            <img src={cover} alt={featured.artist} className="h-12 w-12 rounded-md object-cover" />
            <div className="absolute inset-0 grid place-items-center">
              <PlayButton track={featured} queue={queue} size="sm" label={t("charts.playTrack", { title: featured.title, artist: featured.artist })} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-[0.6rem] text-gold">{t("home.hero.badge")} <DemoBadge /></p>
            <p className="truncate font-display text-lg font-semibold text-foreground">{featured.title}</p>
            <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
              {playing && <Equalizer />}
              {featured.artist}
            </p>
          </div>
          <LikeButton trackId={featured.id} size="sm" />
        </div>
      </div>
    </section>
  );
}
