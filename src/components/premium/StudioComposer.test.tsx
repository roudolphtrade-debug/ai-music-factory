// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import { AllProviders } from "@/test/providers";
import { installFakeAudio } from "@/test/fakeAudio";
import { AuthProvider } from "@/auth/AuthProvider";
import { makeSession, type FakeSupabase } from "@/test/fakeSupabase";
import { navigations, setUpAccounts } from "@/test/authHarness";
import type { AuthHolder } from "@/test/clientMock";
import { CreditsProvider } from "@/library/CreditsProvider";
import { LANGS, translate, type Lang } from "@/i18n/translations";
import { useI18n } from "@/i18n/context";
import { moods } from "@/data/mock";
import { STUDIO_VOICES } from "@/studio/options";
import { peekReturnTo } from "@/auth/returnTo";
import {
  ANON,
  PREP_PREFIX,
  PREP_TTL_MS,
  memberOwner,
  peekAnonymousPrep,
  readPrep,
  savePrep,
} from "@/studio/prep";
import { StudioComposer } from "./StudioComposer";

const holder = vi.hoisted(
  () => ({ fake: null, configured: true, startWithClient: true, snapshot: null }) as AuthHolder,
);
vi.mock("@tanstack/react-router", async () => (await import("@/test/routerMock")).routerModule);
vi.mock("@/integrations/supabase/client", async () =>
  (await import("@/test/clientMock")).clientModule(holder),
);
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn(), warning: vi.fn() },
}));
// The drafts store is a stand-in with a switch: the device can keep the track, or cannot.
const drafts = vi.hoisted(() => ({ fail: false, added: 0, kept: [] as string[] }));
vi.mock("@/library/draftsContext", () => ({
  DraftDiscardedError: class DraftDiscardedError extends Error {},
  useGeneratedDrafts: () => ({
    drafts: [],
    ready: true,
    removeDraft: async () => {},
    addDraft: async (meta: object) => {
      if (drafts.fail) throw new Error("quota");
      drafts.added++;
      return { ...meta, url: "blob:kept" };
    },
    keepUrl: (url: string) => {
      drafts.kept.push(url);
      return url;
    },
    eraseMine: async () => {},
  }),
}));
// The instrumental bed is synthesized with the Web Audio API, absent from jsdom: the vocal passes through.
vi.mock("@/audio/mixTrack", () => ({ composeFinalTrack: async (blob: Blob) => blob }));

const en = (key: string, vars?: Record<string, string | number>) => translate("en", key, vars);
const DEFAULT_PROMPT_START = "Cinematic ambient pop";
let fake: FakeSupabase;
let route: ReturnType<typeof vi.fn>;
let createdUrls: string[];

beforeEach(() => {
  fake = setUpAccounts(holder);
  drafts.fail = false;
  drafts.added = 0;
  drafts.kept = [];
  installFakeAudio();
  createdUrls = [];
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: () => {
        const url = `blob:fake-${createdUrls.length}`;
        createdUrls.push(url);
        return url;
      },
      revokeObjectURL: () => {},
    }),
  );
  // The fake AI route: it is the only thing "generate" can reach. The real gateway is refused by the set-up.
  route = vi.fn(
    async (_input: unknown, _init?: unknown) =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "X-Lyrics": btoa("la la la") },
      }),
  );
  vi.stubGlobal("fetch", route);
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.message).mockClear();
  vi.mocked(toast.warning).mockClear();
  vi.mocked(toast.success).mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount() {
  return render(
    <AllProviders>
      <AuthProvider>
        <CreditsProvider>
          <StudioComposer />
        </CreditsProvider>
      </AuthProvider>
    </AllProviders>,
  );
}
const promptBox = () => screen.getByRole("textbox") as HTMLTextAreaElement;
const generateButton = () => screen.getByRole("button", { name: en("studio.generate") });
const signIn = (id = "user-1") => fake.restore(makeSession(id, `${id}@example.test`));
/** The studio is ready once the session is known: the button is enabled and the preparation is back. */
const ready = () => waitFor(() => expect(generateButton().hasAttribute("disabled")).toBe(false));
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));
const wallet = () =>
  JSON.parse(localStorage.getItem("afm-credits") ?? "{}") as { balance?: number };

describe("a visitor prepares a track, then clicks Generate", () => {
  it("sends nothing to the AI route, keeps the preparation, remembers the way back and goes to sign in", async () => {
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "A tender highlife about rain" } });
    fireEvent.click(generateButton());
    await settle();

    expect(route).not.toHaveBeenCalled();
    expect(toast.message).toHaveBeenCalledWith(en("studio.gen.signInFirst"));
    expect(navigations()).toContainEqual(
      expect.objectContaining({ to: "/auth/sign-in", search: { redirect: "/studio" } }),
    );
    expect(peekReturnTo()).toBe("/studio");
    const kept = readPrep(ANON);
    expect(kept?.fields.prompt).toBe("A tender highlife about rain");
    expect(kept?.claimUntil).toBeGreaterThan(Date.now());
  });

  it("keeps every change at once, and puts it back after a reload", async () => {
    const first = mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "Slow amapiano at dawn" } });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Amapiano" } });
    expect(readPrep(ANON)?.fields).toMatchObject({
      prompt: "Slow amapiano at dawn",
      genre: "Amapiano",
    });
    first.unmount();

    mount();
    await waitFor(() => expect(promptBox().value).toBe("Slow amapiano at dawn"));
    expect((screen.getAllByRole("combobox")[0] as HTMLSelectElement).value).toBe("Amapiano");
    expect(screen.getByText(en("studio.gen.prepResumed"))).toBeTruthy();
    expect(route).not.toHaveBeenCalled();
  });

  it("does not extend the seven days just by opening the studio", async () => {
    const savedAt = Date.now() - 3 * 24 * 3_600_000;
    savePrep(
      ANON,
      { prompt: "old idea", genre: "Trap", mood: "Warm", voice: "Alto" },
      { now: savedAt },
    );
    mount();
    await waitFor(() => expect(promptBox().value).toBe("old idea"));
    expect(readPrep(ANON)?.savedAt).toBe(savedAt);
  });

  it("ignores a preparation older than seven days", async () => {
    savePrep(
      ANON,
      { prompt: "stale", genre: "Trap", mood: "Warm", voice: "Alto" },
      { now: Date.now() - PREP_TTL_MS - 1000 },
    );
    mount();
    await ready();
    await waitFor(() => expect(promptBox().value).toContain(DEFAULT_PROMPT_START));
    expect(screen.queryByText(en("studio.gen.prepResumed"))).toBeNull();
  });

  it("lets the visitor erase the preparation", async () => {
    savePrep(ANON, { prompt: "to erase", genre: "Trap", mood: "Warm", voice: "Alto" });
    mount();
    await waitFor(() => expect(promptBox().value).toBe("to erase"));
    fireEvent.click(screen.getByRole("button", { name: en("studio.gen.prepClear") }));
    expect(readPrep(ANON)).toBeNull();
    expect(promptBox().value).toContain(DEFAULT_PROMPT_START);
    expect(screen.queryByText(en("studio.gen.prepResumed"))).toBeNull();
  });

  it("says accounts are unavailable, and sends nothing, when the backend is not configured", async () => {
    holder.configured = false;
    mount();
    await ready();
    fireEvent.click(generateButton());
    await settle();
    expect(toast.error).toHaveBeenCalledWith(en("studio.gen.accountsOff"));
    expect(route).not.toHaveBeenCalled();
    expect(navigations()).toHaveLength(0);
  });
});

