import type { PlayerStatus } from "@/audio/PlayerProvider";

/** Only confirmed playback, never loading/error/another track, moves the turntable. */
export function vinylRunning(currentId: string | undefined, displayId: string | undefined, isPlaying: boolean, status: PlayerStatus) {
  return !!displayId && currentId === displayId && isPlaying && status === "playing";
}

export function needleAllowed(enabled: boolean, userArmed: boolean, alreadyUsed: boolean, running: boolean) {
  return enabled && userArmed && !alreadyUsed && running;
}

/** Preserve the arm above the groove on pause; return home on stop, error, or track end. */
export type VinylArmPosition = "rest" | "playing" | "lifted";
export function vinylArmPosition(
  currentId: string | undefined,
  displayId: string | undefined,
  isPlaying: boolean,
  status: PlayerStatus,
  currentTime: number,
  duration: number,
): VinylArmPosition {
  if (!currentId || currentId !== displayId || status === "idle" || status === "error") return "rest";
  if (vinylRunning(currentId, displayId, isPlaying, status)) return "playing";
  if (status !== "paused" || !Number.isFinite(currentTime) || currentTime <= 0) return "rest";
  // PlayerProvider uses status="paused" both for user pause and for the end of a queue.
  if (Number.isFinite(duration) && duration > 0 && currentTime >= duration - 0.25) return "rest";
  return "lifted";
}
