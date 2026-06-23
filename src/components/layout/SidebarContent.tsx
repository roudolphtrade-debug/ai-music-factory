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
      {/* faint gold spine on the right edge */}
      <span className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[color-mix(in_oklab,var(--gold)_28%,transparent)] to-transparent" />

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
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                      active
                        ? "bg-[color-mix(in_oklab,var(--gold)_13%,transparent)] text-foreground shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--gold)_18%,transparent)]"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gold-gradient shadow-[0_0_12px_-2px_var(--gold)]" />
                    )}
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-all duration-300",
                        active
                          ? "border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] text-gold"
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
        <div className="surface-premium relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--gold)_24%,transparent)] p-4">
          <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-spot opacity-70" />
          <div className="relative flex items-center gap-2">
            <Crown className="h-4 w-4 text-gold" />
            <p className="font-display text-base font-semibold text-foreground">Go Platinum</p>
          </div>
          <p className="relative mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Unlimited stems, priority mastering, and label tools.
          </p>
          <button className="relative mt-3.5 w-full rounded-lg bg-gold-gradient px-3 py-2 text-xs font-semibold text-primary-foreground shadow-[0_8px_24px_-12px_var(--gold)] transition-transform hover:scale-[1.02]">
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
