import { useEffect, useState } from "react";
import { CreditCard, Lock, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

type Phase = "form" | "processing" | "success";

export interface PaymentIntent {
  /** Localized label of what's being purchased. */
  label: string;
  /** Price in USD. */
  price: number;
  onConfirm: () => void;
}

export function PaymentDialog({
  intent,
  onClose,
}: {
  intent: PaymentIntent | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("form");
  const [card, setCard] = useState("");
  const [name, setName] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");

  // Reset internal state whenever a fresh intent opens the dialog.
  useEffect(() => {
    if (intent) {
      setPhase("form");
      setCard("");
      setName("");
      setExp("");
      setCvc("");
    }
  }, [intent]);

  const open = intent !== null;
  const valid = card.replace(/\s/g, "").length >= 12 && name.trim().length > 1 && exp.length >= 4 && cvc.length >= 3;

  const pay = () => {
    if (!valid || !intent) return;
    setPhase("processing");
    window.setTimeout(() => {
      setPhase("success");
      intent.onConfirm();
      window.setTimeout(() => onClose(), 1400);
    }, 1600);
  };

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && phase !== "processing" && onClose()}>
      <DialogContent className="sm:max-w-md">
        {phase === "success" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-[var(--success)]">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <p className="font-display text-xl font-semibold text-foreground">{t("payment.success")}</p>
            <p className="text-sm text-muted-foreground">{intent?.label}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gold" /> {t("payment.title")}
              </DialogTitle>
              <DialogDescription>{t("payment.desc")}</DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{intent?.label}</span>
                <span className="font-display text-lg font-semibold text-foreground">
                  ${intent?.price.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Field label={t("payment.cardNumber")}>
                <input
                  inputMode="numeric"
                  value={card}
                  onChange={(e) => setCard(formatCard(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  className={inputCls}
                  disabled={phase === "processing"}
                />
              </Field>
              <Field label={t("payment.cardName")}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("payment.cardNamePlaceholder")}
                  className={inputCls}
                  disabled={phase === "processing"}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("payment.expiry")}>
                  <input
                    inputMode="numeric"
                    value={exp}
                    onChange={(e) => setExp(formatExp(e.target.value))}
                    placeholder="12/28"
                    className={inputCls}
                    disabled={phase === "processing"}
                  />
                </Field>
                <Field label={t("payment.cvc")}>
                  <input
                    inputMode="numeric"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="123"
                    className={inputCls}
                    disabled={phase === "processing"}
                  />
                </Field>
              </div>
            </div>

            <Button variant="gold" className="w-full" disabled={!valid || phase === "processing"} onClick={pay}>
              {phase === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("payment.processing")}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> {t("payment.pay", { price: `$${intent?.price.toFixed(2)}` })}
                </>
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" /> {t("payment.secureNote")}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-input bg-secondary/30 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[color-mix(in_oklab,var(--gold)_38%,transparent)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={cn("block space-y-1.5")}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
