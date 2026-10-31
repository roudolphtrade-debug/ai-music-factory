// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

// The account is a switch, the disk is an in-memory store with gates to hold an operation half way:
// nothing real is touched.
const auth = vi.hoisted(() => ({
  status: "signedIn" as "loading" | "signedOut" | "signedIn",
  user: { id: "alice" } as { id: string } | null,
}));
vi.mock("@/auth/context", () => ({ useAuth: () => ({ status: auth.status, user: auth.user }) }));

type Rec = { id: string; ownerId?: string; blob: Blob; title: string };
const disk = vi.hoisted(() => ({
  records: new Map<string, unknown>(),
  loadGate: null as Promise<void> | null,
  writeGate: null as Promise<void> | null,
  afterClaimGate: null as Promise<void> | null,
  deletedFor: [] as string[],
  puts: [] as string[],
  failPut: null as string | null,
  failLoad: false,
  failErase: false,
}));
vi.mock("@/library/generatedDrafts", () => ({
  getAllDrafts: async () => {
    if (disk.loadGate) await disk.loadGate;
    if (disk.failLoad) throw new Error("indexeddb unavailable");
    return [...disk.records.values()];
  },
  putDraft: async (record: { id: string }) => {
    if (disk.writeGate) await disk.writeGate;
    if (disk.failPut === record.id) throw new Error("quota");
    disk.puts.push(record.id);
    disk.records.set(record.id, record);
  },
  deleteUnownedDrafts: async () => {
    let removed = 0;
    for (const [id, value] of disk.records) {
      if ((value as Rec).ownerId === undefined) {
        disk.records.delete(id);
        removed++;
      }
    }
    return removed;
  },
  deleteDraft: async (id: string) => void disk.records.delete(id),
  claimUnownedDrafts: async (owner: string) => {
    if (disk.writeGate) await disk.writeGate;
    const unowned = [...disk.records.values()].filter(
      (v) => (v as Rec).ownerId === undefined,
    ) as Rec[];
    // one transaction: a failure on any record aborts it, and nothing is attached
    if (disk.failPut && unowned.some((r) => r.id === disk.failPut))
      throw new Error("transaction aborted");
    const claimed = unowned.map((r) => ({ ...r, ownerId: owner }));
    for (const r of claimed) disk.records.set(r.id, r);
    // the transaction has committed; the answer is still on its way back (the dangerous window)
    if (disk.afterClaimGate) await disk.afterClaimGate;
    return claimed;
  },
  releaseDrafts: async (ids: string[], owner: string) => {
    let released = 0;
    for (const id of ids) {
      const v = disk.records.get(id) as Rec | undefined;
      if (v && v.ownerId === owner) {
        disk.records.set(id, { ...v, ownerId: undefined });
        released++;
      }
    }
    return released;
  },
  deleteDraftIfOwned: async (id: string, owner: string) => {
    const v = disk.records.get(id) as Rec | undefined;
    if (!v || v.ownerId !== owner) return false;
    disk.records.delete(id);
    return true;
  },
  deleteDraftsOf: async (owner: string) => {
    if (disk.failErase) throw new Error("transaction aborted");
    disk.deletedFor.push(owner);
    for (const [id, value] of disk.records) {
      if ((value as Rec).ownerId === owner) disk.records.delete(id);
    }
  },
}));

import { GeneratedDraftsProvider } from "./GeneratedDraftsProvider";
import { DraftDiscardedError, useGeneratedDrafts } from "./draftsContext";
import { onDraftsErased } from "./draftEvents";

const rec = (id: string, ownerId: string | undefined, title = id): Rec => ({
  id,
  ownerId,
  title,
  blob: new Blob([id]),
});
const gate = () => {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => (open = resolve));
  return { promise, open };
};

