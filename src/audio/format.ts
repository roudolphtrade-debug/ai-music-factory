/** What a track list shows when the length of a generated track was not measured. */
export const UNKNOWN_DURATION = "--:--";

/**
 * A measured length in seconds as "m:ss", or `null` when there is no usable measure (missing, not a
 * number, zero or negative). Nothing is ever guessed.
 */
export function formatMeasuredDuration(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The file extension that matches what is stored. The studio's own mix is a WAV; a bare vocal, when the
 * mix could not be made, is the MP3 the service sent. Anything else is named after the mix.
 */
export function audioExtension(mime: string): "wav" | "mp3" {
  const type = mime.toLowerCase();
  return type.includes("mpeg") || type.includes("mp3") ? "mp3" : "wav";
}
