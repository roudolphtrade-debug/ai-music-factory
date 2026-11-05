// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/i18n/context";
import { LANGS, translate, type Lang } from "@/i18n/translations";
import { AI_LIMITS, DICTATION_MAX_SECONDS } from "@/lib/ai-limits";
import { ReadAloudButton } from "./ReadAloudButton";
import { VoicePrompt } from "./VoicePrompt";

const en = (key: string) => translate("en", key);

// The two voice routes are for members: the backend client is a scripted stand-in with or without a
// session, and fetch is a fake route. Nothing real is reached.
const member = vi.hoisted(() => ({ token: "aaaaaaaa.bbbbbbbb.cccccccc" as string | null }));
vi.mock("@/integrations/supabase/client", () => ({
  loadSupabase: async () => ({
    auth: {
      getSession: async () => ({
        data: { session: member.token ? { access_token: member.token } : null },
      }),
      refreshSession: async () => ({ data: { session: null } }),
    },
  }),
}));

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  static isTypeSupported = () => true;
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  stopCalls = 0;
  constructor(_stream: unknown, options: { mimeType: string }) {
    this.mimeType = options.mimeType;
    FakeRecorder.instances.push(this);
  }
  start() {}
  stop() {
    this.stopCalls++;
    this.ondataavailable?.({ data: new Blob([new Uint8Array(2048)]) });
    this.onstop?.();
  }
}

let upstream: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("afm-lang", "en");
  member.token = "aaaaaaaa.bbbbbbbb.cccccccc";
  FakeRecorder.instances = [];
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => {} }] }) },
  });
  upstream = vi.fn();
  vi.stubGlobal("fetch", upstream);
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const wrap = (node: React.ReactNode) => render(<LanguageProvider>{node}</LanguageProvider>);
const flush = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const reply = (status: number, body: unknown = {}) =>
  upstream.mockResolvedValue(Response.json(body, { status }));

async function startRecording() {
  fireEvent.click(screen.getByRole("button", { name: en("voice.record") }));
  await flush();
}

