import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  Users,
  TrendingUp,
  Coins,
  Percent,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { GoldBadge, ReputationChip } from "@/components/premium/Chips";
import { StatModule } from "@/components/premium/StatModule";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { EmptyState } from "@/components/premium/EmptyState";
import { useSpotlight } from "@/hooks/useSpotlight";
import { artists, artistImages, type ArtistId } from "@/data/mock";
import { simulateLabel, formatMoney, formatCompact, TIER_CONFIG } from "@/library/labels";
import { useLabels } from "@/library/LabelsProvider";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/labels/$labelId")({
  head: () => ({
    meta: [{ title: "Label — Ai Music Factory" }],
  }),
  component: LabelDetailPage,
});

function LabelDetailPage() {
  const { t } = useI18n();
  const { labelId } = Route.useParams();
  const { getLabel, signArtist, releaseArtist } = useLabels();
  const spotlight = useSpotlight<HTMLElement>();
  const [growth, setGrowth] = useState(1);

  const label = getLabel(labelId);

  const sim = useMemo(() => (label ? simulateLabel(label) : null), [label]);

  if (!label || !sim) {
    return (
      <div className="space-y-8">
        <BackLink t={t} />
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={t("labels.detail.notFoundTitle")}
          description={t("labels.detail.notFoundDesc")}
        />
      </div>
    );
  }

  const available = artists.filter((a) => !label.artistIds.includes(a.id));
  const projectedLabelRevenue = sim.labelRevenue * growth;

  return (
    <div className="space-y-8">
      <BackLink t={t} />

      {/* HERO */}
      <section
        ref={spotlight.ref}
        onPointerMove={spotlight.onPointerMove}
        className="group relative overflow-hidden rounded-3xl border border-gold/30 surface-premium p-7 sm:p-10"
      >
        <span className="spotlight-layer z-10 group-hover:opacity-100" />
        <div className="relative flex flex-wrap items-start gap-6">
          <div className="icon-tile h-20 w-20 shrink-0">
            <span className="font-display text-3xl font-semibold gold-text">{label.monogram}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <GoldBadge variant="outline">{t(`labels.tier.${label.tier}`)}</GoldBadge>
              <GoldBadge variant="solid">{t("labels.create.yours")}</GoldBadge>
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
              {label.name}
            </h1>
            {label.tagline && (
              <p className="text-base italic text-muted-foreground">{label.tagline}</p>
            )}
            <p className="text-sm text-muted-foreground/80">{label.specialty}</p>
            <p className="max-w-xl text-sm text-muted-foreground">
              {TIER_CONFIG[label.tier].pitch}
            </p>
          </div>
          <ReputationChip score={sim.reputation} />
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatModule
          label={t("labels.roster")}
          value={`${sim.roster.length}`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatModule
          label={t("labels.detail.totalListeners")}
          value={formatCompact(sim.totalListeners)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatModule
          label={t("labels.detail.grossRevenue")}
          value={formatMoney(sim.monthlyRevenue)}
          icon={<Coins className="h-5 w-5" />}
        />
        <StatModule
          label={t("labels.detail.labelCut")}
          value={`${Math.round(sim.labelShare * 100)}%`}
          delta={formatMoney(sim.labelRevenue)}
          icon={<Percent className="h-5 w-5" />}
        />
      </section>

      {/* ROYALTY SIMULATOR */}
      <section className="space-y-5 rounded-2xl border border-border surface-premium p-6">
        <SectionHeading
          eyebrow={t("labels.detail.simEyebrow")}
          title={t("labels.detail.simTitle")}
          description={t("labels.detail.simDesc")}
        />
        <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("labels.detail.growthScenario")}</span>
                <span className="font-display text-lg font-semibold gold-text">
                  {growth.toFixed(1)}×
                </span>
              </div>
              <Slider
                value={[growth]}
                onValueChange={(v) => setGrowth(v[0])}
                min={1}
                max={5}
                step={0.1}
              />
            </div>
            <div className="rounded-xl border border-gold/30 bg-[color-mix(in_oklab,var(--gold)_7%,transparent)] p-5">
              <p className="eyebrow text-muted-foreground/70">
                {t("labels.detail.projectedLabelMrr")}
              </p>
              <p className="mt-1 font-display text-4xl font-semibold gold-text">
                {formatMoney(projectedLabelRevenue)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("labels.detail.projectedArtistPool", {
                  v: formatMoney(sim.artistPool * growth),
                })}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="eyebrow text-muted-foreground/70">{t("labels.detail.payoutSplit")}</p>
            {sim.payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("labels.detail.noPayouts")}</p>
            ) : (
              <ul className="space-y-2">
                {sim.payouts
                  .slice()
                  .sort((a, b) => b.payout - a.payout)
                  .map(({ artist, payout, listeners }) => (
                    <li
                      key={artist.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-2.5"
                    >
                      <img
                        loading="lazy"
                        src={artistImages[artist.id]}
                        alt={artist.name}
                        className="h-9 w-9 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {artist.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCompact(listeners)} {t("labels.detail.listeners")}
                        </p>
                      </div>
                      <span className="font-display text-sm font-semibold text-foreground">
                        {formatMoney(payout * growth)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ROSTER MANAGEMENT */}
      <section className="space-y-5">
        <SectionHeading
          eyebrow={t("labels.detail.rosterEyebrow")}
          title={t("labels.detail.signedTitle")}
        />
        {sim.roster.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={t("labels.detail.emptyRosterTitle")}
            description={t("labels.detail.emptyRosterDesc")}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sim.roster.map((a) => (
              <ArtistRow
                key={a.id}
                id={a.id}
                name={a.name}
                meta={a.genres.join(" · ")}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      releaseArtist(label.id, a.id);
                      toast(t("labels.detail.released", { name: a.name }));
                    }}
                  >
                    <UserMinus className="h-4 w-4" /> {t("labels.detail.release")}
                  </Button>
                }
              />
            ))}
          </div>
        )}

        {available.length > 0 && (
          <>
            <SectionHeading
              eyebrow={t("labels.detail.scoutEyebrow")}
              title={t("labels.detail.signTitle")}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((a) => (
                <ArtistRow
                  key={a.id}
                  id={a.id}
                  name={a.name}
                  meta={`${a.monthlyListeners} · ${a.genres[0]}`}
                  action={
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => {
                        signArtist(label.id, a.id);
                        toast.success(t("labels.detail.signed", { name: a.name }));
                      }}
                    >
                      <UserPlus className="h-4 w-4" /> {t("labels.detail.sign")}
                    </Button>
                  }
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ArtistRow({
  id,
  name,
  meta,
  action,
}: {
  id: ArtistId;
  name: string;
  meta: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border surface-premium p-3">
      <img
        loading="lazy"
        src={artistImages[id]}
        alt={name}
        className="h-11 w-11 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      {action}
    </div>
  );
}

function BackLink({ t }: { t: (k: string) => string }) {
  return (
    <Link
      to="/labels"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {t("labels.detail.allLabels")}
    </Link>
  );
}
