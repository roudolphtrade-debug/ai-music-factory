import { Link, useRouterState } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { navSections } from "./nav-config";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="relative flex h-full flex-col bg-sidebar">
      {/* whisper-thin gold spine on the right edge */}
      <span className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[color-mix(in_oklab,var(--gold)_16%,transparent)] to-transparent" />

      <div className="px-5 pb-5 pt-6">
        <Link to="/" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>
      <div className="mx-5 divider-gold" />

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 pb-4 pt-5">
        {navSections.map((section) => (
          <div key={section.heading}>
            <p className="eyebrow px-3 pb-2.5 text-[0.6rem] text-muted-foreground/60">
              {t(section.heading)}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.to, item.exact);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-300",
                      active
                        ? "bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] font-medium text-foreground"
                        : "font-normal text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-gold" />
                    )}
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-all duration-300",
                        active
                          ? "border-[color-mix(in_oklab,var(--gold)_24%,transparent)] bg-[color-mix(in_oklab,var(--gold)_7%,transparent)] text-gold"
                          : "border-transparent text-muted-foreground group-hover:border-border group-hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-[1.05rem] w-[1.05rem]" />
                    </span>
                    {t(item.label)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="surface-premium relative overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--gold)_16%,transparent)] p-4">
          <div className="relative flex items-center gap-2">
            <Crown className="h-4 w-4 text-gold" />
            <p className="font-display text-base font-semibold text-foreground">{t("sidebar.platinumTitle")}</p>
          </div>
          <p className="relative mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {t("sidebar.platinumDesc")}
          </p>
          <button className="relative mt-3.5 w-full rounded-md bg-gold-gradient px-3 py-2 text-xs font-semibold text-primary-foreground transition-[filter] hover:brightness-[1.04]">
            {t("sidebar.upgrade")}
          </button>
        </div>
      </div>
    </div>
  );
}
