// @vitest-environment jsdom
// Lot A.3: the studio does not lose, show or claim what it should not (restoration, accounts, storage).
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import { AllProviders } from "@/test/providers";
import { installFakeAudio } from "@/test/fakeAudio";
import { AuthProvider } from "@/auth/AuthProvider";
import { makeSession, type FakeSupabase } from "@/test/fakeSupabase";
import { setUpAccounts } from "@/test/authHarness";
import type { AuthHolder } from "@/test/clientMock";
import { CreditsProvider } from "@/library/CreditsProvider";
import { translate } from "@/i18n/translations";
import { ANON, PREP_PREFIX, memberOwner, readPrep, savePrep } from "@/studio/prep";
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
vi.mock("@/library/draftsContext", () => ({
  DraftDiscardedError: class DraftDiscardedError extends Error {},
  useGeneratedDrafts: () => ({
    drafts: [],
    ready: true,
    removeDraft: async () => {},
    addDraft: async (meta: object) => ({ ...meta, url: "blob:kept" }),
    keepUrl: (url: string) => url,
    eraseMine: async () => true,
  }),
}));
vi.mock("@/audio/mixTrack", () => ({ composeFinalTrack: async (blob: Blob) => blob }));

const en = (key: string) => translate("en", key);
const STORED = {
  prompt: "My long idea about rain on a tin roof",
  genre: "Trap",
  mood: "Triumphant",
  voice: "Alto",
};
const BOB = { prompt: "Bob's own words", genre: "Amapiano", mood: "Intimate", voice: "Soprano" };
let fake: FakeSupabase;
let route: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fake = setUpAccounts(holder);
  installFakeAudio();
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }),
  );
  route = vi.fn(
    async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "X-Lyrics": btoa("la la la") },
      }),
  );
  vi.stubGlobal("fetch", route);
  for (const k of ["error", "success", "message", "warning"] as const) vi.mocked(toast[k]).mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mount = () =>
  render(
    <AllProviders>
      <AuthProvider>
        <CreditsProvider>
          <StudioComposer />
        </CreditsProvider>
      </AuthProvider>
    </AllProviders>,
  );
const card = () => screen.getByTestId("studio-composer");
const promptBox = () => screen.getByRole("textbox") as HTMLTextAreaElement;
const select = (i: number) => screen.getAllByRole("combobox")[i] as HTMLSelectElement;
const chips = () =>
  within(screen.getByRole("group", { name: en("studio.quickMoods") })).getAllByRole("button");
const pressed = () => chips().filter((c) => c.getAttribute("aria-pressed") === "true");
const generateButton = () => screen.getByRole("button", { name: en("studio.generate") });
const saveButton = () => screen.getByRole("button", { name: en("studio.saveDraft") });
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 20))));
const alice = () => makeSession("alice", "alice@example.test");
const bob = () => makeSession("bob", "bob@example.test");
const ready = () => waitFor(() => expect(generateButton().hasAttribute("disabled")).toBe(false));
/** Holds the session lookup, as a slow network would, and returns what releases it. */
function holdSession(id: string) {
  const session = makeSession(id, `${id}@example.test`);
  let release: () => void = () => {};
  (fake.client.auth.getSession as unknown as Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        release = () => resolve({ data: { session }, error: null });
      }),
  );
  return () => release();
}
/** The browser refuses to write the studio's preparation (quota, blocked storage), until told otherwise. */
function refuseWrites() {
  const set = Storage.prototype.setItem;
  const state = { refuse: true };
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    k: string,
    v: string,
  ) {
    if (state.refuse && k.startsWith(PREP_PREFIX)) throw new Error("QuotaExceededError");
    return set.call(this, k, v);
  });
  return state;
}

