// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import { AllProviders } from "@/test/providers";
import { installFakeAudio } from "@/test/fakeAudio";
import { translate } from "@/i18n/translations";

// The account is a switch and the disk is an in-memory store: nothing real is touched, no provider exists.
const auth = vi.hoisted(() => ({
  status: "signedIn" as "loading" | "signedOut" | "signedIn",
  user: { id: "alice" } as { id: string } | null,
}));
vi.mock("@/auth/context", () => ({ useAuth: () => ({ status: auth.status, user: auth.user }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type Rec = { id: string; title: string; ownerId?: string; blob: Blob; [key: string]: unknown };
const disk = vi.hoisted(() => ({ records: new Map<string, unknown>() }));
vi.mock("@/library/generatedDrafts", () => ({
  getAllDrafts: async () => [...disk.records.values()],
  putDraft: async (record: { id: string }) => void disk.records.set(record.id, record),
  deleteDraft: async (id: string) => void disk.records.delete(id),
  deleteDraftsOf: async (owner: string) => {
    for (const [id, v] of disk.records) if ((v as Rec).ownerId === owner) disk.records.delete(id);
  },
  deleteUnownedDrafts: async () => {
    let removed = 0;
    for (const [id, v] of disk.records) {
      if ((v as Rec).ownerId === undefined) {
        disk.records.delete(id);
        removed++;
      }
    }
    return removed;
  },
}));

import { GeneratedDraftsProvider } from "@/library/GeneratedDraftsProvider";
import { GeneratedDraftsSection } from "./GeneratedDraftsSection";

const en = (key: string, vars?: Record<string, string | number>) => translate("en", key, vars);
const track = (id: string, ownerId: string | undefined): Rec => ({
  id,
  title: `Title of ${id}`,
  prompt: "p",
  genre: "Trap",
  mood: "Euphoric",
  voice: "Alto",
  lyrics: "",
  duration: "0:20",
  createdAt: Date.now(),
  ownerId,
  blob: new Blob([id]),
});
const tree = () => (
  <AllProviders>
    <GeneratedDraftsProvider>
      <GeneratedDraftsSection />
    </GeneratedDraftsProvider>
  </AllProviders>
);
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));
const ownerOf = (id: string) => (disk.records.get(id) as Rec | undefined)?.ownerId;
const openClaim = () =>
  fireEvent.click(screen.getByRole("button", { name: en("studio.gen.unassignedClaim") }));
const openDelete = () =>
  fireEvent.click(
    screen.getByRole("button", { name: new RegExp(en("studio.gen.unassignedDelete")) }),
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("afm-lang", "en");
  installFakeAudio();
  auth.status = "signedIn";
  auth.user = { id: "alice" };
  disk.records.clear();
  disk.records.set("old1", track("old1", undefined));
  disk.records.set("old2", track("old2", undefined));
  disk.records.set("mine", track("mine", "alice"));
  disk.records.set("theirs", track("theirs", "bob"));
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  let n = 0;
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: () => `blob:t-${n++}`, revokeObjectURL: () => {} }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tracks from before accounts, in the studio", () => {
  it("are announced but never listed: only the account's own tracks appear", async () => {
    render(tree());
    await settle();
    expect(screen.getByText("Title of mine")).toBeTruthy();
    expect(screen.queryByText("Title of old1")).toBeNull();
    expect(screen.queryByText("Title of old2")).toBeNull();
    expect(screen.queryByText("Title of theirs")).toBeNull();
    const notice = screen.getByTestId("unassigned-titles");
    expect(notice.textContent).toContain(en("studio.gen.unassignedTitle"));
    expect(notice.textContent).toContain(en("studio.gen.unassignedDesc", { n: 2 }));
    // looking at the studio changed nothing on the disk
    expect(ownerOf("old1")).toBeUndefined();
    expect(ownerOf("old2")).toBeUndefined();
  });

  it("show no notice at all when there is nothing unassigned", async () => {
    disk.records.delete("old1");
    disk.records.delete("old2");
    render(tree());
    await settle();
    expect(screen.queryByTestId("unassigned-titles")).toBeNull();
  });

  it("recovery asks first, warns about the shared device, and does not claim to prove who made them", async () => {
    render(tree());
    await settle();
    openClaim();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(en("studio.gen.claimWarning"));
    expect(dialog.textContent).toContain(en("studio.gen.claimNoProof"));
    expect(en("studio.gen.claimNoProof")).toMatch(/does not check who made/);
    expect(dialog.textContent).not.toMatch(
      /\b(proves?|verified|authenticat\w*|you are the author)\b/i,
    );
    // still nothing done
    expect(ownerOf("old1")).toBeUndefined();
  });

  it("cancelling the recovery changes nothing", async () => {
    render(tree());
    await settle();
    openClaim();
    const dialog = await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(within(dialog).getByRole("button", { name: en("studio.gen.dialogCancel") })),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(ownerOf("old1")).toBeUndefined();
    expect(ownerOf("old2")).toBeUndefined();
    expect(screen.queryByText("Title of old1")).toBeNull();
    expect(screen.getByTestId("unassigned-titles")).toBeTruthy();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("confirming the recovery attaches them to this account, lists them, and removes the notice", async () => {
    render(tree());
    await settle();
    openClaim();
    const dialog = await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(within(dialog).getByRole("button", { name: en("studio.gen.claimConfirm") })),
    );
    await waitFor(() => expect(screen.queryByTestId("unassigned-titles")).toBeNull());
    expect(ownerOf("old1")).toBe("alice");
    expect(ownerOf("old2")).toBe("alice");
    expect(ownerOf("theirs")).toBe("bob"); // not touched
    expect(screen.getByText("Title of old1")).toBeTruthy();
    expect(screen.getByText("Title of old2")).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith(en("studio.gen.unassignedClaimed", { n: 2 }));
  });

  it("cancelling the deletion changes nothing", async () => {
    render(tree());
    await settle();
    openDelete();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(en("studio.gen.deleteWarning", { n: 2 }));
    await act(async () =>
      fireEvent.click(within(dialog).getByRole("button", { name: en("studio.gen.dialogCancel") })),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(disk.records.has("old1")).toBe(true);
    expect(disk.records.has("old2")).toBe(true);
    expect(screen.getByTestId("unassigned-titles")).toBeTruthy();
  });

  it("confirming the deletion removes the unassigned tracks, and only them", async () => {
    render(tree());
    await settle();
    openDelete();
    const dialog = await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(within(dialog).getByRole("button", { name: en("studio.gen.deleteConfirm") })),
    );
    await waitFor(() => expect(screen.queryByTestId("unassigned-titles")).toBeNull());
    expect([...disk.records.keys()].sort()).toEqual(["mine", "theirs"]);
    expect(screen.getByText("Title of mine")).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith(en("studio.gen.unassignedDeleted", { n: 2 }));
  });

  it("after one account recovered them, another account sees neither the tracks nor the notice", async () => {
    const view = render(tree());
    await settle();
    openClaim();
    const dialog = await screen.findByRole("alertdialog");
    await act(async () =>
      fireEvent.click(within(dialog).getByRole("button", { name: en("studio.gen.claimConfirm") })),
    );
    await waitFor(() => expect(screen.queryByTestId("unassigned-titles")).toBeNull());

    auth.user = { id: "carol" };
    view.rerender(tree());
    await settle();
    expect(screen.queryByText("Title of old1")).toBeNull();
    expect(screen.queryByText("Title of mine")).toBeNull();
    expect(screen.queryByTestId("unassigned-titles")).toBeNull();
    expect(ownerOf("old1")).toBe("alice");
  });

  it("another account still sees the notice while nobody has decided, and its tracks stay hidden", async () => {
    const view = render(tree());
    await settle();
    auth.user = { id: "carol" };
    view.rerender(tree());
    await settle();
    expect(screen.getByTestId("unassigned-titles").textContent).toContain(
      en("studio.gen.unassignedDesc", { n: 2 }),
    );
    expect(screen.queryByText("Title of old1")).toBeNull();
    expect(ownerOf("old1")).toBeUndefined();
  });

  it("show nothing to a visitor", async () => {
    auth.status = "signedOut";
    auth.user = null;
    render(tree());
    await settle();
    expect(screen.queryByTestId("unassigned-titles")).toBeNull();
    expect(screen.queryByText("Title of old1")).toBeNull();
  });
});
