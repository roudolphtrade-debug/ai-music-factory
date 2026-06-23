import { useCallback, useRef } from "react";

/**
 * Cursor-following spotlight. Returns a ref to attach to the container and a
 * pointer handler that writes `--mx` / `--my` CSS variables (in %), which an
 * overlay element can consume with a radial-gradient. Respects reduced motion
 * implicitly — the effect is subtle and non-essential.
 */
export function useSpotlight<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
  }, []);

  return { ref, onPointerMove };
}