// ------------------------------------------------------------------ P0: nothing is lost while restoring
describe("the form is not shown, and cannot be edited, until the preparation is back", () => {
  it("shows no default value while the session is being looked up, then the stored preparation", async () => {
    savePrep(memberOwner("alice"), STORED);
    const release = holdSession("alice");
    mount();
    await settle();
    expect(card().getAttribute("aria-busy")).toBe("true");
    expect(pressed()).toHaveLength(0); // not "Euphoric", which is only the default
    expect(promptBox().className).toContain("text-transparent");
    expect(promptBox().disabled).toBe(true);
    expect(select(0).disabled && select(1).disabled && select(2).disabled).toBe(true);
    expect(chips().every((c) => c.hasAttribute("disabled"))).toBe(true);
    expect(generateButton().hasAttribute("disabled")).toBe(true);
    expect(saveButton().hasAttribute("disabled")).toBe(true);

    await act(async () => release());
    await waitFor(() => expect(card().getAttribute("aria-busy")).toBe("false"));
    expect(pressed().map((c) => c.textContent)).toEqual([en("moods.Triumphant")]);
    expect(promptBox().value).toBe(STORED.prompt);
    expect(promptBox().disabled).toBe(false);
    expect(promptBox().className).not.toContain("text-transparent");
  });

  it("a visitor's form is hidden the same way until the session is known", async () => {
    savePrep(ANON, STORED);
    const session = makeSession("x", "x@example.test");
    let release: () => void = () => {};
    (fake.client.auth.getSession as unknown as Mock).mockImplementation(
      () => new Promise((resolve) => (release = () => resolve({ data: { session: null }, error: null }))),
    );
    void session;
    mount();
    await settle();
    expect(card().getAttribute("aria-busy")).toBe("true");
    expect(pressed()).toHaveLength(0);
    await act(async () => release());
    await waitFor(() => expect(pressed().map((c) => c.textContent)).toEqual([en("moods.Triumphant")]));
  });

  it("words typed before the session answers keep the other stored choices", async () => {
    savePrep(memberOwner("alice"), STORED);
    const release = holdSession("alice");
    mount();
    await settle();
    fireEvent.change(promptBox(), { target: { value: "typed while it was loading" } });
    await act(async () => release());
    await settle();
    const after = readPrep(memberOwner("alice"))?.fields;
    expect(after).toEqual({ ...STORED, prompt: "typed while it was loading" });
    expect(select(0).value).toBe("Trap");
    expect(select(1).value).toBe("Triumphant");
    expect(select(2).value).toBe("Alto");
  });

  it("a choice made before the session answers keeps the stored prompt, genre and voice", async () => {
    savePrep(memberOwner("alice"), STORED);
    const release = holdSession("alice");
    mount();
    await settle();
    fireEvent.change(select(1), { target: { value: "Hypnotic" } });
    await act(async () => release());
    await settle();
    expect(readPrep(memberOwner("alice"))?.fields).toEqual({ ...STORED, mood: "Hypnotic" });
    expect(promptBox().value).toBe(STORED.prompt);
  });

  it("a click on a shortcut while it is loading changes nothing", async () => {
    savePrep(memberOwner("alice"), STORED);
    const release = holdSession("alice");
    mount();
    await settle();
    fireEvent.click(screen.getByRole("button", { name: en("moods.Hypnotic") }));
    await act(async () => release());
    await settle();
    expect(readPrep(memberOwner("alice"))?.fields).toEqual(STORED);
  });

  it("an account that takes over is never shown the previous account's words, not even for a moment", async () => {
    savePrep(memberOwner("alice"), STORED);
    savePrep(memberOwner("bob"), BOB);
    fake.restore(alice());
    mount();
    await waitFor(() => expect(promptBox().value).toBe(STORED.prompt));
    const busy: string[] = [];
    const watch = new MutationObserver((records) => {
      // what the attribute held before each change: "true" means it was hidden at some point
      for (const r of records) busy.push(String(r.oldValue));
    });
    watch.observe(card(), { attributes: true, attributeFilter: ["aria-busy"], attributeOldValue: true });
    await act(async () => fake.emit("SIGNED_IN", bob()));
    await waitFor(() => expect(promptBox().value).toBe(BOB.prompt));
    watch.disconnect();
    expect(busy).toContain("true"); // hidden while the other account's slot was being put back
    expect(select(0).value).toBe("Amapiano");
    expect(readPrep(memberOwner("alice"))?.fields).toEqual(STORED); // alice's slot untouched
  });
});

