import { useEffect, useRef, useState } from "react";
import introVideo from "@/assets/intro.mp4.asset.json";
import { cn } from "@/lib/utils";

const SESSION_KEY = "afm-intro-seen";

/**
 * Cinematic first-load reveal built around the brand intro video.
 * Shows once per session, can be skipped on click, and never blocks SSR.
 * Near the end of the clip the tagline "Step into the light" lights up.
 */
export function IntroOverlay() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showText, setShowText] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
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

  useEffect(() => {
    if (!mounted || !leaving) return;
    const t = setTimeout(() => {
      setMounted(false);
      sessionStorage.setItem(SESSION_KEY, "1");
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
      role="presentation"
    >
      <video
        ref={videoRef}
        src={introVideo.url}
        autoPlay
        muted
        playsInline
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration && v.currentTime >= v.duration - 2.2) setShowText(true);
        }}
        onEnded={() => setLeaving(true)}
        onError={() => setLeaving(true)}
        className="h-full w-full object-contain"
      />

      {/* Vignette for a cinematic frame */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_50%,transparent_45%,rgba(0,0,0,0.7))]" />

      {/* Cinematic tagline reveal */}
      {showText && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
          {/* expanding light burst behind the words */}
          <div
            className="animate-intro-glow absolute h-[60vmin] w-[60vmin] rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--gold) 45%, white) 0%, color-mix(in oklab, var(--gold) 22%, transparent) 35%, transparent 70%)",
            }}
          />
          <h2 className="animate-intro-text relative text-center font-display text-3xl font-semibold uppercase tracking-[0.22em] sm:text-5xl md:text-6xl">
            <span className="intro-text-shine drop-shadow-[0_0_28px_color-mix(in_oklab,var(--gold)_60%,transparent)]">
              Step into the light
            </span>
          </h2>
        </div>
      )}

      <span className="absolute bottom-[8%] left-1/2 -translate-x-1/2 text-[0.6rem] uppercase tracking-[0.3em] text-white/45">
        Tap to enter
      </span>
    </div>
  );
}
