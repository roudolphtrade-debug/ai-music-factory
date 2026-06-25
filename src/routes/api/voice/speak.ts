import { createFileRoute } from "@tanstack/react-router";
import { guardAiRequest } from "@/lib/api-guard";

/**
 * Text-to-speech endpoint.
 * Accepts JSON { text, voice? } and streams back an MP3 audio file.
 * Powered by Lovable AI (OpenAI-compatible speech gateway).
 */
const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"];

export const Route = createFileRoute("/api/voice/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guardAiRequest(request);
        if (blocked) return blocked;

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "Voice AI is not configured." }, { status: 500 });
        }

        let body: { text?: string; voice?: string } | null = null;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        const text = (body?.text ?? "").trim();
        if (!text) {
          return Response.json({ error: "No text provided." }, { status: 400 });
        }
        const input = text.slice(0, 2400);
        const voice = body?.voice && VOICES.includes(body.voice) ? body.voice : "sage";

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input,
            voice,
            stream_format: "audio",
            response_format: "mp3",
          }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          const status = res.status === 429 || res.status === 402 ? res.status : 502;
          if (detail) console.error(`[voice/speak] upstream ${status}: ${detail}`);
          return Response.json(
            { error: status === 402 ? "AI credits exhausted." : status === 429 ? "Rate limited, retry shortly." : "Speech failed." },
            { status },
          );
        }

        return new Response(res.body, {
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
