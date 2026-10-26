/**
 * Minimal HTMLAudioElement stand-in for tests of the audio engine.
 * No media is ever loaded: tests drive playback by firing the same events a browser would.
 */
export class FakeAudio extends EventTarget {
  /** The element created most recently (PlayerProvider creates exactly one). */
  static last: FakeAudio | null = null;

  src = "";
  preload = "";
  volume = 1;
  muted = false;
  paused = true;
  currentTime = 0;
  duration = Number.NaN;

  constructor() {
    super();
    FakeAudio.last = this;
  }

  play() {
    this.paused = false;
    this.dispatchEvent(new Event("play"));
    this.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }

  /** What `removeAttribute("src")` then `load()` do to a real element: it lets go of its media. */
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }

  load() {}

  fire(name: string) {
    this.dispatchEvent(new Event(name));
  }

  /** Natural end of media: the platform fires "pause" and then "ended". */
  end() {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
    this.dispatchEvent(new Event("ended"));
  }
}

/** Replaces the global `Audio` constructor and resets `FakeAudio.last`. */
export function installFakeAudio() {
  (globalThis as unknown as { Audio: typeof FakeAudio }).Audio = FakeAudio;
  FakeAudio.last = null;
}