let api: ReturnType<typeof useGeneratedDrafts>;
function Probe() {
  api = useGeneratedDrafts();
  return null;
}
const mount = () =>
  render(
    <GeneratedDraftsProvider>
      <Probe />
    </GeneratedDraftsProvider>,
  );
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));
const meta = (id: string) =>
  ({
    id,
    title: id,
    prompt: "p",
    genre: "Trap",
    mood: "Warm",
    voice: "Alto",
    lyrics: "l",
    duration: "0:20",
    createdAt: 1,
  }) as const;

let created: string[];
let revoked: string[];
let erasedNotices: string[][];
let stopListening: () => void;
beforeEach(() => {
  auth.status = "signedIn";
  auth.user = { id: "alice" };
  disk.records.clear();
  disk.loadGate = null;
  disk.writeGate = null;
  disk.afterClaimGate = null;
  disk.deletedFor = [];
  disk.puts = [];
  disk.failPut = null;
  disk.failLoad = false;
  disk.failErase = false;
  created = [];
  revoked = [];
  erasedNotices = [];
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: () => {
        const url = `blob:test-${created.length}`;
        created.push(url);
        return url;
      },
      revokeObjectURL: (url: string) => void revoked.push(url),
    }),
  );
  stopListening = onDraftsErased((urls) => erasedNotices.push([...urls]));
});
afterEach(() => {
  stopListening();
  cleanup();
  vi.unstubAllGlobals();
});

describe("whose drafts these are", () => {
  it("shows an account its own drafts and nobody else's", async () => {
    disk.records.set("a1", rec("a1", "alice"));
    disk.records.set("b1", rec("b1", "bob"));
    mount();
    await settle();
    expect(api.drafts.map((d) => d.id)).toEqual(["a1"]);
    expect(api.ready).toBe(true);
  });

  it("shows nothing at all to a visitor, and does not read the disk for them", async () => {
    disk.records.set("a1", rec("a1", "alice"));
    auth.status = "signedOut";
    auth.user = null;
    mount();
    await settle();
    expect(api.drafts).toEqual([]);
    expect(api.ready).toBe(true);
    expect(created).toHaveLength(0);
  });

  it("leaves a track from before accounts alone: not attached, not shown, not written, no address made", async () => {
    disk.records.set("old", rec("old", undefined));
    mount();
    await settle();
    expect(api.drafts).toEqual([]);
    expect(api.unassignedCount).toBe(1);
    expect((disk.records.get("old") as Rec).ownerId).toBeUndefined();
    expect(disk.puts).toEqual([]); // nothing was written for it
    expect(created).toHaveLength(0); // and no temporary address was made for its audio
  });

  it("another account taking over drops the first account's drafts from memory and revokes their addresses", async () => {
    disk.records.set("a1", rec("a1", "alice"));
    const view = mount();
    await settle();
    expect(created).toHaveLength(1);

    // the session of Alice ended without a sign-out, Bob signs in on the same device
    auth.user = { id: "bob" };
    view.rerender(
      <GeneratedDraftsProvider>
        <Probe />
      </GeneratedDraftsProvider>,
    );
    await settle();
    expect(api.drafts).toEqual([]);
    expect(revoked).toContain("blob:test-0");
    expect(erasedNotices.flat()).toContain("blob:test-0");
    // Alice's track is still hers on disk (no deliberate sign-out), invisible to Bob
    expect(disk.records.has("a1")).toBe(true);
  });
});

describe("a deliberate sign-out erases the account's drafts", () => {
  it("empties the disk (this account only), the memory, and every temporary address", async () => {
    disk.records.set("a1", rec("a1", "alice"));
    disk.records.set("a2", rec("a2", "alice"));
    disk.records.set("b1", rec("b1", "bob"));
    mount();
    await settle();
    const kept = api.keepUrl("blob:not-saved-track"); // a track the device could not keep
    expect(kept).toBe("blob:not-saved-track");

    await act(async () => api.eraseMine());

    expect(api.drafts).toEqual([]);
    expect([...disk.records.keys()]).toEqual(["b1"]);
    expect(disk.deletedFor).toEqual(["alice"]);
    expect(revoked.sort()).toEqual(["blob:not-saved-track", "blob:test-0", "blob:test-1"]);
    // the player is told, so that it lets go of those tracks
    expect(erasedNotices.flat().sort()).toEqual([
      "blob:not-saved-track",
      "blob:test-0",
      "blob:test-1",
    ]);
  });
});

