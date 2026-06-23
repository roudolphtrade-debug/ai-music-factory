import { useEffect, useState } from "react";
import introLogo from "@/assets/intro-logo.png";
import { cn } from "@/lib/utils";

const SESSION_KEY = "afm-intro-seen";

/**
 * Cinematic first-load reveal built around the brand logo.
 * Shows once per session, can be skipped on click, and never blocks SSR.
 */
export function IntroOverlay() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setMounted(true);
    const leaveTimer = setTimeout(() => setLeaving(true), 2600);
    const removeTimer = setTimeout(() => {
      setMounted(false);
      sessionStorage.setItem(SESSION_KEY, "1");
    }, 3400);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => {
      setMounted(false);
      sessionStorage.setItem(SESSION_KEY, "1");
    }, 700);
  };

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
      {/* Atmospheric spotlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_30%,color-mix(in_oklab,var(--gold)_14%,transparent),transparent_60%)]" />

      <div className="relative flex flex-col items-center">
        <img
          src={logoAsset.url}
          alt="Ai Music Factory"
          className="w-[78vw] max-w-[440px] animate-intro-logo select-none object-contain"
          draggable={false}
        />
        {/* Sweeping shimmer */}
        <span className="pointer-events-none absolute inset-0 animate-intro-sheen bg-[linear-gradient(105deg,transparent_40%,color-mix(in_oklab,var(--gold)_22%,transparent)_50%,transparent_60%)]" />
      </div>

      {/* Loading hairline */}
      <div className="absolute bottom-[14%] left-1/2 h-px w-40 -translate-x-1/2 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full w-full origin-left animate-intro-bar bg-gold-gradient" />
      </div>

      <span className="absolute bottom-[9%] left-1/2 -translate-x-1/2 text-[0.6rem] uppercase tracking-[0.3em] text-white/40">
        Tap to enter
      </span>
    </div>
  );
}
