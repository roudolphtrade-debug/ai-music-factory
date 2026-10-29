import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { useI18n } from "@/i18n/context";
import { RTL_LANGS } from "@/i18n/translations";
import {
  discardAnonymousPrep,
  peekAnonymousPrep,
  recoverAnonymousPrep,
  type PrepFields,
  type StoredPrep,
} from "@/studio/prep";

const same = (a: PrepFields, b: PrepFields) =>
  a.prompt === b.prompt && a.genre === b.genre && a.mood === b.mood && a.voice === b.voice;

/**
 * A preparation made without an account that nobody claimed (the visitor never clicked Generate, so no
 * sign-in took it over). It belongs to no account: it stays hidden and untouched here until the signed-in
 * member explicitly takes it over or erases it, after a confirmation that says the device may be shared and
 * that the confirmation does not prove who wrote it. Nothing in this component runs by itself on a sign-in.
 */
export function AnonymousPrepRecovery({
  userId,
  signedInAs,
  current,
  onRecovered,
}: {
  userId: string;
  /** Who is signed in right now, read at the moment of the confirmation. */
  signedInAs: { current: string | null };
  /** What the form holds: an anonymous preparation identical to it is not worth offering. */
  current: PrepFields;
  onRecovered: (fields: PrepFields) => void;
}) {
  const { t, lang } = useI18n();
  const dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  const [anon, setAnon] = useState<StoredPrep | null>(() => peekAnonymousPrep());
  const [asking, setAsking] = useState<"claim" | "delete" | null>(null);
  const askedFor = useRef<string | null>(null);

  const refresh = useCallback(() => setAnon(peekAnonymousPrep()), []);

  // Read again when the account changes, and when another tab of this browser changes the slot.
  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [userId, refresh]);

  const open = (kind: "claim" | "delete") => {
    askedFor.current = signedInAs.current;
    setAsking(kind);
  };
  const close = (isOpen: boolean) => {
    if (!isOpen) setAsking(null);
  };
  /** The account that asked is no longer the one signed in: nothing moves. */
  const accountChanged = () => {
    if (signedInAs.current === userId && askedFor.current === userId) return false;
    setAsking(null);
    refresh();
    toast.error(t("studio.gen.anonClaimCancelled"));
    return true;
  };

  const confirmClaim = () => {
    if (accountChanged()) return;
    const result = recoverAnonymousPrep(userId);
    if (result.status === "recovered") {
      onRecovered(result.prep.fields);
      toast.success(t("studio.gen.anonClaimed"));
    } else if (result.status === "gone") {
      toast.error(t("studio.gen.anonClaimGone"));
    } else {
      toast.error(t("studio.gen.anonClaimFailed"));
    }
    setAsking(null);
    refresh();
  };
  const confirmDelete = () => {
    if (accountChanged()) return;
    if (discardAnonymousPrep()) toast.success(t("studio.gen.anonDeleted"));
    else toast.error(t("studio.gen.anonDeleteFailed"));
    setAsking(null);
    refresh();
  };

  if (!anon || same(anon.fields, current)) return null;

  return (
    <div
      role="region"
      aria-label={t("studio.gen.anonPrepTitle")}
      data-testid="anon-prep"
      className="space-y-3 rounded-xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-secondary/30 p-4"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{t("studio.gen.anonPrepTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("studio.gen.anonPrepDesc")}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost-gold" size="sm" onClick={() => open("claim")}>
          {t("studio.gen.anonPrepClaim")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => open("delete")}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> {t("studio.gen.anonPrepDelete")}
        </Button>
      </div>

      <AlertDialog open={asking === "claim"} onOpenChange={close}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("studio.gen.anonClaimTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">{t("studio.gen.anonClaimWarning")}</span>
              <span className="mt-2 block">{t("studio.gen.anonClaimNoProof")}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("studio.gen.dialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmClaim();
              }}
            >
              {t("studio.gen.anonClaimConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={asking === "delete"} onOpenChange={close}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("studio.gen.anonDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("studio.gen.anonDeleteWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("studio.gen.dialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {t("studio.gen.anonDeleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
