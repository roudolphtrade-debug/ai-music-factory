import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/context";
import { aiFetch } from "@/lib/ai-fetch";
import { useI18n } from "@/i18n/context";
import { PRIVATE_PILOT_COPY, reviewReasonKey } from "@/music/private-demo-copy";
import { Button } from "@/components/ui/button";

const ENDPOINT = "/api/studio/lyria-private";
/** How often a running attempt is checked. The song is made by the server, whether this tab stays open or not. */
export const PILOT_POLL_MS = 4000;
const lastJobKey = (memberId: string) => `aimf-lyria-pilot:last:${memberId}`;

interface PilotSummary {
  enabled: boolean;
  provider?: "lyria-3.5" | "mock";
  usedAttempts: number;
  maxAttempts: number;
  frozen: boolean;
  reviewRequired: boolean;
  activeId: string | null;
}
type JobState = "reserved" | "queued" | "running" | "stored" | "needs_review" | "reviewed" | "halted";
interface JobView {
  id: string;
  state: JobState;
  reviewReason: string | null;
}
const WAITING: readonly JobState[] = ["reserved", "queued", "running"];

function readLastJob(memberId: string): string | null {
  try {
    return localStorage.getItem(lastJobKey(memberId));
  } catch {
    return null;
  }
}
function rememberJob(memberId: string, id: string) {
  try {
    localStorage.setItem(lastJobKey(memberId), id);
  } catch {
    /* the server keeps the attempt anyway */
  }
}

/** The server streams the song while hashing it; the browser checks the whole file once more before playing it. */
async function matchesReprDigest(bytes: ArrayBuffer, header: string | null): Promise<boolean> {
  const expected = header ? /sha-256=:([A-Za-z0-9+/]+=*):/.exec(header)?.[1] : undefined;
  if (!expected) return false;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return btoa(String.fromCharCode(...digest)) === expected;
}

