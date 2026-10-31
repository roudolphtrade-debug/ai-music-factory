import { useState } from "react";
import { Trash2, Download, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { GoldBadge } from "@/components/premium/Chips";
import { PlayButton } from "@/components/audio/PlayButton";
import { LikeButton } from "@/components/premium/LikeButton";
import { useGeneratedDrafts, type GeneratedDraft } from "@/library/draftsContext";
import type { PlayableTrack } from "@/audio/tracks";
import { artistImages, type ArtistId, type RelTime } from "@/data/mock";
import { useI18n } from "@/i18n/context";
import { RTL_LANGS } from "@/i18n/translations";

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
  const { t, relTime, lang } = useI18n();
  const {
    drafts,
    ready,
    unassignedCount,
    loadFailed,
    removeDraft,
    claimUnassigned,
    deleteUnassigned,
  } = useGeneratedDrafts();
  // The track the member is being asked about. Only a track that is still this account's can be asked
  // about: if the account changes, the list empties and the question closes with it.
  const [askingDelete, setAskingDelete] = useState<string | null>(null);
  const asked = askingDelete ? (drafts.find((d) => d.id === askingDelete) ?? null) : null;

  if (!ready) return null;

  const confirmDelete = (id: string) => {
    setAskingDelete(null);
    void removeDraft(id).then((removed) => {
      if (removed) toast.success(t("studio.gen.deleted"));
      else toast.error(t("studio.gen.deleteDraftFailed"));
    });
  };

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
            {loadFailed ? (
              <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <p role={loadFailed ? "status" : undefined} className="max-w-sm text-sm text-muted-foreground">
            {loadFailed ? t("studio.gen.loadFailed") : t("studio.gen.emptyHint")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {drafts.map((d) => {
            const track = draftToTrack(d, t);
            return (
              <article key={d.id} className="group min-w-0 rounded-2xl border border-border bg-card p-5 card-hover">
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
                      download={`${d.title}.${d.ext}`}
                      aria-label={t("studio.gen.download")}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      aria-label={t("studio.gen.delete")}
                      onClick={() => setAskingDelete(d.id)}
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
                </div>
              </article>
            );
          })}
        </div>
      )}

      {unassignedCount > 0 && (
        <UnassignedTitles count={unassignedCount} claim={claimUnassigned} remove={deleteUnassigned} />
      )}

      <AlertDialog open={asked !== null} onOpenChange={(open) => !open && setAskingDelete(null)}>
        <AlertDialogContent dir={RTL_LANGS.includes(lang) ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("studio.gen.deleteDraftTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {asked ? <span className="mb-2 block font-medium text-foreground">{asked.title}</span> : null}
              {t("studio.gen.deleteDraftWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("studio.gen.dialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (asked) confirmDelete(asked.id);
              }}
            >
              {t("studio.gen.deleteDraftConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/**
 * Tracks made on this device before accounts existed. They belong to nobody, so they are not in the list:
 * they stay hidden and untouched until the member chooses, after a confirmation, to attach them to their
 * account or to delete them. The confirmation does not prove who made them, and says so.
 */
function UnassignedTitles({
  count,
  claim,
  remove,
}: {
  count: number;
  claim: () => Promise<{ moved: number; failed: boolean; cancelled: boolean }>;
  remove: () => Promise<number>;
}) {
  const { t, lang } = useI18n();
  const [asking, setAsking] = useState<"claim" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      setAsking(null);
    }
  };
  const confirmClaim = () =>
    run(async () => {
      try {
        const { moved, failed, cancelled } = await claim();
        if (moved > 0) toast.success(t("studio.gen.unassignedClaimed", { n: moved }));
        if (failed) toast.error(t("studio.gen.unassignedClaimFailed"));
        if (cancelled) toast.error(t("studio.gen.unassignedClaimCancelled"));
      } catch {
        toast.error(t("studio.gen.unassignedClaimFailed"));
      }
    });
  const confirmDelete = () =>
    run(async () => {
      try {
        const removed = await remove();
        toast.success(t("studio.gen.unassignedDeleted", { n: removed }));
      } catch {
        toast.error(t("studio.gen.unassignedDeleteFailed"));
      }
    });
  const close = (open: boolean) => {
    if (!open && !busy) setAsking(null);
  };

  return (
    <div
      role="region"
      aria-label={t("studio.gen.unassignedTitle")}
      data-testid="unassigned-titles"
      className="space-y-4 rounded-2xl border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-card/60 p-5"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-foreground">
            {t("studio.gen.unassignedTitle")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("studio.gen.unassignedDesc", { n: count })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost-gold" size="sm" onClick={() => setAsking("claim")}>
          {t("studio.gen.unassignedClaim")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAsking("delete")}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> {t("studio.gen.unassignedDelete")}
        </Button>
      </div>

      <AlertDialog open={asking === "claim"} onOpenChange={close}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("studio.gen.claimTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">{t("studio.gen.claimWarning")}</span>
              <span className="mt-2 block">{t("studio.gen.claimNoProof")}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("studio.gen.dialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void confirmClaim();
              }}
            >
              {t("studio.gen.claimConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={asking === "delete"} onOpenChange={close}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("studio.gen.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("studio.gen.deleteWarning", { n: count })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("studio.gen.dialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {t("studio.gen.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