describe("coming back after signing in", () => {
  it("puts the preparation back intact and does NOT generate by itself", async () => {
    savePrep(
      ANON,
      {
        prompt: "A tender highlife about rain",
        genre: "Afrobeats",
        mood: "Warm",
        voice: "Soprano",
      },
      { claim: true },
    );
    signIn("alice");
    mount();
    await waitFor(() => expect(promptBox().value).toBe("A tender highlife about rain"));
    expect((screen.getAllByRole("combobox")[2] as HTMLSelectElement).value).toBe("Soprano");
    expect(screen.getByText(en("studio.gen.prepResumed"))).toBeTruthy();
    await settle();
    expect(route).not.toHaveBeenCalled();
    expect(wallet().balance ?? 20).toBe(20); // nothing spent
    // it now belongs to the account, and the anonymous slot is empty
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("A tender highlife about rain");
    expect(readPrep(ANON)).toBeNull();
  });

  it("is not available to another account on the same device", async () => {
    savePrep(
      ANON,
      { prompt: "Alice's private idea", genre: "Trap", mood: "Warm", voice: "Alto" },
      { claim: true },
    );
    signIn("alice");
    const first = mount();
    await waitFor(() => expect(promptBox().value).toBe("Alice's private idea"));
    first.unmount();

    // another account signs in on the same device
    signIn("bob");
    mount();
    await ready();
    await waitFor(() => expect(promptBox().value).toContain(DEFAULT_PROMPT_START));
    expect(screen.queryByText(en("studio.gen.prepResumed"))).toBeNull();
    expect(readPrep(memberOwner("bob"))).toBeNull();
    // and Alice's stays hers
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("Alice's private idea");
  });

  it("does not hand an unclaimed preparation to an account that signs in for another reason", async () => {
    savePrep(ANON, {
      prompt: "typed, never submitted",
      genre: "Trap",
      mood: "Warm",
      voice: "Alto",
    });
    signIn("alice");
    mount();
    await ready();
    await waitFor(() => expect(promptBox().value).toContain(DEFAULT_PROMPT_START));
    expect(readPrep(memberOwner("alice"))).toBeNull();
    expect(readPrep(ANON)?.fields.prompt).toBe("typed, never submitted");
  });

  it("only generates on a click, with the session token, and keeps the preparation afterwards", async () => {
    signIn("alice");
    mount();
    await waitFor(() => expect(generateButton().hasAttribute("disabled")).toBe(false));
    fireEvent.change(promptBox(), { target: { value: "Gospel house with a big choir" } });
    fireEvent.click(generateButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(en("studio.gen.saved")));

    expect(route).toHaveBeenCalledTimes(1);
    const [url, init] = route.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/studio/generate");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token");
    expect(JSON.parse(init.body as string).prompt).toBe("Gospel house with a big choir");
    // kept after a successful generation, under the account
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("Gospel house with a big choir");
    expect(screen.getByText("la la la")).toBeTruthy();
    await waitFor(() => expect(wallet().balance).toBe(15)); // 5 credits, spent once the track is kept
  });
});

describe("generation errors keep the preparation and never show server text", () => {
  it.each([
    [402, undefined, "studio.gen.errorCredits"],
    [429, undefined, "studio.gen.errorRate"],
    [503, "auth_unavailable", "aiErrors.authUnavailable"],
    [413, undefined, "aiErrors.tooLarge"],
    [500, undefined, "studio.gen.errorGeneric"],
  ])("HTTP %i (%s) shows %s", async (status, code, key) => {
    signIn("alice");
    route.mockResolvedValue(Response.json({ error: "RAW SERVER TEXT", code }, { status }));
    mount();
    await waitFor(() => expect(generateButton().hasAttribute("disabled")).toBe(false));
    fireEvent.change(promptBox(), { target: { value: "Keep me" } });
    fireEvent.click(generateButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(en(key)));
    expect(JSON.stringify(vi.mocked(toast.error).mock.calls)).not.toContain("RAW SERVER TEXT");
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("Keep me");
    expect(promptBox().value).toBe("Keep me");
    expect(wallet().balance ?? 20).toBe(20); // no credit spent on a failure
  });

  it("HTTP 401: says the session expired, remembers the way back and goes to sign in again", async () => {
    signIn("alice");
    route.mockResolvedValue(
      Response.json({ error: "x", code: "invalid_session" }, { status: 401 }),
    );
    mount();
    await waitFor(() => expect(generateButton().hasAttribute("disabled")).toBe(false));
    fireEvent.change(promptBox(), { target: { value: "Keep me" } });
    fireEvent.click(generateButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(en("aiErrors.session")));
    expect(navigations()).toContainEqual(
      expect.objectContaining({ to: "/auth/sign-in", search: { redirect: "/studio" } }),
    );
    expect(peekReturnTo()).toBe("/studio");
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("Keep me");
  });

  it("a session that vanished before sending: nothing is sent, same way back", async () => {
    signIn("alice");
    mount();
    await waitFor(() => expect(generateButton().hasAttribute("disabled")).toBe(false));
    fake.restore(null); // the token is gone from the device, the page has not noticed yet
    fireEvent.click(generateButton());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(en("aiErrors.session")));
    expect(route).not.toHaveBeenCalled();
    expect(peekReturnTo()).toBe("/studio");
  });
});

