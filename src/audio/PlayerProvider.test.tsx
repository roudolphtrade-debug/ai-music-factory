// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { PlayerProvider, usePlayer } from "./PlayerProvider";
import { FakeAudio, installFakeAudio } from "@/test/fakeAudio";
import { track } from "@/test/fixtures";

const [A, B, C, D, E] = ["a", "b", "c", "d", "e"].map(track);
const wrapper = ({ children }: { children: ReactNode }) => (
  <PlayerProvider>{children}</PlayerProvider>
);
const audio = () => FakeAudio.last!;
const ids = (queue: { id: string }[]) => queue.map((t) => t.id);

beforeEach(() => installFakeAudio());
afterEach(() => cleanup());

function setup() {
  return renderHook(() => usePlayer(), { wrapper });
}

/** Repeat defaults to "all"; two cycles reach "off". */
function repeatOff(player: ReturnType<typeof setup>["result"]) {
  act(() => player.current.cycleRepeat());
  act(() => player.current.cycleRepeat());
}

describe("queue coherence", () => {
  it("keeps the supplied queue and index when the track belongs to it", () => {
    const { result } = setup();
    const queue = [A, B, C];
    act(() => result.current.play(B, queue));
    expect(result.current.queue).toBe(queue);
    expect(result.current.index).toBe(1);
    expect(result.current.current?.id).toBe("b");
  });

  it("places a track outside the supplied queue first, so queue[index] is what plays (R3)", () => {
    const { result } = setup();
    act(() => result.current.play(E, [A, B, C]));
    expect(ids(result.current.queue)).toEqual(["e", "a", "b", "c"]);
    expect(result.current.queue[result.current.index].id).toBe("e");
    act(() => result.current.next());
    expect(result.current.current?.id).toBe("a");
  });

  it("falls back to a single-track queue when none is supplied", () => {
    const { result } = setup();
    act(() => result.current.play(A));
    expect(ids(result.current.queue)).toEqual(["a"]);
    expect(result.current.index).toBe(0);
  });

  it("restores a queue that includes the inserted track when shuffle is turned off (R3)", () => {
    const { result } = setup();
    act(() => result.current.toggleShuffle());
    act(() => result.current.play(E, [A, B, C]));
    expect(result.current.queue[0].id).toBe("e");
    act(() => result.current.toggleShuffle());
    expect(ids(result.current.queue)).toEqual(["e", "a", "b", "c"]);
    expect(result.current.queue[result.current.index].id).toBe("e");
  });

  it("keeps a removed track removed once shuffle is turned off (R4)", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B, C, D]));
    act(() => result.current.toggleShuffle());
    const at = result.current.queue.findIndex((t) => t.id === "c");
    act(() => result.current.removeFromQueue(at));
    expect(ids(result.current.queue)).not.toContain("c");
    act(() => result.current.toggleShuffle());
    expect(ids(result.current.queue)).toEqual(["a", "b", "d"]);
  });

  it("never removes the playing track and re-indexes when an earlier one goes", () => {
    const { result } = setup();
    act(() => result.current.play(C, [A, B, C, D]));
    act(() => result.current.removeFromQueue(2));
    expect(ids(result.current.queue)).toEqual(["a", "b", "c", "d"]);
    act(() => result.current.removeFromQueue(0));
    expect(ids(result.current.queue)).toEqual(["b", "c", "d"]);
    expect(result.current.queue[result.current.index].id).toBe("c");
  });

  it("ignores removals outside the queue", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B]));
    const before = result.current.queue;
    act(() => result.current.removeFromQueue(7));
    act(() => result.current.removeFromQueue(-1));
    expect(result.current.queue).toBe(before);
  });

  it("keeps the playing track current when items move across it (both directions)", () => {
    const { result } = setup();
    act(() => result.current.play(C, [A, B, C, D, E]));
    act(() => result.current.moveInQueue(0, 4)); // earlier item jumps past the current one
    expect(result.current.queue[result.current.index].id).toBe("c");
    act(() => result.current.moveInQueue(4, 0)); // and back in front of it
    expect(result.current.queue[result.current.index].id).toBe("c");
    expect(ids(result.current.queue)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("follows the playing track itself when it is the one that moves", () => {
    const { result } = setup();
    act(() => result.current.play(B, [A, B, C]));
    act(() => result.current.moveInQueue(1, 2));
    expect(ids(result.current.queue)).toEqual(["a", "c", "b"]);
    expect(result.current.index).toBe(2);
    expect(result.current.current?.id).toBe("b");
  });

  it("keeps the current index correct when queue items share an id (N1)", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B, C, B]));
    act(() => result.current.playAt(3));
    act(() => result.current.moveInQueue(0, 1));
    expect(result.current.index).toBe(3);
  });

  it("ignores moves and jumps that are out of range", () => {
    const { result } = setup();
    act(() => result.current.play(B, [A, B, C]));
    const before = result.current.queue;
    act(() => result.current.moveInQueue(0, 9));
    act(() => result.current.moveInQueue(-1, 1));
    act(() => result.current.playAt(9));
    expect(result.current.queue).toBe(before);
    expect(result.current.current?.id).toBe("b");
  });

  it("jumps to a queued track with playAt and loads its source", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B, C]));
    act(() => result.current.playAt(2));
    expect(result.current.current?.id).toBe("c");
    expect(result.current.index).toBe(2);
    expect(audio().src).toBe("/c.mp3");
  });
});

