import { Link } from "@tanstack/react-router";
import { Trash2, ArrowUpRight } from "lucide-react";
import { GoldBadge, ReputationChip } from "./Chips";
import { Button } from "@/components/ui/button";
import { type UserLabel, simulateLabel, formatMoney } from "@/library/labels";
import { useLabels } from "@/library/LabelsProvider";
import { useI18n } from "@/i18n/context";

export function UserLabelCard({ label }: { label: UserLabel }) {
  const { t } = useI18n();
  const { deleteLabel } = useLabels();
  const sim = simulateLabel(label);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-gold/30 surface-premium p-6 card-hover">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-spot opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="icon-tile h-16 w-16">
          <span className="font-display text-2xl font-semibold gold-text">{label.monogram}</span>
        </div>
        <div className="flex items-center gap-2">
          <GoldBadge variant="solid">{t("labels.create.yours")}</GoldBadge>
          <button
            type="button"
            onClick={() => deleteLabel(label.id)}
            aria-label={t("labels.create.delete")}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative mt-5 space-y-1.5">
        <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">{label.name}</h3>
        {label.tagline && <p className="text-sm italic text-muted-foreground">{label.tagline}</p>}
        <p className="text-xs text-muted-foreground/80">
          {label.specialty || t(`labels.tier.${label.tier}`)}
        </p>
      </div>

      <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
        <Stat label={t("labels.roster")} value={`${label.artistIds.length}`} />
        <Stat label={t("labels.mrr")} value={formatMoney(sim.labelRevenue)} />
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted-foreground/70">{t("labels.reputation")}</span>
          <ReputationChip score={sim.reputation} className="w-fit" />
        </div>
      </div>

      <Button asChild variant="outline" size="sm" className="relative mt-5 w-full">
        <Link to="/labels/$labelId" params={{ labelId: label.id }}>
          {t("labels.create.manage")} <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Button>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow text-muted-foreground/70">{label}</span>
      <span className="font-display text-lg font-semibold text-foreground">{value}</span>
    </div>
  );
}
