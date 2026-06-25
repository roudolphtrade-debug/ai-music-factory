import { createFileRoute } from "@tanstack/react-router";
import { guardAiRequest } from "@/lib/api-guard";

/**
 * Studio track generator.
 * 1. Writes short lyrics from the prompt/genre/mood with Lovable AI.
 * 2. Performs them with the AI speech gateway and streams back an MP3.
 * The generated lyrics are returned in the base64 `X-Lyrics` header so the
 * client can display them alongside the audio.
 */
const VOICE_MAP: Record<string, string> = {
  Instrumental: "alloy",
  "Warm tenor": "ash",
  Soprano: "shimmer",
  Alto: "sage",
  "Custom voice": "verse",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const Route = createFileRoute("/api/studio/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guardAiRequest(request);
        if (blocked) return blocked;

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "Generator is not configured." }, { status: 500 });
        }

        let body: { prompt?: string; genre?: string; mood?: string; voice?: string } | null = null;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        const prompt = (body?.prompt ?? "").trim().slice(0, 600);
        if (!prompt) {
          return Response.json({ error: "No prompt provided." }, { status: 400 });
        }
        const genre = (body?.genre ?? "Pop").slice(0, 60);
        const mood = (body?.mood ?? "warm").slice(0, 60);
        const voice = VOICE_MAP[body?.voice ?? ""] ?? "sage";

        const fail = (status: number, fallback: string, detail?: string) => {
          if (detail) console.error(`[studio/generate] upstream ${status}: ${detail}`);
          const error =
            status === 402
              ? "AI credits exhausted."
              : status === 429
                ? "Rate limited, retry shortly."
                : fallback;
          return Response.json({ error }, { status });
        };

        // 1) Write short, performable lyrics.
        let lyrics = "";
        try {
          const chat = await fetch(`${GATEWAY}/chat/completions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a songwriter. Write a short, evocative hook of 4 lines that can be performed aloud in about 20 seconds. Return ONLY the 4 lines, no titles, no quotes, no notes.",
                },
                {
                  role: "user",
                  content: `Genre: ${genre}. Mood: ${mood}. Brief: ${prompt}`,
                },
              ],
            }),
          });
          if (!chat.ok) {
            const detail = await chat.text().catch(() => "");
            const status = chat.status === 429 || chat.status === 402 ? chat.status : 502;
            return fail(status, "Lyric generation failed.", detail);
          }
          const data = (await chat.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          lyrics = (data.choices?.[0]?.message?.content ?? "").trim();
        } catch (e) {
          return fail(502, "Lyric generation failed.", e instanceof Error ? e.message : "");
        }
        if (!lyrics) lyrics = prompt;

        // 2) Perform the lyrics with the speech gateway.
        const speech = await fetch(`${GATEWAY}/audio/speech`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: lyrics.slice(0, 1200),
            voice,
            instructions: `Perform these lyrics like a ${mood} ${genre} vocalist. Use a musical, rhythmic, melodic delivery with expressive phrasing and gentle vibrato — not a flat narration.`,
            stream_format: "audio",
            response_format: "mp3",
          }),
        });

        if (!speech.ok || !speech.body) {
          const detail = await speech.text().catch(() => "");
          const status = speech.status === 429 || speech.status === 402 ? speech.status : 502;
          return fail(status, "Performance failed.", detail);
        }

        const lyricsB64 = Buffer.from(lyrics, "utf-8").toString("base64");
        return new Response(speech.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
            "X-Lyrics": lyricsB64,
          },
        });
      },
    },
  },
});
