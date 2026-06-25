import { createFileRoute } from "@tanstack/react-router";
import { guardAiRequest } from "@/lib/api-guard";

/**
 * Speech-to-text endpoint.
 * Accepts multipart/form-data with an `audio` file and returns { text }.
 * Powered by Lovable AI (OpenAI-compatible transcription gateway).
 */
export const Route = createFileRoute("/api/voice/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guardAiRequest(request);
        if (blocked) return blocked;

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "Voice AI is not configured." }, { status: 500 });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Expected multipart/form-data." }, { status: 400 });
        }

        const audio = form.get("audio");
        if (!(audio instanceof File) || audio.size < 512) {
          return Response.json({ error: "No audio provided." }, { status: 400 });
        }
        if (audio.size > 24 * 1024 * 1024) {
          return Response.json({ error: "Recording too large." }, { status: 413 });
        }

        const type = audio.type.split(";")[0];
        const ext =
          ({ "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg" } as Record<string, string>)[type] ?? "webm";

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", audio, `recording.${ext}`);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstream,
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          const status = res.status === 429 || res.status === 402 ? res.status : 502;
          if (detail) console.error(`[voice/transcribe] upstream ${status}: ${detail}`);
          return Response.json(
            { error: status === 402 ? "AI credits exhausted." : status === 429 ? "Rate limited, retry shortly." : "Transcription failed." },
            { status },
          );
        }

        const data = (await res.json().catch(() => null)) as { text?: string } | null;
        return Response.json({ text: data?.text ?? "" });
      },
    },
  },
});