describe("what one account typed never reaches the next one", () => {
  it("alice's edits are not merged into bob's preparation, nor shown to him", async () => {
    savePrep(memberOwner("bob"), BOB);
    fake.restore(alice());
    mount();
    await waitFor(() => expect(generateButton().hasAttribute("disabled")).toBe(false));
    fireEvent.change(promptBox(), { target: { value: "alice typed this" } });
    fireEvent.click(screen.getByRole("button", { name: en("moods.Hypnotic") }));
    await act(async () => fake.emit("SIGNED_IN", bob()));
    await waitFor(() => expect(promptBox().value).toBe(BOB.prompt));
    expect(readPrep(memberOwner("bob"))?.fields).toEqual(BOB);
    expect(select(1).value).toBe("Intimate");
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("alice typed this");
  });

  it("a visitor's edits stay in the anonymous slot when an account signs in", async () => {
    savePrep(memberOwner("bob"), BOB);
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "visitor typed this" } });
    await act(async () => fake.emit("SIGNED_IN", bob()));
    await waitFor(() => expect(promptBox().value).toBe(BOB.prompt));
    expect(readPrep(memberOwner("bob"))?.fields).toEqual(BOB);
    expect(readPrep(ANON)?.fields.prompt).toBe("visitor typed this");
  });
});

describe("a session that ends elsewhere hands the form back to the visitor", () => {
  it("shows the visitor's own preparation, never the account that has just gone", async () => {
    savePrep(memberOwner("alice"), STORED);
    savePrep(ANON, BOB);
    fake.restore(alice());
    mount();
    await waitFor(() => expect(promptBox().value).toBe(STORED.prompt));
    await act(async () => fake.emit("SIGNED_OUT", null));
    await waitFor(() => expect(promptBox().value).toBe(BOB.prompt));
    expect(select(0).value).toBe("Amapiano");
    expect(select(1).value).toBe("Intimate");
    expect(select(2).value).toBe("Soprano");
    expect(readPrep(memberOwner("alice"))?.fields).toEqual(STORED); // hers, untouched
    expect(readPrep(ANON)?.fields).toEqual(BOB);
  });

  it("with nothing stored for the visitor, shows the example, not the account's words", async () => {
    savePrep(memberOwner("alice"), STORED);
    fake.restore(alice());
    mount();
    await waitFor(() => expect(promptBox().value).toBe(STORED.prompt));
    await act(async () => fake.emit("SIGNED_OUT", null));
    await waitFor(() => expect(promptBox().value).toBe(en("studio.examplePrompt")));
    expect(select(1).value).toBe("Euphoric");
    expect(pressed().map((c) => c.textContent)).toEqual([en("moods.Euphoric")]);
  });
});

describe("rapid edits and refused writes", () => {
  it("every one of the four fields, changed in quick succession, is kept and comes back after a reload", async () => {
    fake.restore(alice());
    const first = mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "four fields, one after the other" } });
    fireEvent.change(select(0), { target: { value: "Reggaeton" } });
    fireEvent.change(select(1), { target: { value: "Ethereal" } });
    fireEvent.change(select(2), { target: { value: "Soprano" } });
    const expected = {
      prompt: "four fields, one after the other",
      genre: "Reggaeton",
      mood: "Ethereal",
      voice: "Soprano",
    };
    expect(readPrep(memberOwner("alice"))?.fields).toEqual(expected);
    first.unmount();
    cleanup();

    mount();
    await waitFor(() => expect(promptBox().value).toBe(expected.prompt));
    expect(select(0).value).toBe("Reggaeton");
    expect(select(1).value).toBe("Ethereal");
    expect(select(2).value).toBe("Soprano");
    expect(pressed().map((c) => c.textContent)).toEqual([en("moods.Ethereal")]);
  });

  it("a refused write leaves the earlier stored copy as it was, and the form keeps what was typed", async () => {
    savePrep(memberOwner("alice"), STORED);
    fake.restore(alice());
    mount();
    await waitFor(() => expect(promptBox().value).toBe(STORED.prompt));
    const before = localStorage.getItem(PREP_PREFIX + "u:alice");
    refuseWrites();
    fireEvent.change(promptBox(), { target: { value: "typed but refused" } });
    expect(localStorage.getItem(PREP_PREFIX + "u:alice")).toBe(before); // the old copy is intact
    expect(promptBox().value).toBe("typed but refused"); // what is on screen is not taken away
    expect(await screen.findByText(en("studio.gen.saveFailed"))).toBeTruthy();
  });

  it("a write refused at the very moment of the restoration is reported, and the typed fields stay on screen", async () => {
    savePrep(memberOwner("alice"), STORED);
    const release = holdSession("alice");
    mount();
    await settle();
    fireEvent.change(select(2), { target: { value: "Instrumental" } });
    refuseWrites();
    await act(async () => release());
    await settle();
    expect(select(2).value).toBe("Instrumental");
    expect(promptBox().value).toBe(STORED.prompt); // the stored fields are still what the form shows
    expect(await screen.findByText(en("studio.gen.saveFailed"))).toBeTruthy();
    expect(readPrep(memberOwner("alice"))?.fields).toEqual(STORED); // and the stored copy was not damaged
  });
});

