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
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlayButton } from "@/components/audio/PlayButton";
import { LikeButton } from "@/components/premium/LikeButton";
import { AnonymousPrepRecovery } from "@/components/premium/AnonymousPrepRecovery";
import { Equalizer } from "@/components/premium/Equalizer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { STUDIO_PROMPT_ID } from "@/components/premium/StudioActions";
import { audioExtension } from "@/audio/format";
import { usePlayer } from "@/audio/PlayerProvider";
import type { PlayableTrack } from "@/audio/tracks";
import { DraftDiscardedError, useGeneratedDrafts } from "@/library/draftsContext";
import { useCredits } from "@/library/CreditsProvider";
import { COSTS } from "@/library/credits";
import { artistImages, moods, type ArtistId } from "@/data/mock";
import { composeFinalTrack } from "@/audio/mixTrack";
import { useI18n } from "@/i18n/context";
import { RTL_LANGS } from "@/i18n/translations";
import { aiErrorCode, aiErrorKey } from "@/lib/ai-limits";
import { aiFetch, SignInRequiredError } from "@/lib/ai-fetch";
import { useAuth } from "@/auth/context";
import { AUTH_PATHS } from "@/auth/redirects";
import { rememberReturnTo } from "@/auth/returnTo";
import { STUDIO_GENRES, STUDIO_VOICES, examplePromptFor, isExamplePrompt } from "@/studio/options";
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

const genres = STUDIO_GENRES;
const voiceKeys = STUDIO_VOICES;
const GEN_COVER: ArtistId = "art-1";
const STUDIO_PATH = "/studio";

type Phase = "idle" | "generating" | "done";

interface GenResult {
  track: PlayableTrack;
  lyrics: string;
  url: string;
  ext: "wav" | "mp3";
  /** Who made it. It is shown to that account only, and only while that account is the one signed in. */
  ownerKey: string;
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
  const { t, lang } = useI18n();
  const { play } = usePlayer();
  const { addDraft, keepUrl } = useGeneratedDrafts();
  const { canAfford, spend } = useCredits();
  const { status, user } = useAuth();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState(() => examplePromptFor(lang));
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
  // Whose form this is: nobody while the session is being looked up, then the account, or the visitor.
  const ownerKey =
    status === "loading" ? null : status === "signedIn" && userId ? `u:${userId}` : "anon";
  // The form shows its values only once the preparation of THIS owner has been put back. Until then (the
  // session lookup at a reload, or the moment an account takes over) it is hidden and cannot be edited,
  // so that the defaults, or the previous account's words, are never on screen, and nothing typed in the
  // gap can overwrite what was stored.
  const [restoredFor, setRestoredFor] = useState<string | null>(null);
  const restored = ownerKey !== null && restoredFor === ownerKey;
  const restoring = !restored;
  // The same fact, readable at once: between the end of the restoration and the next render, an edit must
  // already be saved (a fast typist, or a test), not wait for a render that will not repeat it.
  const restoredRef = useRef(false);
  restoredRef.current = restoredRef.current && restored;
  const [resumed, setResumed] = useState(false);
  // A visitor's preparation is stored on this device: said plainly, with its limits, next to the form.
  const [visitorKept, setVisitorKept] = useState(false);
  // Whether the preparation is stored on this device right now, and whether the last attempt to store it
  // was refused (blocked or full storage). A refused save is never presented as kept.
  const [keptHere, setKeptHere] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // What was changed before the preparation was back (only possible without the interface, or at the very
  // instant of the restoration): those fields win over the stored ones, the others are kept as stored.
  const typed = useRef<Partial<PrepFields>>({});
  const latest = useRef<PrepFields>({ prompt, genre, mood, voice });
  latest.current = { prompt, genre, mood, voice };
  const [askingClear, setAskingClear] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GenResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  // True once the server has answered "paused" to the last click. It is only a notice: the form, the
  // preparation and the button are untouched, and nothing is retried.
  const [paused, setPaused] = useState(false);

  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseLabels = t("studio.gen.phases").split("|");

