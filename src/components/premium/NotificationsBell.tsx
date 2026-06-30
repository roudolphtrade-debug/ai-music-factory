import { useState } from "react";
import { Bell, ChevronUp, Users, Crown, Sparkles, CreditCard, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/library/NotificationsProvider";
import type { NotificationKind } from "@/library/notifications";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  vote: ChevronUp,
  community: Users,
  champion: Crown,
  season: Sparkles,
  payment: CreditCard,
};

function timeAgo(at: number, t: (k: string, v?: Record<string, string | number>) => string): string {
  const diff = Math.max(0, Date.now() - at);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("notif.justNow");
  if (mins < 60) return t("time.m", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("time.h", { n: hours });
  return t("time.d", { n: Math.floor(hours / 24) });
}

export function NotificationsBell() {
  const { t } = useI18n();
  const { notifications, unreadCount, markAllRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) markAllRead();
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={t("notif.title")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold-gradient px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{t("notif.title")}</p>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("notif.clear")}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary/50 text-muted-foreground">
                <Check className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted-foreground">{t("notif.empty")}</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = KIND_ICON[n.kind];
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-b-0"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      n.kind === "champion" || n.kind === "season" || n.kind === "payment"
                        ? "bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-gold"
                        : "bg-secondary/60 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-foreground">{t(n.titleKey, n.vars)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.at, t)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
