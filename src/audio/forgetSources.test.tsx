// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { installFakeAudio } from "@/test/fakeAudio";
import { emitDraftsErased } from "@/library/draftEvents";
import { PlayerProvider, usePlayer } from "./PlayerProvider";
import type { PlayableTrack } from "./tracks";

const track = (id: string, src: string): PlayableTrack => ({
  id,
  title: id,
  artist: "a",
  artistId: "art-1",
  src,
  cover: "c",
  duration: "0:20",
});

let player: ReturnType<typeof usePlayer>;
function Probe() {
  player = usePlayer();
  return null;
}

beforeEach(() => {
  installFakeAudio();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the player lets go of erased tracks", () => {
  it("stops and empties itself when the playing track is one that was erased", () => {
    render(
      <PlayerProvider>
        <Probe />
      </PlayerProvider>,
    );
    act(() => player.play(track("gen-1", "blob:erased"), [track("gen-1", "blob:erased")]));
    expect(player.current?.id).toBe("gen-1");

    act(() => emitDraftsErased(["blob:erased"]));

    expect(player.current).toBeNull();
    expect(player.isPlaying).toBe(false);
    expect(player.status).toBe("idle");
    expect(player.queue).toHaveLength(0);
  });

  it("keeps playing a catalogue track and only removes the erased ones from the queue", () => {
    render(
      <PlayerProvider>
        <Probe />
      </PlayerProvider>,
    );
    const catalog = track("cat-1", "/audio/a.mp3");
    const mine = track("gen-1", "blob:erased");
    act(() => player.play(catalog, [catalog, mine]));
    expect(player.queue.map((t) => t.id)).toEqual(["cat-1", "gen-1"]);

    act(() => emitDraftsErased(["blob:erased"]));

    expect(player.current?.id).toBe("cat-1");
    expect(player.queue.map((t) => t.id)).toEqual(["cat-1"]);
  });

  it("ignores an address it does not hold", () => {
    render(
      <PlayerProvider>
        <Probe />
      </PlayerProvider>,
    );
    const catalog = track("cat-1", "/audio/a.mp3");
    act(() => player.play(catalog, [catalog]));
    act(() => emitDraftsErased(["blob:unknown"]));
    expect(player.current?.id).toBe("cat-1");
    expect(player.queue).toHaveLength(1);
  });
});
