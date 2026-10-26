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
  deletedFor: [] as string[],
}));
vi.mock("@/library/generatedDrafts", () => ({
  getAllDrafts: async () => {
    if (disk.loadGate) await disk.loadGate;
    return [...disk.records.values()];
  },
  putDraft: async (record: { id: string }) => {
    if (disk.writeGate) await disk.writeGate;
    disk.records.set(record.id, record);
  },
  deleteDraft: async (id: string) => void disk.records.delete(id),
  deleteDraftsOf: async (owner: string) => {
    disk.deletedFor.push(owner);
    for (const [id, value] of disk.records) {
      if ((value as Rec).ownerId === owner) disk.records.delete(id);
    }
  },
}));

import {
  DraftDiscardedError,
  GeneratedDraftsProvider,
  useGeneratedDrafts,
} from "./GeneratedDraftsProvider";
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
  disk.deletedFor = [];
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

  it("hands drafts from before accounts to the first account, and writes the owner on disk", async () => {
    disk.records.set("old", rec("old", undefined));
    mount();
    await settle();
    expect(api.drafts.map((d) => d.id)).toEqual(["old"]);
    expect((disk.records.get("old") as Rec).ownerId).toBe("alice");
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
