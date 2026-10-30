import { createFileRoute } from "@tanstack/react-router";
import { Plus, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StudioComposer } from "@/components/premium/StudioComposer";
import { GeneratedDraftsSection } from "@/components/premium/GeneratedDraftsSection";
import { StudioFigures } from "@/components/premium/StudioFigures";
import { StudioExamples } from "@/components/premium/StudioExamples";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/studio")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Creator Studio · Ai Music Factory" },
      { property: "og:description", content: "Compose, prompt, version and publish AI tracks in a premium creative studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Creator Studio · Ai Music Factory" },
      {
        name: "description",
        content: "Compose, prompt, version and publish AI tracks in a premium creative studio.",
      },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const { t } = useI18n();

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
        <StudioComposer />

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
          <StudioFigures />
        </div>
      </section>

      {/* GENERATED DRAFTS (persisted) */}
      <GeneratedDraftsSection />

      {/* EXAMPLES: demonstration ideas, never presented as the member's own creations */}
      <StudioExamples />
    </div>
  );
}
