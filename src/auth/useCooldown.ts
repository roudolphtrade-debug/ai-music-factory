import { useCallback, useEffect, useRef, useState } from "react";

/** A countdown in whole seconds, used to space out "resend the link" requests. */
export function useCooldown(seconds: number) {
  const [remaining, setRemaining] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const start = useCallback(() => {
    stop();
    setRemaining(seconds);
    timer.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          stop();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [seconds]);

  useEffect(() => stop, []);
  return { remaining, start };
}
