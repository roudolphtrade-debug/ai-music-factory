import { createFileRoute } from "@tanstack/react-router";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatModule } from "@/components/premium/StatModule";
import { LabelCard } from "@/components/premium/LabelCard";
import { labels } from "@/data/mock";

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
  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Houses"
        title="Virtual labels"
        description="Each label is a house — a curated identity with its own roster, sound and prestige."
        action={
          <Button variant="gold" size="lg">
            <Plus className="h-4 w-4" /> Create a label
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatModule label="Active labels" value="1,284" delta="+18 this week" icon={<Building2 className="h-5 w-5" />} />
        <StatModule label="Avg. roster" value="9.2" delta="artists per house" />
        <StatModule label="Top house MRR" value="$61.5K" delta="Goldhouse Collective" />
        <StatModule label="Signed artists" value="11,802" delta="across all houses" />
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow="Featured" title="Premium houses" />
        <div className="grid gap-5 md:grid-cols-2">
          {labels.map((l) => (
            <LabelCard key={l.id} label={l} />
          ))}
        </div>
      </section>
    </div>
  );
}
