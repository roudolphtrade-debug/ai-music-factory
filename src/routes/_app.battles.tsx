import { createFileRoute } from "@tanstack/react-router";
import { Swords, Trophy, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { BattleAudioCard } from "@/components/audio/BattleAudioCard";
import { BracketView } from "@/components/premium/BracketView";
import { battles, battleHistory } from "@/data/mock";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/battles")({
  head: () => ({
    meta: [
      { title: "Battles — Ai Music Factory" },
      { name: "description", content: "Head-to-head AI artist battles: vote live, follow the bracket, and crown champions." },
    ],
  }),
  component: BattlesPage,
});

function BattlesPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow={t("battles.eyebrow")}
        title={t("battles.title")}
        description={t("battles.desc")}
        action={
          <Button variant="gold" size="lg">
            <Swords className="h-4 w-4" /> {t("battles.joinNext")}
          </Button>
        }
      />

      {/* LIVE BATTLES */}
      <section className="space-y-5">
        <SectionHeading eyebrow={t("battles.now")} title={t("battles.liveUpcoming")} />
        <div className="grid gap-5 lg:grid-cols-2">
          {battles.map((b, i) => (
            <BattleAudioCard key={b.id} battle={b} index={i} />
          ))}
        </div>
      </section>

      {/* INTERACTIVE BRACKET */}
      <section className="space-y-5">
        <SectionHeading
          eyebrow={t("battles.standings")}
          title={t("battles.seasonBracket")}
          description={t("bracket.desc")}
        />
        <BracketView />
      </section>

      {/* HISTORY */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <SectionHeading
          eyebrow={t("battles.archive")}
          title={t("battles.history")}
          action={<History className="h-4 w-4 text-gold" />}
        />
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
      </section>
    </div>
  );
}
