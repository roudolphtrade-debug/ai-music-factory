import { Crown, Trophy, History } from "lucide-react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { GoldBadge } from "@/components/premium/Chips";
import { useBattles } from "@/library/BattlesProvider";
import { battleHistory } from "@/data/mock";
import { artistImages } from "@/data/mock";
import { useI18n } from "@/i18n/context";

/**
 * Season history — archived bracket champions from completed seasons, blended
 * with the seeded historical record so there's always something to show.
 */
export function SeasonHistory() {
  const { t } = useI18n();
  const { bracket } = useBattles();
  const history = bracket.history ?? [];

  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow={t("seasons.eyebrow")}
        title={t("seasons.title")}
        description={t("seasons.desc")}
        action={<History className="h-4 w-4 text-gold" />}
      />

      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center">
          <Trophy className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("seasons.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {history.map((s) => (
            <div
              key={`${s.season}-${s.at}`}
              className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--gold)_24%,transparent)] bg-card p-5"
            >
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_18%,transparent),transparent_70%)]" />
              <div className="relative flex items-center justify-between">
                <GoldBadge variant="outline">{t("battles.season")} {s.season}</GoldBadge>
                <Crown className="h-4 w-4 text-gold" />
              </div>
              <div className="relative mt-4 flex items-center gap-3">
                <img
                  src={artistImages[s.championId]}
                  alt={s.championName}
                  className="h-12 w-12 rounded-xl object-cover ring-1 ring-[color-mix(in_oklab,var(--gold)_30%,transparent)]"
                />
                <div className="min-w-0">
                  <p className="eyebrow text-gold">{t("seasons.champion")}</p>
                  <p className="truncate font-display text-lg font-semibold text-foreground">{s.championName}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.championTrack}</p>
                </div>
              </div>
              {s.runnerUpName && (
                <p className="relative mt-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  {t("seasons.runnerUp")}: <span className="text-foreground">{s.runnerUpName}</span>
                  <span className="ml-2 tabular-nums">{s.margin}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Seeded ledger of legendary past results. */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <SectionHeading eyebrow={t("battles.archive")} title={t("seasons.ledger")} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {battleHistory.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/20 px-4 py-3"
            >
              <Trophy className="h-4 w-4 shrink-0 text-gold" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  <span className="font-semibold">{h.winner}</span>{" "}
                  <span className="text-muted-foreground">{t("common.def")} {h.loser}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`battles.${h.round.phase}`)} · {t("battles.season")} {h.round.season}
                </p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{h.margin}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