describe("the AI is paused on the server (503 ai_paused)", () => {
  const PAUSED_BODY = { error: "AI features are temporarily paused.", code: "ai_paused" };
  const notice = () => en("studio.gen.pausedNotice");
  const visibleText = () => document.body.textContent ?? "";

  async function clickOnceWhilePaused(prompt = "Keep my words") {
    signIn("alice");
    route.mockResolvedValue(Response.json(PAUSED_BODY, { status: 503 }));
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: prompt } });
    fireEvent.click(generateButton());
    await screen.findByText(notice());
  }

  it("says in plain words that generation is unavailable and that the preparation is kept", async () => {
    await clickOnceWhilePaused();
    expect(notice()).toBe(
      "AI generation is temporarily unavailable. Your preparation is kept. You can try again later.",
    );
    expect(screen.getByRole("status").textContent).toContain(notice());
    expect(screen.getByText(en("studio.gen.pausedStatus"))).toBeTruthy();
    // a calm notice, not a red toast
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows no code, no status number, no raw JSON and no server text", async () => {
    await clickOnceWhilePaused();
    const text = visibleText();
    expect(text).not.toContain("ai_paused");
    expect(text).not.toContain("503");
    expect(text).not.toContain("{");
    expect(text).not.toContain("AI features are temporarily paused");
    expect(JSON.stringify(vi.mocked(toast.error).mock.calls)).not.toContain("ai_paused");
  });

  it("keeps the prompt, genre, mood, voice and the stored preparation, and creates no track", async () => {
    signIn("alice");
    route.mockResolvedValue(Response.json(PAUSED_BODY, { status: 503 }));
    mount();
    await ready();
    const [genre, mood, voice] = screen.getAllByRole("combobox") as HTMLSelectElement[];
    fireEvent.change(promptBox(), { target: { value: "Keep my words" } });
    fireEvent.change(genre, { target: { value: "Amapiano" } });
    fireEvent.change(voice, { target: { value: "Soprano" } });
    const chosen = { genre: genre.value, mood: mood.value, voice: voice.value };
    fireEvent.click(generateButton());
    await screen.findByText(notice());

    expect(promptBox().value).toBe("Keep my words");
    expect({ genre: genre.value, mood: mood.value, voice: voice.value }).toEqual(chosen);
    const kept = readPrep(memberOwner("alice"))?.fields;
    expect(kept).toEqual({ prompt: "Keep my words", ...chosen });
    expect(drafts.added).toBe(0); // no draft, no invented track
    expect(screen.queryByText(en("studio.gen.resultTitle"))).toBeNull();
    expect(wallet().balance ?? 20).toBe(20); // the local credit is untouched
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("gives the button back, and one click is one request, with no retry of any kind", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await clickOnceWhilePaused();
      expect(generateButton().hasAttribute("disabled")).toBe(false);
      // time passes: nothing is sent by itself
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120_000);
      });
      expect(route).toHaveBeenCalledTimes(1);
      expect(route.mock.calls.every(([url]) => url === "/api/studio/generate")).toBe(true);
      // a second click is a second request, and only that
      fireEvent.click(generateButton());
      await settle();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120_000);
      });
      expect(route).toHaveBeenCalledTimes(2);
      expect(generateButton().hasAttribute("disabled")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops saying the engine is connected once the pause is known, and never before", async () => {
    signIn("alice");
    route.mockResolvedValue(Response.json(PAUSED_BODY, { status: 503 }));
    mount();
    await ready();
    expect(screen.getByText(en("studio.gen.ready"))).toBeTruthy();
    expect(visibleText()).not.toMatch(/connected/i);
    fireEvent.click(generateButton());
    await screen.findByText(notice());
    expect(screen.queryByText(en("studio.gen.ready"))).toBeNull();
    expect(screen.getByText(en("studio.gen.pausedStatus"))).toBeTruthy();
  });

  it("clears the notice when the next click goes through", async () => {
    await clickOnceWhilePaused();
    route.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "X-Lyrics": btoa("la") } }),
    );
    fireEvent.click(generateButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(en("studio.gen.saved")));
    expect(screen.queryByText(notice())).toBeNull();
  });

  it("does not turn other 503 answers, or other errors, into the pause notice", async () => {
    for (const [status, code] of [
      [503, "auth_unavailable"],
      [503, undefined],
      [500, "ai_paused"],
      [429, undefined],
    ] as const) {
      cleanup();
      vi.mocked(toast.error).mockClear();
      signIn("alice");
      route.mockResolvedValue(Response.json({ error: "x", code }, { status }));
      mount();
      await ready();
      fireEvent.click(generateButton());
      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(screen.queryByText(notice()), `${status} ${code}`).toBeNull();
      expect(screen.queryByText(en("studio.gen.pausedStatus"))).toBeNull();
    }
  });

  it("has the notice in every language, never a raw key", () => {
    for (const lang of ["fr", "es", "zh", "pt", "ar"] as const) {
      expect(translate(lang, "studio.gen.pausedNotice")).not.toBe("studio.gen.pausedNotice");
      expect(translate(lang, "studio.gen.pausedStatus")).not.toBe("studio.gen.pausedStatus");
    }
    expect(translate("fr", "studio.gen.pausedNotice")).toBe(
      "La génération IA est temporairement indisponible. Votre préparation est conservée. Vous pourrez réessayer plus tard.",
    );
  });
});

