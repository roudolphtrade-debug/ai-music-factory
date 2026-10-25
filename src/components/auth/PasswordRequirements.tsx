import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isolate } from "@/auth/handle";
import { passwordCriteria, PASSWORD_CRITERIA, PASSWORD_SYMBOLS } from "@/auth/password";
import { CRITERION_KEY } from "@/auth/passwordText";
import { useAuthCopy } from "@/i18n/auth";

/**
 * The password rules, shown before anything is typed and ticked off as the member types. Nothing is
 * announced on every key press: each line carries its state as text for screen readers, and the
 * list is linked to the field with aria-describedby (the field gets `id`).
 * `invalid` turns the missing lines red after a refused attempt.
 */
export function PasswordRequirements({
  id,
  value,
  invalid,
}: {
  id: string;
  value: string;
  invalid?: boolean;
}) {
  const { t } = useAuthCopy();
  const met = passwordCriteria(value);
  const untouched = value === "" && !invalid;
  return (
    <div
      id={id}
      className="rounded-xl border border-border bg-secondary/30 px-3.5 py-3 text-xs leading-relaxed"
    >
      <p className="font-medium text-foreground">{t("passwordReqTitle")}</p>
      <ul className="mt-2 space-y-1.5">
        {PASSWORD_CRITERIA.map((criterion) => {
          const ok = met[criterion];
          return (
            <li
              key={criterion}
              data-state={ok ? "met" : untouched ? "idle" : invalid ? "missing" : "pending"}
              className={cn(
                "flex items-start gap-2",
                ok ? "text-foreground" : invalid ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {ok ? (
                <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              ) : (
                <Circle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <span>
                {t(CRITERION_KEY[criterion])}
                {!untouched && (
                  <span className="sr-only"> ({ok ? t("critMet") : t("critMissing")})</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2.5 text-muted-foreground">
        {t("passwordSymbols", { symbols: isolate(PASSWORD_SYMBOLS) })}
      </p>
    </div>
  );
}
