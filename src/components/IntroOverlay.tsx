import { useEffect, useRef, useState } from "react";
import introVideo from "@/assets/intro.mp4.asset.json";
import { cn } from "@/lib/utils";

const SESSION_KEY = "afm-intro-seen";

/**
 * Cinematic first-load reveal built around the brand intro video.
 * Shows once per session, can be skipped on click, and never blocks SSR.
 */
export function IntroOverlay() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setMounted(true);
    // Safety fallback in case the video never fires `ended` (autoplay blocked).
    const fallback = setTimeout(() => setLeaving(true), 6500);
    return () => clearTimeout(fallback);
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
        onEnded={() => setLeaving(true)}
        className="h-full w-full object-cover"
      />

      {/* Vignette for a cinematic frame */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_50%,transparent_55%,rgba(0,0,0,0.55))]" />

      <span className="absolute bottom-[8%] left-1/2 -translate-x-1/2 text-[0.6rem] uppercase tracking-[0.3em] text-white/45">
        Tap to enter
      </span>
    </div>
  );
}
