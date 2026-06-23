import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  UploadCloud,
  Layers,
  GitBranch,
  MoreHorizontal,
  Music2,
  Mic2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { StatusChip, GoldBadge } from "@/components/premium/Chips";
import { StudioComposer } from "@/components/premium/StudioComposer";
import { GeneratedDraftsSection } from "@/components/premium/GeneratedDraftsSection";
import { PlayButton } from "@/components/audio/PlayButton";
import { makePlayable, type PlayableTrack } from "@/audio/tracks";
import { usePlayer } from "@/audio/PlayerProvider";
import { projects, type ArtistId } from "@/data/mock";
import { useI18n } from "@/i18n/context";

const PROJECT_COVERS: ArtistId[] = ["art-1", "art-2", "art-5", "art-4"];

export const Route = createFileRoute("/_app/studio")({
  head: () => ({
    meta: [
      { title: "Creator Studio — Ai Music Factory" },
      { name: "description", content: "Compose, prompt, version and publish AI tracks in a premium creative studio." },
    ],
  }),
  component: StudioPage,
});


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
          {projects.map((p, i) => {
            const preview = makePlayable({
              id: `project-${p.id}`,
              title: p.title,
              artist: `${p.genre} · ${t(`studio.voices.${p.voice}`)}`,
              artistId: PROJECT_COVERS[i % PROJECT_COVERS.length],
              index: i,
              duration: "0:30",
            });
            return (
              <article
                key={p.id}
                className="group rounded-2xl border border-border bg-card p-5 card-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <PlayButton track={preview} size="md" />
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-xl font-semibold text-foreground">
                        {p.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{t("common.updated", { time: relTime(p.updated) })}</p>
                    </div>
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

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-5">
                    <span className="inline-flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 text-gold" /> {t("studio.versions", { n: p.versions })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-gold" /> {t("studio.stems", { n: p.stems })}
                    </span>
                  </div>
                  <ListenButton track={preview} />
                </div>
              </article>
            );
          })}
        </div>

      </section>
    </div>
  );
}

function ListenButton({ track }: { track: PlayableTrack }) {
  const { t } = useI18n();
  const { isTrackPlaying } = usePlayer();
  const { toggle } = usePlayer();
  const playing = isTrackPlaying(track.id);
  return (
    <button
      type="button"
      onClick={() => toggle(track)}
      className={
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
        (playing
          ? "border-[color-mix(in_oklab,var(--gold)_50%,transparent)] text-gold"
          : "border-border text-muted-foreground hover:border-[color-mix(in_oklab,var(--gold)_40%,transparent)] hover:text-foreground")
      }
    >
      {playing ? t("audio.pause") : t("audio.listenVersion")}
    </button>
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
