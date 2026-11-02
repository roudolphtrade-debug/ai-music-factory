import { describe, expect, it, vi } from "vitest";
import {
  LYRIA_INTERACTIONS_URL,
  LYRIA_MODEL,
  LyriaGenerationError,
  buildLyriaPrompt,
  generateLyriaSong,
  parseLyriaInteraction,
} from "./lyria35";

// A tiny MP3-shaped fixture, not a playable song; no AI service is called in this test suite.
const mp3 = Buffer.from([0x49, 0x44, 0x33, 0x04, 0, 0, 0, 0, 0, 0, 0xff, 0xfb]);
const interaction = (blocks: unknown[]) => ({
  steps: [
    { type: "tool_output", content: [{ type: "audio", data: "ignored" }] },
    { type: "model_output", content: blocks },
  ],
});

describe("Lyria 3.5 prompt contract", () => {
  it("requests an actual sung song, not a TTS narration", () => {
    const text = buildLyriaPrompt({
      prompt: "An uplifting love song",
      genre: "Afrobeats",
      mood: "Joyful",
      language: "French",
      vocalPreference: "female voice",
    });
    expect(text).toContain("real sung vocals");
    expect(text).toContain("not produce spoken narration");
    expect(text).toContain("Afrobeats");
    expect(text).toContain("French");
    expect(text).toContain("female voice");
    expect(text).toContain("Write original lyrics");
  });

  it("separates user lyrics from musical instructions", () => {
    const text = buildLyriaPrompt({
      prompt: "Rhythmic pop with guitars",
      lyrics: "[Verse]\nHello there\n[Chorus]\nRise up",
    });
    expect(text).toContain("user-provided lyrics");
    expect(text).toContain("[Verse]\nHello there");
    expect(text).not.toContain("Write original lyrics");
  });

  it("rejects a blank request and bounds adversarial fields", () => {
    expect(() => buildLyriaPrompt({ prompt: "  " })).toThrowError(LyriaGenerationError);
    const text = buildLyriaPrompt({ prompt: "x".repeat(5000), lyrics: "z".repeat(8000), genre: "g".repeat(500) });
    expect(text).not.toContain("x".repeat(1201));
    expect(text).not.toContain("z".repeat(5001));
    expect(text).not.toContain("g".repeat(81));
  });
});

describe("Lyria Interactions response parsing", () => {
  it("reads audio and text across interleaved model output blocks", () => {
    const parsed = parseLyriaInteraction(interaction([
      { type: "text", text: "[Verse]\nLet it go" },
      { type: "audio", data: mp3.toString("base64") },
      { type: "text", text: "[Chorus]\nSing it" },
    ]));
    expect(parsed.text).toBe("[Verse]\nLet it go\n\n[Chorus]\nSing it");
    expect(parsed.mimeType).toBe("audio/mpeg");
    expect(Buffer.from(parsed.audio)).toEqual(mp3);
  });

  it.each([
    null, {}, { steps: [] },
    interaction([{ type: "text", text: "no audio" }]),
    interaction([{ type: "audio", data: "invalid!" }]),
    interaction([{ type: "audio", data: Buffer.from("not an mp3").toString("base64") }]),
  ])("rejects absent, malformed, or non-MP3 audio", (data) => {
    expect(() => parseLyriaInteraction(data)).toThrowError(LyriaGenerationError);
  });

  it("accepts an MPEG audio frame header without ID3", () => {
    const data = Buffer.from([0xff, 0xfb, 0x90, 0x64]).toString("base64");
    expect(parseLyriaInteraction(interaction([{ type: "audio", data }])).audio).toHaveLength(4);
  });

  it("does not assume the lyrics are always present", () => {
    const parsed = parseLyriaInteraction(interaction([{ type: "audio", data: mp3.toString("base64") }]));
    expect(parsed.text).toBeNull();
  });
});

describe("the adapter does exactly one paid-call-shaped request", () => {
  it("uses the documented endpoint and model, with the key only in server-side request headers", async () => {
    const mockFetch = vi.fn(async () => Response.json(interaction([
      { type: "audio", data: mp3.toString("base64") },
      { type: "text", text: "some lyrics" },
    ])));
    const result = await generateLyriaSong({ prompt: "Highlife guitar, French lyrics" }, {
      apiKey: "server-secret-only",
      fetchImpl: mockFetch as typeof fetch,
    });
    expect(result.model).toBe(LYRIA_MODEL);
    expect(result.estimatedCostUsd).toBe(0.08);
    expect(result.text).toBe("some lyrics");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(LYRIA_INTERACTIONS_URL);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe("server-secret-only");
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "lyria-3.5" });
    expect(String(init.body)).not.toContain("server-secret-only");
  });

  it("fails closed if the server secret is absent", async () => {
    const mockFetch = vi.fn();
    await expect(generateLyriaSong({ prompt: "a song" }, {
      apiKey: "", fetchImpl: mockFetch,
    })).rejects.toMatchObject({ code: "upstream_unavailable", status: 503 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([400, 401, 402, 429, 500])("does not retry rejected HTTP %s", async (status) => {
    const mockFetch = vi.fn(async () => new Response("private upstream details", { status }));
    await expect(generateLyriaSong({ prompt: "a song" }, {
      apiKey: "test", fetchImpl: mockFetch as typeof fetch,
    })).rejects.toMatchObject({ code: "upstream_rejected" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry a network failure that may already have been billed", async () => {
    const mockFetch = vi.fn(async () => { throw new Error("network down"); });
    await expect(generateLyriaSong({ prompt: "a song" }, {
      apiKey: "test", fetchImpl: mockFetch as typeof fetch,
    })).rejects.toMatchObject({ code: "upstream_unavailable" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("refuses a declared oversized response without parsing it", async () => {
    const mockFetch = vi.fn(async () => new Response("x", {
      headers: { "content-length": String(25 * 1024 * 1024) },
    }));
    await expect(generateLyriaSong({ prompt: "a song" }, {
      apiKey: "test", fetchImpl: mockFetch as typeof fetch,
    })).rejects.toMatchObject({ code: "response_too_large" });
  });

  it("refuses a malformed response without inventing an audio track", async () => {
    const mockFetch = vi.fn(async () => Response.json({ steps: [{ type: "model_output", content: [] }] }));
    await expect(generateLyriaSong({ prompt: "a song" }, {
      apiKey: "test", fetchImpl: mockFetch as typeof fetch,
    })).rejects.toMatchObject({ code: "upstream_invalid" });
  });
});
