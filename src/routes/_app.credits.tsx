import { useId } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gem, Gift, History, Info, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatModule } from "@/components/premium/StatModule";
import { GoldBadge } from "@/components/premium/Chips";
import { useCredits, PACKS } from "@/library/CreditsProvider";
import { COSTS, FREE_MONTHLY_CREDITS } from "@/library/credits";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/credits")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Crédits · Ai Music Factory" },
      {
        property: "og:description",
        content:
          "Consultez vos crédits IA et votre offre gratuite mensuelle. Les paiements ne sont pas encore disponibles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Crédits · Ai Music Factory" },
      {
        name: "description",
        content:
          "Consultez vos crédits IA et votre offre gratuite mensuelle. Les paiements ne sont pas encore disponibles.",
      },
    ],
  }),
  component: CreditsPage,
});

function CreditsPage() {
  const { t } = useI18n();
  const { balance, ledger } = useCredits();
  // The packs below point at this notice, so that assistive technology reads why they are disabled.
  const noticeId = useId();

  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow={t("credits.eyebrow")}
        title={t("credits.title")}
        description={t("credits.desc")}
        action={
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-gradient text-background">
              <Gem className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-2xl font-semibold leading-none tabular-nums text-foreground">
                {formatNumber(balance)}
              </p>
              <p className="text-xs text-muted-foreground">{t("credits.balance")}</p>
            </div>
          </div>
        }
      />

      <div
        id={noticeId}
        role="note"
        className="flex items-start gap-3 rounded-2xl border border-gold/40 bg-card p-4"
      >
        <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <p className="text-sm text-foreground">{t("credits.paymentsUnavailable")}</p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatModule
          label={t("credits.balance")}
          value={formatNumber(balance)}
          delta={t("credits.creditsUnit")}
          icon={<Gem className="h-5 w-5" />}
        />
        <StatModule
          label={t("credits.giftMonthly")}
          value={formatNumber(FREE_MONTHLY_CREDITS)}
          delta={t("credits.creditsUnit")}
          icon={<Gift className="h-5 w-5" />}
        />
        <StatModule
          label={t("credits.costTrack")}
          value={`${COSTS.track}`}
          delta={t("credits.creditsUnit")}
          icon={<Sparkles className="h-5 w-5" />}
        />
        <StatModule
          label={t("credits.costVoice")}
          value={`${COSTS.voice}`}
          delta={t("credits.creditsUnit")}
          icon={<Zap className="h-5 w-5" />}
        />
      </section>

      {/* FREE OFFER — the only way credits are added today. */}
      <section className="rounded-2xl border border-gold/50 bg-card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-gradient text-background">
            <Gift aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {t("credits.freeOfferTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("credits.freeOfferDesc", { n: formatNumber(FREE_MONTHLY_CREDITS) })}
            </p>
          </div>
        </div>
      </section>

      {/* CREATOR EARNINGS — how the platform intends to pay creators, stated
          plainly rather than left as an implied promise the product doesn't
          yet fulfill. */}
      <section className="rounded-2xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-noir-gradient p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow text-gold">{t("credits.earningsEyebrow")}</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">
              {t("credits.earningsTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("credits.earningsDesc")}
            </p>
          </div>
          <GoldBadge variant="outline" className="shrink-0">
            {t("credits.earningsStatus")}
          </GoldBadge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-sm font-medium text-foreground">{t("credits.earningsStep1Title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("credits.earningsStep1Desc")}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-sm font-medium text-foreground">{t("credits.earningsStep2Title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("credits.earningsStep2Desc")}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-sm font-medium text-foreground">{t("credits.earningsStep3Title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("credits.earningsStep3Desc")}</p>
          </div>
        </div>
      </section>

      {/* TOP-UP PACKS — shown for what is planned; nothing can be bought yet. */}
      <section className="space-y-5">
        <SectionHeading
          eyebrow={t("credits.packsEyebrow")}
          title={t("credits.packsTitle")}
          description={t("credits.packsSoonDesc")}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          {PACKS.map((pack) => {
            const total = pack.credits + (pack.bonus ?? 0);
            return (
              <div
                key={pack.id}
                className="flex flex-col items-start rounded-2xl border border-border bg-card p-6"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-border/70 bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] text-gold">
                  <Gem className="h-5 w-5" />
                </span>
                <p className="mt-4 font-mono text-2xl font-semibold tabular-nums text-foreground">
                  {formatNumber(pack.credits)}
                  {pack.bonus ? (
                    <span className="ml-2 text-sm font-medium text-gold">+{pack.bonus}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{t("credits.creditsUnit")}</p>
                <Button
                  variant="outline"
                  className="mt-5 w-full"
                  disabled
                  aria-describedby={noticeId}
                  aria-label={t("credits.comingSoonPack", { n: formatNumber(total) })}
                >
                  {t("credits.comingSoon")}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* LEDGER */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <SectionHeading
          eyebrow={t("credits.ledgerEyebrow")}
          title={t("credits.ledgerTitle")}
          action={<History className="h-4 w-4 text-gold" />}
        />
        <div className="mt-4 space-y-1.5">
          {ledger.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("credits.ledgerEmpty")}</p>
          )}
          {ledger.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/40"
            >
              <span className="flex-1 text-sm text-foreground">{t(e.reasonKey)}</span>
              <span
                className={cn(
                  "font-mono text-sm font-semibold tabular-nums",
                  e.amount >= 0 ? "text-gold" : "text-muted-foreground",
                )}
              >
                {e.amount >= 0 ? "+" : ""}
                {formatNumber(e.amount)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