describe("a preparation older than seven days", () => {
  it("is not put back, is erased from the device, and nothing announces an expiry for it", async () => {
    const old = Date.now() - 8 * 24 * 3_600_000;
    savePrep(memberOwner("alice"), STORED, { now: old });
    fake.restore(alice());
    mount();
    await ready();
    expect(promptBox().value).toBe(en("studio.examplePrompt"));
    expect(select(1).value).toBe("Euphoric");
    expect(localStorage.getItem(PREP_PREFIX + "u:alice")).toBeNull();
    expect(screen.queryByTestId("prep-expiry")).toBeNull();
    expect(screen.queryByText(en("studio.gen.prepResumed"))).toBeNull();
  });

  it("one that is six days old is still there", async () => {
    savePrep(memberOwner("alice"), STORED, { now: Date.now() - 6 * 24 * 3_600_000 });
    fake.restore(alice());
    mount();
    await waitFor(() => expect(promptBox().value).toBe(STORED.prompt));
    expect(screen.getByTestId("prep-expiry")).toBeTruthy();
  });
});

// ------------------------------------------------------------------ P0: nothing is shown to another account
describe("a generated result belongs to the account that made it", () => {
  async function generated() {
    fake.restore(alice());
    mount();
    await ready();
    fireEvent.click(generateButton());
    await waitFor(() => expect(screen.getByText(en("studio.gen.resultTitle"))).toBeTruthy());
    expect(screen.getByText("la la la")).toBeTruthy();
  }
  const gone = () => {
    expect(screen.queryByText("la la la")).toBeNull();
    expect(screen.queryByText(en("studio.gen.resultTitle"))).toBeNull();
    expect(screen.queryByRole("link", { name: en("studio.gen.download") })).toBeNull();
  };

  it("another account signing in on the same page does not see it", async () => {
    await generated();
    await act(async () => fake.emit("SIGNED_IN", bob()));
    await settle();
    gone();
  });

  it("a session that ends elsewhere removes it", async () => {
    await generated();
    await act(async () => fake.emit("SIGNED_OUT", null));
    await settle();
    gone();
  });

  it("the account that made it keeps it through a session refresh", async () => {
    await generated();
    await act(async () => fake.emit("TOKEN_REFRESHED", alice()));
    await settle();
    expect(screen.getByText("la la la")).toBeTruthy();
  });

  it("the next account only ever sees its own result", async () => {
    await generated();
    await act(async () => fake.emit("SIGNED_IN", bob()));
    await settle();
    route.mockResolvedValue(
      new Response(new Uint8Array([4, 5]), { status: 200, headers: { "X-Lyrics": btoa("bob lyrics") } }),
    );
    await ready();
    fireEvent.click(generateButton());
    await waitFor(() => expect(screen.getByText("bob lyrics")).toBeTruthy());
    expect(screen.queryByText("la la la")).toBeNull();
  });
});

describe("the downloaded file carries the right extension", () => {
  const download = async (type: string) => {
    route.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "X-Lyrics": btoa("la la la"), "Content-Type": type },
      }),
    );
    fake.restore(alice());
    mount();
    await ready();
    fireEvent.click(generateButton());
    const link = await screen.findByRole("link", { name: en("studio.gen.download") });
    return link.getAttribute("download") ?? "";
  };

  it("is .wav for the studio's own mix", async () => {
    expect(await download("audio/wav")).toMatch(/.wav$/);
  });

  it("is .mp3 for a bare vocal, when the mix could not be made", async () => {
    expect(await download("audio/mpeg")).toMatch(/.mp3$/);
  });
});

