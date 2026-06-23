import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatModule } from "@/components/premium/StatModule";
import { LabelCard } from "@/components/premium/LabelCard";
import { UserLabelCard } from "@/components/premium/UserLabelCard";
import { CreateLabelDialog } from "@/components/premium/CreateLabelDialog";
import { labels } from "@/data/mock";
import { useLabels } from "@/library/LabelsProvider";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/labels/")({
  component: LabelsPage,
});

function LabelsPage() {
  const { t } = useI18n();
  const { labels: userLabels } = useLabels();

  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow={t("labels.eyebrow")}
        title={t("labels.title")}
        description={t("labels.desc")}
        action={<CreateLabelDialog />}
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatModule label={t("labels.activeLabels")} value="1,284" delta={t("home.stats.plusThisWeek", { n: "18" })} icon={<Building2 className="h-5 w-5" />} />
        <StatModule label={t("labels.avgRoster")} value="9.2" delta={t("labels.avgRosterDelta")} />
        <StatModule label={t("labels.topMrr")} value="$61.5K" delta="Goldhouse Collective" />
        <StatModule label={t("labels.signedArtists")} value="11,802" delta={t("labels.signedDelta")} />
      </section>

      {userLabels.length > 0 && (
        <section className="space-y-5">
          <SectionHeading eyebrow={t("labels.create.yoursEyebrow")} title={t("labels.create.yoursTitle")} />
          <div className="grid gap-5 md:grid-cols-2">
            {userLabels.map((l) => (
              <UserLabelCard key={l.id} label={l} />
            ))}
          </div>
        </section>
      )}

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