describe("shuffle", () => {
  it("keeps the current track first, every track once, and restores order and position", () => {
    const { result } = setup();
    act(() => result.current.play(C, [A, B, C, D, E]));
    act(() => result.current.toggleShuffle());
    expect(result.current.shuffle).toBe(true);
    expect(result.current.index).toBe(0);
    expect(result.current.queue[0].id).toBe("c");
    expect([...ids(result.current.queue)].sort()).toEqual(["a", "b", "c", "d", "e"]);
    act(() => result.current.toggleShuffle());
    expect(result.current.shuffle).toBe(false);
    expect(ids(result.current.queue)).toEqual(["a", "b", "c", "d", "e"]);
    expect(result.current.index).toBe(2);
  });

  it("starts a new list with the chosen track first while shuffle is on", () => {
    const { result } = setup();
    act(() => result.current.toggleShuffle());
    act(() => result.current.play(D, [A, B, C, D, E]));
    expect(result.current.queue[0].id).toBe("d");
    expect(result.current.index).toBe(0);
    expect([...ids(result.current.queue)].sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("plays every track exactly once through natural ends, then stops (repeat off)", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B, C, D, E]));
    act(() => result.current.toggleShuffle());
    repeatOff(result);
    const seen = [result.current.current!.id];
    for (let i = 0; i < 4; i++) {
      act(() => audio().end());
      seen.push(result.current.current!.id);
    }
    expect([...seen].sort()).toEqual(["a", "b", "c", "d", "e"]);
    act(() => audio().end());
    expect(result.current.status).toBe("paused");
    expect(result.current.isPlaying).toBe(false);
  });
});

describe("repeat", () => {
  it("cycles all, one, off, then back to all", () => {
    const { result } = setup();
    expect(result.current.repeat).toBe("all");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe("one");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe("off");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe("all");
  });

  it("wraps to the first track after the last with repeat all", () => {
    const { result } = setup();
    act(() => result.current.play(C, [A, B, C]));
    act(() => audio().end());
    expect(result.current.current?.id).toBe("a");
    expect(result.current.isPlaying).toBe(true);
  });

  it("restarts the same track at natural end with repeat one", () => {
    const { result } = setup();
    const play = vi.spyOn(FakeAudio.prototype, "play");
    act(() => result.current.play(B, [A, B, C]));
    act(() => result.current.cycleRepeat());
    play.mockClear();
    act(() => audio().end());
    expect(play).toHaveBeenCalledTimes(1);
    expect(result.current.current?.id).toBe("b");
    expect(result.current.index).toBe(1);
    expect(result.current.isPlaying).toBe(true);
  });

  it("stops after the last track with repeat off and keeps it current", () => {
    const { result } = setup();
    act(() => result.current.play(C, [A, B, C]));
    repeatOff(result);
    act(() => audio().end());
    expect(result.current.current?.id).toBe("c");
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.status).toBe("paused");
  });

  it("lets manual next leave a repeat-one track and wrap even with repeat off", () => {
    const { result } = setup();
    act(() => result.current.play(B, [A, B, C]));
    act(() => result.current.cycleRepeat());
    act(() => result.current.next());
    expect(result.current.current?.id).toBe("c");
    repeatOff(result);
    act(() => result.current.next());
    expect(result.current.current?.id).toBe("a");
  });
});

