import { SectionHeading } from "@/components/premium/SectionHeading";
import { GoldBadge } from "@/components/premium/Chips";
import { projects } from "@/data/mock";
import { useI18n } from "@/i18n/context";

/**
 * Demonstration ideas, named as such. They are not the member's creations, so they carry no date, no
 * status, no version count and no audio: nothing here suggests that something was made or published.
 * The description is written in the language of the interface; the title (a work), the genre and the
 * artist are names and stay as they are.
 */
export function StudioExamples() {
  const { t } = useI18n();
  return (
    <section aria-label={t("studio.examples.title")} className="space-y-5">
      <SectionHeading
        eyebrow={t("studio.examples.eyebrow")}
        title={t("studio.examples.title")}
        description={t("studio.examples.desc")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <article
            key={p.id}
            data-example="true"
            className="min-w-0 rounded-2xl border border-dashed border-border bg-card/60 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 truncate font-display text-xl font-semibold text-foreground">
                {p.title}
              </h3>
              <GoldBadge variant="outline">{t("studio.examples.badge")}</GoldBadge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t(`studio.examples.items.${p.id}`)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <GoldBadge variant="outline">{p.genre}</GoldBadge>
              <GoldBadge variant="outline">{t(`moods.${p.mood}`)}</GoldBadge>
              <GoldBadge variant="outline">{t(`studio.voices.${p.voice}`)}</GoldBadge>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
