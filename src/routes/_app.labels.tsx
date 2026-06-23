import { createFileRoute } from "@tanstack/react-router";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatModule } from "@/components/premium/StatModule";
import { LabelCard } from "@/components/premium/LabelCard";
import { labels } from "@/data/mock";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/labels")({
  head: () => ({
    meta: [
      { title: "Virtual Labels — Ai Music Factory" },
      { name: "description", content: "Premium virtual labels — houses with their own roster, specialty, reputation and revenue." },
    ],
  }),
  component: LabelsPage,
});

function LabelsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow={t("labels.eyebrow")}
        title={t("labels.title")}
        description={t("labels.desc")}
        action={
          <Button variant="gold" size="lg">
            <Plus className="h-4 w-4" /> {t("labels.createLabel")}
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatModule label={t("labels.activeLabels")} value="1,284" delta={t("home.stats.plusThisWeek", { n: "18" })} icon={<Building2 className="h-5 w-5" />} />
        <StatModule label={t("labels.avgRoster")} value="9.2" delta={t("labels.avgRosterDelta")} />
        <StatModule label={t("labels.topMrr")} value="$61.5K" delta="Goldhouse Collective" />
        <StatModule label={t("labels.signedArtists")} value="11,802" delta={t("labels.signedDelta")} />
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow={t("labels.featured")} title={t("labels.premiumHouses")} />
        <div className="grid gap-5 md:grid-cols-2">
          {labels.map((l) => (
            <LabelCard key={l.id} label={l} />
          ))}
        </div>
      </section>
    </div>
  );
}
