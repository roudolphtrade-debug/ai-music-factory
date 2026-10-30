import { Music2, Mic2 } from "lucide-react";
import { useGeneratedDrafts } from "@/library/draftsContext";
import { useI18n } from "@/i18n/context";
import { STUDIO_VOICES } from "@/studio/options";

/**
 * Two figures beside the studio form, both real and both local: how many tracks this account has made and
 * kept on this device, and how many voice choices the form really offers. Neither is a platform total.
 */
export function StudioFigures() {
  const { t } = useI18n();
  const { drafts, ready } = useGeneratedDrafts();
  return (
    <div className="grid grid-cols-2 gap-4">
      <Figure
        icon={<Music2 className="h-4 w-4" />}
        label={t("studio.statDrafts")}
        value={ready ? String(drafts.length) : "…"}
        testId="figure-drafts"
      />
      <Figure
        icon={<Mic2 className="h-4 w-4" />}
        label={t("studio.statVoices")}
        value={String(STUDIO_VOICES.length)}
        testId="figure-voices"
      />
    </div>
  );
}

function Figure({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary/60 text-gold">
        {icon}
      </span>
      <div className="min-w-0">
        <p data-testid={testId} className="font-display text-lg font-semibold text-foreground">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
