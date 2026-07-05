import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { GoldBadge } from "@/components/premium/Chips";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/context";
import { useTheme } from "@/theme/context";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Ai Music Factory" },
      {
        name: "description",
        content: "Manage your studio profile, identity and platform preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.desc")}
      />

      {/* AUTH NOTICE */}
      <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-noir-gradient p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/60 text-gold">
          <Lock className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium text-foreground">{t("settings.accountsTitle")}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("settings.accountsDesc")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* PROFILE */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {t("settings.studioProfile")}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField label={t("settings.studioName")} defaultValue="Studio A" />
              <FormField label={t("settings.handle")} defaultValue="@studio-a" />
              <FormField label={t("settings.primaryGenre")} defaultValue="Afrobeats" />
              <FormField label={t("settings.location")} defaultValue="Paris, FR" />
            </div>
            <FormField
              label={t("settings.bio")}
              defaultValue="Crafting cinematic, golden-hour electronica for AI-native artists."
              className="mt-4"
              textarea
            />
          </section>

          {/* PREFERENCES */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {t("settings.preferences")}
            </h2>
            <div className="mt-4 divide-y divide-border/60">
              <ToggleRow
                label={t("settings.battleInvites")}
                desc={t("settings.battleInvitesDesc")}
                defaultOn
              />
              <ToggleRow
                label={t("settings.radioAutoSubmit")}
                desc={t("settings.radioAutoSubmitDesc")}
                defaultOn
              />
              <ToggleRow
                label={t("settings.publicReputation")}
                desc={t("settings.publicReputationDesc")}
                defaultOn
              />
              <ToggleRow label={t("settings.emailDigests")} desc={t("settings.emailDigestsDesc")} />
              <LightModeToggleRow />
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("settings.replayIntro")}</p>
                  <p className="text-xs text-muted-foreground">{t("settings.replayIntroDesc")}</p>
                </div>
                <Button
                  variant="noir"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem("afm-intro-seen");
                    window.location.href = "/";
                  }}
                >
                  {t("settings.replayIntroAction")}
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* SIDE */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-gold-gradient text-2xl font-semibold text-primary-foreground">
              A
            </span>
            <p className="mt-4 font-display text-lg font-semibold text-foreground">Studio A</p>
            <p className="text-xs text-muted-foreground">@studio-a</p>
            <GoldBadge className="mt-3">
              <ShieldCheck className="h-3.5 w-3.5" /> {t("settings.platinumTier")}
            </GoldBadge>
            <Button variant="ghost-gold" className="mt-5 w-full">
              {t("settings.changeAvatar")}
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-base font-semibold text-foreground">
              {t("settings.plan")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("settings.planDesc")}</p>
            <Button variant="gold" className="mt-4 w-full">
              {t("settings.managePlan")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="noir">{t("settings.discard")}</Button>
        <Button variant="gold">{t("settings.saveChanges")}</Button>
      </div>
    </div>
  );
}

function FormField({
  label,
  defaultValue,
  className,
  textarea,
}: {
  label: string;
  defaultValue: string;
  className?: string;
  textarea?: boolean;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="eyebrow text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          defaultValue={defaultValue}
          className="w-full resize-none rounded-xl border border-input bg-secondary/30 p-3 text-sm text-foreground outline-none transition-colors focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
        />
      ) : (
        <input
          defaultValue={defaultValue}
          className="h-10 w-full rounded-xl border border-input bg-secondary/30 px-3 text-sm text-foreground outline-none transition-colors focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
        />
      )}
    </label>
  );
}

function LightModeToggleRow() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const on = theme === "light";
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-foreground">{t("settings.lightMode")}</p>
        <p className="text-xs text-muted-foreground">{t("settings.lightModeDesc")}</p>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={on}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          on ? "bg-gold-gradient" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform",
            on ? "translate-x-[1.4rem]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  defaultOn,
}: {
  label: string;
  desc: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          on ? "bg-gold-gradient" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform",
            on ? "translate-x-[1.4rem]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
