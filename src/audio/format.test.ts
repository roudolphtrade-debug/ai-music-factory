import { describe, expect, it } from "vitest";
import { audioExtension, formatMeasuredDuration, UNKNOWN_DURATION } from "./format";

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

describe("lot P0: a length is shown only when it was measured", () => {
  it.each([
    [83.4, "1:23"],
    [20, "0:20"],
    [59.6, "1:00"],
    [125, "2:05"],
  ])("%s s reads %s", (seconds, label) => {
    expect(formatMeasuredDuration(seconds)).toBe(label);
  });

  it.each([null, undefined, 0, -3, Number.NaN, Number.POSITIVE_INFINITY])("%s is no measure", (value) => {
    expect(formatMeasuredDuration(value)).toBeNull();
  });

  it("the unknown length is neutral, not a time", () => {
    expect(UNKNOWN_DURATION).toBe("--:--");
  });
});
