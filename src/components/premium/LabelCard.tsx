import { type Label } from "@/data/mock";
import { GoldBadge, ReputationChip } from "./Chips";
import { useI18n } from "@/i18n/context";

export function LabelCard({ label }: { label: Label }) {
  const { t } = useI18n();
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border surface-premium card-hover">
      {label.cover && (
        <div className="relative aspect-[5/2] overflow-hidden">
          <img
            src={label.cover}
            alt={`${label.name} cover art`}
            loading="lazy"
            width={1024}
            height={1024}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <GoldBadge variant="outline" className="absolute right-4 top-4">
            {t(`labels.tier.${label.tier}`)}
          </GoldBadge>
        </div>
      )}
      <div className="relative p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-spot opacity-60 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="icon-tile h-16 w-16">
            <span className="font-display text-2xl font-semibold gold-text">{label.monogram}</span>
          </div>
          {!label.cover && (
            <GoldBadge variant="outline">{t(`labels.tier.${label.tier}`)}</GoldBadge>
          )}
        </div>
        <div className="relative mt-5 space-y-1.5">
          <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {label.name}
          </h3>
          <p className="text-sm italic text-muted-foreground">{label.tagline}</p>
          <p className="text-xs text-muted-foreground/80">{label.specialty}</p>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
          <Stat label={t("labels.roster")} value={`${label.roster}`} />
          <Stat label={t("labels.mrr")} value={label.mrr} />
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow text-muted-foreground/70">{t("labels.reputation")}</span>
            <ReputationChip score={label.reputation} className="w-fit" />
          </div>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow text-muted-foreground/70">{label}</span>
      <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}