describe("a late answer does not bring anything back", () => {
  it("a track written after the sign-out is deleted again and refused", async () => {
    mount();
    await settle();
    const hold = gate();
    disk.writeGate = hold.promise;
    let outcome: unknown = "pending";
    const adding = api.addDraft(meta("late"), new Blob(["audio"])).catch((e) => (outcome = e));

    await act(async () => api.eraseMine()); // the member signs out while the track is being written
    hold.open();
    await act(async () => void (await adding));

    expect(outcome).toBeInstanceOf(DraftDiscardedError);
    expect(disk.records.has("late")).toBe(false); // written by the late answer, then undone
    expect(api.drafts).toEqual([]);
    expect(created).toHaveLength(0); // no address was even created for it
  });

  it("a track whose answer arrives after another account signed in is refused too", async () => {
    const view = mount();
    await settle();
    const hold = gate();
    disk.writeGate = hold.promise;
    let outcome: unknown = "pending";
    const adding = api.addDraft(meta("late"), new Blob(["audio"])).catch((e) => (outcome = e));

    auth.user = { id: "bob" };
    view.rerender(
      <GeneratedDraftsProvider>
        <Probe />
      </GeneratedDraftsProvider>,
    );
    await settle();
    hold.open();
    await act(async () => void (await adding));

    expect(outcome).toBeInstanceOf(DraftDiscardedError);
    expect(disk.records.has("late")).toBe(false);
    expect(api.drafts).toEqual([]);
  });

  it("an add with nobody signed in is refused outright and writes nothing", async () => {
    auth.status = "signedOut";
    auth.user = null;
    mount();
    await settle();
    await expect(api.addDraft(meta("x"), new Blob(["a"]))).rejects.toBeInstanceOf(
      DraftDiscardedError,
    );
    expect(disk.records.size).toBe(0);
  });

  it("the list read from the disk after the sign-out is not put back on screen", async () => {
    disk.records.set("a1", rec("a1", "alice"));
    const hold = gate();
    disk.loadGate = hold.promise;
    const view = mount();
    await settle();
    expect(api.ready).toBe(false);

    auth.status = "signedOut";
    auth.user = null;
    view.rerender(
      <GeneratedDraftsProvider>
        <Probe />
      </GeneratedDraftsProvider>,
    );
    await settle();
    hold.open();
    await settle();

    expect(api.drafts).toEqual([]);
    expect(created).toHaveLength(0);
  });

  it("a track saved normally while signed in is kept, listed first, and readable", async () => {
    mount();
    await settle();
    let draft!: Awaited<ReturnType<typeof api.addDraft>>;
    await act(async () => {
      draft = await api.addDraft(meta("fresh"), new Blob(["audio"]));
    });
    expect(draft.url).toBe("blob:test-0");
    expect(api.drafts.map((d) => d.id)).toEqual(["fresh"]);
    expect((disk.records.get("fresh") as Rec).ownerId).toBe("alice");
  });
});