describe("a track the device cannot keep", () => {
  it("is still shown, the member is told, and no credit is spent", async () => {
    signIn("alice");
    drafts.fail = true;
    mount();
    await ready();
    fireEvent.click(generateButton());
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(en("studio.gen.notKept")));
    expect(screen.getByText("la la la")).toBeTruthy();
    expect(wallet().balance ?? 20).toBe(20);
  });
});

describe("typing before the session is known", () => {
  it("is not overwritten by the restoration", async () => {
    savePrep(ANON, { prompt: "stored idea", genre: "Trap", mood: "Warm", voice: "Alto" });
    // The session check is held until the test lets it finish, so that "typed before the session is
    // known" is a fact of the test and not a matter of timing on a busy machine.
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    fake.client.auth.getSession.mockImplementation(async () => {
      await held;
      return { data: { session: null }, error: null };
    });
    mount();
    fireEvent.change(promptBox(), { target: { value: "typed first" } });
    expect(promptBox().value).toBe("typed first");
    expect(generateButton().hasAttribute("disabled")).toBe(true); // the session is still unknown
    await act(async () => release());
    await ready();
    expect(promptBox().value).toBe("typed first");
    expect(readPrep(ANON)?.fields.prompt).toBe("typed first");
  });
});

describe("an answer that comes back after the account changed", () => {
  function slowRoute() {
    let answer!: () => void;
    route.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          answer = () =>
            resolve(
              new Response(new Uint8Array([1, 2, 3]), {
                status: 200,
                headers: { "X-Lyrics": btoa("late lyrics") },
              }),
            );
        }),
    );
    return () => answer();
  }

  it("after a sign-out: nothing is kept, shown or played and the local credit is untouched (the provider has already billed)", async () => {
    signIn("alice");
    mount();
    await ready();
    const answer = slowRoute();
    fireEvent.click(generateButton());
    await waitFor(() => expect(route).toHaveBeenCalledTimes(1));

    act(() => fake.emit("SIGNED_OUT", null)); // the member signs out while the track is being made
    answer();
    await settle();
    await settle();

    expect(drafts.added).toBe(0);
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByText("late lyrics")).toBeNull();
    expect(wallet().balance ?? 20).toBe(20);
    expect(createdUrls).toHaveLength(0);
    // the studio is usable again, as a visitor
    await waitFor(() => expect(generateButton().hasAttribute("disabled")).toBe(false));
  });

  it("after another account signed in: same, and the first account's preparation stays its own", async () => {
    signIn("alice");
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "Alice's idea" } });
    const answer = slowRoute();
    fireEvent.click(generateButton());
    await waitFor(() => expect(route).toHaveBeenCalledTimes(1));

    act(() => fake.emit("SIGNED_IN", makeSession("bob", "bob@example.test")));
    answer();
    await settle();
    await settle();

    expect(drafts.added).toBe(0);
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByText("late lyrics")).toBeNull();
    expect(readPrep(memberOwner("bob"))).toBeNull();
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("Alice's idea");
  });

  it("a track the device cannot keep gets its temporary address registered, so that a sign-out revokes it", async () => {
    signIn("alice");
    drafts.fail = true;
    mount();
    await ready();
    fireEvent.click(generateButton());
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(en("studio.gen.notKept")));
    expect(drafts.kept).toEqual(createdUrls);
    expect(drafts.kept).toHaveLength(1);
  });
});

