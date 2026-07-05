import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, Menu } from "lucide-react";
import { NotificationsBell } from "@/components/premium/NotificationsBell";
import { CircularFlag } from "@/components/premium/CircularFlag";
import { SearchPalette } from "@/components/layout/SearchPalette";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";
import { LANGS } from "@/i18n/translations";
import { cn } from "@/lib/utils";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t, lang, setLang } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:h-9 sm:w-9 lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="relative flex h-9 flex-1 items-center gap-2 rounded-lg border border-input bg-secondary/30 px-3 text-left text-sm text-muted-foreground/70 outline-none transition-colors hover:border-[color-mix(in_oklab,var(--gold)_28%,transparent)] sm:max-w-md sm:px-3.5"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{t("topbar.searchPlaceholder")}</span>
          <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground/80 sm:inline-flex">
            ⌘K
          </kbd>
        </button>

        <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
          {/* Language switcher — compact circular SVG flags, scales cleanly on mobile */}
          <div
            role="group"
            aria-label={t("language.label")}
            className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-secondary/40 p-0.5 backdrop-blur-sm sm:gap-0.5 sm:p-1"
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                title={l.label}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full transition-all duration-200",
                  "h-6 w-6 sm:h-7 sm:w-auto sm:px-2",
                  lang === l.code
                    ? "text-gold ring-1 ring-gold ring-offset-1 ring-offset-background shadow-[0_0_12px_-4px_color-mix(in_oklab,var(--gold)_55%,transparent)] sm:shadow-[0_0_14px_-4px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                <CircularFlag lang={l.code} className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden text-[10px] font-semibold tracking-wide sm:inline">
                  {l.label}
                </span>
              </button>
            ))}
          </div>

          <Button asChild variant="gold" className="hidden sm:inline-flex">
            <Link to="/studio">
              <Plus className="h-4 w-4" />
              {t("topbar.create")}
            </Link>
          </Button>
          <NotificationsBell />
          <Link
            to="/settings"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-secondary/30 py-1 pl-1 pr-1.5 transition-colors hover:border-[color-mix(in_oklab,var(--gold)_28%,transparent)] sm:pr-2.5"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-sm font-semibold text-gold">
              A
            </span>
            <span className="hidden text-sm font-medium text-foreground md:block">Studio A</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
