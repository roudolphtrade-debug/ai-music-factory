import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Shuffle, Wand2, Feather, BookOpen, Palette, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { GoldBadge } from "@/components/premium/Chips";
import avatarPreview from "@/assets/avatar-preview.jpg";

export const Route = createFileRoute("/_app/avatar-lab")({
  head: () => ({
    meta: [
      { title: "Avatar Lab — Ai Music Factory" },
      { name: "description", content: "Design a virtual identity: persona, aura, aesthetic and stage presence for your AI artist." },
    ],
  }),
  component: AvatarLabPage,
});

const styles = ["Amber Minimal", "Liquid Chrome", "Monastic Noir", "Maximal Gold", "Neon Visor"];

function AvatarLabPage() {
  const [style, setStyle] = useState(styles[0]);

  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Avatar Lab"
        title="Forge a virtual identity"
        description="Sculpt the persona, aura and aesthetic that turns an algorithm into an icon."
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* PREVIEW */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-noir-gradient">
          <div className="absolute inset-0 bg-spot" />
          <div className="relative flex flex-col">
            <div className="relative aspect-square overflow-hidden">
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              <GoldBadge variant="outline" className="absolute left-4 top-4 backdrop-blur-sm">
                Preview · {style}
              </GoldBadge>
            </div>
            <div className="space-y-1 p-6">
              <p className="eyebrow text-gold">Working identity</p>
              <h3 className="font-display text-3xl font-semibold text-foreground">Aurora Solène</h3>
              <p className="text-sm text-muted-foreground">
                Ethereal art-pop entity · golden-hour visuals · couture futurism
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="space-y-5 rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-gold" />
            <span className="eyebrow text-gold">Identity parameters</span>
          </div>

          <div className="space-y-5">
            <AttributeSlider label="Charisma" initial={78} />
            <AttributeSlider label="Futuristic edge" initial={64} />
            <AttributeSlider label="Warmth" initial={52} />
            <AttributeSlider label="Aura intensity" initial={88} />
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <span className="eyebrow text-muted-foreground">Visual style</span>
            <div className="flex flex-wrap gap-2">
              {styles.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    style === s
                      ? "bg-gold-gradient text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border pt-5">
            <Button variant="gold">
              <Sparkles className="h-4 w-4" />
              Generate artist identity
            </Button>
            <Button variant="ghost-gold">
              <Shuffle className="h-4 w-4" />
              Randomize
            </Button>
          </div>
        </div>
      </section>

      {/* IDENTITY CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <IdentityCard
          icon={<Feather className="h-4 w-4" />}
          title="Persona"
          body="A poised, otherworldly art-pop muse who treats every release as a ritual of light and restraint."
        />
        <IdentityCard
          icon={<BookOpen className="h-4 w-4" />}
          title="Backstory"
          body="Born from a corrupted golden-hour archive, she reconstructs forgotten melodies into luminous new forms."
        />
        <IdentityCard
          icon={<Palette className="h-4 w-4" />}
          title="Signature aesthetic"
          body="Amber light, sculptural silhouettes, brushed-gold detailing on absolute black. Never loud, always luminous."
        />
        <IdentityCard
          icon={<Mic2 className="h-4 w-4" />}
          title="Stage identity"
          body="Performs inside a single beam of warm light — a cathedral of sound built for intimate, cinematic moments."
        />
      </section>
    </div>
  );
}

function AttributeSlider({ label, initial }: { label: string; initial: number }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-display text-base font-semibold text-gold tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_color-mix(in_oklab,var(--gold)_25%,transparent)]"
        style={{
          background: `linear-gradient(to right, var(--gold) ${value}%, var(--secondary) ${value}%)`,
        }}
      />
    </div>
  );
}

function IdentityCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 card-hover">
      <div className="flex items-center gap-2 text-gold">
        {icon}
        <span className="eyebrow">{title}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
