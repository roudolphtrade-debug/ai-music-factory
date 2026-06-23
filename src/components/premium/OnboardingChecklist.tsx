import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Play, Heart, AudioWaveform, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/library/LibraryProvider";
import { useI18n } from "@/i18n/context";

const STUDIO_KEY = "afm-onboarding-studio";

/**
 * Contextual onboarding: a sober, dismissible checklist that reacts to the
 * user's real actions (first play, first favorite, studio visit). It hides
 * itself permanently once dismissed or fully completed.
 */
export function OnboardingChecklist() {
  const { t } = useI18n();
  const { history, favorites, onboardingDismissed, dismissOnboarding } = useLibrary();
  const [studioVisited, setStudioVisited] = useState(false);

  useEffect(() => {
    setStudioVisited(
      typeof window !== "undefined" && window.localStorage.getItem(STUDIO_KEY) === "1",
    );
  }, []);

  const steps = [
    { key: "step1", icon: Play, done: history.length > 0 },
    { key: "step2", icon: Heart, done: favorites.length > 0 },
    { key: "step3", icon: AudioWaveform, done: studioVisited },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  if (onboardingDismissed || doneCount === steps.length) return null;

  const markStudio = () => {
    try {
      window.localStorage.setItem(STUDIO_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="animate-route-in relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--gold)_22%,transparent)] surface-premium p-6 sm:p-7">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-spot" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-gold">
              <Sparkles className="h-4 w-4" />
              <span className="eyebrow">{t("onboarding.eyebrow")}</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
              {t("onboarding.title")}
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("onboarding.desc")}</p>
          </div>
          <button
            type="button"
            onClick={dismissOnboarding}
            aria-label={t("onboarding.dismiss")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="mt-5 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gold-gradient transition-all duration-500"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("onboarding.progress", { done: doneCount, total: steps.length })}
          </span>
        </div>

        {/* Steps */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {steps.map(({ key, icon: Icon, done }) => (
            <div
              key={key}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 transition-colors",
                done
                  ? "border-[color-mix(in_oklab,var(--gold)_30%,transparent)] bg-[color-mix(in_oklab,var(--gold)_7%,transparent)]"
                  : "border-border bg-background/40",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-all",
                  done
                    ? "bg-gold-gradient text-primary-foreground"
                    : "border border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className={cn("text-sm font-medium", done ? "text-foreground" : "text-foreground")}>
                  {t(`onboarding.${key}Title`)}
                </p>
                <p className="text-xs text-muted-foreground">{t(`onboarding.${key}Desc`)}</p>
              </div>
            </div>
          ))}
        </div>

        {!studioVisited && (
          <Link
            to="/studio"
            onClick={markStudio}
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-gold hover:underline"
          >
            <AudioWaveform className="h-4 w-4" />
            {t("onboarding.cta")}
          </Link>
        )}
      </div>
    </section>
  );
}