// ------------------------------------------------------------------ P1: a failed save is detected and said
describe("a preparation that could not be saved is never presented as kept", () => {
  it("says so as soon as the browser refuses a member's edit, and stops saying it when it works again", async () => {
    fake.restore(alice());
    mount();
    await ready();
    const writes = refuseWrites();
    fireEvent.change(promptBox(), { target: { value: "words the browser will not keep" } });
    expect(await screen.findByText(en("studio.gen.saveFailed"))).toBeTruthy();
    expect(screen.queryByTestId("prep-expiry")).toBeNull(); // nothing is kept, so nothing expires
    writes.refuse = false;
    fireEvent.change(promptBox(), { target: { value: "words the browser keeps" } });
    await waitFor(() => expect(screen.queryByText(en("studio.gen.saveFailed"))).toBeNull());
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("words the browser keeps");
  });

  it("the pause notice does not claim the preparation is kept when it was not saved", async () => {
    fake.restore(alice());
    mount();
    await ready();
    refuseWrites();
    fireEvent.change(promptBox(), { target: { value: "words the browser will not keep" } });
    route.mockResolvedValue(Response.json({ error: "x", code: "ai_paused" }, { status: 503 }));
    fireEvent.click(generateButton());
    await waitFor(() => expect(screen.queryByText(en("studio.gen.pausedNoticeUnsaved"))).not.toBeNull());
    expect(screen.queryByText(en("studio.gen.pausedNotice"))).toBeNull();
  });

  it("the pause notice still says it is kept when it was", async () => {
    fake.restore(alice());
    mount();
    await ready();
    route.mockResolvedValue(Response.json({ error: "x", code: "ai_paused" }, { status: 503 }));
    fireEvent.click(generateButton());
    await waitFor(() => expect(screen.queryByText(en("studio.gen.pausedNotice"))).not.toBeNull());
    expect(screen.queryByText(en("studio.gen.pausedNoticeUnsaved"))).toBeNull();
  });

  it("a visitor sent to sign in is not told the preparation is kept when it was not saved", async () => {
    mount();
    await ready();
    refuseWrites();
    fireEvent.click(generateButton());
    await settle();
    expect(toast.message).toHaveBeenCalledWith(en("studio.gen.signInFirstUnsaved"));
    expect(toast.message).not.toHaveBeenCalledWith(en("studio.gen.signInFirst"));
  });

  it("a visitor whose browser refuses the edit gets no 'kept on this device' notice", async () => {
    mount();
    await ready();
    refuseWrites();
    fireEvent.change(promptBox(), { target: { value: "not kept" } });
    expect(await screen.findByText(en("studio.gen.saveFailed"))).toBeTruthy();
    expect(screen.queryByTestId("anon-limits")).toBeNull();
  });
});

// ------------------------------------------------------------------ P1: "Save draft" does what it says
describe("the Save draft button saves the preparation, and says what happened", () => {
  it("saves a member's preparation on this device and confirms it", async () => {
    fake.restore(alice());
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "to be saved" } });
    localStorage.removeItem(PREP_PREFIX + "u:alice"); // as if it had been lost since the last edit
    fireEvent.click(saveButton());
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("to be saved");
    expect(toast.success).toHaveBeenCalledWith(en("studio.gen.prepSaved"));
  });

  it("saves a visitor's preparation in the anonymous slot only", async () => {
    mount();
    await ready();
    fireEvent.change(promptBox(), { target: { value: "visitor words" } });
    localStorage.removeItem(PREP_PREFIX + "anon");
    fireEvent.click(saveButton());
    expect(readPrep(ANON)?.fields.prompt).toBe("visitor words");
    expect(toast.success).toHaveBeenCalledWith(en("studio.gen.prepSaved"));
  });

  it("says plainly when the browser refuses, and never confirms", async () => {
    fake.restore(alice());
    mount();
    await ready();
    refuseWrites();
    fireEvent.click(saveButton());
    expect(toast.error).toHaveBeenCalledWith(en("studio.gen.saveFailed"));
    expect(toast.success).not.toHaveBeenCalledWith(en("studio.gen.prepSaved"));
    expect(await screen.findByText(en("studio.gen.saveFailed"))).toBeTruthy();
  });

  it("is not available while a track is being made", async () => {
    fake.restore(alice());
    let finish: (r: Response) => void = () => {};
    route.mockImplementation(() => new Promise<Response>((resolve) => (finish = resolve)));
    mount();
    await ready();
    fireEvent.click(generateButton());
    await waitFor(() => expect(saveButton().hasAttribute("disabled")).toBe(true));
    await act(async () => finish(new Response(new Uint8Array([1]), { status: 200 })));
  });
});

