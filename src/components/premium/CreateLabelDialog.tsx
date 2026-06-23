import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { artists } from "@/data/mock";
import { artistImages, type ArtistId } from "@/data/mock";
import { TIERS, TIER_CONFIG, deriveMonogram, formatMoney, parseCompact } from "@/library/labels";
import { useLabels } from "@/library/LabelsProvider";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

export function CreateLabelDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useI18n();
  const { createLabel } = useLabels();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [tagline, setTagline] = useState("");
  const [tier, setTier] = useState(TIERS[0]);
  const [picked, setPicked] = useState<ArtistId[]>([]);

  const monogram = deriveMonogram(name || "AF");

  const projectedRevenue = useMemo(() => {
    const listeners = picked.reduce((sum, id) => {
      const a = artists.find((x) => x.id === id);
      return sum + (a ? parseCompact(a.monthlyListeners) : 0);
    }, 0);
    const cut = TIER_CONFIG[tier].labelShare;
    return formatMoney(listeners * 0.0046 * cut);
  }, [picked, tier]);

  function toggle(id: ArtistId) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function reset() {
    setName("");
    setSpecialty("");
    setTagline("");
    setTier(TIERS[0]);
    setPicked([]);
  }

  function submit() {
    if (!name.trim()) {
      toast.error(t("labels.create.nameRequired"));
      return;
    }
    const label = createLabel({ name, specialty, tagline, tier, artistIds: picked });
    toast.success(t("labels.create.created", { name: label.name }));
    setOpen(false);
    reset();
    navigate({ to: "/labels/$labelId", params: { labelId: label.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="gold" size="lg">
            <Plus className="h-4 w-4" /> {t("labels.createLabel")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("labels.create.title")}</DialogTitle>
          <DialogDescription>{t("labels.create.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex items-center gap-4">
            <div className="icon-tile h-16 w-16 shrink-0">
              <span className="font-display text-2xl font-semibold gold-text">{monogram}</span>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="label-name">{t("labels.create.nameLabel")}</Label>
              <Input
                id="label-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("labels.create.namePlaceholder")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="label-specialty">{t("labels.create.specialtyLabel")}</Label>
              <Input
                id="label-specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder={t("labels.create.specialtyPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="label-tagline">{t("labels.create.taglineLabel")}</Label>
              <Input
                id="label-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder={t("labels.create.taglinePlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("labels.create.tierLabel")}</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {TIERS.map((tr) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => setTier(tr)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    tier === tr
                      ? "border-gold bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]"
                      : "border-border hover:border-gold/40",
                  )}
                >
                  <span className="block text-sm font-semibold text-foreground">
                    {t(`labels.tier.${tr}`)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t("labels.create.cut", { pct: `${Math.round(TIER_CONFIG[tr].labelShare * 100)}` })}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("labels.create.rosterLabel")}</Label>
              <span className="text-xs text-muted-foreground">
                {t("labels.create.selected", { n: `${picked.length}` })}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {artists.map((a) => {
                const active = picked.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                      active
                        ? "border-gold bg-[color-mix(in_oklab,var(--gold)_8%,transparent)]"
                        : "border-border hover:border-gold/40",
                    )}
                  >
                    <img
                      src={artistImages[a.id]}
                      alt={a.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{a.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {a.genres.join(" · ")}
                      </span>
                    </span>
                    {active && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-gradient">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">{t("labels.create.projectedMrr")}</span>
            <span className="font-display text-xl font-semibold gold-text">{projectedRevenue}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("labels.create.cancel")}
          </Button>
          <Button variant="gold" onClick={submit}>
            <Plus className="h-4 w-4" /> {t("labels.create.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
