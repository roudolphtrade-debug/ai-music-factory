import { useEffect, useRef, useState } from "react";
import { Wand2, Sparkles, Loader2, Download, RotateCcw, Music4 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlayButton } from "@/components/audio/PlayButton";
import { LikeButton } from "@/components/premium/LikeButton";
import { Equalizer } from "@/components/premium/Equalizer";
import { usePlayer } from "@/audio/PlayerProvider";
import type { PlayableTrack } from "@/audio/tracks";
import { useGeneratedDrafts } from "@/library/GeneratedDraftsProvider";
import { useCredits } from "@/library/CreditsProvider";
import { COSTS } from "@/library/credits";
import { artistImages, moods, type ArtistId } from "@/data/mock";
import { useI18n } from "@/i18n/context";

const genres = ["Hip-Hop", "Trap", "Afrobeats", "UK Drill", "Amapiano", "Reggaeton", "Hyperpop", "Neo-Soul"];
const voiceKeys = ["Instrumental", "Warm tenor", "Soprano", "Alto", "Custom voice"];
const GEN_COVER: ArtistId = "art-1";

type Phase = "idle" | "generating" | "done";

interface GenResult {
  track: PlayableTrack;
  lyrics: string;
  url: string;
}

function decodeLyrics(b64: string | null): string {
  if (!b64) return "";
  try {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export function StudioComposer() {
  const { t } = useI18n();
  const { play } = usePlayer();
  const { addDraft } = useGeneratedDrafts();
  const { canAfford, spend } = useCredits();


  const [prompt, setPrompt] = useState(
    "Cinematic ambient pop with golden-hour pads, warm analogue tape saturation, and a slow euphoric build toward a wordless choir.",
  );
  const [genre, setGenre] = useState(genres[0]);
  const [mood, setMood] = useState(moods[0]);
  const [voice, setVoice] = useState(voiceKeys[1]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GenResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseLabels = t("studio.gen.phases").split("|");

  // Cycle phase labels while generating for a lively "forging" feel.
  useEffect(() => {
    if (phase !== "generating") {
      if (stepTimer.current) clearInterval(stepTimer.current);
      return;
    }
    setStepIndex(0);
    stepTimer.current = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, phaseLabels.length - 1));
    }, 2200);
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const generate = async () => {
    const clean = prompt.trim();
    if (!clean) {
      toast.error(t("studio.gen.emptyPrompt"));
      return;
    }
    if (!canAfford("track")) {
      toast.error(t("studio.gen.noCredits", { n: COSTS.track }));
      return;
    }
    setPhase("generating");

    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: clean,
          genre,
          mood: t(`moods.${mood}`),
          voice,
        }),
      });
      if (!res.ok) {
        let key = "studio.gen.errorGeneric";
        if (res.status === 402) key = "studio.gen.errorCredits";
        else if (res.status === 429) key = "studio.gen.errorRate";
        toast.error(t(key));
        setPhase(result ? "done" : "idle");
        return;
      }
      const lyrics = decodeLyrics(res.headers.get("X-Lyrics"));
      const blob = await res.blob();

      const id = `gen-${Date.now()}`;
      const title = clean.split(/[.,—-]/)[0].trim().slice(0, 42) || t("studio.gen.newTrack");
      const duration = "0:20";

      // Persist the draft (audio Blob + metadata) — provider owns the object URL.
      const draft = await addDraft(
        {
          id,
          title,
          prompt: clean,
          genre,
          mood,
          voice,
          lyrics,
          duration,
          createdAt: Date.now(),
        },
        blob,
      );

      const track: PlayableTrack = {
        id,
        title,
        artist: `${genre} · ${t(`studio.voices.${voice}`)}`,
        artistId: GEN_COVER,
        src: draft.url,
        cover: artistImages[GEN_COVER],
        duration,
      };

      setResult({ track, lyrics, url: draft.url });
      setPhase("done");
      play(track);
      toast.success(t("studio.gen.saved"));
    } catch {
      toast.error(t("studio.gen.errorGeneric"));
      setPhase(result ? "done" : "idle");
    }
  };

  return (
    <div className="relative space-y-5 overflow-hidden rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-gold" />
        <span className="eyebrow text-gold">{t("studio.newComposition")}</span>
      </div>

      <Field label={t("studio.prompt")}>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full resize-none rounded-xl border border-input bg-secondary/30 p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("studio.genre")}>
          <Select value={genre} onChange={setGenre} options={genres.map((g) => ({ value: g, label: g }))} />
        </Field>
        <Field label={t("studio.mood")}>
          <Select
            value={mood}
            onChange={setMood}
            options={moods.slice(0, 6).map((m) => ({ value: m, label: t(`moods.${m}`) }))}
          />
        </Field>
        <Field label={t("studio.voice")}>
          <Select
            value={voice}
            onChange={setVoice}
            options={voiceKeys.map((v) => ({ value: v, label: t(`studio.voices.${v}`) }))}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("studio.quickMoods")}</span>
        {moods.slice(0, 5).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMood(m)}
            className={
              "rounded-full border px-3 py-1 text-xs transition-colors " +
              (mood === m
                ? "border-[color-mix(in_oklab,var(--gold)_50%,transparent)] text-gold"
                : "border-border text-muted-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground")
            }
          >
            {t(`moods.${m}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button variant="gold" onClick={generate} disabled={phase === "generating"}>
          {phase === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {phase === "generating" ? t("studio.gen.generating") : t("studio.generate")}
        </Button>
        <Button variant="noir" disabled={phase === "generating"}>
          {t("studio.saveDraft")}
        </Button>
        {phase === "idle" && !result && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gold/80">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-gold" />
            {t("studio.gen.ready")}
          </span>
        )}
      </div>

      {/* GENERATING OVERLAY */}
      {phase === "generating" && (
        <div className="animate-fade-in rounded-2xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-noir-gradient p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-primary-foreground shadow-[0_10px_28px_-12px_var(--gold)]">
              <Music4 className="h-5 w-5 animate-pulse" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold text-foreground">{t("studio.gen.generating")}</p>
              <p className="truncate text-sm text-gold">{phaseLabels[stepIndex]}</p>
            </div>
            <Equalizer />
          </div>
          <div className="mt-5 flex gap-1.5">
            {phaseLabels.map((_, i) => (
              <span
                key={i}
                className={
                  "h-1 flex-1 rounded-full transition-colors duration-500 " +
                  (i <= stepIndex ? "bg-gold-gradient" : "bg-border")
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === "done" && result && (
        <div className="animate-scale-in rounded-2xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-noir-gradient p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="eyebrow text-gold">{t("studio.gen.resultTitle")}</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <img
              src={result.track.cover}
              alt={result.track.title}
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-semibold text-foreground">{result.track.title}</p>
              <p className="truncate text-sm text-muted-foreground">{result.track.artist}</p>
            </div>
            <PlayButton track={result.track} size="md" />
            <LikeButton trackId={result.track.id} size="sm" />
          </div>

          {result.lyrics && (
            <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                {t("studio.gen.lyricsLabel")}
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{result.lyrics}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="ghost-gold" size="sm" onClick={generate}>
              <RotateCcw className="h-4 w-4" /> {t("studio.gen.regenerate")}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={result.url} download={`${result.track.title}.mp3`}>
                <Download className="h-4 w-4" /> {t("studio.gen.download")}
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="eyebrow text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-xl border border-input bg-secondary/30 px-3 text-sm text-foreground outline-none transition-colors focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-card">
          {o.label}
        </option>
      ))}
    </select>
  );
}
