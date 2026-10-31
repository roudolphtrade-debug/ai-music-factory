import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LogIn, LogOut, Settings } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useGeneratedDraftsOptional } from "@/library/draftsContext";
import { clearPrep, hasPrep, memberOwner } from "@/studio/prep";
import { MemberMonogram } from "./ProfileParts";

/**
 * Top bar entry for the member: explicit sign-up and sign-in links for visitors, the member's own name and a small
 * menu once signed in. Nothing at all while accounts are not configured, so no dead end.
 */
export function AccountMenu() {
  const { t } = useAuthCopy();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const { status, user, memberName, signOut } = useAuth();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const drafts = useGeneratedDraftsOptional();

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
      <div className="col-span-4 flex min-w-0 items-center justify-end gap-2 pb-2 sm:pb-0">
        <Button asChild variant="ghost-gold" size="sm" className="h-11 shrink-0 px-2.5 sm:h-9 sm:px-3.5">
          <Link to={AUTH_PATHS.signIn} aria-label={t("signIn")}>
            <LogIn aria-hidden="true" />
            <span>{t("signIn")}</span>
          </Link>
        </Button>
        <Button asChild variant="gold" size="sm" className="h-11 shrink-0 px-2.5 sm:h-9 sm:px-3.5">
          <Link to={AUTH_PATHS.signUp}>{t("signUp")}</Link>
        </Button>
        </div>
    );
  }

  const finishSignOut = async () => {
    // A deliberate sign-out leaves nothing of the member on this device: the generated tracks go too
    // (disk, memory, temporary addresses), before the session ends.
    const erased = await drafts?.eraseMine();
    await signOut();
    toast.success(t("signedOut"));
    // The disk refused to erase them: the member is told the tracks are still on this device.
    if (erased === false) toast.error(t("signOutEraseFailed"));
    void navigate({ to: "/" });
  };

  // What the member made in the studio and kept on this device (the preparation, the generated tracks)
  // is erased at a deliberate sign-out, so that it cannot be resumed by whoever uses the device next:
  // the member is warned first and can stay signed in. While the tracks are still being read, the
  // warning is shown too: nothing is erased unannounced.
  const hasStudioData =
    (user !== null && hasPrep(memberOwner(user.id))) ||
    (drafts !== null && (!drafts.ready || drafts.drafts.length > 0));
  const onSignOut = () => {
    if (hasStudioData) setConfirmingSignOut(true);
    else void finishSignOut();
  };
  const onConfirmedSignOut = () => {
    if (user) clearPrep(memberOwner(user.id));
    setConfirmingSignOut(false);
    void finishSignOut();
  };

  return (
    <>
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
      <AlertDialog open={confirmingSignOut} onOpenChange={setConfirmingSignOut}>
        <AlertDialogContent dir={RTL_LANGS.includes(lang) ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("signOutPrepTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("signOutPrepDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("signOutPrepStay")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmedSignOut}>
              {t("signOutPrepConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
