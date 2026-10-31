/**
 * The file extension that matches what is stored. The studio's own mix is a WAV; a bare vocal, when the
 * mix could not be made, is the MP3 the service sent. Anything else is named after the mix.
 */
export function audioExtension(mime: string): "wav" | "mp3" {
  const type = mime.toLowerCase();
  return type.includes("mpeg") || type.includes("mp3") ? "mp3" : "wav";
}