// ------------------------------------------------------------------ P1: erasing the preparation is confirmed
describe("erasing the preparation asks first", () => {
  const erase = () => fireEvent.click(screen.getByRole("button", { name: en("studio.gen.prepClear") }));

  async function resumed() {
    savePrep(memberOwner("alice"), STORED);
    fake.restore(alice());
    mount();
    await waitFor(() => expect(promptBox().value).toBe(STORED.prompt));
  }

  it("keeps everything until the member confirms", async () => {
    await resumed();
    erase();
    const box = await screen.findByRole("alertdialog");
    expect(within(box).getByText(en("studio.gen.prepClearTitle"))).toBeTruthy();
    expect(readPrep(memberOwner("alice"))?.fields).toEqual(STORED);
    expect((screen.getByRole("textbox", { hidden: true }) as HTMLTextAreaElement).value).toBe(
      STORED.prompt,
    );
  });

  it("cancelling erases nothing", async () => {
    await resumed();
    erase();
    const box = await screen.findByRole("alertdialog");
    fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.dialogCancel") }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(readPrep(memberOwner("alice"))?.fields).toEqual(STORED);
    expect(toast.success).not.toHaveBeenCalledWith(en("studio.gen.prepCleared"));
  });

  it("confirming erases it and brings back the example", async () => {
    await resumed();
    erase();
    const box = await screen.findByRole("alertdialog");
    fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.prepClearConfirm") }));
    await waitFor(() => expect(readPrep(memberOwner("alice"))).toBeNull());
    expect(promptBox().value).toBe(en("studio.examplePrompt"));
    expect(toast.success).toHaveBeenCalledWith(en("studio.gen.prepCleared"));
  });

  it("an account change while the question is open closes it and erases nothing, for anyone", async () => {
    savePrep(memberOwner("alice"), STORED);
    savePrep(memberOwner("bob"), BOB);
    fake.restore(alice());
    mount();
    await waitFor(() => expect(promptBox().value).toBe(STORED.prompt));
    erase();
    await screen.findByRole("alertdialog");
    await act(async () => fake.emit("SIGNED_IN", bob()));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(readPrep(memberOwner("bob"))?.fields).toEqual(BOB);
    expect(readPrep(memberOwner("alice"))?.fields).toEqual(STORED);
  });
});

// ------------------------------------------------------------------ P2: the seven days are announced
describe("the seven days are announced wherever a preparation is kept", () => {
  it("is shown once the preparation is kept, for a member and for a visitor", async () => {
    fake.restore(alice());
    const first = mount();
    await ready();
    expect(screen.queryByTestId("prep-expiry")).toBeNull(); // nothing is kept yet
    fireEvent.change(promptBox(), { target: { value: "kept now" } });
    expect((await screen.findByTestId("prep-expiry")).textContent).toBe(en("studio.gen.prepExpiry"));
    first.unmount();
    cleanup();
    fake.restore(null);
    savePrep(ANON, STORED);
    mount();
    expect((await screen.findByTestId("prep-expiry")).textContent).toBe(en("studio.gen.prepExpiry"));
  });

  it("is gone when the preparation is erased", async () => {
    savePrep(memberOwner("alice"), STORED);
    fake.restore(alice());
    mount();
    expect(await screen.findByTestId("prep-expiry")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: en("studio.gen.prepClear") }));
    const box = await screen.findByRole("alertdialog");
    fireEvent.click(within(box).getByRole("button", { name: en("studio.gen.prepClearConfirm") }));
    await waitFor(() => expect(screen.queryByTestId("prep-expiry")).toBeNull());
  });
});
