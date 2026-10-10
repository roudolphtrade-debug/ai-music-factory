import { Link } from "@tanstack/react-router";
import { AudioWaveform, Sparkles, Compass, MessagesSquare, TrendingUp } from "lucide-react";
import { useI18n } from "@/i18n/context";

const pillars = [
  { key: "create", to: "/studio", icon: AudioWaveform },
  { key: "identity", to: "/avatar-lab", icon: Sparkles },
  { key: "discover", to: "/artists", icon: Compass },
  { key: "connect", to: "/community", icon: MessagesSquare },
  { key: "grow", to: "/analytics", icon: TrendingUp },
] as const;

const names = { create: "Create", identity: "Identity", discover: "Discover", connect: "Connect", grow: "Grow" };

/** The five product pillars, as an editorial entry band on the home page. */
export function PillarBand() {
  const { t } = useI18n();
  return (
    <nav aria-label="Pillars" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-5">
      {pillars.map((p, i) => (
        <Link
          key={p.key}
          to={p.to}
          className="group relative flex flex-col gap-3 bg-card p-5 transition-colors hover:bg-secondary/40 last:col-span-2 sm:last:col-span-1"
        >
          <span className="flex items-center justify-between text-muted-foreground">
            <p.icon className="h-4 w-4 transition-colors group-hover:text-gold" />
            <span className="font-display text-xs italic">0{i + 1}</span>
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight text-foreground">{names[p.key]}</span>
          <span className="text-xs leading-relaxed text-muted-foreground">{t(`nav.pillarDesc.${p.key}`)}</span>
          <span className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-gold-gradient transition-transform duration-500 group-hover:scale-x-100" />
        </Link>
      ))}
    </nav>
  );
}
