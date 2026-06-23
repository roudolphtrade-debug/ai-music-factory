import { createFileRoute } from "@tanstack/react-router";
import { Swords, Trophy, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatusChip, GoldBadge } from "@/components/premium/Chips";
import { VoteButton } from "@/components/premium/VoteButton";
import { battles, battleHistory, artistImages } from "@/data/mock";

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
  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="The Arena"
        title="Battles"
        description="Two artists. Two tracks. One winner — decided by the community in real time."
        action={
          <Button variant="gold" size="lg">
            <Swords className="h-4 w-4" /> Join next battle
          </Button>
        }
      />

      {/* LIVE BATTLES */}
      <section className="space-y-5">
        <SectionHeading eyebrow="Now" title="Live & upcoming" />
        <div className="grid gap-5 lg:grid-cols-2">
          {battles.map((b) => {
            const total = b.a.votes + b.b.votes || 1;
            const aPct = Math.round((b.a.votes / total) * 100);
            return (
              <article
                key={b.id}
                className="overflow-hidden rounded-2xl border border-border bg-noir-gradient p-6"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{b.round}</span>
                  <StatusChip status={b.status} />
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <Contender side={b.a} align="left" live={b.status === "Live"} />
                  <span className="font-display text-2xl font-semibold text-muted-foreground">VS</span>
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

                <p className="mt-4 text-center text-xs text-muted-foreground">{b.ends}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* BRACKET / RANKING */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <SectionHeading eyebrow="Standings" title="Season 7 bracket" />
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
                  {i < 2 && <GoldBadge variant="outline">Advancing</GoldBadge>}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {6 - i} wins
                  </span>
                </div>
              ),
            )}
          </div>
        </section>

        {/* HISTORY */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <SectionHeading
            eyebrow="Archive"
            title="Battle history"
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
                    <span className="text-muted-foreground">def. {h.loser}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{h.round}</p>
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
          Voting soon
        </span>
      )}
    </div>
  );
}
