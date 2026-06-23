// Deterministic number formatting so SSR and client output match
// (avoids hydration mismatches from locale-dependent toLocaleString()).
const numberFormatter = new Intl.NumberFormat("en-US");

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