describe("tracks from before accounts", () => {
  const withLegacy = () => {
    disk.records.set("l1", rec("l1", undefined));
    disk.records.set("l2", rec("l2", undefined));
  };
  const remount = (view: ReturnType<typeof mount>) =>
    view.rerender(
      <GeneratedDraftsProvider>
        <Probe />
      </GeneratedDraftsProvider>,
    );
  const ownersOnDisk = () =>
    [...disk.records.values()]
      .map((r) => `${(r as Rec).id}:${(r as Rec).ownerId ?? "none"}`)
      .sort();

  it("are attached to no account by simply signing in, whoever signs in, however often", async () => {
    withLegacy();
    const view = mount();
    await settle();
    expect(api.unassignedCount).toBe(2);
    for (const id of ["bob", "carol", "alice"]) {
      auth.user = { id };
      remount(view);
      await settle();
      expect(api.drafts).toEqual([]);
      expect(api.unassignedCount).toBe(2);
    }
    expect(ownersOnDisk()).toEqual(["l1:none", "l2:none"]);
    expect(disk.puts).toEqual([]);
  });

  it("stay where they are when nothing is confirmed, including after a sign-out", async () => {
    withLegacy();
    disk.records.set("a1", rec("a1", "alice"));
    mount();
    await settle();
    await act(async () => api.eraseMine());
    expect(ownersOnDisk()).toEqual(["l1:none", "l2:none"]); // only Alice's own went
  });

  it("are shown to nobody at all while nobody is signed in", async () => {
    withLegacy();
    auth.status = "signedOut";
    auth.user = null;
    mount();
    await settle();
    expect(api.drafts).toEqual([]);
    expect(api.unassignedCount).toBe(0);
  });

  it("are attached to the account that confirms, and to that account only", async () => {
    withLegacy();
    const view = mount();
    await settle();
    let result!: Awaited<ReturnType<typeof api.claimUnassigned>>;
    await act(async () => {
      result = await api.claimUnassigned();
    });
    expect(result).toEqual({ moved: 2, failed: false, cancelled: false });
    expect(api.drafts.map((d) => d.id).sort()).toEqual(["l1", "l2"]);
    expect(api.unassignedCount).toBe(0);
    expect(ownersOnDisk()).toEqual(["l1:alice", "l2:alice"]);

    // another account on the same device finds neither the tracks nor anything left to take
    auth.user = { id: "bob" };
    remount(view);
    await settle();
    expect(api.drafts).toEqual([]);
    expect(api.unassignedCount).toBe(0);
    expect(ownersOnDisk()).toEqual(["l1:alice", "l2:alice"]);
  });

  it("are deleted, and only they, when the deletion is confirmed", async () => {
    withLegacy();
    disk.records.set("a1", rec("a1", "alice"));
    disk.records.set("b1", rec("b1", "bob"));
    mount();
    await settle();
    let removed = -1;
    await act(async () => {
      removed = await api.deleteUnassigned();
    });
    expect(removed).toBe(2);
    expect(ownersOnDisk()).toEqual(["a1:alice", "b1:bob"]);
    expect(api.unassignedCount).toBe(0);
    expect(api.drafts.map((d) => d.id)).toEqual(["a1"]);
  });
});

