import { Link, useRouterState } from "@tanstack/react-router";
import { navSections } from "./nav-config";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="px-5 py-6">
        <Link to="/" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {navSections.map((section) => (
          <div key={section.heading}>
            <p className="eyebrow px-3 pb-2 text-muted-foreground/70">{section.heading}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.to, item.exact);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gold-gradient" />
                    )}
                    <item.icon
                      className={cn(
                        "h-[1.15rem] w-[1.15rem] shrink-0 transition-colors",
                        active ? "text-gold" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--gold)_22%,transparent)] bg-noir-gradient p-4">
          <p className="font-display text-base font-semibold text-foreground">Go Platinum</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unlimited stems, priority mastering, and label tools.
          </p>
          <button className="mt-3 w-full rounded-lg bg-gold-gradient px-3 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02]">
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