describe("Lot A.1: the preparation of a visitor who signs in without clicking Generate", () => {
  const TYPED = { prompt: "S2 an afro-soul lullaby", genre: "Neo-Soul", mood: "Euphoric", voice: "Soprano" };
  const notice = () => screen.queryByTestId("anon-prep");
  const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
  const dialog = () => screen.findByRole("alertdialog");
  const closed = () => waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  const form = () => ({
    prompt: promptBox().value,
    genre: (screen.getAllByRole("combobox")[0] as HTMLSelectElement).value,
    voice: (screen.getAllByRole("combobox")[2] as HTMLSelectElement).value,
  });
  const fromAnonymous = (claim = false) => savePrep(ANON, TYPED, claim ? { claim: true } : {});

  beforeEach(() => {
    localStorage.removeItem("afm-return-to");
  });

  // ---------------------------------------------------------------- the way back (S2, the cause)
  it("a visitor who types remembers the way back to the studio, whatever door is taken, and no claim", async () => {
    mount();
    await ready();
    expect(peekReturnTo()).toBeUndefined(); // only looking at the studio remembers nothing
    expect(screen.queryByTestId("anon-limits")).toBeNull();

    fireEvent.change(promptBox(), { target: { value: "S2 typed, never submitted" } });
    expect(peekReturnTo()).toBe("/studio");
    expect(readPrep(ANON)?.claimUntil).toBeUndefined(); // typing alone never lets an account take it
    expect(route).not.toHaveBeenCalled();
    expect(navigations()).toHaveLength(0);
  });

  it("a signed-in member's typing does not set a destination", async () => {
    signIn("alice");
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "typed by a member" } });
    expect(peekReturnTo()).toBeUndefined();
  });

  it("tells the visitor, next to the form, where the preparation lives and where it does not follow", async () => {
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "something to keep" } });
    const note = screen.getByTestId("anon-limits");
    expect(note.textContent).toBe(en("studio.gen.anonLimits"));
    expect(note.textContent).toMatch(/another browser, a private window, another profile or another device/i);
    // a preparation that was already stored is announced as well, on the next visit
    cleanup();
    mount();
    await waitFor(() => expect(screen.getByTestId("anon-limits")).toBeTruthy());
  });

  it("does not show that note to a member", async () => {
    fromAnonymous();
    signIn("alice");
    mount();
    await ready();
    expect(screen.queryByTestId("anon-limits")).toBeNull();
  });

  // ---------------------------------------------------------------- S2: nothing by itself, then a confirmed recovery
  it("S2: after the sign-in the preparation is offered, hidden from nobody, attached to nobody, and nothing is generated", async () => {
    fromAnonymous();
    signIn("alice");
    mount();
    await ready();
    await waitFor(() => expect(notice()).not.toBeNull());
    expect(promptBox().value).toContain(DEFAULT_PROMPT_START); // the form is not touched
    expect(readPrep(memberOwner("alice"))).toBeNull(); // attached to no one
    expect(peekAnonymousPrep()?.fields.prompt).toBe(TYPED.prompt); // intact
    expect(route).not.toHaveBeenCalled();
    expect(wallet().balance ?? 20).toBe(20);
  });

  it("S2: cancelling the confirmation changes nothing", async () => {
    fromAnonymous();
    signIn("alice");
    mount();
    await waitFor(() => expect(notice()).not.toBeNull());
    click(en("studio.gen.anonPrepClaim"));
    const box = await dialog();
    // the warning says the device may be shared and that the confirmation proves nothing
    expect(within(box).getByText(en("studio.gen.anonClaimWarning"))).toBeTruthy();
    expect(within(box).getByText(en("studio.gen.anonClaimNoProof"))).toBeTruthy();
    fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.dialogCancel") }));
    await closed();
    expect(readPrep(memberOwner("alice"))).toBeNull();
    expect(peekAnonymousPrep()?.fields.prompt).toBe(TYPED.prompt);
    expect(promptBox().value).toContain(DEFAULT_PROMPT_START);
    expect(notice()).not.toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("S2: confirming puts the words in the form, in the account's slot, and empties the anonymous one", async () => {
    fromAnonymous();
    signIn("alice");
    mount();
    await waitFor(() => expect(notice()).not.toBeNull());
    click(en("studio.gen.anonPrepClaim"));
    fireEvent.click(within(await dialog()).getByRole("button", { name: en("studio.gen.anonClaimConfirm") }));
    await closed();
    expect(form()).toEqual({ prompt: TYPED.prompt, genre: "Neo-Soul", voice: "Soprano" });
    expect(screen.getByText(en("studio.gen.prepResumed"))).toBeTruthy();
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe(TYPED.prompt);
    expect(peekAnonymousPrep()).toBeNull();
    expect(notice()).toBeNull();
    expect(toast.success).toHaveBeenCalledWith(en("studio.gen.anonClaimed"));
    await settle();
    expect(route).not.toHaveBeenCalled(); // resuming never generates
    expect(wallet().balance ?? 20).toBe(20);
  });

  it("S2: the member can erase it instead, after a confirmation that says it cannot be undone", async () => {
    fromAnonymous();
    signIn("alice");
    mount();
    await waitFor(() => expect(notice()).not.toBeNull());
    click(en("studio.gen.anonPrepDelete"));
    let box = await dialog();
    expect(within(box).getByText(en("studio.gen.anonDeleteWarning"))).toBeTruthy();
    fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.dialogCancel") }));
    await closed();
    expect(peekAnonymousPrep()).not.toBeNull(); // cancelled: kept

    click(en("studio.gen.anonPrepDelete"));
    box = await dialog();
    fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.anonDeleteConfirm") }));
    await closed();
    expect(peekAnonymousPrep()).toBeNull();
    expect(notice()).toBeNull();
    expect(promptBox().value).toContain(DEFAULT_PROMPT_START); // the form is untouched
    expect(toast.success).toHaveBeenCalledWith(en("studio.gen.anonDeleted"));
  });

  // ---------------------------------------------------------------- S1: the Generate click keeps working
  it("S1: with the claim of a Generate click, nothing is offered: the account takes it over as before", async () => {
    fromAnonymous(true);
    signIn("alice");
    mount();
    await waitFor(() => expect(promptBox().value).toBe(TYPED.prompt));
    expect(screen.getByText(en("studio.gen.prepResumed"))).toBeTruthy();
    expect(notice()).toBeNull();
    expect(peekAnonymousPrep()).toBeNull();
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe(TYPED.prompt);
  });

  // ---------------------------------------------------------------- S3: another browser, profile, private window, device
  it("S3: a device that holds nothing offers nothing and invents nothing", async () => {
    signIn("carol");
    mount();
    await ready();
    expect(notice()).toBeNull();
    expect(promptBox().value).toContain(DEFAULT_PROMPT_START);
    expect(screen.queryByText(en("studio.gen.prepResumed"))).toBeNull();
    expect(readPrep(memberOwner("carol"))).toBeNull();
    expect(peekReturnTo()).toBeUndefined();
  });

  // ---------------------------------------------------------------- S4: words typed while the session becomes a member's
  it("S4: words typed in an open studio tab are never carried into the member's form by the sign-in: they are offered, and nothing is attributed", async () => {
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "S4 typed in the open tab" } });
    await act(async () => fake.emit("SIGNED_IN", makeSession("alice", "alice@example.test")));
    await waitFor(() => expect(generateButton().hasAttribute("disabled")).toBe(false));
    await waitFor(() => expect(notice()).not.toBeNull());
    expect(promptBox().value).toContain(DEFAULT_PROMPT_START); // the member's form starts clean
    expect(readPrep(memberOwner("alice"))).toBeNull(); // not attributed by the sign-in
    expect(peekAnonymousPrep()?.fields.prompt).toBe("S4 typed in the open tab"); // not lost either
    // a member's edit to another field saves the member's own form, never the visitor's words
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Amapiano" } });
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toContain(DEFAULT_PROMPT_START);
    expect(readPrep(memberOwner("alice"))?.fields.prompt).not.toContain("S4 typed");
    // and the words come back only through the confirmation
    click(en("studio.gen.anonPrepClaim"));
    fireEvent.click(within(await dialog()).getByRole("button", { name: en("studio.gen.anonClaimConfirm") }));
    await closed();
    expect(promptBox().value).toBe("S4 typed in the open tab");
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("S4 typed in the open tab");
  });

  it("S4: an account that signs in over a visitor's words, then another one, never inherits them silently", async () => {
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "visitor words" } });
    await act(async () => fake.emit("SIGNED_IN", makeSession("alice", "alice@example.test")));
    await waitFor(() => expect(notice()).not.toBeNull());
    await act(async () => fake.emit("SIGNED_IN", makeSession("bob", "bob@example.test")));
    await settle();
    expect(promptBox().value).toContain(DEFAULT_PROMPT_START);
    expect(readPrep(memberOwner("alice"))).toBeNull();
    expect(readPrep(memberOwner("bob"))).toBeNull();
    expect(peekAnonymousPrep()?.fields.prompt).toBe("visitor words");
  });

  it("S4: a stored preparation of the member wins over words typed before the session, which stay offered", async () => {
    savePrep(memberOwner("alice"), { ...TYPED, prompt: "alice's own stored words" });
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "typed as a visitor" } });
    await act(async () => fake.emit("SIGNED_IN", makeSession("alice", "alice@example.test")));
    await waitFor(() => expect(promptBox().value).toBe("alice's own stored words"));
    await waitFor(() => expect(notice()).not.toBeNull()); // the visitor's words are not lost
    expect(peekAnonymousPrep()?.fields.prompt).toBe("typed as a visitor");
  });

  // ---------------------------------------------------------------- protections between accounts
  it("refusal: once Alice has recovered it, Bob sees nothing and never gets her words", async () => {
    fromAnonymous();
    signIn("alice");
    const first = mount();
    await waitFor(() => expect(notice()).not.toBeNull());
    click(en("studio.gen.anonPrepClaim"));
    fireEvent.click(within(await dialog()).getByRole("button", { name: en("studio.gen.anonClaimConfirm") }));
    await closed();
    first.unmount();

    signIn("bob");
    mount();
    await ready();
    await waitFor(() => expect(promptBox().value).toContain(DEFAULT_PROMPT_START));
    expect(notice()).toBeNull();
    expect(readPrep(memberOwner("bob"))).toBeNull();
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe(TYPED.prompt); // still hers
  });

  it("refusal: left alone by Alice, it belongs to nobody, Bob is warned about a shared device, and Alice's slot is never touched", async () => {
    savePrep(memberOwner("alice"), { ...TYPED, prompt: "alice's own" });
    fromAnonymous();
    signIn("bob");
    mount();
    await waitFor(() => expect(notice()).not.toBeNull());
    click(en("studio.gen.anonPrepClaim"));
    const box = await dialog();
    expect(within(box).getByText(en("studio.gen.anonClaimWarning"))).toBeTruthy();
    expect(box.textContent).not.toMatch(/\b(proves?|verified|authenticat\w+)\b/i);
    fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.anonClaimConfirm") }));
    await closed();
    expect(readPrep(memberOwner("bob"))?.fields.prompt).toBe(TYPED.prompt);
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("alice's own");
  });

  it("refusal: if the account changes while the confirmation is open, nothing moves", async () => {
    fromAnonymous();
    signIn("alice");
    mount();
    await waitFor(() => expect(notice()).not.toBeNull());
    click(en("studio.gen.anonPrepClaim"));
    const box = await dialog();
    await act(async () => fake.emit("SIGNED_IN", makeSession("bob", "bob@example.test")));
    const confirm = screen.queryByRole("button", { name: en("studio.gen.anonClaimConfirm") });
    if (confirm) fireEvent.click(confirm);
    await settle();
    expect(box).toBeTruthy();
    expect(readPrep(memberOwner("alice"))).toBeNull();
    expect(readPrep(memberOwner("bob"))).toBeNull();
    expect(peekAnonymousPrep()?.fields.prompt).toBe(TYPED.prompt); // still nobody's
  });

  it("refusal: a sign-out while the confirmation is open closes it and moves nothing", async () => {
    fromAnonymous();
    signIn("alice");
    mount();
    await waitFor(() => expect(notice()).not.toBeNull());
    click(en("studio.gen.anonPrepClaim"));
    await dialog();
    await act(async () => fake.emit("SIGNED_OUT", null));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(readPrep(memberOwner("alice"))).toBeNull();
    expect(peekAnonymousPrep()?.fields.prompt).toBe(TYPED.prompt);
  });

  // ---------------------------------------------------------------- expirations and failures
  it("expiry: a preparation older than seven days is neither offered nor kept", async () => {
    savePrep(ANON, TYPED, { now: Date.now() - PREP_TTL_MS - 1000 });
    signIn("alice");
    mount();
    await ready();
    await settle();
    expect(notice()).toBeNull();
    expect(peekAnonymousPrep()).toBeNull();
    expect(localStorage.getItem(PREP_PREFIX + "anon")).toBeNull();
  });

  it("expiry: if it expires between the offer and the confirmation, nothing moves and the member is told", async () => {
    savePrep(ANON, TYPED, { now: Date.now() - PREP_TTL_MS + 60_000 });
    signIn("alice");
    mount();
    await waitFor(() => expect(notice()).not.toBeNull());
    click(en("studio.gen.anonPrepClaim"));
    const box = await dialog();
    const real = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(real + 5 * 60_000);
    try {
      fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.anonClaimConfirm") }));
    } finally {
      clock.mockRestore();
    }
    await closed();
    expect(toast.error).toHaveBeenCalledWith(en("studio.gen.anonClaimGone"));
    expect(readPrep(memberOwner("alice"))).toBeNull();
    expect(promptBox().value).toContain(DEFAULT_PROMPT_START);
    await waitFor(() => expect(notice()).toBeNull()); // nothing left to offer
  });

  it("failure: a storage that refuses the account's slot leaves the preparation intact and says so", async () => {
    fromAnonymous();
    signIn("alice");
    mount();
    await waitFor(() => expect(notice()).not.toBeNull());
    click(en("studio.gen.anonPrepClaim"));
    const box = await dialog();
    const original = Storage.prototype.setItem;
    const refuse = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith(PREP_PREFIX + "u:")) throw new Error("quota");
      return original.call(this, key, value);
    });
    try {
      fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.anonClaimConfirm") }));
    } finally {
      refuse.mockRestore();
    }
    await closed();
    expect(toast.error).toHaveBeenCalledWith(en("studio.gen.anonClaimFailed"));
    expect(peekAnonymousPrep()?.fields.prompt).toBe(TYPED.prompt);
    expect(readPrep(memberOwner("alice"))).toBeNull();
    expect(promptBox().value).toContain(DEFAULT_PROMPT_START);
    expect(notice()).not.toBeNull(); // still offered
  });

  it.each([["throws", "throw"], ["silently does nothing", "noop"]] as const)(
    "failure: an erase of the anonymous slot that %s after the copy is a failure: nothing moves and the offer stays",
    async (_name, mode) => {
      fromAnonymous();
      signIn("alice");
      mount();
      await waitFor(() => expect(notice()).not.toBeNull());
      click(en("studio.gen.anonPrepClaim"));
      const box = await dialog();
      const original = Storage.prototype.removeItem;
      const refuse = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (
        this: Storage,
        key: string,
      ) {
        if (key === PREP_PREFIX + "anon") {
          if (mode === "throw") throw new Error("locked");
          return; // silently ignored
        }
        return original.call(this, key);
      });
      try {
        fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.anonClaimConfirm") }));
      } finally {
        refuse.mockRestore();
      }
      await closed();
      expect(toast.error).toHaveBeenCalledWith(en("studio.gen.anonClaimFailed"));
      expect(toast.success).not.toHaveBeenCalled();
      expect(peekAnonymousPrep()?.fields.prompt).toBe(TYPED.prompt); // still anonymous, still offered
      expect(readPrep(memberOwner("alice"))).toBeNull(); // no second copy on the account
      expect(promptBox().value).toContain(DEFAULT_PROMPT_START); // the form was not changed
      expect(notice()).not.toBeNull();
    },
  );

  it("failure: an erase the storage refuses keeps the preparation and says so", async () => {
    fromAnonymous();
    signIn("alice");
    mount();
    await waitFor(() => expect(notice()).not.toBeNull());
    click(en("studio.gen.anonPrepDelete"));
    const box = await dialog();
    const original = Storage.prototype.removeItem;
    const refuse = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key === PREP_PREFIX + "anon") throw new Error("locked");
      return original.call(this, key);
    });
    try {
      fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.anonDeleteConfirm") }));
    } finally {
      refuse.mockRestore();
    }
    await closed();
    expect(toast.error).toHaveBeenCalledWith(en("studio.gen.anonDeleteFailed"));
    expect(peekAnonymousPrep()?.fields.prompt).toBe(TYPED.prompt);
    expect(notice()).not.toBeNull();
  });

  it("a visitor is never offered a recovery, even when the anonymous slot differs from the form", async () => {
    mount();
    await ready();
    expect(promptBox().value).toContain(DEFAULT_PROMPT_START);
    savePrep(ANON, TYPED); // another tab of the same browser wrote words that are not in this form
    await act(async () => void window.dispatchEvent(new Event("storage")));
    await settle();
    expect(notice()).toBeNull(); // only a signed-in member can take words over
    expect(screen.queryByRole("button", { name: en("studio.gen.anonPrepClaim") })).toBeNull();
    expect(readPrep(memberOwner("visitor"))).toBeNull();
  });

  it("an anonymous preparation identical to the form is not offered", async () => {
    fromAnonymous(true); // taken over, so identical to the form
    signIn("alice");
    mount();
    await waitFor(() => expect(promptBox().value).toBe(TYPED.prompt));
    savePrep(ANON, TYPED); // the same words appear again in the anonymous slot
    await act(async () => void window.dispatchEvent(new Event("storage")));
    expect(notice()).toBeNull();
  });
});

