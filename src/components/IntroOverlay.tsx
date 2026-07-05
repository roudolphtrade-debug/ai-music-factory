import { useEffect, useRef, useState } from "react";
import introVideo from "@/assets/intro.mp4";
import introPoster from "@/assets/intro-poster.webp";
import { cn } from "@/lib/utils";

const SEEN_KEY = "afm-intro-seen";

/**
 * Cinematic first-load reveal built around the brand intro video.
 * Shows once, ever, per browser — not once per session. Forcing it back on
 * every new tab/session is the kind of thing a restrained brand doesn't do;
 * a "replay" affordance lives in Settings for anyone who wants to see it
 * again on purpose (e.g. before a demo).
 * Can be skipped on click. Never blocks SSR.
 * Near the end of the clip the tagline "Step into the light" lights up.
 */
export function IntroOverlay() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showText, setShowText] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY)) return;
    // Respect the user's OS-level motion preference: never force an
    // autoplaying full-screen video on people who have asked for reduced motion.
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      localStorage.setItem(SEEN_KEY, "1");
      return;
    }
    setMounted(true);
    // Reveal the tagline a beat before the clip resolves.
    const textTimer = setTimeout(() => setShowText(true), 3000);
    // Safety fallback in case the video never fires `ended` (autoplay blocked).
    const fallback = setTimeout(() => setLeaving(true), 7200);
    return () => {
      clearTimeout(textTimer);
      clearTimeout(fallback);
    };
  }, []);

  // Let keyboard users skip instantly with Escape.
  useEffect(() => {
    if (!mounted || leaving) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLeaving(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, leaving]);

  useEffect(() => {
    if (!mounted || !leaving) return;
    const t = setTimeout(() => {
      setMounted(false);
      localStorage.setItem(SEEN_KEY, "1");
    }, 700);
    return () => clearTimeout(t);
  }, [leaving, mounted]);

  const dismiss = () => setLeaving(true);

  if (!mounted) return null;

  return (
    <div
      onClick={dismiss}
      className={cn(
        "fixed inset-0 z-[120] grid cursor-pointer place-items-center overflow-hidden bg-black",
        leaving ? "animate-intro-out" : "animate-intro-in",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Ai Music Factory intro"
    >
      <video
        ref={videoRef}
        src={introVideo}
        poster={introPoster}
        autoPlay
        preload="auto"
        muted
        playsInline
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration && v.currentTime >= v.duration - 2.2) setShowText(true);
        }}
        onEnded={() => setLeaving(true)}
        onError={() => setLeaving(true)}
        className="h-full w-full object-cover"
      />

      {/* Vignette for a cinematic frame */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_50%,transparent_45%,rgba(0,0,0,0.7))]" />

      {/* Cinematic tagline reveal */}
      {showText && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
          {/* one-time soft flash synced to the payoff word landing */}
          <div className="animate-intro-flash absolute inset-0 bg-white motion-reduce:hidden" />

          {/* expanding light burst behind the words */}
          <div
            className="animate-intro-glow absolute h-[60vmin] w-[60vmin] rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--gold) 45%, white) 0%, color-mix(in oklab, var(--gold) 22%, transparent) 35%, transparent 70%)",
            }}
          />

          <div className="relative flex flex-col items-center gap-2 text-center sm:gap-3">
            <span
              className="animate-intro-word text-xs font-medium uppercase tracking-[0.5em] text-white/70 sm:text-sm"
              style={{ animationDelay: "0ms" }}
            >
              Step into
            </span>

            <h2 className="font-display text-4xl font-semibold uppercase tracking-[0.16em] sm:text-6xl md:text-7xl">
              <span
                className="intro-text-shine animate-intro-word inline-block drop-shadow-[0_0_36px_color-mix(in_oklab,var(--gold)_65%,transparent)]"
                style={{ animationDelay: "260ms" }}
              >
                the light
              </span>
            </h2>

            {/* light line drawing outward beneath the payoff word */}
            <span className="animate-intro-line mt-1 h-px w-40 bg-gradient-to-r from-transparent via-gold to-transparent sm:w-56" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        className="absolute right-5 top-5 z-[121] rounded-full border border-white/30 bg-black/40 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-black/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-8 sm:top-8"
      >
        Passer
      </button>

      <div className="absolute bottom-[6%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-white/70">
          Appuyez n'importe où pour continuer
        </span>
      </div>
    </div>
  );
}