// REPRODUCTION AND NON-REGRESSION, point 1 of the audit: the attachment is all or nothing, and a change of
// account while it is being written can never leave tracks attached to the account that has gone.
describe("the recovery is atomic and safe against a change of account", () => {
  const withLegacy = () => {
    disk.records.set("l1", rec("l1", undefined));
    disk.records.set("l2", rec("l2", undefined));
    disk.records.set("l3", rec("l3", undefined));
  };
  const remount = (view: ReturnType<typeof mount>) =>
    view.rerender(
      <GeneratedDraftsProvider>
        <Probe />
      </GeneratedDraftsProvider>,
    );
  const ownersOnDisk = () =>
    [...disk.records.values()]
      .map((r) => `${(r as Rec).id}:${(r as Rec).ownerId ?? "none"}`)
      .sort();

  it("a failure on any track attaches none of them: no half-attached state", async () => {
    withLegacy();
    mount();
    await settle();
    disk.failPut = "l2"; // the middle one cannot be written
    let result!: Awaited<ReturnType<typeof api.claimUnassigned>>;
    await act(async () => {
      result = await api.claimUnassigned();
    });
    expect(ownersOnDisk()).toEqual(["l1:none", "l2:none", "l3:none"]);
    expect(api.drafts).toEqual([]);
    expect(api.unassignedCount).toBe(3);
    expect(result).toEqual({ moved: 0, failed: true, cancelled: false });
  });

  it("another account signing in while the attachment is being written: everything goes back to unassigned", async () => {
    withLegacy();
    const view = mount();
    await settle();
    const hold = gate();
    disk.writeGate = hold.promise;
    const claiming = api.claimUnassigned();
    auth.user = { id: "bob" };
    remount(view);
    await settle();
    hold.open();
    let result!: Awaited<ReturnType<typeof api.claimUnassigned>>;
    await act(async () => {
      result = await claiming;
    });
    await settle();
    expect(ownersOnDisk()).toEqual(["l1:none", "l2:none", "l3:none"]); // none attached to the account that left
    expect(api.drafts).toEqual([]); // Bob sees nothing of what Alice confirmed
    expect(api.unassignedCount).toBe(3); // and they are still there to decide about
    expect(result).toEqual({ moved: 0, failed: false, cancelled: true });
  });

  it("a deliberate sign-out while the attachment is being written leaves nothing attached to the account that left", async () => {
    withLegacy();
    disk.records.set("a1", rec("a1", "alice"));
    mount();
    await settle();
    const hold = gate();
    disk.writeGate = hold.promise;
    const claiming = api.claimUnassigned();
    const erasing = api.eraseMine(); // Alice signs out and erases, mid-way
    hold.open();
    await act(async () => void (await Promise.all([claiming, erasing])));
    await settle();
    // her own track went with the sign-out; the unassigned ones did not become hers, and are not lost
    expect(ownersOnDisk()).toEqual(["l1:none", "l2:none", "l3:none"]);
    expect(api.drafts).toEqual([]);
  });

  it("a sign-out right after the attachment committed, before its answer came back, does not erase the tracks she never chose to lose", async () => {
    withLegacy();
    disk.records.set("a1", rec("a1", "alice"));
    mount();
    await settle();
    const hold = gate();
    disk.afterClaimGate = hold.promise;
    const claiming = api.claimUnassigned();
    await settle(); // the attachment has committed: the tracks are Alice's on the disk, the answer is held back
    expect(ownersOnDisk()).toEqual(["a1:alice", "l1:alice", "l2:alice", "l3:alice"]);

    const erasing = api.eraseMine(); // Alice signs out and erases, in that very window
    hold.open();
    await act(async () => void (await Promise.all([claiming, erasing])));
    await settle();
    // her own track is gone; the three others went back to nobody's instead of being erased with it
    expect(ownersOnDisk()).toEqual(["l1:none", "l2:none", "l3:none"]);
  });

  it("a sign-out after the attachment finished erases her tracks, claimed ones included (her own data)", async () => {
    withLegacy();
    mount();
    await settle();
    await act(async () => void (await api.claimUnassigned()));
    expect(ownersOnDisk()).toEqual(["l1:alice", "l2:alice", "l3:alice"]);
    await act(async () => api.eraseMine());
    expect(ownersOnDisk()).toEqual([]);
  });
});

