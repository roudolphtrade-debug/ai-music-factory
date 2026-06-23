import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Wand2,
  UploadCloud,
  Layers,
  GitBranch,
  MoreHorizontal,
  Music2,
  Mic2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatusChip, GoldBadge } from "@/components/premium/Chips";
import { projects, moods } from "@/data/mock";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/studio")({
  head: () => ({
    meta: [
      { title: "Creator Studio — Ai Music Factory" },
      { name: "description", content: "Compose, prompt, version and publish AI tracks in a premium creative studio." },
    ],
  }),
  component: StudioPage,
});

const genres = ["Hip-Hop", "Trap", "Afrobeats", "UK Drill", "Amapiano", "Reggaeton", "Hyperpop", "Neo-Soul"];
const voiceKeys = ["Instrumental", "Warm tenor", "Soprano", "Alto", "Custom voice"];

function StudioPage() {
  const { t, relTime } = useI18n();

  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow={t("studio.eyebrow")}
        title={t("studio.title")}
        description={t("studio.desc")}
        action={
          <Button variant="gold" size="lg">
            <Plus className="h-4 w-4" />
            {t("studio.createNew")}
          </Button>
        }
      />

      {/* COMPOSER */}
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-gold" />
            <span className="eyebrow text-gold">{t("studio.newComposition")}</span>
          </div>

          <Field label={t("studio.prompt")}>
            <textarea
              rows={3}
              defaultValue="Cinematic ambient pop with golden-hour pads, warm analogue tape saturation, and a slow euphoric build toward a wordless choir."
              className="w-full resize-none rounded-xl border border-input bg-secondary/30 p-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("studio.genre")}>
              <Select options={genres} />
            </Field>
            <Field label={t("studio.mood")}>
              <Select options={moods.slice(0, 6).map((m) => t(`moods.${m}`))} />
            </Field>
            <Field label={t("studio.voice")}>
              <Select options={voiceKeys.map((v) => t(`studio.voices.${v}`))} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("studio.quickMoods")}</span>
            {moods.slice(0, 5).map((m) => (
              <button
                key={m}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground"
              >
                {t(`moods.${m}`)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border pt-5">
            <Button variant="gold">
              <Sparkles className="h-4 w-4" />
              {t("studio.generate")}
            </Button>
            <Button variant="noir">{t("studio.saveDraft")}</Button>
          </div>
        </div>

        {/* UPLOAD ZONE */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[color-mix(in_oklab,var(--gold)_28%,transparent)] bg-card/40 p-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-noir-gradient text-gold">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
              {t("studio.uploadTitle")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("studio.uploadDesc")}</p>
            <Button variant="ghost-gold" size="sm" className="mt-4">
              {t("studio.browseFiles")}
            </Button>
            <p className="mt-3 text-[0.7rem] text-muted-foreground/70">{t("studio.engineNote")}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MiniStat icon={<Music2 className="h-4 w-4" />} label={t("studio.miniTracks")} value="42" />
            <MiniStat icon={<Mic2 className="h-4 w-4" />} label={t("studio.miniVoices")} value="6" />
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section className="space-y-5">
        <SectionHeading eyebrow={t("studio.library")} title={t("studio.yourDrafts")} />
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <article
              key={p.id}
              className="group rounded-2xl border border-border bg-card p-5 card-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-xl font-semibold text-foreground">
                    {p.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{t("common.updated", { time: relTime(p.updated) })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={p.status} />
                  <button className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.prompt}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <GoldBadge variant="outline">{p.genre}</GoldBadge>
                <GoldBadge variant="outline">{t(`moods.${p.mood}`)}</GoldBadge>
                <GoldBadge variant="outline">{t(`studio.voices.${p.voice}`)}</GoldBadge>
              </div>

              <div className="mt-4 flex items-center gap-5 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-gold" /> {t("studio.versions", { n: p.versions })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-gold" /> {t("studio.stems", { n: p.stems })}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="eyebrow text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Select({ options }: { options: string[] }) {
  return (
    <select className="h-10 w-full rounded-xl border border-input bg-secondary/30 px-3 text-sm text-foreground outline-none transition-colors focus:border-[color-mix(in_oklab,var(--gold)_45%,transparent)]">
      {options.map((o) => (
        <option key={o} className="bg-card">
          {o}
        </option>
      ))}
    </select>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary/60 text-gold">
        {icon}
      </span>
      <div>
        <p className="font-display text-lg font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
