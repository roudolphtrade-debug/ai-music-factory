import { useEffect, useState } from "react";
import { Flame, ThumbsUp, Check } from "lucide-react";
import { tracks, artistImages } from "@/data/mock";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

const STREAK_KEY = "afm-jury-streak";
const LAST_DAY_KEY = "afm-jury-last-day";
const VOTED_KEY_PREFIX = "afm-jury-voted-";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Deterministic "today's 3 tracks" — same for everyone, changes daily. */
function pickDailyTracks(day: string) {
  let seed = 0;
  for (let i = 0; i < day.length; i++) seed = (seed * 31 + day.charCodeAt(i)) % 100000;
  const pool = [...tracks];
  const picked: typeof tracks = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const idx = seed % pool.length;
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

/**
 * A short, daily, low-friction ritual: rate 3 tracks, build a streak.
 * This is the "why come back tomorrow" the product was missing — battles
 * and charts are occasional events, this is the once-a-day habit loop.
 */
export function DailyJury() {
  const { t } = useI18n();
  const day = todayKey();
  const dailyTracks = pickDailyTracks(day);
  const [votedIds, setVotedIds] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const storedVoted = localStorage.getItem(VOTED_KEY_PREFIX + day);
    if (storedVoted) setVotedIds(JSON.parse(storedVoted));

    const lastDay = localStorage.getItem(LAST_DAY_KEY);
    const storedStreak = Number(localStorage.getItem(STREAK_KEY) ?? "0");
    if (lastDay === day) {
      setStreak(storedStreak);
    } else if (lastDay === yesterdayKey()) {
      setStreak(storedStreak); // streak carries over; increments on first vote today
    } else {
      setStreak(0);
    }
  }, [day]);

  const vote = (id: string) => {
    if (votedIds.includes(id)) return;
    const next = [...votedIds, id];
    setVotedIds(next);
    localStorage.setItem(VOTED_KEY_PREFIX + day, JSON.stringify(next));

    const lastDay = localStorage.getItem(LAST_DAY_KEY);
    if (lastDay !== day) {
      const base = lastDay === yesterdayKey() ? Number(localStorage.getItem(STREAK_KEY) ?? "0") : 0;
      const newStreak = base + 1;
      setStreak(newStreak);
      localStorage.setItem(STREAK_KEY, String(newStreak));
      localStorage.setItem(LAST_DAY_KEY, day);
    }
  };

  const done = votedIds.length >= dailyTracks.length;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold">{t("dailyJury.eyebrow")}</p>
          <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
            {done ? t("dailyJury.doneTitle") : t("dailyJury.title")}
          </h3>
        </div>
        {streak > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--gold)_35%,transparent)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-3 py-1 text-sm font-semibold text-gold">
            <Flame className="h-4 w-4" />
            {t("dailyJury.streak", { n: streak })}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {dailyTracks.map((tr) => {
          const voted = votedIds.includes(tr.id);
          return (
            <div
              key={tr.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 p-2.5"
            >
              <img
                src={artistImages[tr.artistId]}
                alt={tr.artist}
                loading="lazy"
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{tr.title}</p>
                <p className="truncate text-xs text-muted-foreground">{tr.artist}</p>
              </div>
              <button
                type="button"
                onClick={() => vote(tr.id)}
                disabled={voted}
                aria-pressed={voted}
                aria-label={t("dailyJury.voteFor", { title: tr.title })}
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors active:scale-90 motion-reduce:active:scale-100",
                  voted
                    ? "border-transparent bg-gold-gradient text-primary-foreground"
                    : "border-[color-mix(in_oklab,var(--gold)_30%,transparent)] text-muted-foreground hover:text-gold",
                )}
              >
                {voted ? <Check className="h-4 w-4" /> : <ThumbsUp className="h-3.5 w-3.5" />}
              </button>
            </div>
          );
        })}
      </div>

      {done && <p className="mt-4 text-sm text-muted-foreground">{t("dailyJury.comeBack")}</p>}
    </section>
  );
}