  // The example prompt is shown in the language of the interface. A stored one that is still the
  // untouched example (written in another language) follows the interface too; the member's own words
  // never change.
  const applyFields = (f: PrepFields | undefined) => {
    const next: PrepFields = {
      prompt:
        f && !isExamplePrompt(f.prompt) ? f.prompt.slice(0, PREP_PROMPT_MAX) : examplePromptFor(lang),
      genre: f && genres.includes(f.genre) ? f.genre : genres[0],
      mood: f && (moods as readonly string[]).includes(f.mood) ? f.mood : moods[0],
      voice: f && voiceKeys.includes(f.voice) ? f.voice : voiceKeys[1],
    };
    // readable at once, before the next render
    latest.current = next;
    setPrompt(next.prompt);
    setGenre(next.genre);
    setMood(next.mood);
    setVoice(next.voice);
  };
  // The signed-in member took over an anonymous preparation, after confirming (never by itself).
  const recovered = (fields: PrepFields) => {
    typed.current = {};
    applyFields(fields);
    setResumed(true);
    setKeptHere(true);
    setSaveFailed(false);
  };

  // Put the stored preparation back once the session is known, for each new owner of the form. A member
  // who has just signed in through the Generate click takes over the anonymous preparation; nobody else can.
  useEffect(() => {
    if (ownerKey === null) return;
    const now = Date.now();
    purgeExpiredPreps(now);
    const mine = typed.current;
    const edited = Object.keys(mine).length > 0;
    // Words typed as a visitor are never carried into a member's form by a change of session (another
    // tab signing in, a new account on a shared browser): they stay in the anonymous slot, where the
    // signed-in member is offered them, and only takes them over after a confirmation. A member who edited
    // before the session answered keeps those edits, and does not take over a claimed preparation.
    let stored = null;
    if (status === "signedIn" && userId) {
      stored = edited
        ? readPrep(memberOwner(userId), now)
        : (adoptAnonymousPrep(userId, now) ?? readPrep(memberOwner(userId), now));
    } else {
      stored = readPrep(ANON, now);
    }
    let fields: PrepFields | undefined = stored?.fields;
    let kept = Boolean(stored);
    if (edited) {
      // Only the fields that were edited replace the stored ones: one click does not wipe the rest.
      const base: PrepFields = fields ?? {
        prompt: examplePromptFor(lang),
        genre: genres[0],
        mood: moods[0],
        voice: voiceKeys[1],
      };
      fields = { ...base, ...mine };
      kept = savePrep(owner, fields, { now });
      if (status === "signedOut" && kept) rememberReturnTo(STUDIO_PATH);
    }
    typed.current = {};
    applyFields(fields);
    setResumed(Boolean(stored) && !edited);
    setVisitorKept(status !== "signedIn" && kept);
    setKeptHere(kept);
    setSaveFailed(edited && !kept);
    setPaused(false);
    restoredRef.current = true;
    setRestoredFor(ownerKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey]);

  // A result belongs to the account that made it. When the account changes, or the session ends, it goes.
  useEffect(() => {
    setResult((r) => (r && r.ownerKey !== ownerKey ? null : r));
    setPhase((p) => (p === "done" ? "idle" : p));
    setAskingClear(null);
  }, [ownerKey]);
  const shown = result && result.ownerKey === ownerKey ? result : null;

  // Changing the interface language changes the example prompt with it, as long as it is still the
  // example. Nothing is saved: the example is not a preparation.
  useEffect(() => {
    if (isExamplePrompt(latest.current.prompt)) {
      latest.current = { ...latest.current, prompt: examplePromptFor(lang) };
    }
    setPrompt((p) => (isExamplePrompt(p) ? examplePromptFor(lang) : p));
  }, [lang]);

  // Every change is kept at once, for the owner of the form (an account, or the visitor).
  const current: PrepFields = { prompt, genre, mood, voice };
  const change = (patch: Partial<PrepFields>) => {
    // Before the preparation is back, the edit is remembered apart: it will win over the stored field
    // alone, never over the rest.
    if (!restoredRef.current) typed.current = { ...typed.current, ...patch };
    // What the restoration may have to save must already hold this edit, before the next render.
    latest.current = { ...latest.current, ...patch };
    if (patch.prompt !== undefined) setPrompt(patch.prompt);
    if (patch.genre !== undefined) setGenre(patch.genre);
    if (patch.mood !== undefined) setMood(patch.mood);
    if (patch.voice !== undefined) setVoice(patch.voice);
    setResumed(false);
    if (restoredRef.current) {
      const kept = savePrep(owner, latest.current);
      setKeptHere(kept);
      setSaveFailed(!kept);
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
    typed.current = {};
    applyFields(undefined);
    setResumed(false);
    setVisitorKept(false);
    setKeptHere(false);
    setSaveFailed(false);
    toast.success(t("studio.gen.prepCleared"));
  };
  // "Save draft": writes exactly what is in the form to this device, and says what happened.
  const saveNow = () => {
    if (restoring) return;
    const kept = savePrep(owner, latest.current);
    setKeptHere(kept);
    setSaveFailed(!kept);
    if (!kept) {
      toast.error(t("studio.gen.saveFailed"));
      return;
    }
    if (status === "signedOut") {
      setVisitorKept(true);
      rememberReturnTo(STUDIO_PATH);
    }
    toast.success(t("studio.gen.prepSaved"));
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
    if (restoring) return;
    const clean = prompt.trim();
    if (!clean) {
      toast.error(t("studio.gen.emptyPrompt"));
      return;
    }
    // Without an account nothing is sent: the preparation is kept, the way back is remembered, and
    // the visitor goes to sign in. Coming back never starts a generation by itself.
    if (status !== "signedIn") {
      if (status === "unconfigured") {
        toast.error(t(saveFailed ? "studio.gen.accountsOffUnsaved" : "studio.gen.accountsOff"));
        return;
      }
      const kept = savePrep(ANON, current, { claim: true });
      setKeptHere(kept);
      setSaveFailed(!kept);
      rememberReturnTo(STUDIO_PATH);
      toast.message(t(kept ? "studio.gen.signInFirst" : "studio.gen.signInFirstUnsaved"));
      void navigate({ to: AUTH_PATHS.signIn, search: { redirect: STUDIO_PATH } });
      return;
    }
    if (!canAfford("track")) {
      toast.error(t("studio.gen.noCredits", { n: COSTS.track }));
      return;
    }
    const keptNow = savePrep(owner, current);
    setKeptHere(keptNow);
    setSaveFailed(!keptNow);
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
          setPhase(shown ? "done" : "idle");
          return;
        }
        let key = "studio.gen.errorGeneric";
        if (res.status === 402) key = "studio.gen.errorCredits";
        else if (res.status === 429) key = "studio.gen.errorRate";
        else if ([401, 503, 413].includes(res.status)) key = aiErrorKey(res.status, code);
        toast.error(t(key));
        setPhase(shown ? "done" : "idle");
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

      setResult({ track, lyrics, url: draftUrl, ext: audioExtension(blob.type), ownerKey: `u:${startedFor}` });
      setPhase("done");
      play(track);
      toast.success(t("studio.gen.saved"));
    } catch (error) {
      if (error instanceof SignInRequiredError) {
        rememberReturnTo(STUDIO_PATH);
        toast.error(t("aiErrors.session"));
        setPhase(shown ? "done" : "idle");
        void navigate({ to: AUTH_PATHS.signIn, search: { redirect: STUDIO_PATH } });
        return;
      }
      toast.error(t("studio.gen.errorGeneric"));
      setPhase(shown ? "done" : "idle");
    }
  };

