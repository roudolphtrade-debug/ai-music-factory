import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Wand2,
  Sparkles,
  Loader2,
  Download,
  RotateCcw,
  Music4,
  ShieldCheck,
  History,
  Info,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlayButton } from "@/components/audio/PlayButton";
import { LikeButton } from "@/components/premium/LikeButton";
import { AnonymousPrepRecovery } from "@/components/premium/AnonymousPrepRecovery";
import { Equalizer } from "@/components/premium/Equalizer";
import { usePlayer } from "@/audio/PlayerProvider";
import type { PlayableTrack } from "@/audio/tracks";
import { DraftDiscardedError, useGeneratedDrafts } from "@/library/draftsContext";
import { useCredits } from "@/library/CreditsProvider";
import { COSTS } from "@/library/credits";
import { artistImages, moods, type ArtistId } from "@/data/mock";
import { composeFinalTrack } from "@/audio/mixTrack";
import { useI18n } from "@/i18n/context";
import { aiErrorCode, aiErrorKey } from "@/lib/ai-limits";
import { aiFetch, SignInRequiredError } from "@/lib/ai-fetch";
import { useAuth } from "@/auth/context";
import { AUTH_PATHS } from "@/auth/redirects";
import { rememberReturnTo } from "@/auth/returnTo";
import {
  ANON,
  PREP_PROMPT_MAX,
  adoptAnonymousPrep,
  clearPrep,
  memberOwner,
  purgeExpiredPreps,
  readPrep,
  savePrep,
  type PrepFields,
} from "@/studio/prep";

