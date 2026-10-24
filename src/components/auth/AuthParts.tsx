import { forwardRef, useId, useState, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuthCopy } from "@/i18n/auth";

/** The framed card every account screen sits in. */
export function AuthCard({
  title,
  description,
  icon,
  children,
  className,
  headingLevel = 1,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 1 when the card is the page's main content, 2 when the page has its own title. */
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section
      aria-labelledby="auth-card-title"
      className={cn(
        "surface-premium relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold-gradient opacity-60" />
      {icon && (
        <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] text-gold">
          {icon}
        </span>
      )}
      <Heading
        id="auth-card-title"
        className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]"
      >
        {title}
      </Heading>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** A message tied to a form: errors are announced at once, other notes politely. */
export function FormNotice({
  tone,
  children,
  className,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-snug",
        tone === "error" &&
          "border-destructive/40 bg-destructive/10 text-foreground [&_svg]:text-destructive",
        tone === "success" &&
          "border-[color-mix(in_oklab,var(--gold)_35%,transparent)] bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] text-foreground [&_svg]:text-gold",
        tone === "info" && "border-border bg-secondary/40 text-muted-foreground [&_svg]:text-gold",
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

interface FieldProps extends Omit<ComponentProps<"input">, "id"> {
  label: string;
  error?: string;
  hint?: string;
  optionalLabel?: string;
  /** Latin-script content (an address, a handle): written left to right, still aligned with the page. */
  ltr?: boolean;
  endSlot?: ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, FieldProps>(function AuthField(
  { label, error, hint, optionalLabel, ltr, endSlot, className, ...input },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-baseline justify-between gap-2 text-foreground">
        <span>{label}</span>
        {optionalLabel && (
          <span className="text-xs font-normal text-muted-foreground">{optionalLabel}</span>
        )}
      </Label>
      <div className="relative">
        <Input
          {...input}
          id={id}
          ref={ref}
          dir={ltr ? "ltr" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 rounded-xl border-input bg-secondary/30 px-3.5 text-base shadow-none focus-visible:border-[color-mix(in_oklab,var(--gold)_45%,transparent)] focus-visible:ring-1 focus-visible:ring-[var(--gold)] sm:text-sm",
            ltr && "rtl:text-right",
            endSlot && "pe-11",
            error && "border-destructive/60",
            className,
          )}
        />
        {endSlot && <div className="absolute inset-y-0 end-1 flex items-center">{endSlot}</div>}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
});

export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, "type" | "endSlot">>(
  function PasswordField(props, ref) {
    const { t } = useAuthCopy();
    const [shown, setShown] = useState(false);
    return (
      <AuthField
        {...props}
        ref={ref}
        ltr
        type={shown ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        endSlot={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label={shown ? t("hidePassword") : t("showPassword")}
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
          >
            {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        }
      />
    );
  },
);

export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  return (
    <Button type="submit" variant="gold" size="xl" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
