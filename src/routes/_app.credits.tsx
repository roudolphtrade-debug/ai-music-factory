import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gem, Check, Sparkles, History, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatModule } from "@/components/premium/StatModule";
import { GoldBadge } from "@/components/premium/Chips";
import { PaymentDialog, type PaymentIntent } from "@/components/premium/PaymentDialog";
import { useCredits, PACKS } from "@/library/CreditsProvider";
import { useNotifications } from "@/library/NotificationsProvider";
import { PLANS, COSTS, planById, type PlanId, type CreditPack } from "@/library/credits";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/i18n/context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/credits")({
  head: () => ({
    meta: [
      { title: "Crédits & abonnement — Ai Music Factory" },
      {
        name: "description",
        content:
          "Gérez vos crédits IA, choisissez un abonnement et rechargez votre studio pour générer plus de titres.",
      },
    ],
  }),
  component: CreditsPage,
});

function CreditsPage() {
  const { t } = useI18n();
  const { balance, plan, ledger, subscribe, buyPack } = useCredits();
  const { notify } = useNotifications();
  const active = planById(plan);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);

  const onSubscribe = (id: PlanId) => {
    if (id === plan) return;
    const p = planById(id);
    // Free plan needs no checkout.
    if (p.price === 0) {
      subscribe(id);
      toast.success(t("credits.subscribed", { plan: t(`credits.plans.${id}.name`) }));
      return;
    }
    setIntent({
      label: t("payment.planLabel", { plan: t(`credits.plans.${id}.name`) }),
      price: p.price,
      onConfirm: () => {
        subscribe(id);
        toast.success(t("credits.subscribed", { plan: t(`credits.plans.${id}.name`) }));
        notify("payment", "notif.paymentPlan", { plan: t(`credits.plans.${id}.name`) });
      },
    });
  };

  const onBuyPack = (pack: CreditPack) => {
    const total = pack.credits + (pack.bonus ?? 0);
    setIntent({
      label: t("payment.packLabel", { n: formatNumber(total) }),
      price: pack.price,
      onConfirm: () => {
        buyPack(pack);
        toast.success(t("credits.packAdded", { n: formatNumber(total) }));
        notify("payment", "notif.paymentPack", { n: formatNumber(total) });
      },
    });
  };

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

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatModule
          label={t("credits.balance")}
          value={formatNumber(balance)}
          delta={t("credits.creditsUnit")}
          icon={<Gem className="h-5 w-5" />}
        />
        <StatModule
          label={t("credits.currentPlan")}
          value={t(`credits.plans.${plan}.name`)}
          delta={t("credits.perMonth", { n: formatNumber(active.monthlyCredits) })}
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

      {/* PLANS */}
      <section className="space-y-5">
        <SectionHeading eyebrow={t("credits.plansEyebrow")} title={t("credits.plansTitle")} />
        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = p.id === plan;
            return (
              <div
                key={p.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6",
                  p.featured
                    ? "border-gold/50 shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_30%,transparent)]"
                    : "border-border",
                )}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-6">
                    <GoldBadge>{t("credits.popular")}</GoldBadge>
                  </span>
                )}
                <p className="font-display text-xl font-semibold text-foreground">
                  {t(`credits.plans.${p.id}.name`)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`credits.plans.${p.id}.tag`)}
                </p>
                <p className="mt-4 font-mono text-3xl font-semibold tabular-nums text-foreground">
                  {p.price === 0 ? t("credits.free") : `$${p.price}`}
                  {p.price > 0 && (
                    <span className="text-base font-normal text-muted-foreground">
                      {t("credits.month")}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-gold">
                  {t("credits.perMonth", { n: formatNumber(p.monthlyCredits) })}
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.perkKeys.map((k) => (
                    <li key={k} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      {t(k)}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={p.featured ? "gold" : "outline"}
                  className="mt-6 w-full"
                  disabled={isCurrent}
                  onClick={() => onSubscribe(p.id)}
                >
                  {isCurrent ? t("credits.currentPlanCta") : t("credits.choosePlan")}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* TOP-UP PACKS */}
      <section className="space-y-5">
        <SectionHeading
          eyebrow={t("credits.packsEyebrow")}
          title={t("credits.packsTitle")}
          description={t("credits.packsDesc")}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          {PACKS.map((pack) => (
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
              <Button variant="outline" className="mt-5 w-full" onClick={() => onBuyPack(pack)}>
                {t("credits.buy", { price: `$${pack.price}` })}
              </Button>
            </div>
          ))}
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

      <PaymentDialog intent={intent} onClose={() => setIntent(null)} />
    </div>
  );
}
