import { describe, expect, it } from "vitest";
import { needleAllowed, vinylRunning } from "./radio-vinyl-state";

describe("Radio vinyl honesty", () => {
  it("rotates only during confirmed playback of the displayed track", () => {
    expect(vinylRunning("a", "a", true, "playing")).toBe(true);
    expect(vinylRunning("b", "a", true, "playing")).toBe(false);
  });
  it("stops in pause, loading, error and without a track", () => {
    for (const status of ["paused", "loading", "error", "idle"] as const) expect(vinylRunning("a", "a", true, status)).toBe(false);
    expect(vinylRunning("a", "a", false, "playing")).toBe(false);
    expect(vinylRunning(undefined, undefined, true, "playing")).toBe(false);
  });
  it("needle ambience is off by default and requires a user gesture", () => {
    expect(needleAllowed(false, true, false, true)).toBe(false);
    expect(needleAllowed(true, false, false, true)).toBe(false);
    expect(needleAllowed(true, true, false, true)).toBe(true);
  });
  it("never repeats automatically or sounds on failed playback", () => {
    expect(needleAllowed(true, true, true, true)).toBe(false);
    expect(needleAllowed(true, true, false, false)).toBe(false);
  });
});