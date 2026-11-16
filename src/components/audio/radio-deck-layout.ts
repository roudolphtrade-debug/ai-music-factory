/**
 * Geometry of the photoreal Radio turntable layers (lot 2B), as percentages of the deck frame.
 * Generated with the layers by the Blender pipeline (outside the repository); edit both together.
 */
export const deckLayout = {
  record: { left: 5.0, top: 10.0, width: 62.222, height: 80.0 },
  labelPct: 30.06,
  arm: { left: 51.42, top: 2.937, width: 44.753, height: 66.508, originX: 70.483, originY: 28.52 },
  /** Rest position of the tonearm relative to its rendered playing pose (CSS rotation, degrees). */
  armRestDeg: -30.11,
} as const;
