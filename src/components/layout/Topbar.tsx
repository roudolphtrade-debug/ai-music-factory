import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Plus, Menu } from "lucide-react";
import { NotificationsBell } from "@/components/premium/NotificationsBell";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { SearchPalette } from "@/components/layout/SearchPalette";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/Logo";

export function Topbar({ onMenu, compact = false }: { onMenu: () => void; compact?: boolean }) {
  const { t } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const open = () => setSearchOpen(true);
    window.addEventListener("afm:open-search", open);
    return () => window.removeEventListener("afm:open-search", open);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className={cn("flex min-w-0 items-center gap-1.5 px-3 sm:gap-3 sm:px-6", compact ? "min-h-14 md:h-16" : "min-h-16 md:h-16")}>
        <Link to="/" aria-label={t("nav.home")} className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:hidden">
          <Logo showWordmark={false} />
        </Link>

        <Button variant="outline"
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label={t("topbar.searchPlaceholder")}
          className="relative h-11 w-11 min-w-0 ms-auto shrink-0 justify-center px-0 sm:ms-0 sm:shrink sm:w-auto sm:flex-1 sm:justify-start gap-2 border-input bg-secondary/30 text-start text-sm text-muted-foreground sm:h-9 sm:max-w-md sm:px-3.5"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden min-w-0 flex-1 truncate sm:inline">{t("topbar.searchPlaceholder")}</span>
          <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground/80 sm:inline-flex">
            ⌘K
          </kbd>
        </Button>

        <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />

        <div className="flex shrink-0 sm:ms-auto items-center gap-1.5 sm:gap-3">
          <LanguageSelector />

          <Button asChild variant="gold" className="hidden xl:inline-flex">
            <Link to="/studio">
              <Plus className="h-4 w-4" />
              {t("topbar.create")}
            </Link>
          </Button>
          <NotificationsBell />
        </div>
        <AccountMenu />
        <Button variant="ghost" size="icon"
          type="button"
          onClick={onMenu}
          className="h-11 w-11 shrink-0 -me-1 text-muted-foreground lg:hidden"
          aria-label={t("nav.menu")}
        >
          <Menu className="h-5 w-5" />
        </Button>

      </div>
    </header>
  );
}
