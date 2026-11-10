import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Radio, Users, Swords } from "lucide-react";
import heroHeadphones from "@/assets/hero-headphones.jpg";
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

  const shortcuts = [
    { to: "/studio", label: t("nav.sections.create"), icon: Sparkles },
    { to: "/radio", label: t("nav.radio"), icon: Radio },
    { to: "/artists", label: t("nav.artists"), icon: Users },
    { to: "/battles", label: t("nav.challenges"), icon: Swords },
  ] as const;

  return (
    <section className="relative -mx-4 -mt-6 home-opening overflow-hidden sm:-mx-6 lg:-mx-10">
      <img
        src={heroHeadphones}
        alt=""
        width={1920}
        height={1088}
        className="absolute inset-0 h-full w-full object-cover object-[72%_center] motion-safe:animate-[hero-zoom_24s_ease-out_forwards]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
      {/* Decorative gold spectrum, echoing the hero artwork. */}
      <div aria-hidden="true" className="hero-spectrum pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-32" />
      <div className="hero-grain pointer-events-none absolute inset-0" />

      <div className="relative flex home-opening flex-col justify-center gap-5 px-6 py-7 sm:px-10 sm:py-10 lg:px-12">
        <div className="max-w-xl lg:max-w-2xl">
          <p className="eyebrow mb-3 flex items-center gap-3 text-muted-foreground">
            <span className="inline-block h-px w-10 bg-gold-gradient" />
            Ai Music Factory
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.04] tracking-normal text-foreground sm:text-5xl xl:text-6xl">
            {t("home.hero.titleLead")}{" "}
            <span className="italic">
              {words.map((w, i) => (
                <span
                  key={i}
                  className="gold-text inline-block motion-safe:animate-[word-in_0.9s_ease-out_both]"
                  style={{ animationDelay: `${0.25 + i * 0.18}s` }}
                >
                    {w}{i < words.length - 1 ? "\u00a0" : ""}
                </span>
              ))}
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-foreground/85 sm:text-base">
            {t("home.hero.subtitle")}
          </p>
          <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <Button asChild variant="gold" size="lg">
              <Link to="/artists">
                {t("home.hero.exploreArtists")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-foreground/30 bg-transparent backdrop-blur-sm">
              <Link to="/studio">{t("home.hero.startCreating")}</Link>
            </Button>
          </div>
          <nav aria-label={t("home.hero.shortcuts")} className="mt-5 flex flex-wrap gap-2">
            {shortcuts.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-foreground/20 bg-background/40 px-3.5 text-xs font-medium text-foreground/85 backdrop-blur-sm transition-colors hover:border-[color-mix(in_oklab,var(--gold)_50%,transparent)] hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <Icon className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex w-full max-w-sm items-center gap-3 self-start border-t border-foreground/20 bg-background/40 px-2 py-3 backdrop-blur-sm">
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
