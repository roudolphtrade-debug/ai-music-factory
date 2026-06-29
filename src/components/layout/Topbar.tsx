import { Link } from "@tanstack/react-router";
import { Search, Plus, Menu } from "lucide-react";
import { NotificationsBell } from "@/components/premium/NotificationsBell";
import { CircularFlag } from "@/components/premium/CircularFlag";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";
import { LANGS } from "@/i18n/translations";
import { cn } from "@/lib/utils";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t, lang, setLang } = useI18n();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={t("topbar.searchPlaceholder")}
            className="h-10 w-full rounded-lg border border-input bg-secondary/30 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-[color-mix(in_oklab,var(--gold)_38%,transparent)]"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Language switcher — circular SVG flags with gold glow */}
          <div
            role="group"
            aria-label={t("language.label")}
            className="flex items-center gap-0.5 rounded-full border border-border bg-secondary/40 p-1 backdrop-blur-sm"
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                title={l.label}
                className={cn(
                  "flex items-center gap-1.5 rounded-full transition-all duration-200",
                  "h-7 w-7 justify-center sm:h-8 sm:w-auto sm:px-2",
                  lang === l.code
                    ? "text-gold ring-1 ring-gold ring-offset-1 ring-offset-background shadow-[0_0_14px_-4px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <CircularFlag lang={l.code} />
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
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 py-1 pl-1 pr-2.5 transition-colors hover:border-[color-mix(in_oklab,var(--gold)_28%,transparent)]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-sm font-semibold text-gold">
              A
            </span>
            <span className="hidden text-sm font-medium text-foreground md:block">Studio A</span>
          </button>
        </div>
      </div>
    </header>
  );
}
