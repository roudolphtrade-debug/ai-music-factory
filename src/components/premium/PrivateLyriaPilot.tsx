import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/context";
import { aiFetch } from "@/lib/ai-fetch";
import { useI18n } from "@/i18n/context";
import { PRIVATE_PILOT_COPY } from "@/music/private-demo-copy";
import { Button } from "@/components/ui/button";

const ENDPOINT = "/api/studio/lyria-private";
const VISIBLE_IN_THIS_BUILD = import.meta.env.VITE_PRIVATE_LYRIA_PILOT_UI === "1";

interface PilotStatus {
  enabled: boolean;
  usedCalls: number;
  maxCalls: number;
  busy: boolean;
}
interface PilotSongResponse {
  generationId: string;
  model: string;
  lyrics: string | null;
  audioMimeType: string;
  audioBase64: string;
  estimatedCostUsd: number;
  pilotCallsUsed: number;
}

interface SongResult {
  url: string;
  lyrics: string | null;
  model: string;
  generationId: string;
}

/** Default-hidden shell: no extra auth requests and no UI unless explicitly enabled at build time. */
export function PrivateLyriaPilot() {
  return VISIBLE_IN_THIS_BUILD ? <EnabledPrivateLyriaPilot /> : null;
}

function EnabledPrivateLyriaPilot() {
  const { lang } = useI18n();
  const copy = PRIVATE_PILOT_COPY[lang];
  const { status, user } = useAuth();
  const memberId = status === "signedIn" ? (user?.id ?? null) : null;
  const currentMember = useRef(memberId);
  currentMember.current = memberId;

  const [access, setAccess] = useState<PilotStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("Afrobeats");
  const [mood, setMood] = useState("uplifting");
  const [language, setLanguage] = useState("French");
  const [voice, setVoice] = useState("female sung voice");
  const [lyrics, setLyrics] = useState("");
  const [result, setResult] = useState<SongResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAccess(null);
    setResult(null);
    setError(null);
    setPending(false);
    if (!memberId) return;
    void aiFetch(ENDPOINT, { method: "GET", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json() as PilotStatus;
        return data.enabled === true &&
          Number.isInteger(data.usedCalls) &&
          Number.isInteger(data.maxCalls) &&
          typeof data.busy === "boolean" ? data : null;
      })
      .then((data) => {
        if (!cancelled && currentMember.current === memberId) setAccess(data);
      })
      .catch(() => {
        if (!cancelled) setAccess(null);
      });
    return () => { cancelled = true; };
  }, [memberId]);

  useEffect(() => () => {
    if (result?.url) URL.revokeObjectURL(result.url);
  }, [result?.url]);

  // No visual affordance for nonowners. Server authorization is authoritative regardless of this check.
  if (!memberId || !access) return null;
  const exhausted = access.busy || access.usedCalls >= access.maxCalls;

  const onGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || exhausted || !prompt.trim()) return;
    const startedFor = currentMember.current;
    setPending(true);
    setError(null);
    setResult(null);
    const requestId = crypto.randomUUID();
    try {
      const response = await aiFetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        cache: "no-store",
        body: JSON.stringify({
          prompt: prompt.trim(),
          genre: genre.trim(),
          mood: mood.trim(),
          language: language.trim(),
          vocalPreference: voice.trim(),
          lyrics: lyrics.trim() || undefined,
        }),
      });
      if (currentMember.current !== startedFor) return;
      if (!response.ok) {
        setError(response.status === 409 || response.status === 402 || response.status === 503 ? copy.blocked : copy.failed);
        // A failed or ambiguous request might be billed: never auto-retry.
        setAccess((prev) => prev ? { ...prev, busy: true } : prev);
        return;
      }
      const data = await response.json() as PilotSongResponse;
      if (
        data.model !== "lyria-3.5" ||
        data.audioMimeType !== "audio/mpeg" ||
        typeof data.audioBase64 !== "string" ||
        data.audioBase64.length === 0 ||
        data.audioBase64.length > 24 * 1024 * 1024 ||
        !Number.isInteger(data.pilotCallsUsed)
      ) {
        setError(copy.failed);
        setAccess((prev) => prev ? { ...prev, busy: true } : prev);
        return;
      }
      const bytes = Uint8Array.from(atob(data.audioBase64), (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
      if (currentMember.current !== startedFor) {
        URL.revokeObjectURL(url);
        return;
      }
      setResult({
        url,
        lyrics: typeof data.lyrics === "string" ? data.lyrics : null,
        model: data.model,
        generationId: data.generationId,
      });
      setAccess((prev) => prev ? { ...prev, usedCalls: data.pilotCallsUsed, busy: false } : prev);
    } catch {
      if (currentMember.current === startedFor) {
        setError(copy.failed);
        setAccess((prev) => prev ? { ...prev, busy: true } : prev);
      }
    } finally {
      if (currentMember.current === startedFor) setPending(false);
    }
  };

  return (
    <section
      aria-label={copy.title}
      className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-neutral-950 via-neutral-950 to-amber-950/20 p-5 text-white shadow-xl md:p-7"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-bold tracking-[0.18em] text-amber-300">{copy.eyebrow}</p>
          <h2 className="font-serif text-2xl font-medium md:text-3xl">{copy.title}</h2>
          <p className="max-w-2xl text-sm text-neutral-300">{copy.description}</p>
        </div>
        <span className="rounded-full border border-amber-300/40 px-3 py-1 text-xs text-amber-200">{copy.ownerOnly}</span>
      </div>

      <div className="mb-4 rounded-lg border border-amber-500/20 bg-black/40 p-3 text-sm text-neutral-200">
        <strong>{copy.quota} : {access.usedCalls} / {access.maxCalls}</strong>
        <p className="mt-1 text-xs text-neutral-400">{copy.warning}</p>
      </div>

      <form className="space-y-4" onSubmit={(event) => { void onGenerate(event); }}>
        <label className="block text-sm font-medium" htmlFor="aimf-lyria-prompt">{copy.prompt}</label>
        <textarea
          id="aimf-lyria-prompt"
          required
          maxLength={1200}
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={copy.promptPlaceholder}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-sm text-white placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-amber-400"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([
            [copy.genre, genre, setGenre, "aimf-lyria-genre"],
            [copy.mood, mood, setMood, "aimf-lyria-mood"],
            [copy.language, language, setLanguage, "aimf-lyria-language"],
            [copy.voice, voice, setVoice, "aimf-lyria-voice"],
          ] as const).map(([label, value, setter, id]) => (
            <label className="block space-y-1 text-sm" htmlFor={id} key={id}>
              <span>{label}</span>
              <input
                id={id}
                type="text"
                maxLength={80}
                value={value}
                onChange={(event) => setter(event.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-2 text-white focus-visible:outline-2 focus-visible:outline-amber-400"
              />
            </label>
          ))}
        </div>
        <label className="block space-y-1 text-sm" htmlFor="aimf-lyria-lyrics">
          <span>{copy.lyrics} ({copy.optional})</span>
          <textarea
            id="aimf-lyria-lyrics"
            rows={4}
            maxLength={5000}
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white focus-visible:outline-2 focus-visible:outline-amber-400"
          />
        </label>
        <Button variant="gold" type="submit" size="lg" disabled={pending || exhausted || !prompt.trim()}>
          {pending ? copy.generating : copy.submit}
        </Button>
        <p className="text-xs text-neutral-400">{copy.spokenNotGuaranteed}</p>
      </form>

      {error && <p role="alert" className="mt-4 text-sm text-amber-300">{error}</p>}
      {result && (
        <div className="mt-6 space-y-3 border-t border-amber-300/20 pt-5">
          <h3 className="font-semibold">{copy.result} · {result.model}</h3>
          <audio aria-label={copy.result} src={result.url} controls className="w-full"/>
          <a
            href={result.url}
            download={"aimf-lyria-" + result.generationId + ".mp3"}
            className="inline-flex rounded-lg border border-amber-400/40 px-3 py-2 text-sm text-amber-200"
          >
            {copy.download}
          </a>
          {result.lyrics && (
            <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-900 p-4 text-sm text-neutral-200" dir="auto">{result.lyrics}</pre>
          )}
        </div>
      )}
    </section>
  );
}
