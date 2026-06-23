import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { GoldBadge } from "@/components/premium/Chips";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Ai Music Factory" },
      { name: "description", content: "Manage your studio profile, identity and platform preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Settings"
        title="Studio preferences"
        description="Manage how your studio, identity and account behave across Ai Music Factory."
      />

      {/* AUTH NOTICE */}
      <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-noir-gradient p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/60 text-gold">
          <Lock className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium text-foreground">Accounts arrive next</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sign-in, real profiles, uploads and vote history connect once the experience is
            validated. This is a UI preview.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* PROFILE */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Studio profile</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField label="Studio name" defaultValue="Studio A" />
              <FormField label="Handle" defaultValue="@studio-a" />
              <FormField label="Primary genre" defaultValue="Ambient Pop" />
              <FormField label="Location" defaultValue="Paris, FR" />
            </div>
            <FormField
              label="Bio"
              defaultValue="Crafting cinematic, golden-hour electronica for AI-native artists."
              className="mt-4"
              textarea
            />
          </section>

          {/* PREFERENCES */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Preferences</h2>
            <div className="mt-4 divide-y divide-border/60">
              <ToggleRow label="Battle invitations" desc="Let other artists challenge you." defaultOn />
              <ToggleRow label="Radio auto-submit" desc="Send new releases to AI Radio rotation." defaultOn />
              <ToggleRow label="Public reputation" desc="Show your reputation score on your profile." defaultOn />
              <ToggleRow label="Email digests" desc="Weekly summary of plays and votes." />
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
              <ShieldCheck className="h-3.5 w-3.5" /> Platinum tier
            </GoldBadge>
            <Button variant="ghost-gold" className="mt-5 w-full">
              Change avatar
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-base font-semibold text-foreground">Plan</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Platinum · unlimited stems, priority mastering, label tools.
            </p>
            <Button variant="gold" className="mt-4 w-full">
              Manage plan
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="noir">Discard</Button>
        <Button variant="gold">Save changes</Button>
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
