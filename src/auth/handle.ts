/**
 * The member's handle (pseudonym): rules, and a precise reason when one is not respected.
 * Pure and free of zod, so a route can use it without pulling the schemas into the first load.
 */
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 24;
export const HANDLE_EXAMPLE = "amina_o";

const ALLOWED = /^[a-z0-9_]$/;

/** "@Studio_A " becomes "studio_a": the @, the case and the surrounding spaces are not mistakes. */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

export type HandleProblem =
  | { key: "errHandleChars"; chars: string[] }
  | { key: "errHandleShort" | "errHandleLong"; count: number };

/** The characters a handle cannot contain, each once, in the order they were typed. */
export function refusedChars(value: string): string[] {
  const seen: string[] = [];
  for (const char of Array.from(value))
    if (!ALLOWED.test(char) && !seen.includes(char)) seen.push(char);
  return seen;
}

/**
 * Why a (normalized) handle is not valid, or null when it is. An empty handle is valid: it is optional.
 * Refused characters come first, because shortening a handle does not help while they are in it.
 */
export function handleProblem(value: string): HandleProblem | null {
  if (value === "") return null;
  const chars = refusedChars(value);
  if (chars.length) return { key: "errHandleChars", chars };
  const count = Array.from(value).length;
  if (count < HANDLE_MIN) return { key: "errHandleShort", count };
  if (count > HANDLE_MAX) return { key: "errHandleLong", count };
  return null;
}

const MAX_SHOWN = 6;
const LRI = String.fromCodePoint(0x2066); // isolates Latin text inside right-to-left sentences
const PDI = String.fromCodePoint(0x2069);

/** The refused characters as they are shown: "é, -, (space)", at most six, isolated for RTL text. */
export function formatRefusedChars(chars: string[], spaceWord: string): string {
  const shown = chars
    .slice(0, MAX_SHOWN)
    .map((char) => (/\s/.test(char) ? `(${spaceWord})` : char));
  return `${LRI}${shown.join(", ")}${chars.length > MAX_SHOWN ? ", …" : ""}${PDI}`;
}

/** Isolates a Latin value (a handle, an example) inside a sentence that may be right-to-left. */
export const isolate = (value: string) => `${LRI}${value}${PDI}`;

/** Another handle to try when this one is taken: "amina_o" gives "amina_o2", within the length limit. */
export function suggestHandle(value: string): string {
  const base = normalizeHandle(value).replace(/[^a-z0-9_]/g, "");
  const stem = (base.length >= HANDLE_MIN ? base : HANDLE_EXAMPLE).slice(0, HANDLE_MAX - 1);
  return `${stem}2`;
}
