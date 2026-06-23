import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { ArtistCard } from "@/components/premium/ArtistCard";
import { artists } from "@/data/mock";

export const Route = createFileRoute("/_app/artists/")({
  head: () => ({
    meta: [
      { title: "Virtual Artists — Ai Music Factory" },
      { name: "description", content: "Discover and follow AI-native virtual artists across every genre and aesthetic." },
    ],
  }),
  component: ArtistsPage,
});

const filters = ["All", "Ambient Pop", "Hyperpop", "Techno", "Trap", "Neo-Soul", "Synthwave"];

function ArtistsPage() {
  const [active, setActive] = useState("All");

  const filtered =
    active === "All" ? artists : artists.filter((a) => a.genres.includes(active));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Discover"
        title="Virtual artists"
        description="A roster of AI-native icons — each with a distinct identity, sound and following."
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active === f
                ? "bg-gold-gradient text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground"
            }`}
          >
            {f}
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
