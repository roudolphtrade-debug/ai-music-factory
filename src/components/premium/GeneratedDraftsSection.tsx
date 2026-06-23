import { Trash2, Download, GitBranch, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { GoldBadge } from "@/components/premium/Chips";
import { PlayButton } from "@/components/audio/PlayButton";
import { LikeButton } from "@/components/premium/LikeButton";
import { useGeneratedDrafts, type GeneratedDraft } from "@/library/GeneratedDraftsProvider";
import type { PlayableTrack } from "@/audio/tracks";
import { artistImages, type ArtistId, type RelTime } from "@/data/mock";
import { useI18n } from "@/i18n/context";

const COVER: ArtistId = "art-1";

function toRelTime(ts: number): RelTime {
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return { n: 0, u: "m" };
  if (min < 60) return { n: min, u: "m" };
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return { n: hrs, u: "h" };
  const days = Math.floor(hrs / 24);
  if (days === 1) return { u: "yesterday" };
  return { n: days, u: "d" };
}

function draftToTrack(d: GeneratedDraft, t: (k: string) => string): PlayableTrack {
  return {
    id: d.id,
    title: d.title,
    artist: `${d.genre} · ${t(`studio.voices.${d.voice}`)}`,
    artistId: COVER,
    src: d.url,
    cover: artistImages[COVER],
    duration: d.duration,
  };
}

export function GeneratedDraftsSection() {
  const { t, relTime } = useI18n();
  const { drafts, ready, removeDraft } = useGeneratedDrafts();

  if (!ready) return null;

  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow={t("studio.gen.myCreations")}
        title={t("studio.gen.myCreations")}
        description={t("studio.gen.myCreationsDesc")}
      />

      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-noir-gradient text-gold">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="max-w-sm text-sm text-muted-foreground">{t("studio.gen.emptyHint")}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {drafts.map((d) => {
            const track = draftToTrack(d, t);
            return (
              <article key={d.id} className="group rounded-2xl border border-border bg-card p-5 card-hover">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <PlayButton track={track} queue={drafts.map((x) => draftToTrack(x, t))} size="md" />
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-xl font-semibold text-foreground">{d.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t("common.updated", { time: relTime(toRelTime(d.createdAt)) })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <LikeButton trackId={d.id} size="sm" />
                    <a
                      href={d.url}
                      download={`${d.title}.mp3`}
                      aria-label={t("studio.gen.download")}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      aria-label={t("studio.gen.delete")}
                      onClick={() => {
                        void removeDraft(d.id);
                        toast.success(t("studio.gen.deleted"));
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {d.lyrics && (
                  <p className="mt-3 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{d.lyrics}</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <GoldBadge variant="outline">{d.genre}</GoldBadge>
                  <GoldBadge variant="outline">{t(`moods.${d.mood}`)}</GoldBadge>
                  <GoldBadge variant="outline">{t(`studio.voices.${d.voice}`)}</GoldBadge>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5 text-gold" /> v1
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