describe("natural end and navigation", () => {
  it("advances to the next track and loads its source", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B, C]));
    act(() => audio().end());
    expect(result.current.current?.id).toBe("b");
    expect(result.current.index).toBe(1);
    expect(audio().src).toBe("/b.mp3");
  });

  it("restarts the track when previous is pressed after 3 seconds", () => {
    const { result } = setup();
    act(() => result.current.play(B, [A, B, C]));
    audio().currentTime = 10;
    act(() => result.current.prev());
    expect(audio().currentTime).toBe(0);
    expect(result.current.index).toBe(1);
  });

  it("goes to the previous track within the first 3 seconds and wraps from the first", () => {
    const { result } = setup();
    act(() => result.current.play(B, [A, B, C]));
    act(() => result.current.prev());
    expect(result.current.current?.id).toBe("a");
    act(() => result.current.prev());
    expect(result.current.current?.id).toBe("c");
  });

  it("does nothing on next and previous when nothing was ever played", () => {
    const { result } = setup();
    act(() => result.current.next());
    act(() => result.current.prev());
    expect(result.current.current).toBeNull();
    expect(result.current.status).toBe("idle");
  });
});

describe("errors and recovery", () => {
  it("reports an error and stops reporting playback", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B]));
    expect(result.current.isPlaying).toBe(true);
    act(() => audio().fire("error"));
    expect(result.current.status).toBe("error");
    expect(result.current.isPlaying).toBe(false);
  });

  it("ignores an error event while nothing is loaded", () => {
    const { result } = setup();
    act(() => audio().fire("error"));
    expect(result.current.status).toBe("idle");
  });

  it("retries the same track when toggled from the error state", () => {
    const { result } = setup();
    const play = vi.spyOn(FakeAudio.prototype, "play");
    act(() => result.current.play(A, [A, B]));
    act(() => audio().fire("error"));
    play.mockClear();
    act(() => result.current.toggle());
    expect(play).toHaveBeenCalledTimes(1);
    expect(result.current.current?.id).toBe("a");
    expect(result.current.status).not.toBe("error");
  });

  it("retry() reloads the current track", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B]));
    act(() => audio().fire("error"));
    act(() => result.current.retry());
    expect(result.current.status).not.toBe("error");
    expect(result.current.isPlaying).toBe(true);
  });

  it("recovers through next, previous and playAt", () => {
    const { result } = setup();
    act(() => result.current.play(B, [A, B, C]));
    for (const move of [
      () => result.current.next(),
      () => result.current.prev(),
      () => result.current.playAt(0),
    ]) {
      act(() => audio().fire("error"));
      expect(result.current.status).toBe("error");
      act(() => move());
      expect(result.current.status).not.toBe("error");
    }
  });

  it("treats a blocked autoplay as paused, not as an error", async () => {
    const { result } = setup();
    vi.spyOn(FakeAudio.prototype, "play").mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" })),
    );
    await act(async () => {
      result.current.play(A, [A, B]);
    });
    expect(result.current.status).toBe("paused");
    expect(result.current.isPlaying).toBe(false);
  });

  it("ignores an aborted play() request (a newer load superseded it)", async () => {
    const { result } = setup();
    vi.spyOn(FakeAudio.prototype, "play").mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
    );
    await act(async () => {
      result.current.play(A, [A, B]);
    });
    expect(result.current.status).toBe("loading");
  });
});

describe("pause and resume", () => {
  it("pauses and resumes the same track without touching the queue", () => {
    const { result } = setup();
    act(() => result.current.play(B, [A, B, C]));
    const queue = result.current.queue;
    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.status).toBe("paused");
    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.queue).toBe(queue);
    expect(result.current.current?.id).toBe("b");
  });

  it("restarts the current track after the end of a repeat-off queue", () => {
    const { result } = setup();
    act(() => result.current.play(C, [A, B, C]));
    repeatOff(result);
    act(() => audio().end());
    expect(result.current.isPlaying).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.current?.id).toBe("c");
    expect(result.current.isPlaying).toBe(true);
  });

  it("replaces the queue when toggled on a different track", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B]));
    act(() => result.current.toggle(D, [C, D, E]));
    expect(ids(result.current.queue)).toEqual(["c", "d", "e"]);
    expect(result.current.current?.id).toBe("d");
  });

  it("exposes which track is active and which one is playing", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B]));
    expect(result.current.isActive("a")).toBe(true);
    expect(result.current.isTrackPlaying("a")).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.isActive("a")).toBe(true);
    expect(result.current.isTrackPlaying("a")).toBe(false);
    expect(result.current.isActive("b")).toBe(false);
  });
});