/** Default-hidden: only the server-verified owner status reveals the UI. */
export function PrivateLyriaPilot() {
  const { lang } = useI18n();
  const copy = PRIVATE_PILOT_COPY[lang];
  const { status, user } = useAuth();
  const memberId = status === "signedIn" ? (user?.id ?? null) : null;
  const currentMember = useRef(memberId);
  currentMember.current = memberId;

  const [access, setAccess] = useState<PilotSummary | null>(null);
  const [job, setJob] = useState<JobView | null>(null);
  const [lyricsText, setLyricsText] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("Afrobeats");
  const [mood, setMood] = useState("uplifting");
  const [language, setLanguage] = useState("French");
  const [voice, setVoice] = useState("female sung voice");
  const [lyrics, setLyrics] = useState("");

  const refreshSummary = useCallback(async (forMember: string) => {
    const response = await aiFetch(ENDPOINT, { method: "GET", cache: "no-store" }).catch(() => null);
    if (!response?.ok || currentMember.current !== forMember) return null;
    const data = (await response.json().catch(() => null)) as PilotSummary | null;
    const valid =
      data?.enabled === true && Number.isInteger(data.usedAttempts) && Number.isInteger(data.maxAttempts) ? data : null;
    setAccess(valid);
    return valid;
  }, []);

  const loadJob = useCallback(async (forMember: string, id: string) => {
    const response = await aiFetch(`${ENDPOINT}?job=${encodeURIComponent(id)}`, { method: "GET", cache: "no-store" }).catch(
      () => null,
    );
    if (!response || currentMember.current !== forMember) return;
    if (!response.ok) return; // unknown or refused: nothing to show
    const data = (await response.json().catch(() => null)) as { job?: JobView; lyrics?: string | null } | null;
    if (!data?.job || currentMember.current !== forMember) return;
    setJob(data.job);
    setLyricsText(typeof data.lyrics === "string" ? data.lyrics : null);
  }, []);

  // Owner status, then the attempt in progress (or the last one), even after this tab was closed and reopened.
  useEffect(() => {
    setAccess(null);
    setJob(null);
    setLyricsText(null);
    setError(null);
    setPending(false);
    if (!memberId) return;
    void refreshSummary(memberId).then((summary) => {
      const id = summary?.activeId ?? readLastJob(memberId);
      if (summary && id) void loadJob(memberId, id);
    });
  }, [memberId, refreshSummary, loadJob]);

  // While the server works on it, the attempt is checked again. Nothing here can start a new paid call.
  useEffect(() => {
    if (!memberId || !job || !WAITING.includes(job.state)) return;
    const timer = setInterval(() => void loadJob(memberId, job.id), PILOT_POLL_MS);
    return () => clearInterval(timer);
  }, [memberId, job, loadJob]);

  // A stored song is read back from the private store (owner session), never from a public address.
  useEffect(() => {
    if (!memberId || job?.state !== "stored") return;
    let url: string | null = null;
    let live = true;
    setAudioFailed(false);
    void aiFetch(`${ENDPOINT}?job=${encodeURIComponent(job.id)}&audio=1`, { method: "GET", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("audio refused");
        const bytes = await r.arrayBuffer(); // rejects when the server failed the stream on an integrity error
        if (!(await matchesReprDigest(bytes, r.headers.get("repr-digest")))) throw new Error("digest mismatch");
        return new Blob([bytes], { type: "audio/mpeg" });
      })
      .then((blob) => {
        if (!live || currentMember.current !== memberId) return;
        url = URL.createObjectURL(blob);
        setAudioUrl(url);
      })
      .catch(() => {
        if (live && currentMember.current === memberId) setAudioFailed(true);
      });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
      setAudioUrl(null);
    };
  }, [memberId, job?.id, job?.state]);

  if (!memberId || !access) return null;
  const waiting = job !== null && WAITING.includes(job.state);
  const blocked =
    waiting || access.frozen || access.reviewRequired || access.usedAttempts >= access.maxAttempts;

  const onGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || blocked || !prompt.trim()) return;
    const startedFor = memberId;
    const requestId = crypto.randomUUID();
    rememberJob(startedFor, requestId); // kept before sending: a closed tab can still find this attempt
    setPending(true);
    setError(null);
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
      if (response.status === 202 || response.status === 200) {
        const data = (await response.json()) as { job: JobView };
        setJob(data.job);
      } else {
        setError(response.status === 423 ? copy.reviewRequired : copy.blocked);
      }
    } catch {
      // The attempt may exist on the server: it is looked up with the same id, never sent again by itself.
      if (currentMember.current === startedFor) {
        setError(copy.failed);
        void loadJob(startedFor, requestId);
      }
    } finally {
      if (currentMember.current === startedFor) {
        setPending(false);
        void refreshSummary(startedFor);
      }
    }
  };

  const stateText: Record<JobState, string> = {
    reserved: copy.statusQueued,
    queued: copy.statusQueued,
    running: copy.statusRunning,
    stored: copy.statusStored,
    needs_review: copy.statusNeedsReview,
    reviewed: copy.statusReviewed,
    halted: copy.statusHalted,
  };
  const reasonKey = job?.state === "needs_review" ? reviewReasonKey(job.reviewReason) : null;
  const isMock = access.provider === "mock";

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
        <strong>
          {copy.quota} : {access.usedAttempts} / {access.maxAttempts}
        </strong>
        <p className="mt-1 text-xs text-neutral-400">{copy.warning}</p>
        {access.reviewRequired && <p className="mt-1 text-xs text-amber-300">{copy.reviewRequired}</p>}
        {isMock && (
          <p className="mt-1 text-xs font-semibold text-sky-300" data-testid="pilot-mock">
            {copy.mockProvider}
          </p>
        )}
      </div>

      <form className="space-y-4" onSubmit={(event) => void onGenerate(event)}>
        <label className="block text-sm font-medium" htmlFor="aimf-lyria-prompt">
          {copy.prompt}
        </label>
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
          {(
            [
              [copy.genre, genre, setGenre, "aimf-lyria-genre"],
              [copy.mood, mood, setMood, "aimf-lyria-mood"],
              [copy.language, language, setLanguage, "aimf-lyria-language"],
              [copy.voice, voice, setVoice, "aimf-lyria-voice"],
            ] as const
          ).map(([label, value, setter, id]) => (
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
          <span>
            {copy.lyrics} ({copy.optional})
          </span>
          <textarea
            id="aimf-lyria-lyrics"
            rows={4}
            maxLength={5000}
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white focus-visible:outline-2 focus-visible:outline-amber-400"
          />
        </label>
        <Button variant="gold" type="submit" size="lg" disabled={pending || blocked || !prompt.trim()}>
          {pending || waiting ? copy.generating : copy.submit}
        </Button>
        <p className="text-xs text-neutral-400">{copy.spokenNotGuaranteed}</p>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-amber-300">
          {error}
        </p>
      )}

      {job && (
        <div className="mt-6 space-y-3 border-t border-amber-300/20 pt-5" data-testid="pilot-job">
          <p role="status" className="text-sm text-neutral-200">
            {stateText[job.state]}
          </p>
          {reasonKey && <p className="text-sm text-amber-300">{copy.reviewReasons[reasonKey]}</p>}
          {job.state === "stored" && audioFailed && (
            <p role="alert" className="text-sm text-amber-300">
              {copy.audioUnavailable}
            </p>
          )}
          {(waiting || error) && (
            <Button type="button" variant="ghost-gold" size="sm" onClick={() => memberId && void loadJob(memberId, job.id)}>
              {copy.refresh}
            </Button>
          )}
          {job.state === "stored" && audioUrl && (
            <>
              <h3 className="font-semibold">
                {copy.result} · {isMock ? "mock" : "lyria-3.5"}
              </h3>
              <audio aria-label={copy.result} src={audioUrl} controls className="w-full" />
              <a
                href={audioUrl}
                download={"aimf-lyria-" + job.id + ".mp3"}
                className="inline-flex rounded-lg border border-amber-400/40 px-3 py-2 text-sm text-amber-200"
              >
                {copy.download}
              </a>
              {lyricsText && (
                <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-900 p-4 text-sm text-neutral-200" dir="auto">
                  {lyricsText}
                </pre>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
