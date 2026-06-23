import { Link } from "@tanstack/react-router";
import { Search, Bell, Plus, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search artists, tracks, labels…"
            className="h-10 w-full rounded-xl border border-input bg-secondary/40 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Button asChild variant="gold" className="hidden sm:inline-flex">
            <Link to="/studio">
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </Button>
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-gold ring-2 ring-background" />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 py-1 pl-1 pr-2.5 transition-colors hover:border-[color-mix(in_oklab,var(--gold)_35%,transparent)]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-gradient text-sm font-semibold text-primary-foreground">
              A
            </span>
            <span className="hidden text-sm font-medium text-foreground md:block">Studio A</span>
          </button>
        </div>
      </div>
    </header>
  );
}
