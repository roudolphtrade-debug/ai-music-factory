import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";

export function ArtistNotFound() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
      <h2 className="font-display text-2xl font-semibold text-foreground">
        {t("artistProfile.notFoundTitle")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("artistProfile.notFoundDesc")}</p>
      <div className="mt-5 flex gap-3">
        <Button variant="ghost-gold" onClick={() => router.history.back()}>
          {t("artistProfile.goBack")}
        </Button>
        <Button asChild variant="gold">
          <Link to="/artists">{t("artistProfile.browse")}</Link>
        </Button>
      </div>
    </div>
  );
}
