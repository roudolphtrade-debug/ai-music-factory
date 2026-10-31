import { describe, expect, it } from "vitest";
import { audioExtension } from "./format";

describe("the file extension follows what is stored", () => {
  it.each([
    ["audio/wav", "wav"],
    ["audio/x-wav", "wav"],
    ["audio/wave", "wav"],
    ["AUDIO/WAV", "wav"],
    ["audio/mpeg", "mp3"],
    ["audio/mp3", "mp3"],
    ["audio/mpeg; codecs=mp3", "mp3"],
  ])("%s gives .%s", (type, ext) => {
    expect(audioExtension(type)).toBe(ext);
  });

  it("falls back to wav, which is what the studio's own mix produces", () => {
    expect(audioExtension("")).toBe("wav");
    expect(audioExtension("application/octet-stream")).toBe("wav");
  });
});
