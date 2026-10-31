import { createFileRoute } from "@tanstack/react-router";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StudioComposer } from "@/components/premium/StudioComposer";
import { GeneratedDraftsSection } from "@/components/premium/GeneratedDraftsSection";
import { NewTrackButton, StudioUploadZone } from "@/components/premium/StudioActions";
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
        action={<NewTrackButton />}
      />

      {/* COMPOSER */}
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <StudioComposer />

        {/* UPLOAD ZONE */}
        <div className="flex flex-col gap-4">
          <StudioUploadZone />
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
