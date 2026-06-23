import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { ArtistCard } from "@/components/premium/ArtistCard";
import { artists } from "@/data/mock";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/artists/")({
  head: () => ({
    meta: [
      { title: "Virtual Artists — Ai Music Factory" },
      { name: "description", content: "Discover and follow AI-native virtual artists across every genre and aesthetic." },
    ],
  }),
  component: ArtistsPage,
});

const genreFilters = ["Ambient Pop", "Hyperpop", "Techno", "Trap", "Neo-Soul", "Synthwave"];

function ArtistsPage() {
  const { t } = useI18n();
  const [active, setActive] = useState("All");

  const filtered =
    active === "All" ? artists : artists.filter((a) => a.genres.includes(active));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={t("artists.eyebrow")}
        title={t("artists.title")}
        description={t("artists.desc")}
      />

      <div className="flex flex-wrap gap-2">
        {["All", ...genreFilters].map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active === f
                ? "bg-gold-gradient text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground",
            )}
          >
            {f === "All" ? t("common.all") : f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {filtered.map((a) => (
          <ArtistCard key={a.id} artist={a} />
        ))}
      </div>
    </div>
  );
}
