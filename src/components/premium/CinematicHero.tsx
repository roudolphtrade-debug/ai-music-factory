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

// Deterministic bar heights (no randomness → SSR-safe), shaped like a waveform.
const SPECTRUM = Array.from({ length: 96 }, (_, i) => {
  const x = i / 95;
  const env = Math.sin(Math.PI * x) ** 0.8;
  const ripple = 0.55 + 0.45 * Math.abs(Math.sin(i * 0.47) * Math.cos(i * 0.13));
  return Math.max(0.08, env * ripple);
});

function HeroSpectrum() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-3 flex h-10 items-center justify-between gap-px px-6 opacity-70 sm:bottom-5 sm:h-12 sm:px-12"
    >
      {SPECTRUM.map((h, i) => (
        <span
          key={i}
          className="hero-spectrum-bar w-px rounded-full"
          style={{ height: `${Math.round(h * 100)}%`, animationDelay: `${(i % 12) * -0.27}s` }}
        />
      ))}
    </div>
  );
}

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
      {/* Mobile: portrait band on top, so text never covers the face. Desktop: full-bleed. */}
      <div className="relative h-[68vw] max-h-[420px] overflow-hidden sm:absolute sm:inset-0 sm:h-full sm:max-h-none">
        <img
          src={heroHeadphones}
          alt=""
          width={1920}
          height={1088}
          className="h-full w-full object-cover object-[74%_30%] motion-safe:animate-[hero-zoom_24s_ease-out_forwards] sm:object-[72%_center]"
        />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-background via-background/70 to-transparent sm:block" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
      </div>
      <div className="hero-grain pointer-events-none absolute inset-0" />
      {/* Decorative gold spectrum (not audio-reactive), echoing the artwork. */}
      <HeroSpectrum />

      <div className="relative -mt-10 flex home-opening flex-col justify-center gap-5 px-5 pb-12 pt-0 sm:mt-0 sm:px-10 sm:py-10 sm:pb-16 lg:px-12">
        <div className="max-w-xl lg:max-w-2xl">
          <p className="eyebrow mb-3 flex items-center gap-3 text-muted-foreground">
            <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
              {[5, 9, 6, 12, 8, 4, 10, 7].map((h, i) => (
                <span key={i} className="hero-spectrum-bar w-px rounded-full" style={{ height: `${h}px`, animationDelay: `${i * 0.12}s` }} />
              ))}
            </span>
            <span aria-hidden="true" className="text-gold">{t("home.hero.titleLead")}</span>
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.04] tracking-normal text-foreground sm:text-5xl xl:text-6xl">
            <span className="sr-only">{t("home.hero.titleLead")} </span>
            <span className="block whitespace-nowrap italic">
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
                {t("home.hero.exploreArtists")} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-foreground/30 bg-transparent backdrop-blur-sm">
              <Link to="/studio">{t("home.hero.startCreating")}</Link>
            </Button>
          </div>
          <nav
            aria-label={t("home.hero.shortcuts")}
            className="mt-5 grid grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:gap-2 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
          >
            {shortcuts.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex min-w-0 flex-col items-center justify-center group/sc gap-1.5 rounded-lg px-1 py-1 text-center text-[0.68rem] font-medium leading-tight text-foreground/85 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold sm:inline-flex sm:h-9 sm:flex-row sm:gap-2 sm:rounded-full sm:border sm:border-foreground/20 sm:bg-background/40 sm:px-3.5 sm:py-0 sm:text-xs sm:backdrop-blur-sm sm:[&:not(:last-child)]:border-e sm:hover:border-[color-mix(in_oklab,var(--gold)_50%,transparent)]"
              >
                <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[color-mix(in_oklab,var(--gold)_60%,transparent)] bg-background/60 shadow-[0_0_14px_color-mix(in_oklab,var(--gold)_25%,transparent)] sm:contents">
                  <Icon className="h-5 w-5 shrink-0 text-gold sm:h-3.5 sm:w-3.5" />
                </span>
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