// ---------------------------------------------------------------- Lot A.2: moods, example prompt
describe("the quick moods and the mood menu say the same thing", () => {
  const moodSelect = () => screen.getAllByRole("combobox")[1] as HTMLSelectElement;
  const chips = () =>
    within(screen.getByRole("group", { name: en("studio.quickMoods") })).getAllByRole("button");
  const pressed = () => chips().filter((c) => c.getAttribute("aria-pressed") === "true");

  it("offers every mood in both, in the same order", async () => {
    mount();
    await ready();
    const menu = Array.from(moodSelect().options).map((o) => o.textContent);
    expect(menu).toEqual(moods.map((m) => en(`moods.${m}`)));
    expect(chips().map((c) => c.textContent)).toEqual(menu);
  });

  it("shows exactly one active shortcut, the one that matches the menu, from the start", async () => {
    mount();
    await ready();
    expect(pressed().map((c) => c.textContent)).toEqual([en(`moods.${moods[0]}`)]);
    expect(moodSelect().value).toBe(moods[0]);
  });

  it("the active shortcut is visibly different from the others, and only that one", async () => {
    mount();
    await ready();
    fireEvent.change(moodSelect(), { target: { value: "Triumphant" } });
    const gold = (c: HTMLElement) => c.classList.contains("text-gold");
    expect(chips().filter(gold).map((c) => c.textContent)).toEqual([en("moods.Triumphant")]);
  });

  it("Triumphant chosen in the menu is the active shortcut, and the other way round", async () => {
    mount();
    await ready();
    fireEvent.change(moodSelect(), { target: { value: "Triumphant" } });
    expect(pressed().map((c) => c.textContent)).toEqual([en("moods.Triumphant")]);
    expect(readPrep(ANON)?.fields.mood).toBe("Triumphant");

    fireEvent.click(screen.getByRole("button", { name: en("moods.Hypnotic") }));
    expect(moodSelect().value).toBe("Hypnotic");
    expect(pressed().map((c) => c.textContent)).toEqual([en("moods.Hypnotic")]);

    fireEvent.click(screen.getByRole("button", { name: en("moods.Triumphant") }));
    expect(moodSelect().value).toBe("Triumphant");
    expect(pressed()).toHaveLength(1);
  });

  it.each(moods)("%s, put back from a stored preparation, is shown in the menu and as a shortcut", async (mood) => {
    savePrep(ANON, { prompt: "stored", genre: "Trap", mood, voice: "Alto" });
    mount();
    await waitFor(() => expect(promptBox().value).toBe("stored"));
    expect(moodSelect().value).toBe(mood);
    expect(pressed().map((c) => c.textContent)).toEqual([en(`moods.${mood}`)]);
  });

  it("the mood that is sent is the active one", async () => {
    signIn("alice");
    mount();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: en("moods.Triumphant") }));
    fireEvent.click(generateButton());
    await waitFor(() => expect(route).toHaveBeenCalled());
    const sent = JSON.parse(String((route.mock.calls[0][1] as RequestInit).body));
    expect(sent.mood).toBe(en("moods.Triumphant"));
  });

  it("the voice menu offers exactly the voices the figure beside the form counts", async () => {
    mount();
    await ready();
    expect((screen.getAllByRole("combobox")[2] as HTMLSelectElement).options).toHaveLength(
      STUDIO_VOICES.length,
    );
  });
});

