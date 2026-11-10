import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, AudioWaveform, Library, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";

const TAB_LABELS = {
  fr: { discover: "Découvrir", create: "Créer" },
  en: { discover: "Discover", create: "Create" },
  es: { discover: "Descubrir", create: "Crear" },
  zh: { discover: "发现", create: "创作" },
  pt: { discover: "Descobrir", create: "Criar" },
  ar: { discover: "اكتشف", create: "أنشئ" },
} as const;

/**
 * Mobile-first primary navigation. Replaces "hamburger as the only way to
 * move around" with the 4 destinations people actually reach for with a
 * thumb, plus a raised center action for the core "create" flow — the same
 * shape as Spotify/Apple Music's bottom bar. The 5th slot opens the full
 * drawer (same one as the topbar hamburger) for everything else.
 *
 * Hidden at `lg:` and up, where the persistent sidebar takes over.
 */
export function MobileTabBar({ onMenu, compact = false }: { onMenu: () => void; compact?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t, lang } = useI18n();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const labels = TAB_LABELS[lang as keyof typeof TAB_LABELS] ?? TAB_LABELS.fr;

  return (
    <nav
      className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-border backdrop-blur-xl lg:hidden", compact ? "bg-card" : "bg-card/90")}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("nav.menu")}
    >
      <div className={cn("grid grid-cols-5 items-center px-1", compact && "h-14")}>
        <TabLink label={t("nav.home")} to="/" icon={Home} active={isActive("/", true)} />
        <TabLink label={labels.discover} to="/artists" icon={Compass} active={isActive("/artists")} />
        <Link to="/studio" className="relative flex flex-col items-center justify-end gap-1 pb-1.5" aria-label={t("nav.studio")}>
          <span
            className={cn(
              "grid place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-glow transition-transform duration-[var(--duration-fast)] active:scale-90 motion-reduce:active:scale-100",
              compact ? "h-9 w-9" : "-mt-5 h-12 w-12",
              isActive("/studio") && "ring-2 ring-gold ring-offset-2 ring-offset-background",
            )}
          >
            <AudioWaveform className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className={cn("text-[0.65rem] font-medium", isActive("/studio") ? "text-gold" : "text-muted-foreground")}>{labels.create}</span>
        </Link>
        <TabLink label={t("nav.radio")} to="/radio" icon={Radio} active={isActive("/radio")} />
        <TabLink label={t("nav.library")} to="/library" icon={Library} active={isActive("/library")} />
      </div>
    </nav>
  );
}

function TabLink({
  label,
  to,
  icon: Icon,
  active,
}: {
  label: string;
  to: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 transition-colors active:scale-95 motion-reduce:active:scale-100",
        active ? "text-gold" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="text-[0.65rem] font-medium">{label}</span>
    </Link>
  );
}
