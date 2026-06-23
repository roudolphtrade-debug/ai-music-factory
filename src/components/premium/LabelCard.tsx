import { type Label } from "@/data/mock";
import { GoldBadge, ReputationChip } from "./Chips";

export function LabelCard({ label }: { label: Label }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 card-hover">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-spot opacity-60" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-noir-gradient">
          <span className="font-display text-2xl font-semibold gold-text">{label.monogram}</span>
        </div>
        <GoldBadge variant="outline">{label.tier}</GoldBadge>
      </div>
      <div className="relative mt-5 space-y-1.5">
        <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {label.name}
        </h3>
        <p className="text-sm italic text-muted-foreground">{label.tagline}</p>
        <p className="text-xs text-muted-foreground/80">{label.specialty}</p>
      </div>
      <div className="relative mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <Stat label="Roster" value={`${label.roster}`} />
        <Stat label="MRR" value={label.mrr} />
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-muted-foreground">Reputation</span>
          <ReputationChip score={label.reputation} className="w-fit" />
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-semibold text-foreground">{value}</span>
    </div>
  );
}
