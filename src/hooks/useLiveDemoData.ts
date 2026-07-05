import { useEffect, useState } from "react";
import {
  platformStats as initialStats,
  activityFeed as initialActivity,
  artists,
  type PlatformStat,
  type ActivityItem,
} from "@/data/mock";

/**
 * NOT real telemetry. This nudges the homepage's platform stats and activity
 * feed forward on a timer so a live walkthrough (e.g. a demo to co-founders)
 * doesn't visibly freeze on the same numbers for minutes at a time. All
 * values are still derived from the same mock dataset — nothing here talks
 * to a server or represents actual user activity.
 */
export function useLiveDemoData() {
  const [stats, setStats] = useState<PlatformStat[]>(initialStats);
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);

  useEffect(() => {
    const statTimer = setInterval(() => {
      setStats((prev) =>
        prev.map((s) => {
          if (Math.random() > 0.6) return s; // not every stat moves every tick
          const n = Number(s.value.replace(/,/g, ""));
          if (!Number.isFinite(n)) return s;
          const bump =
            s.key === "battlesLiveNow"
              ? Math.random() > 0.5
                ? 1
                : -1
              : Math.ceil(Math.random() * 6);
          const next = Math.max(0, n + bump);
          return { ...s, value: next.toLocaleString("en-US") };
        }),
      );
    }, 6000);

    const actionKeys: ActivityItem["actionKey"][] = [
      "publishedRelease",
      "enteredBattle",
      "signedArtist",
      "crossedListeners",
      "climbedTrending",
    ];

    const activityTimer = setInterval(() => {
      const artist = artists[Math.floor(Math.random() * artists.length)];
      const actionKey = actionKeys[Math.floor(Math.random() * actionKeys.length)];
      const item: ActivityItem = {
        id: `live-${Date.now()}`,
        who: artist.name,
        actionKey,
        detail: artist.genres[0],
        time: { n: 0, u: "m" },
      };
      setActivity((prev) => [item, ...prev].slice(0, 8));
    }, 22000);

    return () => {
      clearInterval(statTimer);
      clearInterval(activityTimer);
    };
  }, []);

  return { stats, activity };
}
