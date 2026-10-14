// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { PlayerProvider, usePlayer } from "@/audio/PlayerProvider";
import { FakeAudio, installFakeAudio } from "./fakeAudio";
import { track } from "./fixtures";
import { AllProviders } from "./providers";

beforeEach(() => {
  window.localStorage.clear();
  installFakeAudio();
});
afterEach(() => cleanup());

// Smoke tests of the test infrastructure itself; behaviour tests live next to the code.
describe("test infrastructure", () => {
  it("provides a DOM, storage and the `@/` path alias", () => {
    window.localStorage.setItem("probe", "1");
    expect(window.localStorage.getItem("probe")).toBe("1");
    expect(document.body).toBeTruthy();
    expect(track("x").src).toBe("/x.mp3");
  });

  it("mounts the real PlayerProvider on top of the fake audio element", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PlayerProvider>{children}</PlayerProvider>
    );
    const { result } = renderHook(() => usePlayer(), { wrapper });
    expect(FakeAudio.last).toBeInstanceOf(FakeAudio);
    expect(result.current.status).toBe("idle");
    expect(result.current.queue).toEqual([]);
  });

  it("renders children inside the shared provider stack", () => {
    render(
      <AllProviders>
        <p>ready</p>
      </AllProviders>,
    );
    expect(screen.getByText("ready")).toBeTruthy();
  });
});
