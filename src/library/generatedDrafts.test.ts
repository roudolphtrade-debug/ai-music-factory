// @vitest-environment jsdom
// jsdom has no IndexedDB: this is a device where the store simply does not exist.
import { describe, expect, it } from "vitest";
import { IndexedDbUnavailableError, getAllDrafts, putDraft } from "./generatedDrafts";

const record = {
  id: "g1",
  title: "t",
  prompt: "p",
  genre: "Trap",
  mood: "Euphoric",
  voice: "Alto",
  lyrics: "",
  duration: "0:20",
  createdAt: 1,
  ownerId: "alice",
  blob: new Blob(["x"]),
};

describe("a device without IndexedDB", () => {
  it("has no IndexedDB in this environment (the premise of these tests)", () => {
    expect("indexedDB" in window).toBe(false);
  });

  it("refuses to save a track instead of resolving as if it was saved", async () => {
    await expect(putDraft(record)).rejects.toBeInstanceOf(IndexedDbUnavailableError);
  });

  it("refuses to read instead of answering that there is nothing", async () => {
    await expect(getAllDrafts()).rejects.toBeInstanceOf(IndexedDbUnavailableError);
  });

  it("names the problem so that it can be shown", async () => {
    const error = await putDraft(record).catch((e: unknown) => e);
    expect((error as Error).name).toBe("IndexedDbUnavailableError");
  });
});