describe("dictation limit", () => {
  it("is two minutes", () => {
    expect(DICTATION_MAX_SECONDS).toBe(120);
  });

  it("stops by itself after two minutes, tells the user, and still transcribes the recording", async () => {
    reply(200, { text: "hello world" });
    wrap(<VoicePrompt />);
    await startRecording();
    const recorder = FakeRecorder.instances[0];

    await advance(DICTATION_MAX_SECONDS * 1000 - 1);
    expect(recorder.stopCalls).toBe(0);
    expect(screen.queryByRole("status")).toBeNull();

    await advance(1);
    expect(recorder.stopCalls).toBe(1);
    expect(screen.getByRole("status").textContent).toBe(en("voice.maxDuration"));
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(String(upstream.mock.calls[0][0])).toBe("/api/voice/transcribe");
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("hello world");
  });

  it("does nothing more when the user stops first", async () => {
    reply(200, { text: "short" });
    wrap(<VoicePrompt />);
    await startRecording();
    await advance(30_000);
    fireEvent.click(screen.getByRole("button", { name: en("voice.stopRecording") }));
    await flush();
    await advance(DICTATION_MAX_SECONDS * 1000);
    expect(FakeRecorder.instances[0].stopCalls).toBe(1); // only the user's click
    expect(screen.queryByRole("status")).toBeNull();
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("does not fire after the component is gone", async () => {
    wrap(<VoicePrompt />);
    await startRecording();
    cleanup();
    await advance(DICTATION_MAX_SECONDS * 1000 * 2);
    expect(FakeRecorder.instances[0].stopCalls).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("translated error messages", () => {
  const cases: [number, string][] = [
    [503, "aiErrors.paused"],
    [429, "aiErrors.rate"],
    [402, "aiErrors.credits"],
    [413, "aiErrors.tooLarge"],
    [500, "aiErrors.generic"],
  ];

  it.each(cases)("dictation: HTTP %i shows %s, never the raw server text", async (status, key) => {
    reply(status, { error: "RAW SERVER TEXT" });
    wrap(<VoicePrompt />);
    await startRecording();
    fireEvent.click(screen.getByRole("button", { name: en("voice.stopRecording") }));
    await flush();
    expect(screen.getByText(en(key))).toBeTruthy();
    expect(screen.queryByText(/RAW SERVER TEXT/)).toBeNull();
  });

  it.each(cases)("read aloud: HTTP %i shows %s, never the raw server text", async (status, key) => {
    reply(status, { error: "RAW SERVER TEXT" });
    wrap(<ReadAloudButton text="hello" />);
    fireEvent.click(screen.getByRole("button", { name: en("voice.readAloud") }));
    await flush();
    expect(screen.getByText(en(key))).toBeTruthy();
    expect(screen.queryByText(/RAW SERVER TEXT/)).toBeNull();
  });
});

describe("read aloud text cap", () => {
  it("sends at most 800 characters to the server", async () => {
    reply(503);
    wrap(<ReadAloudButton text={"a".repeat(3000)} />);
    fireEvent.click(screen.getByRole("button", { name: en("voice.readAloud") }));
    await flush();
    const body = JSON.parse((upstream.mock.calls[0][1] as RequestInit).body as string);
    expect(body.text).toHaveLength(AI_LIMITS.speechChars);
  });
});

describe("voice routes are for members", () => {
  it("read aloud without a session sends nothing and says to sign in", async () => {
    member.token = null;
    wrap(<ReadAloudButton text="Hello there" />);
    fireEvent.click(screen.getByRole("button", { name: en("voice.readAloud") }));
    await flush();
    expect(upstream).not.toHaveBeenCalled();
    expect(screen.getByText(en("aiErrors.signIn"))).toBeTruthy();
  });

  it("dictation without a session does not even open the microphone, and sends nothing", async () => {
    member.token = null;
    const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: () => {} }] }));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    wrap(<VoicePrompt />);
    await startRecording();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
    expect(screen.getByText(en("aiErrors.signIn"))).toBeTruthy();
  });

  it("read aloud sends the session token with the text", async () => {
    upstream.mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }),
    );
    wrap(<ReadAloudButton text="Hello there" />);
    fireEvent.click(screen.getByRole("button", { name: en("voice.readAloud") }));
    await flush();
    const init = upstream.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer aaaaaaaa.bbbbbbbb.cccccccc",
    );
  });

  it("shows the right sentence for an expired session and for a session check that is out of reach", async () => {
    wrap(<ReadAloudButton text="Hello there" />);
    for (const [status, code, key] of [
      [401, "invalid_session", "aiErrors.session"],
      [503, "auth_unavailable", "aiErrors.authUnavailable"],
      [503, "ai_paused", "aiErrors.paused"],
    ] as const) {
      upstream.mockResolvedValue(Response.json({ error: "RAW SERVER TEXT", code }, { status }));
      fireEvent.click(screen.getByRole("button", { name: en("voice.readAloud") }));
      await flush();
      expect(screen.getByText(en(key)), key).toBeTruthy();
      expect(screen.queryByText(/RAW SERVER TEXT/)).toBeNull();
    }
  });
});

