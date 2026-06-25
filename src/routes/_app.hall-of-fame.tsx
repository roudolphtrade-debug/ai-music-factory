import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Trophy } from "lucide-react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { GoldBadge } from "@/components/premium/Chips";
import { SeasonHistory } from "@/components/premium/SeasonHistory";
import { hallOfFame, artistImages } from "@/data/mock";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/hall-of-fame")({
  head: () => ({
    meta: [
      { title: "Hall of Fame — Ai Music Factory" },
      { name: "description", content: "The most decorated artists, prompts and labels — celebrated with prestige and honour." },
    ],
  }),
  component: HallOfFamePage,
});

const laureates = [
  { season: 6, artist: "Seraphine 9", award: "Artist of the Year" },
  { season: 5, artist: "ORACLE", award: "Underground Icon" },
  { season: 4, artist: "MIDAS PRIME", award: "Master of Craft" },
  { season: 3, artist: "SØL Aurelius", award: "Radio Favorite" },
];

function HallOfFamePage() {
  const { t } = useI18n();
  const top = hallOfFame[0];

  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow={t("hallOfFame.eyebrow")}
        title={t("hallOfFame.title")}
        description={t("hallOfFame.desc")}
      />

      {/* CROWN JEWEL */}
      <section className="relative overflow-hidden rounded-3xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-noir-gradient p-8 sm:p-12">
        <div className="absolute inset-0 bg-spot" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_22%,transparent),transparent_70%)]" />
        <div className="relative grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
          <img
            src={artistImages[top.artistId]}
            alt={top.winner}
            className="h-40 w-40 rounded-2xl object-cover ring-1 ring-[color-mix(in_oklab,var(--gold)_35%,transparent)] sm:h-48 sm:w-48"
          />
          <div>
            <div className="flex items-center gap-2 text-gold">
              <Crown className="h-5 w-5" />
              <span className="eyebrow">{t(`hallOfFame.items.${top.id}.crown`)}</span>
            </div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {top.winner}
            </h2>
            <p className="mt-2 text-base text-muted-foreground">{t(`hallOfFame.items.${top.id}.note`)}</p>
            <GoldBadge variant="solid" className="mt-5">
              {t(`hallOfFame.items.${top.id}.title`)}
            </GoldBadge>
          </div>
        </div>
      </section>

      {/* AWARD CARDS */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {hallOfFame.slice(1).map((h) => (
          <article
            key={h.id}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 card-hover"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-spot opacity-60" />
            <div className="relative flex items-center gap-4">
              <img
                src={artistImages[h.artistId]}
                alt={h.winner}
                className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
              />
              <div>
                <div className="flex items-center gap-1.5 text-gold">
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="eyebrow">{t(`hallOfFame.items.${h.id}.crown`)}</span>
                </div>
                <p className="mt-1 font-display text-xl font-semibold text-foreground">{h.winner}</p>
              </div>
            </div>
            <p className="relative mt-4 text-xs text-muted-foreground">{t(`hallOfFame.items.${h.id}.title`)}</p>
            <p className="relative mt-1 text-sm text-muted-foreground">{t(`hallOfFame.items.${h.id}.note`)}</p>
          </article>
        ))}
      </section>

      {/* LEGENDS LEDGER */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <SectionHeading eyebrow={t("hallOfFame.ledger")} title={t("hallOfFame.pastLaureates")} />
        <div className="mt-4 divide-y divide-border/60">
          {laureates.map((l) => (
            <div key={l.season} className="flex items-center gap-4 py-3">
              <span className="w-24 text-xs text-muted-foreground">
                {t("hallOfFame.season", { n: l.season })}
              </span>
              <Link
                to="/artists"
                className="flex-1 font-medium text-foreground transition-colors hover:text-gold"
              >
                {l.artist}
              </Link>
              <GoldBadge variant="outline">{t(`hallOfFame.awards.${l.award}`)}</GoldBadge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