describe("the example prompt follows the language of the interface", () => {
  let setLang: (l: Lang) => void = () => {};
  function LangProbe() {
    setLang = useI18n().setLang;
    return null;
  }
  function mountSwitchable() {
    return render(
      <AllProviders>
        <LangProbe />
        <AuthProvider>
          <CreditsProvider>
            <StudioComposer />
          </CreditsProvider>
        </AuthProvider>
      </AllProviders>,
    );
  }
  const example = (lang: Lang) => translate(lang, "studio.examplePrompt");

  it.each(LANGS.map((l) => l.code))("%s: the form opens with the example in that language", async (lang) => {
    localStorage.setItem("afm-lang", lang);
    mountSwitchable();
    await waitFor(() => expect(promptBox().value).toBe(example(lang)));
    if (lang !== "en") expect(promptBox().value).not.toBe(example("en"));
    // an example is not a preparation: nothing was saved by showing it
    expect(readPrep(ANON)).toBeNull();
  });

  it("switching the language changes the example while it is untouched, and saves nothing", async () => {
    mountSwitchable();
    await waitFor(() => expect(promptBox().value).toBe(example("en")));
    for (const lang of ["fr", "es", "zh", "pt", "ar", "en"] as const) {
      act(() => setLang(lang));
      await waitFor(() => expect(promptBox().value).toBe(example(lang)));
    }
    expect(readPrep(ANON)).toBeNull();
  });

  it("never touches words the member wrote, whatever the language", async () => {
    mountSwitchable();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "My own words about the sea" } });
    for (const lang of ["fr", "ar", "zh"] as const) {
      act(() => setLang(lang));
      await settle();
      expect(promptBox().value).toBe("My own words about the sea");
    }
    expect(readPrep(ANON)?.fields.prompt).toBe("My own words about the sea");
  });

  it("a stored preparation that kept the untouched example in another language follows the interface", async () => {
    savePrep(ANON, { prompt: example("fr"), genre: "Trap", mood: "Triumphant", voice: "Alto" });
    mountSwitchable();
    await waitFor(() => expect(promptBox().value).toBe(example("en")));
    expect(readPrep(ANON)?.fields.mood).toBe("Triumphant"); // the other choices are kept
  });

  it("a preparation that arrives later with the untouched example in another language follows the interface too", async () => {
    savePrep(memberOwner("alice"), { prompt: example("fr"), genre: "Trap", mood: "Triumphant", voice: "Alto" });
    mountSwitchable();
    await waitFor(() => expect(promptBox().value).toBe(example("en")));
    await ready();
    await act(async () => fake.emit("SIGNED_IN", makeSession("alice", "alice@example.test"))); // the language is settled; only now is the member's preparation put back
    await waitFor(() => expect(screen.getAllByRole("combobox")[1]).toHaveProperty("value", "Triumphant"));
    expect(promptBox().value).toBe(example("en"));
  });

  it("the example of the language in use is what a click on Generate would send", async () => {
    signIn("alice");
    localStorage.setItem("afm-lang", "es");
    mountSwitchable();
    await waitFor(() => expect(promptBox().value).toBe(example("es")));
    const go = () => screen.getByRole("button", { name: translate("es", "studio.generate") });
    await waitFor(() => expect(go().hasAttribute("disabled")).toBe(false));
    fireEvent.click(go());
    await waitFor(() => expect(route).toHaveBeenCalled());
    const sent = JSON.parse(String((route.mock.calls[0][1] as RequestInit).body));
    expect(sent.prompt).toBe(example("es"));
  });

  it("erasing the preparation brings back the example of the language in use", async () => {
    localStorage.setItem("afm-lang", "pt");
    savePrep(ANON, { prompt: "mine", genre: "Trap", mood: "Hypnotic", voice: "Alto" });
    mountSwitchable();
    await waitFor(() => expect(promptBox().value).toBe("mine"));
    fireEvent.click(screen.getByRole("button", { name: translate("pt", "studio.gen.prepClear") }));
    expect(promptBox().value).toBe(example("pt"));
  });
});
