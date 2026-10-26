// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { AllProviders } from "@/test/providers";
import { installFakeAudio } from "@/test/fakeAudio";
import { AuthProvider } from "@/auth/AuthProvider";
import { makeSession, type FakeSupabase } from "@/test/fakeSupabase";
import { navigations, setUpAccounts } from "@/test/authHarness";
import type { AuthHolder } from "@/test/clientMock";
import { CreditsProvider } from "@/library/CreditsProvider";
import { translate } from "@/i18n/translations";
import { peekReturnTo } from "@/auth/returnTo";
import { ANON, memberOwner, readPrep, savePrep, PREP_TTL_MS } from "@/studio/prep";
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
    [503, "ai_paused", "aiErrors.paused"],
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
    mount();
    // typed at once, before the session check has had time to finish
    fireEvent.change(promptBox(), { target: { value: "typed first" } });
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

  it("after a sign-out: nothing is kept, shown, played or paid for", async () => {
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