const genres = [
  "Hip-Hop",
  "Trap",
  "Afrobeats",
  "UK Drill",
  "Amapiano",
  "Reggaeton",
  "Hyperpop",
  "Neo-Soul",
];
const voiceKeys = ["Instrumental", "Warm tenor", "Soprano", "Alto", "Custom voice"];
const GEN_COVER: ArtistId = "art-1";
const STUDIO_PATH = "/studio";
const DEFAULT_PROMPT =
  "Cinematic ambient pop with golden-hour pads, warm analogue tape saturation, and a slow euphoric build toward a wordless choir.";

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
  const { addDraft, keepUrl } = useGeneratedDrafts();
  const { canAfford, spend } = useCredits();
  const { status, user } = useAuth();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [genre, setGenre] = useState(genres[0]);
  const [mood, setMood] = useState(moods[0]);
  const [voice, setVoice] = useState(voiceKeys[1]);
  // The preparation is kept on this device (see studio/prep.ts). "restored" turns true once the
  // session is known and the stored preparation, if any, has been put back in the form.
  const userId = user?.id;
  const owner = useMemo(
    () => (status === "signedIn" && userId ? memberOwner(userId) : ANON),
    [status, userId],
  );
  // Who is signed in right now, readable from an answer that comes back later.
  const signedInAs = useRef<string | null>(null);
  signedInAs.current = status === "signedIn" && userId ? userId : null;
  const [restored, setRestored] = useState(false);
  // The same fact, readable at once: between the end of the restoration and the next render, an edit must
  // already be saved (a fast typist, or a test), not wait for a render that will not repeat it.
  const restoredRef = useRef(false);
  const [resumed, setResumed] = useState(false);
  // A visitor's preparation is stored on this device: said plainly, with its limits, next to the form.
  const [visitorKept, setVisitorKept] = useState(false);
  // Typing before the session is known (a few hundred ms at load) must not be overwritten by the
  // restoration: the member's own words win.
  const touched = useRef(false);
  const latest = useRef<PrepFields>({ prompt, genre, mood, voice });
  latest.current = { prompt, genre, mood, voice };

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GenResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  // True once the server has answered "paused" to the last click. It is only a notice: the form, the
  // preparation and the button are untouched, and nothing is retried.
  const [paused, setPaused] = useState(false);

  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseLabels = t("studio.gen.phases").split("|");

  const applyFields = (f: PrepFields | undefined) => {
    setPrompt(f ? f.prompt.slice(0, PREP_PROMPT_MAX) : DEFAULT_PROMPT);
    setGenre(f && genres.includes(f.genre) ? f.genre : genres[0]);
    setMood(f && (moods as readonly string[]).includes(f.mood) ? f.mood : moods[0]);
    setVoice(f && voiceKeys.includes(f.voice) ? f.voice : voiceKeys[1]);
  };
  // The signed-in member took over an anonymous preparation, after confirming (never by itself).
  const recovered = (fields: PrepFields) => {
    touched.current = false;
    applyFields(fields);
    setResumed(true);
  };

  // Put the stored preparation back once the session is known. A member who has just signed in
  // through the Generate click takes over the anonymous preparation; nobody else can.
  useEffect(() => {
    if (status === "loading") return;
    const now = Date.now();
    purgeExpiredPreps(now);
    // Only the very first time: after that, an account change must never carry the previous
    // account's words into the next one's form or slot.
    if (touched.current && !restoredRef.current) {
      const kept = savePrep(owner, latest.current, { now });
      if (status === "signedOut" && kept) {
        setVisitorKept(true);
        rememberReturnTo(STUDIO_PATH);
      }
      touched.current = false;
      restoredRef.current = true;
      setRestored(true);
      return;
    }
    // Words typed as a visitor are never carried into a member's form by a change of session (another
    // tab signing in, a new account on a shared browser): they stay in the anonymous slot, where the
    // signed-in member is offered them, and only takes them over after a confirmation.
    touched.current = false;
    let stored = null;
    if (status === "signedIn" && userId) {
      stored = adoptAnonymousPrep(userId, now) ?? readPrep(memberOwner(userId), now);
    } else {
      stored = readPrep(ANON, now);
    }
    applyFields(stored?.fields);
    setResumed(Boolean(stored));
    setVisitorKept(status !== "signedIn" && Boolean(stored));
    restoredRef.current = true;
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId]);

  // Every change is kept at once, for the owner of the form (an account, or the visitor).
  const current: PrepFields = { prompt, genre, mood, voice };
  const change = (patch: Partial<PrepFields>) => {
    touched.current = true;
    // What the restoration may have to save must already hold this edit, before the next render.
    latest.current = { ...latest.current, ...patch };
    if (patch.prompt !== undefined) setPrompt(patch.prompt);
    if (patch.genre !== undefined) setGenre(patch.genre);
    if (patch.mood !== undefined) setMood(patch.mood);
    if (patch.voice !== undefined) setVoice(patch.voice);
    setResumed(false);
    if (restoredRef.current) {
      const kept = savePrep(owner, { ...current, ...patch });
      if (status === "signedOut") {
        setVisitorKept(kept);
        // A visitor who has started a preparation comes back to the studio after signing in or up, by
        // whatever door: the header, the sign-in page or Generate. Only the Generate click lets the
        // account take the words over by itself; the others are offered a confirmed recovery.
        if (kept) rememberReturnTo(STUDIO_PATH);
      }
    }
  };
  const clearPreparation = () => {
    clearPrep(owner);
    touched.current = false;
    setPrompt(DEFAULT_PROMPT);
    setGenre(genres[0]);
    setMood(moods[0]);
    setVoice(voiceKeys[1]);
    setResumed(false);
    setVisitorKept(false);
    toast.success(t("studio.gen.prepCleared"));
  };

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
    // Without an account nothing is sent: the preparation is kept, the way back is remembered, and
    // the visitor goes to sign in. Coming back never starts a generation by itself.
    if (status !== "signedIn") {
      if (status === "unconfigured") {
        toast.error(t("studio.gen.accountsOff"));
        return;
      }
      savePrep(ANON, current, { claim: true });
      rememberReturnTo(STUDIO_PATH);
      toast.message(t("studio.gen.signInFirst"));
      void navigate({ to: AUTH_PATHS.signIn, search: { redirect: STUDIO_PATH } });
      return;
    }
    if (!canAfford("track")) {
      toast.error(t("studio.gen.noCredits", { n: COSTS.track }));
      return;
    }
    savePrep(owner, current);
    setPaused(false);
    setPhase("generating");
    const startedFor = signedInAs.current;
    // An answer that comes back after the member signed out, or after another account signed in, is
    // dropped: nothing is shown or kept, and the LOCAL credit is not debited. The AI provider, however, has
    // ALREADY BILLED that request when it was made: an abandoned generation is not free (see
    // docs/member-auth/LOT-STUDIO-GENERER.md, section 13.4).
    const stale = () => signedInAs.current !== startedFor;

    try {
      const res = await aiFetch("/api/studio/generate", {
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
        const code = await aiErrorCode(res);
        if (res.status === 503 && code === "ai_paused") {
          // The pause is deliberate, not a failure: a calm notice next to the button instead of a red
          // toast. The form and the stored preparation are not touched, and the button is usable again.
          if (!stale()) setPaused(true);
          setPhase(result ? "done" : "idle");
          return;
        }
        let key = "studio.gen.errorGeneric";
        if (res.status === 402) key = "studio.gen.errorCredits";
        else if (res.status === 429) key = "studio.gen.errorRate";
        else if ([401, 503, 413].includes(res.status)) key = aiErrorKey(res.status, code);
        toast.error(t(key));
        setPhase(result ? "done" : "idle");
        if (res.status === 401) {
          // The session is gone: sign in again, the preparation is waiting under this account.
          rememberReturnTo(STUDIO_PATH);
          void navigate({ to: AUTH_PATHS.signIn, search: { redirect: STUDIO_PATH } });
        }
        return;
      }
      const lyrics = decodeLyrics(res.headers.get("X-Lyrics"));
      const vocalBlob = await res.blob();
      if (stale()) {
        setPhase("idle");
        return;
      }
      // Compose an original instrumental bed (drums/bass/pad, synthesized on
      // the fly — no samples, no API, no cost) and mix it under the vocal
      // performance. Falls back to the vocal-only take if mixing fails.
      const blob = await composeFinalTrack(vocalBlob, genre, mood);
      if (stale()) {
        setPhase("idle");
        return;
      }

      const id = `gen-${Date.now()}`;
      const title =
        clean
          .split(/[.,—-]/)[0]
          .trim()
          .slice(0, 42) || t("studio.gen.newTrack");
      const duration = "0:20";

      // Persist the draft (audio Blob + metadata) — provider owns the object URL. The wallet is
      // debited only once the track is kept; if the device cannot keep it, the track is still
      // playable and downloadable from this page, and the member is told it was not saved.
      let draftUrl: string;
      try {
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
        draftUrl = draft.url;
        spend("track");
      } catch (saveError) {
        if (saveError instanceof DraftDiscardedError || stale()) {
          setPhase("idle");
          return;
        }
        draftUrl = keepUrl(URL.createObjectURL(blob));
        toast.warning(t("studio.gen.notKept"));
      }
      if (stale()) {
        setPhase("idle");
        return;
      }

      const track: PlayableTrack = {
        id,
        title,
        artist: `${genre} · ${t(`studio.voices.${voice}`)}`,
        artistId: GEN_COVER,
        src: draftUrl,
        cover: artistImages[GEN_COVER],
        duration,
      };

      setResult({ track, lyrics, url: draftUrl });
      setPhase("done");
      play(track);
      toast.success(t("studio.gen.saved"));
    } catch (error) {
      if (error instanceof SignInRequiredError) {
        rememberReturnTo(STUDIO_PATH);
        toast.error(t("aiErrors.session"));
        setPhase(result ? "done" : "idle");
        void navigate({ to: AUTH_PATHS.signIn, search: { redirect: STUDIO_PATH } });
        return;
      }
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

      {resumed && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-secondary/30 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:gap-3"
        >
          <p className="flex min-w-0 flex-1 items-start gap-2">
            <History className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span className="min-w-0">{t("studio.gen.prepResumed")}</span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start sm:self-auto"
            onClick={clearPreparation}
          >
            <X className="h-4 w-4" aria-hidden="true" /> {t("studio.gen.prepClear")}
          </Button>
        </div>
      )}

      {status === "signedIn" && userId && restored && (
        <AnonymousPrepRecovery
          userId={userId}
          signedInAs={signedInAs}
          current={current}
          onRecovered={recovered}
        />
      )}

      <Field label={t("studio.prompt")}>
        <textarea
          rows={3}
          maxLength={PREP_PROMPT_MAX}
          value={prompt}
          onChange={(e) => change({ prompt: e.target.value })}
          className="w-full resize-none rounded-xl border border-input bg-secondary/30 p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("studio.genre")}>
          <Select
            value={genre}
            onChange={(value) => change({ genre: value })}
            options={genres.map((g) => ({ value: g, label: g }))}
          />
        </Field>
        <Field label={t("studio.mood")}>
          <Select
            value={mood}
            onChange={(value) => change({ mood: value })}
            options={moods.slice(0, 6).map((m) => ({ value: m, label: t(`moods.${m}`) }))}
          />
        </Field>
        <Field label={t("studio.voice")}>
          <Select
            value={voice}
            onChange={(value) => change({ voice: value })}
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
            onClick={() => change({ mood: m })}
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
        <Button
          variant="gold"
          onClick={generate}
          disabled={phase === "generating" || status === "loading"}
        >
          {phase === "generating" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {phase === "generating" ? t("studio.gen.generating") : t("studio.generate")}
        </Button>
        <Button variant="noir" disabled={phase === "generating"}>
          {t("studio.saveDraft")}
        </Button>
        {paused ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-gold/80">
            <span className="h-1.5 w-1.5 rounded-full bg-gold/60" />
            {t("studio.gen.pausedStatus")}
          </span>
        ) : (
          phase === "idle" &&
          !result && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gold/80">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-gold" />
              {t("studio.gen.ready")}
            </span>
          )
        )}
      </div>

      {paused && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-secondary/30 px-4 py-3 text-sm text-foreground"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
          <span className="min-w-0">{t("studio.gen.pausedNotice")}</span>
        </p>
      )}

      {visitorKept && status === "signedOut" && (
        <p
          data-testid="anon-limits"
          className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/70" aria-hidden="true" />
          {t("studio.gen.anonLimits")}
        </p>
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground/80">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/70" />
        {t("studio.rightsNotice")}
      </p>

      {/* GENERATING OVERLAY */}
      {phase === "generating" && (
        <div className="animate-fade-in rounded-2xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-noir-gradient p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-primary-foreground shadow-[0_10px_28px_-12px_var(--gold)]">
              <Music4 className="h-5 w-5 animate-pulse" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold text-foreground">
                {t("studio.gen.generating")}
              </p>
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
              loading="lazy"
              src={result.track.cover}
              alt={result.track.title}
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-semibold text-foreground">
                {result.track.title}
              </p>
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
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {result.lyrics}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="ghost-gold" size="sm" onClick={generate}>
              <RotateCcw className="h-4 w-4" /> {t("studio.gen.regenerate")}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={result.url} download={`${result.track.title}.wav`}>
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
