import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LogIn, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/auth/context";
import { AUTH_PATHS } from "@/auth/redirects";
import { useAuthCopy } from "@/i18n/auth";
import { useI18n } from "@/i18n/context";
import { RTL_LANGS } from "@/i18n/translations";
import { MemberMonogram } from "./ProfileParts";

/**
 * Top bar entry for the member: a sign-in button for visitors, the member's own name and a small
 * menu once signed in. Nothing at all while accounts are not configured, so no dead end.
 */
export function AccountMenu() {
  const { t } = useAuthCopy();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const { status, user, memberName, signOut } = useAuth();

  if (status === "unconfigured") return null;

  if (status === "loading") {
    // Same footprint as the final control, so the bar does not jump.
    return (
      <span
        aria-hidden="true"
        className="h-9 w-9 shrink-0 rounded-lg border border-border bg-secondary/30"
      />
    );
  }

  if (status === "signedOut") {
    return (
      <Button asChild variant="ghost-gold" size="sm" className="h-9 shrink-0 px-2.5 sm:px-3.5">
        <Link to={AUTH_PATHS.signIn} aria-label={t("signIn")}>
          <LogIn aria-hidden="true" />
          <span className="hidden sm:inline">{t("signIn")}</span>
        </Link>
      </Button>
    );
  }

  const onSignOut = async () => {
    await signOut();
    toast.success(t("signedOut"));
    void navigate({ to: "/" });
  };

  return (
    <DropdownMenu dir={RTL_LANGS.includes(lang) ? "rtl" : "ltr"}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t("account")} · ${memberName}`}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-secondary/30 p-1 transition-colors hover:border-[color-mix(in_oklab,var(--gold)_28%,transparent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)] data-[state=open]:border-[color-mix(in_oklab,var(--gold)_28%,transparent)] sm:pe-2.5"
        >
          <MemberMonogram name={memberName} className="h-8 w-8 rounded-md text-sm" />
          <span className="hidden max-w-32 truncate text-sm font-medium text-foreground md:block">
            {memberName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 max-w-[calc(100vw-1.5rem)]">
        <DropdownMenuLabel className="space-y-0.5 font-normal">
          <span className="block text-xs text-muted-foreground">{t("signedInAs")}</span>
          <bdi dir="ltr" className="block truncate text-sm font-medium text-foreground">
            {user?.email}
          </bdi>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-11 cursor-pointer gap-2">
          <Link to="/settings">
            <Settings aria-hidden="true" className="h-4 w-4" />
            {t("profileSettings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSignOut} className="min-h-11 cursor-pointer gap-2">
          <LogOut aria-hidden="true" className="h-4 w-4" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
