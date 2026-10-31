// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { makeProfile, makeSession, type FakeSupabase } from "@/test/fakeSupabase";
import { expectNavigation, mountPage, setUpAccounts } from "@/test/authHarness";
import type { AuthHolder } from "@/test/clientMock";
import { toast } from "sonner";
import { authCopy } from "@/i18n/auth";
import { LANGS } from "@/i18n/translations";
import { ANON, hasPrep, memberOwner, readPrep, savePrep } from "@/studio/prep";

const holder = vi.hoisted(
  () => ({ fake: null, configured: true, startWithClient: true, snapshot: null }) as AuthHolder,
);
vi.mock("@tanstack/react-router", async () => (await import("@/test/routerMock")).routerModule);
vi.mock("@/integrations/supabase/client", async () =>
  (await import("@/test/clientMock")).clientModule(holder),
);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const disk = vi.hoisted(() => ({
  records: new Map<string, { id: string; ownerId?: string; blob: Blob }>(),
  loadGate: null as Promise<void> | null,
  events: [] as string[],
  failErase: false,
}));
vi.mock("@/library/generatedDrafts", () => ({
  getAllDrafts: async () => {
    if (disk.loadGate) await disk.loadGate;
    return [...disk.records.values()];
  },
  putDraft: async (r: { id: string; ownerId?: string; blob: Blob }) =>
    void disk.records.set(r.id, r),
  deleteDraft: async (id: string) => void disk.records.delete(id),
  claimUnownedDrafts: async (owner: string) => {
    const claimed = [...disk.records.values()]
      .filter((v) => (v as { id: string; ownerId?: string; blob: Blob }).ownerId === undefined)
      .map((v) => ({ ...(v as { id: string; ownerId?: string; blob: Blob }), ownerId: owner }));
    for (const r of claimed) disk.records.set(r.id, r);
    return claimed;
  },
  releaseDrafts: async (ids: string[], owner: string) => {
    let released = 0;
    for (const id of ids) {
      const v = disk.records.get(id) as { id: string; ownerId?: string; blob: Blob } | undefined;
      if (v && v.ownerId === owner) {
        disk.records.set(id, { ...v, ownerId: undefined });
        released++;
      }
    }
    return released;
  },
  deleteDraftIfOwned: async (id: string, owner: string) => {
    const v = disk.records.get(id) as { id: string; ownerId?: string; blob: Blob } | undefined;
    if (!v || v.ownerId !== owner) return false;
    disk.records.delete(id);
    return true;
  },
  deleteUnownedDrafts: async () => 0,
  deleteDraftsOf: async (owner: string) => {
    if (disk.failErase) throw new Error("transaction aborted");
    disk.events.push("erase-disk");
    for (const [id, v] of disk.records) if (v.ownerId === owner) disk.records.delete(id);
  },
}));

import { AccountMenu } from "./AccountMenu";
import { GeneratedDraftsProvider } from "@/library/GeneratedDraftsProvider";

let fake: FakeSupabase;
beforeEach(() => {
  fake = setUpAccounts(holder);
  disk.records.clear();
  disk.loadGate = null;
  disk.events = [];
  disk.failErase = false;
  vi.mocked(toast.error).mockClear();
  fake.restore(makeSession("alice", "alice@example.test"));
  fake.client.auth.signOut.mockImplementation(async () => {
    disk.events.push("sign-out");
    return { error: null };
  });
  fake.set("fetchProfile", {
    data: makeProfile({ id: "alice", display_name: "Alice" }),
    error: null,
  });
});
afterEach(() => cleanup());

const prep = { prompt: "my song", genre: "Trap", mood: "Warm", voice: "Alto" };

async function openMenuAndPressSignOut() {
  mountPage(AccountMenu);
  const trigger = await screen.findByRole("button", { name: /My account/ });
  fireEvent.keyDown(trigger, { key: "Enter" });
  await act(async () => fireEvent.click(await screen.findByRole("menuitem", { name: /Sign out/ })));
}

