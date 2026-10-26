import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Sparkles, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaveBars } from "@/components/audio/WaveBars";
import { useI18n } from "@/i18n/context";
import { DICTATION_MAX_SECONDS, aiErrorCode, aiErrorKey } from "@/lib/ai-limits";
import { aiFetch, hasMemberSession, SignInRequiredError } from "@/lib/ai-fetch";
import { cn } from "@/lib/utils";

type Phase = "idle" | "recording" | "transcribing";

/**
 * Lightweight voice prompt: record from the mic, transcribe via Lovable AI,
 * and surface an editable transcript. No advanced audio editing. Transcription is for members: without
 * a session the microphone is not even opened, and nothing is sent.
 */
export function VoicePrompt({
  className,
  onTranscript,
}: {
  className?: string;
  onTranscript?: (text: string) => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [copied, setCopied] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (limitRef.current) {
      clearTimeout(limitRef.current);
      limitRef.current = null;
    }
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      stopTimer();
      releaseStream();
    },
    [],
  );

  const start = async () => {
    setError(null);
    setNotice(null);
    if (!(await hasMemberSession())) {
      setError(t("aiErrors.signIn"));
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t("voice.micDenied"));
      return;
    }
    const mimeType = ["audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
    if (!mimeType) {
      releaseStream();
      setError(t("voice.unsupported"));
      stream.getTracks().forEach((tr) => tr.stop());
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    recorder.onstop = () => transcribe(recorder.mimeType);
    recorder.start();
    setPhase("recording");
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    // The recording is kept and transcribed; it only ends here instead of at the user's click.
    limitRef.current = setTimeout(() => {
      setNotice(t("voice.maxDuration"));
      stop();
    }, DICTATION_MAX_SECONDS * 1000);
  };

  const stop = () => {
    stopTimer();
    recorderRef.current?.stop();
  };

  const transcribe = async (mimeType: string) => {
    releaseStream();
    const blob = new Blob(chunksRef.current, { type: mimeType });
    if (blob.size < 1024) {
      setPhase("idle");
      setError(t("voice.tooShort"));
      return;
    }
    setPhase("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "recording");
      const res = await aiFetch("/api/voice/transcribe", { method: "POST", body: form });
      if (!res.ok) throw new Error(t(aiErrorKey(res.status, await aiErrorCode(res))));
      const data = (await res.json()) as { text?: string };
      const text = (data.text ?? "").trim();
      setTranscript((prev) => (prev ? `${prev} ${text}` : text));
      onTranscript?.(text);
    } catch (e) {
      setError(
        e instanceof SignInRequiredError
          ? t("aiErrors.signIn")
          : e instanceof Error
            ? e.message
            : t("aiErrors.generic"),
      );
    } finally {
      setPhase("idle");
    }
  };

  const reset = () => {
    setTranscript("");
    setError(null);
    setNotice(null);
  };

  const copy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <section
      className={cn(
        "surface-premium relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="icon-tile h-10 w-10">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-foreground">{t("voice.promptTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("voice.promptDesc")}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {phase === "recording" ? (
          <Button type="button" variant="default" onClick={stop} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            <Square className="h-4 w-4 fill-current" /> {t("voice.stopRecording")}
          </Button>
        ) : (
          <Button type="button" variant="gold" onClick={start} disabled={phase === "transcribing"}>
            {phase === "transcribing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            {phase === "transcribing" ? t("voice.transcribing") : t("voice.record")}
          </Button>
        )}

        {phase === "recording" && (
          <span className="flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-background/60 px-3 py-1.5 text-sm text-foreground">
            <WaveBars active className="h-3" />
            <span className="tabular-nums text-muted-foreground">{mmss}</span>
          </span>
        )}

        {transcript && phase === "idle" && (
          <>
            <Button type="button" variant="ghost-gold" size="sm" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("voice.copied") : t("voice.copy")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              <Trash2 className="h-4 w-4" /> {t("voice.clear")}
            </Button>
          </>
        )}
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
          {t("voice.transcriptLabel")}
        </label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={t("voice.transcriptPlaceholder")}
          rows={4}
          className="w-full resize-none rounded-xl border border-border bg-background/60 p-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
        />
      </div>

      {notice && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