describe("source change, position and volume", () => {
  it("resets position and duration and loads the new source when another track starts", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A, B]));
    act(() => {
      audio().duration = 100;
      audio().currentTime = 40;
      audio().fire("durationchange");
      audio().fire("timeupdate");
    });
    expect(result.current.duration).toBe(100);
    expect(result.current.currentTime).toBe(40);
    act(() => result.current.play(B, [A, B]));
    expect(audio().src).toBe("/b.mp3");
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.status).not.toBe("idle");
  });

  it("seeks by ratio, clamped to the track, and only once the duration is known", () => {
    const { result } = setup();
    act(() => result.current.play(A, [A]));
    act(() => result.current.seekRatio(0.5));
    expect(audio().currentTime).toBe(0); // duration unknown: ignored
    act(() => {
      audio().duration = 200;
      audio().fire("durationchange");
    });
    act(() => result.current.seekRatio(0.25));
    expect(audio().currentTime).toBe(50);
    act(() => result.current.seekRatio(5));
    expect(audio().currentTime).toBe(200);
    act(() => result.current.seekRatio(-1));
    expect(audio().currentTime).toBe(0);
  });

  it("clamps the volume, mutes at zero and toggles mute while a level is set", () => {
    const { result } = setup();
    act(() => result.current.setVolume(1.7));
    expect(result.current.volume).toBe(1);
    expect(audio().volume).toBe(1);
    act(() => result.current.setVolume(0));
    expect(result.current.muted).toBe(true);
    expect(audio().muted).toBe(true);
    act(() => result.current.setVolume(0.4));
    expect(result.current.muted).toBe(false);
    act(() => result.current.toggleMute());
    expect(result.current.muted).toBe(true);
    expect(audio().muted).toBe(true);
    act(() => result.current.toggleMute());
    expect(result.current.muted).toBe(false);
  });

  describe("unmuting from a zero level", () => {
    /** The element and the React state must always describe the same sound. */
    const expectSynced = (result: ReturnType<typeof setup>["result"]) => {
      expect(audio().volume).toBe(result.current.volume);
      expect(audio().muted).toBe(result.current.muted);
    };

    it("restores the last audible level instead of staying silent", () => {
      const { result } = setup();
      act(() => result.current.setVolume(0.4));
      act(() => result.current.setVolume(0));
      expect(result.current.muted).toBe(true);
      expectSynced(result);
      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(false);
      expect(result.current.volume).toBe(0.4);
      expect(audio().volume).toBe(0.4);
      expect(audio().muted).toBe(false);
      expectSynced(result);
    });

    it("falls back to the default level when no other level was ever set", () => {
      const { result } = setup();
      expect(result.current.volume).toBe(0.8);
      act(() => result.current.setVolume(0));
      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(false);
      expect(result.current.volume).toBe(0.8);
      expectSynced(result);
    });

    it("remembers the latest positive level across successive changes", () => {
      const { result } = setup();
      act(() => result.current.setVolume(0.6));
      act(() => result.current.setVolume(0.2));
      act(() => result.current.setVolume(0));
      act(() => result.current.toggleMute());
      expect(result.current.volume).toBe(0.2);
      expectSynced(result);
      // mute, unmute again: the restored level is kept, nothing drifts
      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(true);
      expect(result.current.volume).toBe(0.2);
      expectSynced(result);
      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(false);
      expect(result.current.volume).toBe(0.2);
      expectSynced(result);
    });

    it("is not confused by a zero reached after a manual mute", () => {
      const { result } = setup();
      act(() => result.current.setVolume(0.5));
      act(() => result.current.toggleMute()); // muted at 0.5
      act(() => result.current.setVolume(0)); // slider dragged to zero while muted
      expect(result.current.muted).toBe(true);
      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(false);
      expect(result.current.volume).toBe(0.5);
      expectSynced(result);
    });

    it("leaves the level alone when muting and unmuting above zero", () => {
      const { result } = setup();
      act(() => result.current.setVolume(0.3));
      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(true);
      expect(result.current.volume).toBe(0.3);
      expect(audio().volume).toBe(0.3);
      act(() => result.current.toggleMute());
      expect(result.current.muted).toBe(false);
      expect(result.current.volume).toBe(0.3);
      expectSynced(result);
    });

    it("does not touch the current track, the queue or the playback", () => {
      const { result } = setup();
      act(() => result.current.play(A, [A, B]));
      const src = audio().src;
      act(() => result.current.setVolume(0));
      act(() => result.current.toggleMute());
      expect(result.current.current?.id).toBe(A.id);
      expect(result.current.queue.map((t) => t.id)).toEqual([A.id, B.id]);
      expect(result.current.index).toBe(0);
      expect(audio().src).toBe(src);
      expect(result.current.isPlaying).toBe(true);
      expect(result.current.volume).toBe(0.8);
    });
  });
});
