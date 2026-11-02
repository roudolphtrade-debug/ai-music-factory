/**
 * Private owner-only Lyria pilot endpoint, deliberately NOT exposed through the ordinary Studio
 * generation route. OFF unless an operator configures ALL secrets, an isolated D1 database, and
 * an explicit enable flag. The existing Studio/TTS route remains paused.
 *
 * This is staged code only: deployment/activation and any paid call require separate owner GO.
 */
import { readJsonLimited, textField } from "@/lib/api-guard";
import { memberAuthConfig, verifyMemberSession, type MemberCheck } from "@/lib/member-guard";
import { buildLyriaPrompt, generateLyriaSong, LyriaGenerationError, type LyriaSong, type LyriaSongRequest } from "./lyria35";
import {
  PrivateDemoBudgetError,
  completeOwnerDemoCall,
  isOwner,
  reserveOwnerDemoCall,
  type BudgetDatabase,
} from "./private-demo-budget";

export interface PrivateLyriaBindings {
  AIMF_PRIVATE_LYRIA_ENABLED?: string;
  AIMF_PRIVATE_LYRIA_OWNER_ID?: string;
  AIMF_PRIVATE_LYRIA_DB?: BudgetDatabase;
  GEMINI_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

export interface PrivateLyriaDependencies {
  verify?: (request: Request) => Promise<MemberCheck>;
  generate?: (request: LyriaSongRequest, options: { apiKey: string }) => Promise<LyriaSong>;
}

function jsonFailure(status: number, code: string): Response {
  return Response.json(
    { error: "Private music generation unavailable.", code },
    { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One request = at most one Lyria call. Never auto retry. A provider failure
 * intentionally leaves the durable reservation locked for owner investigation.
 * A successful response releases the active lock, but its ID stays spent forever.
 */
export async function handlePrivateLyriaRequest(
  request: Request,
  bindings: PrivateLyriaBindings | null | undefined,
  deps: PrivateLyriaDependencies = {},
): Promise<Response> {
  if (request.method !== "POST") return jsonFailure(405, "method_not_allowed");
  if (!bindings || bindings.AIMF_PRIVATE_LYRIA_ENABLED !== "1") {
    return jsonFailure(503, "pilot_disabled");
  }
  if (!isSameOriginRequest(request)) return jsonFailure(403, "forbidden");
  if (!bindings.AIMF_PRIVATE_LYRIA_OWNER_ID?.trim()) {
    return jsonFailure(503, "pilot_unconfigured");
  }

  // Authentication is read-only; a valid token is not enough unless it belongs to the owner.
  const member = await (deps.verify ?? ((r) => verifyMemberSession(r, {
    config: memberAuthConfig({
      SUPABASE_URL: bindings.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: bindings.SUPABASE_PUBLISHABLE_KEY,
      VITE_SUPABASE_URL: bindings.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: bindings.VITE_SUPABASE_PUBLISHABLE_KEY,
    }),
  })))(request);
  if (!member.ok) return member.response;
  if (!isOwner(member.userId, bindings.AIMF_PRIVATE_LYRIA_OWNER_ID)) {
    return jsonFailure(403, "owner_only");
  }

  const apiKey = bindings.GEMINI_API_KEY?.trim();
  const db = bindings.AIMF_PRIVATE_LYRIA_DB;
  if (!apiKey || !db || typeof db.prepare !== "function") {
    return jsonFailure(503, "pilot_unconfigured");
  }

  const requestId = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!UUID_PATTERN.test(requestId)) return jsonFailure(400, "idempotency_key_required");

  const parsed = await readJsonLimited(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonFailure(400, "invalid_input");
  }
  const fields = body as Record<string, unknown>;
  const input: LyriaSongRequest = {
    prompt: textField(fields.prompt, 1200),
    genre: textField(fields.genre, 80),
    mood: textField(fields.mood, 80),
    language: textField(fields.language, 80),
    vocalPreference: textField(fields.vocalPreference, 80),
    lyrics: textField(fields.lyrics, 5000),
  };
  try {
    buildLyriaPrompt(input);
  } catch {
    return jsonFailure(400, "invalid_input");
  }

  let usedCalls: number;
  try {
    usedCalls = await reserveOwnerDemoCall(db, requestId);
  } catch (error) {
    if (!(error instanceof PrivateDemoBudgetError)) return jsonFailure(503, "pilot_unavailable");
    if (error.reason === "invalid_request") return jsonFailure(400, "invalid_request");
    if (error.reason === "duplicate") return jsonFailure(409, "already_submitted");
    if (error.reason === "busy") return jsonFailure(409, "generation_in_progress");
    if (error.reason === "exhausted") return jsonFailure(402, "pilot_quota_exhausted");
    return jsonFailure(503, "pilot_unavailable");
  }

  let song: LyriaSong;
  try {
    song = await (deps.generate ?? generateLyriaSong)(input, { apiKey });
  } catch (error) {
    // Reservation stays locked; do not retry or refund on an unknown billing outcome.
    if (error instanceof LyriaGenerationError && error.status === 429) {
      return jsonFailure(429, "provider_rate_limited");
    }
    return jsonFailure(502, "provider_failed_review_required");
  }

  // Fail-closed if the provider returned an unexpected output without an MP3.
  if (song.model !== "lyria-3.5" || song.mimeType !== "audio/mpeg" || song.audio.byteLength === 0) {
    return jsonFailure(502, "provider_invalid_review_required");
  }

  // Complete the one-flight reservation only after the audio exists and is validated.
  // A client disconnect may lose the result, but replaying this ID can never re-spend.
  try {
    await completeOwnerDemoCall(db, requestId);
  } catch {
    // Do not return a success with budget state possibly inconsistent.
    return jsonFailure(503, "pilot_unavailable_review_required");
  }

  return Response.json(
    {
      generationId: requestId,
      model: song.model,
      lyrics: song.text,
      audioMimeType: song.mimeType,
      audioBase64: Buffer.from(song.audio).toString("base64"),
      estimatedCostUsd: song.estimatedCostUsd,
      pilotCallsUsed: usedCalls,
    },
    { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
