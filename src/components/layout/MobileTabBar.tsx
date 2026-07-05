import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Radio, AudioWaveform, Library, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";

/**
 * Mobile-first primary navigation. Replaces "hamburger as the only way to
 * move around" with the 4 destinations people actually reach for with a
 * thumb, plus a raised center action for the core "create" flow — the same
 * shape as Spotify/Apple Music's bottom bar. The 5th slot opens the full
 * drawer (same one as the topbar hamburger) for everything else.
 *
 * Hidden at `lg:` and up, where the persistent sidebar takes over.
 */
export function MobileTabBar({ onMenu }: { onMenu: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const items = [
    { label: t("nav.home"), to: "/", icon: Home, exact: true },
    { label: t("nav.radio"), to: "/radio", icon: Radio, exact: false },
  ] as const;

  const trailingItems = [
    { label: t("nav.library"), to: "/library", icon: Library, exact: false },
  ] as const;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("nav.menu")}
    >
      <div className="grid grid-cols-5 items-center px-1">
        {items.map((item) => (
          <TabLink key={item.to} {...item} active={isActive(item.to, item.exact)} />
        ))}

        {/* Raised center action — the core "create" flow gets visual priority */}
        <Link
          to="/studio"
          className="relative flex flex-col items-center justify-end pb-2"
          aria-label={t("nav.studio")}
        >
          <span
            className={cn(
              "-mt-6 grid h-14 w-14 place-items-center rounded-full bg-gold-gradient text-primary-foreground shadow-[0_10px_28px_-10px_var(--gold)] transition-transform duration-[var(--duration-fast)] active:scale-90 motion-reduce:active:scale-100",
              isActive("/studio") && "ring-2 ring-gold ring-offset-2 ring-offset-background",
            )}
          >
            <AudioWaveform className="h-6 w-6" />
          </span>
        </Link>

        {trailingItems.map((item) => (
          <TabLink key={item.to} {...item} active={isActive(item.to)} />
        ))}

        <button
          type="button"
          onClick={onMenu}
          className="flex flex-col items-center gap-1 py-2.5 text-muted-foreground transition-colors active:text-gold"
          aria-label={t("nav.menu")}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[0.65rem] font-medium">{t("nav.menu")}</span>
        </button>
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
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 transition-colors active:scale-95 motion-reduce:active:scale-100",
        active ? "text-gold" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[0.65rem] font-medium">{label}</span>
    </Link>
  );
}
