// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  RETURN_TO_KEY,
  RETURN_TO_TTL_MS,
  clearReturnTo,
  peekReturnTo,
  rememberReturnTo,
} from "./returnTo";

const T0 = 1_800_000_000_000;
beforeEach(() => localStorage.clear());

describe("the way back after signing in", () => {
  it("remembers a same-site path for 24 hours", () => {
    expect(RETURN_TO_TTL_MS).toBe(24 * 60 * 60 * 1000);
    rememberReturnTo("/studio", T0);
    expect(peekReturnTo(T0 + RETURN_TO_TTL_MS - 1)).toBe("/studio");
    expect(peekReturnTo(T0 + RETURN_TO_TTL_MS)).toBeUndefined();
    // and the expired record has been removed
    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });

  it("reading it twice gives the same answer; only clearing removes it", () => {
    rememberReturnTo("/studio", T0);
    expect(peekReturnTo(T0)).toBe("/studio");
    expect(peekReturnTo(T0)).toBe("/studio");
    clearReturnTo();
    expect(peekReturnTo(T0)).toBeUndefined();
  });

  it("never stores or returns anything outside the site or inside the account pages", () => {
    for (const bad of [
      "https://evil.example.test/",
      "//evil.example.test",
      "/\\evil",
      "/auth/sign-in",
      "javascript:alert(1)",
      "studio",
      "",
    ]) {
      rememberReturnTo(bad, T0);
      expect(localStorage.getItem(RETURN_TO_KEY), bad).toBeNull();
    }
    localStorage.setItem(
      RETURN_TO_KEY,
      JSON.stringify({ path: "https://evil.example.test/", at: T0 }),
    );
    expect(peekReturnTo(T0)).toBeUndefined();
    localStorage.setItem(RETURN_TO_KEY, "not json");
    expect(peekReturnTo(T0)).toBeUndefined();
  });

  it("ignores a record dated in the future", () => {
    localStorage.setItem(RETURN_TO_KEY, JSON.stringify({ path: "/studio", at: T0 + 1000 }));
    expect(peekReturnTo(T0)).toBeUndefined();
  });
});