describe("the AI is paused on purpose (503 ai_paused): a calm notice, not an error", () => {
  const PAUSED = { error: "AI features are temporarily paused.", code: "ai_paused" };
  const pausedReply = () => upstream.mockResolvedValue(Response.json(PAUSED, { status: 503 }));
  const notice = () => screen.getByText(en("aiErrors.paused")).closest("[data-ai-paused]");
  const anyRed = (root: Element) =>
    [root, ...root.querySelectorAll("*")].some((el) => /destructive/.test(el.getAttribute("class") ?? ""));
  const visible = () => document.body.textContent ?? "";

  async function readAloudOnce() {
    pausedReply();
    const view = wrap(<ReadAloudButton text="hello" />);
    fireEvent.click(screen.getByRole("button", { name: en("voice.readAloud") }));
    await flush();
    return view;
  }
  async function dictateOnce() {
    pausedReply();
    const view = wrap(<VoicePrompt />);
    await startRecording();
    fireEvent.click(screen.getByRole("button", { name: en("voice.stopRecording") }));
    await flush();
    return view;
  }

  it.each([
    ["read aloud", readAloudOnce],
    ["dictation", dictateOnce],
  ])("%s: shows the translated sentence in a status notice, in amber, never in red", async (_n, run) => {
    const { container } = await run();
    const box = notice();
    expect(box).not.toBeNull();
    expect(box?.getAttribute("role")).toBe("status");
    expect(box?.querySelector("svg")?.getAttribute("class")).toMatch(/text-gold/);
    expect(anyRed(box as Element)).toBe(false);
    expect(container.querySelector(".text-destructive")).toBeNull();
  });

  it.each([
    ["read aloud", readAloudOnce],
    ["dictation", dictateOnce],
  ])("%s: never shows the status, the code, JSON or the server's text", async (_n, run) => {
    await run();
    expect(visible()).not.toMatch(/503|ai_paused|\{|\}/);
    expect(screen.queryByText(PAUSED.error)).toBeNull(); // the server's own sentence, word for word
  });

  it("read aloud: the button is back to its normal state, with no retry and no extra call", async () => {
    await readAloudOnce();
    const button = screen.getByRole("button", { name: en("voice.readAloud") });
    expect(button.hasAttribute("disabled")).toBe(false);
    await advance(180_000);
    expect(upstream).toHaveBeenCalledTimes(1);
    // one more click is one more request, and only that
    fireEvent.click(button);
    await flush();
    await advance(180_000);
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(String(upstream.mock.calls[1][0])).toBe("/api/voice/speak");
  });

  it("dictation: the button is back to its normal state, with no retry and no extra call", async () => {
    await dictateOnce();
    const button = screen.getByRole("button", { name: en("voice.record") });
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(screen.queryByRole("button", { name: en("voice.transcribing") })).toBeNull();
    await advance(180_000);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(String(upstream.mock.calls[0][0])).toBe("/api/voice/transcribe");
    expect(FakeRecorder.instances).toHaveLength(1); // no second recording, no second upload
  });

  it("dictation: the transcript that was already there is kept", async () => {
    reply(200, { text: "hello world" });
    wrap(<VoicePrompt />);
    await startRecording();
    fireEvent.click(screen.getByRole("button", { name: en("voice.stopRecording") }));
    await flush();
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(box.value).toBe("hello world");
    fireEvent.change(box, { target: { value: "hello world, edited by hand" } });

    pausedReply();
    await startRecording();
    fireEvent.click(screen.getByRole("button", { name: en("voice.stopRecording") }));
    await flush();
    expect(notice()).not.toBeNull();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("hello world, edited by hand");
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it("the notice goes away when the next attempt goes through", async () => {
    await readAloudOnce();
    expect(notice()).not.toBeNull();
    upstream.mockResolvedValue(Response.json({ error: "x" }, { status: 500 }));
    fireEvent.click(screen.getByRole("button", { name: en("voice.readAloud") }));
    await flush();
    expect(screen.queryByText(en("aiErrors.paused"))).toBeNull();
    expect(screen.getByText(en("aiErrors.generic"))).toBeTruthy();
  });

  it.each([
    [503, "auth_unavailable", "aiErrors.authUnavailable"],
    [503, undefined, "aiErrors.paused"],
    [500, "ai_paused", "aiErrors.generic"],
    [429, undefined, "aiErrors.rate"],
    [401, "invalid_session", "aiErrors.session"],
  ] as const)(
    "any other answer stays a red error with its own sentence: HTTP %i %s",
    async (status, code, key) => {
      upstream.mockResolvedValue(Response.json({ error: "RAW SERVER TEXT", code }, { status }));
      const { container } = wrap(<ReadAloudButton text="hello" />);
      fireEvent.click(screen.getByRole("button", { name: en("voice.readAloud") }));
      await flush();
      expect(screen.getByText(en(key))).toBeTruthy();
      expect(container.querySelector("[data-ai-paused]")).toBeNull();
      expect(container.querySelector(".text-destructive")?.textContent).toBe(en(key));
    },
  );

  it("dictation: another 503 or another error is not the calm notice either", async () => {
    for (const [status, code] of [
      [503, "auth_unavailable"],
      [500, undefined],
    ] as const) {
      cleanup();
      upstream.mockResolvedValue(Response.json({ error: "x", code }, { status }));
      const { container } = wrap(<VoicePrompt />);
      await startRecording();
      fireEvent.click(screen.getByRole("button", { name: en("voice.stopRecording") }));
      await flush();
      expect(container.querySelector("[data-ai-paused]"), `${status} ${code}`).toBeNull();
      expect(container.querySelector(".text-destructive")).not.toBeNull();
    }
  });

  it.each(LANGS.map((l) => l.code) as Lang[])(
    "%s: the sentence exists, is not the key, and shows no code or number",
    (lang) => {
      const text = translate(lang, "aiErrors.paused");
      expect(text).not.toBe("aiErrors.paused");
      expect(text.length).toBeGreaterThan(5);
      expect(text).not.toMatch(/ai_paused|503|json/i);
    },
  );
});
