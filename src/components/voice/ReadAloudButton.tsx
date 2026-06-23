import { useEffect, useRef, useState } from "react";
import { Volume2, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

type State = "idle" | "loading" | "playing";

/**
 * "Read aloud" control — sends text to the TTS endpoint and plays the result.
 * Lightweight: one shared <audio> element, no advanced processing.
 */
export function ReadAloudButton({
  text,
  voice = "sage",
  label,
  className,
  variant = "ghost-gold",
  size = "default",
}: {
  text: string;
  voice?: string;
  label?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const { t } = useI18n();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  useEffect(() => cleanup, []);

  const stop = () => {
    cleanup();
    setState("idle");
  };

  const play = async () => {
    if (state === "playing" || state === "loading") {
      stop();
      return;
    }
    setError(null);
    setState("loading");
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Speech failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = stop;
      audio.onerror = stop;
      await audio.play();
      setState("playing");
    } catch (e) {
      cleanup();
      setState("idle");
      setError(e instanceof Error ? e.message : "Speech failed.");
    }
  };

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <Button type="button" variant={variant} size={size} onClick={play} aria-live="polite">
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "playing" ? (
          <Square className="h-4 w-4 fill-current" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
        {state === "playing" ? t("voice.stop") : (label ?? t("voice.readAloud"))}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