  return (
    <div
      data-testid="studio-composer"
      aria-busy={restoring}
      className="relative space-y-5 overflow-hidden rounded-2xl border border-border bg-card p-6"
    >
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
            onClick={() => setAskingClear(ownerKey)}
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
          id={STUDIO_PROMPT_ID}
          rows={3}
          maxLength={PREP_PROMPT_MAX}
          value={prompt}
          disabled={restoring}
          onChange={(e) => change({ prompt: e.target.value })}
          className={
            "w-full resize-none rounded-xl border border-input bg-secondary/30 p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)] " +
            (restoring ? "text-transparent motion-safe:animate-pulse" : "text-foreground")
          }
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("studio.genre")}>
          <Select
            restoring={restoring}
            value={genre}
            onChange={(value) => change({ genre: value })}
            options={genres.map((g) => ({ value: g, label: g }))}
          />
        </Field>
        <Field label={t("studio.mood")}>
          <Select
            restoring={restoring}
            value={mood}
            onChange={(value) => change({ mood: value })}
            options={moods.map((m) => ({ value: m, label: t(`moods.${m}`) }))}
          />
        </Field>
        <Field label={t("studio.voice")}>
          <Select
            restoring={restoring}
            value={voice}
            onChange={(value) => change({ voice: value })}
            options={voiceKeys.map((v) => ({ value: v, label: t(`studio.voices.${v}`) }))}
          />
        </Field>
      </div>