describe("signing out with a preparation kept on the device", () => {
  it("signs out at once when there is nothing to erase", async () => {
    await openMenuAndPressSignOut();
    await waitFor(() => expect(fake.client.auth.signOut).toHaveBeenCalledWith({ scope: "local" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expectNavigation("/"));
  });

  it("warns first, and does nothing more while the dialog is open", async () => {
    savePrep(memberOwner("alice"), prep);
    await openMenuAndPressSignOut();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(authCopy.en.signOutPrepTitle);
    expect(dialog.textContent).toContain(authCopy.en.signOutPrepDesc);
    expect(fake.client.auth.signOut).not.toHaveBeenCalled();
    expect(hasPrep(memberOwner("alice"))).toBe(true);
  });

  it("'Stay signed in' keeps the member signed in and the preparation intact", async () => {
    savePrep(memberOwner("alice"), prep);
    await openMenuAndPressSignOut();
    await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: authCopy.en.signOutPrepStay as string })),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(fake.client.auth.signOut).not.toHaveBeenCalled();
    expect(readPrep(memberOwner("alice"))?.fields.prompt).toBe("my song");
  });

  it("'Sign out and erase' erases this account's preparation, then signs out", async () => {
    savePrep(memberOwner("alice"), prep);
    savePrep(memberOwner("bob"), { ...prep, prompt: "bob's song" });
    savePrep(ANON, { ...prep, prompt: "a visitor's song" });
    await openMenuAndPressSignOut();
    await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: authCopy.en.signOutPrepConfirm as string }),
      ),
    );
    await waitFor(() => expect(fake.client.auth.signOut).toHaveBeenCalledWith({ scope: "local" }));
    expect(readPrep(memberOwner("alice"))).toBeNull();
    // only this account's slot goes: the others are not this member's to erase
    expect(readPrep(memberOwner("bob"))?.fields.prompt).toBe("bob's song");
    expect(readPrep(ANON)?.fields.prompt).toBe("a visitor's song");
    await waitFor(() => expectNavigation("/"));
  });

  it("an expired preparation does not trigger the warning", async () => {
    savePrep(memberOwner("alice"), prep, { now: Date.now() - 8 * 24 * 3_600_000 });
    await openMenuAndPressSignOut();
    await waitFor(() => expect(fake.client.auth.signOut).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("the warning exists in the six languages", () => {
  it.each(LANGS.map((l) => l.code))(
    "%s: four texts, no dash, the confirm button says it erases",
    (lang) => {
      const copy = authCopy[lang] as Record<string, unknown>;
      for (const key of [
        "signOutPrepTitle",
        "signOutPrepDesc",
        "signOutPrepConfirm",
        "signOutPrepStay",
      ]) {
        const value = copy[key];
        expect(typeof value, `${lang}.${key}`).toBe("string");
        expect((value as string).length).toBeGreaterThan(3);
        expect(value as string).not.toContain("—");
      }
      expect(copy.signOutPrepConfirm).not.toBe(copy.signOutPrepStay);
    },
  );
});

function MenuWithTracks() {
  return (
    <GeneratedDraftsProvider>
      <AccountMenu />
    </GeneratedDraftsProvider>
  );
}
async function pressSignOutWithTracks() {
  mountPage(MenuWithTracks);
  const trigger = await screen.findByRole("button", { name: /My account/ });
  fireEvent.keyDown(trigger, { key: "Enter" });
  await act(async () => fireEvent.click(await screen.findByRole("menuitem", { name: /Sign out/ })));
}
const track = (id: string, ownerId: string) => ({ id, ownerId, blob: new Blob([id]) });

describe("signing out with generated tracks kept on the device", () => {
  it("warns about the tracks even with no preparation, and 'Stay signed in' erases nothing", async () => {
    disk.records.set("t1", track("t1", "alice"));
    await pressSignOutWithTracks();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(authCopy.en.signOutPrepTitle);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: authCopy.en.signOutPrepStay as string })),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(disk.events).toEqual([]);
    expect(disk.records.has("t1")).toBe(true);
    expect(fake.client.auth.signOut).not.toHaveBeenCalled();
  });

  it("'Sign out and erase' erases this account's tracks from the disk BEFORE the session ends", async () => {
    disk.records.set("t1", track("t1", "alice"));
    disk.records.set("t2", track("t2", "alice"));
    disk.records.set("other", track("other", "bob"));
    await pressSignOutWithTracks();
    await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: authCopy.en.signOutPrepConfirm as string }),
      ),
    );
    await waitFor(() => expect(fake.client.auth.signOut).toHaveBeenCalled());
    expect(disk.events).toEqual(["erase-disk", "sign-out"]);
    expect([...disk.records.keys()]).toEqual(["other"]); // another account's tracks are not touched
  });

  it("with nothing to erase, signs out at once, and still sweeps the disk for this account", async () => {
    await pressSignOutWithTracks();
    await waitFor(() => expect(fake.client.auth.signOut).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(disk.events).toEqual(["erase-disk", "sign-out"]);
  });

  it("never erases, nor warns about, tracks that belong to nobody: they are not the member's to erase", async () => {
    disk.records.set("legacy", { id: "legacy", blob: new Blob(["l"]) }); // no owner
    await pressSignOutWithTracks();
    await waitFor(() => expect(fake.client.auth.signOut).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(disk.records.has("legacy")).toBe(true);
  });

  it("erases the account's own tracks and still leaves the unassigned ones on the disk", async () => {
    disk.records.set("legacy", { id: "legacy", blob: new Blob(["l"]) });
    disk.records.set("t1", track("t1", "alice"));
    await pressSignOutWithTracks();
    await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: authCopy.en.signOutPrepConfirm as string }),
      ),
    );
    await waitFor(() => expect(fake.client.auth.signOut).toHaveBeenCalled());
    expect([...disk.records.keys()]).toEqual(["legacy"]);
  });

  it("warns while the tracks are still being read: nothing is erased unannounced", async () => {
    let open!: () => void;
    disk.loadGate = new Promise<void>((resolve) => (open = resolve));
    disk.records.set("t1", track("t1", "alice"));
    await pressSignOutWithTracks();
    await screen.findByRole("alertdialog");
    expect(fake.client.auth.signOut).not.toHaveBeenCalled();
    open();
  });
});

describe("signing out when the disk refuses to erase the tracks", () => {
  it("signs out as asked, and tells the member that the tracks are still on this device", async () => {
    disk.records.set("t1", track("t1", "alice"));
    disk.failErase = true;
    await pressSignOutWithTracks();
    await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: authCopy.en.signOutPrepConfirm as string }),
      ),
    );
    await waitFor(() => expect(fake.client.auth.signOut).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(authCopy.en.signOutEraseFailed);
    expect(disk.records.has("t1")).toBe(true);
  });

  it("says nothing of the kind when the erase worked", async () => {
    disk.records.set("t1", track("t1", "alice"));
    await pressSignOutWithTracks();
    await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: authCopy.en.signOutPrepConfirm as string }),
      ),
    );
    await waitFor(() => expect(fake.client.auth.signOut).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
    expect(disk.records.has("t1")).toBe(false);
  });

  it.each(LANGS.map((l) => l.code))("%s: the warning exists, has no dash and is its own text", (code) => {
    const text = authCopy[code].signOutEraseFailed as string;
    expect(text).toBeTruthy();
    expect(text).not.toContain("—");
    if (code !== "en") expect(text).not.toBe(authCopy.en.signOutEraseFailed);
  });
});
