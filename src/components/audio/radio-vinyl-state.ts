import type { PlayerStatus } from "@/audio/PlayerProvider";

/** Only confirmed playback, never loading/error/another track, moves the turntable. */
export function vinylRunning(currentId: string | undefined, displayId: string | undefined, isPlaying: boolean, status: PlayerStatus) {
  return !!displayId && currentId === displayId && isPlaying && status === "playing";
}

export function needleAllowed(enabled: boolean, userArmed: boolean, alreadyUsed: boolean, running: boolean) {
  return enabled && userArmed && !alreadyUsed && running;
}