import { createFileRoute } from "@tanstack/react-router";
import { Swords, Trophy, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatusChip, GoldBadge } from "@/components/premium/Chips";
import { VoteButton } from "@/components/premium/VoteButton";
import { battles, battleHistory, artistImages } from "@/data/mock";
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
          {battles.map((b) => {
            const total = b.a.votes + b.b.votes || 1;
            const aPct = Math.round((b.a.votes / total) * 100);
            const round = `${t(`battles.${b.round.phase}`)} · ${t("battles.bracket")} ${b.round.bracket}`;
            const ends = t(b.ends.key === "left" ? "time.left" : "time.startsIn", { t: b.ends.text });
            return (
              <article
                key={b.id}
                className="overflow-hidden rounded-2xl border border-border bg-noir-gradient p-6"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{round}</span>
                  <StatusChip status={b.status} />
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <Contender side={b.a} align="left" live={b.status === "Live"} />
                  <span className="font-display text-2xl font-semibold text-muted-foreground">
                    {t("common.vs")}
                  </span>
                  <Contender side={b.b} align="right" live={b.status === "Live"} />
                </div>

                {b.status === "Live" && (
                  <div className="mt-5">
                    <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="bg-gold-gradient" style={{ width: `${aPct}%` }} />
                      <div className="bg-foreground/30" style={{ width: `${100 - aPct}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                      <span>{aPct}%</span>
                      <span>{100 - aPct}%</span>
                    </div>
                  </div>
                )}

                <p className="mt-4 text-center text-xs text-muted-foreground">{ends}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* BRACKET / RANKING */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <SectionHeading eyebrow={t("battles.standings")} title={t("battles.seasonBracket")} />
          <div className="mt-4 space-y-2">
            {["Seraphine 9", "MIDAS PRIME", "ORACLE", "SØL Aurelius", "Nyla Solenne", "VISR"].map(
              (name, i) => (
                <div
                  key={name}
                  className="flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/40"
                >
                  <span
                    className={`w-6 text-center font-display text-lg font-semibold ${
                      i < 2 ? "text-gold" : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium text-foreground">{name}</span>
                  {i < 2 && <GoldBadge variant="outline">{t("common.advancing")}</GoldBadge>}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t("common.wins", { n: 6 - i })}
                  </span>
                </div>
              ),
            )}
          </div>
        </section>

        {/* HISTORY */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <SectionHeading
            eyebrow={t("battles.archive")}
            title={t("battles.history")}
            action={<History className="h-4 w-4 text-gold" />}
          />
          <div className="mt-4 space-y-3">
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
    </div>
  );
}

function Contender({
  side,
  align,
  live,
}: {
  side: { artistId: keyof typeof artistImages; name: string; track: string; votes: number };
  align: "left" | "right";
  live: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      className={`flex flex-col items-center gap-3 text-center ${
        align === "right" ? "sm:items-end sm:text-right" : "sm:items-start sm:text-left"
      }`}
    >
      <img
        src={artistImages[side.artistId]}
        alt={side.name}
        className="h-20 w-20 rounded-2xl object-cover ring-1 ring-border"
      />
      <div>
        <p className="font-semibold text-foreground">{side.name}</p>
        <p className="text-xs text-muted-foreground">{side.track}</p>
      </div>
      {live ? (
        <VoteButton initialVotes={side.votes} size="sm" />
      ) : (
        <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
          {t("common.votingSoon")}
        </span>
      )}
    </div>
  );
}
