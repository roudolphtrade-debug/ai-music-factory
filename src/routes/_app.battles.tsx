import { createFileRoute, Link } from "@tanstack/react-router";
import { Swords, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { BattleAudioCard } from "@/components/audio/BattleAudioCard";
import { BracketView } from "@/components/premium/BracketView";
import { SeasonHistory } from "@/components/premium/SeasonHistory";
import { battles } from "@/data/mock";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/battles")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Battles · Ai Music Factory" },
      { property: "og:description", content: "Head-to-head AI artist battles: vote live, follow the bracket, and crown champions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Battles · Ai Music Factory" },
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
        className="flex-wrap sm:flex-nowrap"
        eyebrow={t("battles.eyebrow")}
        title={t("battles.title")}
        description={t("battles.desc")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost-gold" size="lg">
              <Link to="/hall-of-fame">
                <Crown className="h-4 w-4" /> {t("nav.hallOfFame")}
              </Link>
            </Button>
            <Button variant="gold" size="lg">
              <Swords className="h-4 w-4" /> {t("battles.joinNext")}
            </Button>
          </div>
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

      {/* SEASON HISTORY */}
      <SeasonHistory />
    </div>
  );
}
