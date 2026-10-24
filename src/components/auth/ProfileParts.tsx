import { cn } from "@/lib/utils";
import { CREATOR_ROLES, type CreatorRole } from "@/auth/types";
import { memberInitial } from "@/auth/format";
import { useAuthCopy } from "@/i18n/auth";

/** Artist and label are optional, not exclusive, and never required. */
export function RoleChips({
  value,
  onChange,
  disabled,
}: {
  value: CreatorRole[];
  onChange: (next: CreatorRole[]) => void;
  disabled?: boolean;
}) {
  const { t } = useAuthCopy();
  const label: Record<CreatorRole, string> = { artist: t("roleArtist"), label: t("roleLabel") };
  return (
    <div role="group" aria-label={t("roleTitle")} className="flex flex-wrap gap-2">
      {CREATOR_ROLES.map((role) => {
        const on = value.includes(role);
        return (
          <button
            key={role}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((r) => r !== role) : [...value, role])}
            className={cn(
              "inline-flex h-11 min-w-28 items-center justify-center rounded-xl border px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-50",
              on
                ? "border-[color-mix(in_oklab,var(--gold)_55%,transparent)] bg-[color-mix(in_oklab,var(--gold)_14%,transparent)] text-foreground"
                : "border-border bg-secondary/30 text-muted-foreground hover:border-[color-mix(in_oklab,var(--gold)_30%,transparent)] hover:text-foreground",
            )}
          >
            {label[role]}
          </button>
        );
      })}
    </div>
  );
}

/** Monogram tile used for the member everywhere an avatar would go. */
export function MemberMonogram({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid place-items-center border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] font-semibold text-gold",
        className,
      )}
    >
      {memberInitial(name)}
    </span>
  );
}