// REPRODUCTION AND NON-REGRESSION, point 3 of the audit: removing a track checks the owner at the moment of
// the deletion, so a stale call can never delete another account's title.
describe("removing a track never touches another account's track", () => {
  const remount = (view: ReturnType<typeof mount>) =>
    view.rerender(
      <GeneratedDraftsProvider>
        <Probe />
      </GeneratedDraftsProvider>,
    );

  it("removes the signed-in account's own track", async () => {
    disk.records.set("a1", rec("a1", "alice"));
    mount();
    await settle();
    let removed = false;
    await act(async () => {
      removed = await api.removeDraft("a1");
    });
    expect(removed).toBe(true);
    expect(disk.records.has("a1")).toBe(false);
    expect(api.drafts).toEqual([]);
  });

  it("a delete function kept from Alice's session, called after Bob signed in, deletes nothing of hers", async () => {
    disk.records.set("a1", rec("a1", "alice"));
    const view = mount();
    await settle();
    const stale = api.removeDraft; // what a button of Alice's screen still holds
    auth.user = { id: "bob" };
    remount(view);
    await settle();
    let removed = true;
    await act(async () => {
      removed = await stale("a1");
    });
    expect(removed).toBe(false);
    expect((disk.records.get("a1") as Rec).ownerId).toBe("alice"); // still there, still hers
  });

  it("an id that belongs to another account, or to nobody, or to nothing, is not deleted", async () => {
    disk.records.set("b1", rec("b1", "bob"));
    disk.records.set("old", rec("old", undefined));
    mount();
    await settle();
    for (const id of ["b1", "old", "ghost"]) {
      let removed = true;
      await act(async () => {
        removed = await api.removeDraft(id);
      });
      expect(removed, id).toBe(false);
    }
    expect([...disk.records.keys()].sort()).toEqual(["b1", "old"]);
  });

  it("nothing is deleted when nobody is signed in", async () => {
    disk.records.set("a1", rec("a1", "alice"));
    auth.status = "signedOut";
    auth.user = null;
    mount();
    await settle();
    let removed = true;
    await act(async () => {
      removed = await api.removeDraft("a1");
    });
    expect(removed).toBe(false);
    expect(disk.records.has("a1")).toBe(true);
  });

  it("the undo of a late track only deletes what that very answer wrote", async () => {
    disk.records.set("keep", rec("keep", "alice"));
    mount();
    await settle();
    const hold = gate();
    disk.writeGate = hold.promise;
    const adding = api.addDraft(meta("late"), new Blob(["a"])).catch((e) => e);
    await act(async () => api.eraseMine());
    hold.open();
    await act(async () => void (await adding));
    expect(disk.records.has("late")).toBe(false);
  });
});

describe("what the disk refuses is reported, never swallowed", () => {
  it("says the tracks could not be read, and keeps that apart from 'there are none'", async () => {
    disk.failLoad = true;
    disk.records.set("a1", rec("a1", "alice"));
    mount();
    await settle();
    expect(api.ready).toBe(true);
    expect(api.loadFailed).toBe(true);
    expect(api.drafts).toEqual([]);
  });

  it("does not say it when the read worked, and forgets it at the next account", async () => {
    disk.records.set("a1", rec("a1", "alice"));
    const view = mount();
    await settle();
    expect(api.loadFailed).toBe(false);
    disk.failLoad = true;
    auth.user = { id: "bob" };
    view.rerender(
      <GeneratedDraftsProvider>
        <Probe />
      </GeneratedDraftsProvider>,
    );
    await settle();
    expect(api.loadFailed).toBe(true);
    disk.failLoad = false;
    auth.user = { id: "alice" };
    view.rerender(
      <GeneratedDraftsProvider>
        <Probe />
      </GeneratedDraftsProvider>,
    );
    await settle();
    expect(api.loadFailed).toBe(false);
    expect(api.drafts.map((d) => d.id)).toEqual(["a1"]);
  });

  it("a sign-out erase that the disk refuses answers false, and one that works answers true", async () => {
    disk.records.set("a1", rec("a1", "alice"));
    mount();
    await settle();
    disk.failErase = true;
    let result: boolean | undefined;
    await act(async () => void (result = await api.eraseMine()));
    expect(result).toBe(false);
    expect(disk.records.has("a1")).toBe(true); // still there: the member can be told so

    disk.failErase = false;
    await act(async () => void (result = await api.eraseMine()));
    expect(result).toBe(true);
    expect(disk.records.has("a1")).toBe(false);
  });

  it("a track that cannot be written is refused with the disk's error, never reported as saved", async () => {
    mount();
    await settle();
    disk.failPut = "t1";
    await expect(api.addDraft(meta("t1"), new Blob(["x"]))).rejects.toThrow();
    expect(api.drafts).toEqual([]);
  });
});