      <div role="group" aria-labelledby="quick-moods-label" className="flex flex-wrap items-center gap-2">
        <span id="quick-moods-label" className="text-xs text-muted-foreground">
          {t("studio.quickMoods")}
        </span>
        {moods.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={!restoring && mood === m}
            disabled={restoring}
            onClick={() => change({ mood: m })}
            className={
              "min-h-8 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-60 " +
              (!restoring && mood === m
                ? "border-[color-mix(in_oklab,var(--gold)_60%,transparent)] bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] font-medium text-gold"
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
          disabled={phase === "generating" || restoring}
        >
          {phase === "generating" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {phase === "generating" ? t("studio.gen.generating") : t("studio.generate")}
        </Button>
        <Button
          type="button"
          variant="noir"
          onClick={saveNow}
          disabled={phase === "generating" || restoring}
        >
          {t("studio.saveDraft")}
        </Button>
        {paused ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-gold/80">
            <span className="h-1.5 w-1.5 rounded-full bg-gold/60" />
            {t("studio.gen.pausedStatus")}
          </span>
        ) : (
          phase === "idle" &&
          !shown && (
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
          <span className="min-w-0">
            {t(saveFailed ? "studio.gen.pausedNoticeUnsaved" : "studio.gen.pausedNotice")}
          </span>
        </p>
      )}

      {saveFailed && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-secondary/30 px-4 py-3 text-sm text-foreground"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
          <span className="min-w-0">{t("studio.gen.saveFailed")}</span>
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

      {keptHere && !saveFailed && (
        <p
          data-testid="prep-expiry"
          className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
        >
          <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/70" aria-hidden="true" />
          {t("studio.gen.prepExpiry")}
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
      {phase === "done" && shown && (
        <div className="animate-scale-in rounded-2xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-noir-gradient p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="eyebrow text-gold">{t("studio.gen.resultTitle")}</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <img
              loading="lazy"
              src={shown.track.cover}
              alt={shown.track.title}
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-semibold text-foreground">
                {shown.track.title}
              </p>
              <p className="truncate text-sm text-muted-foreground">{shown.track.artist}</p>
            </div>
            <PlayButton track={shown.track} size="md" />
            <LikeButton trackId={shown.track.id} size="sm" />
          </div>

          {shown.lyrics && (
            <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                {t("studio.gen.lyricsLabel")}
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {shown.lyrics}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="ghost-gold" size="sm" onClick={generate}>
              <RotateCcw className="h-4 w-4" /> {t("studio.gen.regenerate")}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={shown.url} download={`${shown.track.title}.${shown.ext}`}>
                <Download className="h-4 w-4" /> {t("studio.gen.download")}
              </a>
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={askingClear !== null && askingClear === ownerKey}
        onOpenChange={(open) => !open && setAskingClear(null)}
      >
        <AlertDialogContent dir={RTL_LANGS.includes(lang) ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("studio.gen.prepClearTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("studio.gen.prepClearWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("studio.gen.dialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                // only for the owner who was asked: an account that took over in the meantime closes it
                if (askingClear === ownerKey) clearPreparation();
                setAskingClear(null);
              }}
            >
              {t("studio.gen.prepClearConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  restoring,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  /** The preparation is not back yet: the value is hidden and cannot be changed. */
  restoring: boolean;
}) {
  return (
    <select
      value={value}
      disabled={restoring}
      onChange={(e) => onChange(e.target.value)}
      className={
        "h-10 w-full rounded-xl border border-input bg-secondary/30 px-3 text-sm outline-none transition-colors focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)] " +
        (restoring ? "text-transparent motion-safe:animate-pulse" : "text-foreground")
      }
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-card">
          {o.label}
        </option>
      ))}
    </select>
  );
}
