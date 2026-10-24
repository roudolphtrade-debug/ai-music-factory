/** Initial shown in place of an avatar. */
export function memberInitial(name: string): string {
  const first = [...name.trim()][0];
  return first ? first.toUpperCase() : "?";
}
