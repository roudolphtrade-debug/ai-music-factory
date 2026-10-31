import { Plus, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoldBadge } from "@/components/premium/Chips";
import { useI18n } from "@/i18n/context";

/** The prompt field of the studio form: what "Create a track" takes the member to. */
export const STUDIO_PROMPT_ID = "studio-prompt";

/**
 * "Create a track" starts where a track is created: it scrolls to the prompt and puts the cursor in it.
 * It changes nothing in what was written, and does nothing if the prompt is not there or cannot be edited yet.
 */
export function NewTrackButton() {
  const { t } = useI18n();
  const go = () => {
    const prompt = document.getElementById(STUDIO_PROMPT_ID);
    if (!prompt) return;
    const calm =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    prompt.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
    prompt.focus({ preventScroll: true });
  };
  return (
    <Button type="button" variant="gold" size="lg" onClick={go}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      {t("studio.createNew")}
    </Button>
  );
}

/**
 * The audio import is not built yet. The zone says so, takes nothing (no file field, no drop) and its
 * button cannot be used, instead of looking ready and doing nothing.
 */
export function StudioUploadZone() {
  const { t } = useI18n();
  return (
    <div
      data-testid="upload-zone"
      className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[color-mix(in_oklab,var(--gold)_28%,transparent)] bg-card/40 p-8 text-center"
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-noir-gradient text-gold">
        <UploadCloud className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
        {t("studio.uploadTitle")}
      </h3>
      <p id="upload-desc" className="mt-1 text-sm text-muted-foreground">
        {t("studio.uploadDesc")}
      </p>
      <Button
        type="button"
        variant="ghost-gold"
        size="sm"
        className="mt-4"
        disabled
        aria-describedby="upload-desc"
      >
        {t("studio.browseFiles")}
      </Button>
      <GoldBadge variant="outline" className="mt-3">
        {t("studio.uploadSoon")}
      </GoldBadge>
    </div>
  );
}
