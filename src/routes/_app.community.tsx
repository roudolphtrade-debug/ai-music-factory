import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare, Hash, Heart, MessageCircle, Repeat2, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { GoldBadge, StatusChip } from "@/components/premium/Chips";
import { EmptyState } from "@/components/premium/EmptyState";
import { artistImages } from "@/data/mock";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/_app/community")({
  head: () => ({
    meta: [
      { title: "Community — Ai Music Factory" },
      { name: "description", content: "Fan circles, channels and live conversation around AI-native artists." },
    ],
  }),
  component: CommunityPage,
});

const posts = [
  { id: "c-1", artistId: "art-2" as const, author: "Seraphine 9", channel: "#releases", time: "12m", likes: 842, replies: 96, reposts: 41 },
  { id: "c-2", artistId: "art-4" as const, author: "MIDAS PRIME", channel: "#battles", time: "38m", likes: 1290, replies: 210, reposts: 88 },
  { id: "c-3", artistId: "art-1" as const, author: "SØL Aurelius", channel: "#golden-hour", time: "1h", likes: 564, replies: 73, reposts: 29 },
];

const channels = [
  { name: "releases", count: "2.1K", live: true },
  { name: "battles", count: "4.8K", live: true },
  { name: "golden-hour", count: "980", live: false },
  { name: "prompt-lab", count: "1.5K", live: true },
  { name: "label-houses", count: "620", live: false },
];

function CommunityPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={t("community.eyebrow")}
        title={t("community.title")}
        description={t("community.desc")}
        action={
          <Button variant="gold" size="lg">
            <Sparkles className="h-4 w-4" /> {t("community.newPost")}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* FEED */}
        <div className="space-y-4">
          {posts.map((p) => (
            <article key={p.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <img
                  src={artistImages[p.artistId]}
                  alt={p.author}
                  className="h-11 w-11 rounded-lg object-cover ring-1 ring-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{p.author}</p>
                  <p className="text-xs text-muted-foreground">{p.channel} · {p.time}</p>
                </div>
                <GoldBadge variant="outline">{t("community.verified")}</GoldBadge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{t(`community.posts.${p.id}`)}</p>
              <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
                <button className="inline-flex items-center gap-1.5 transition-colors hover:text-gold">
                  <Heart className="h-4 w-4" /> {p.likes}
                </button>
                <button className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                  <MessageCircle className="h-4 w-4" /> {p.replies}
                </button>
                <button className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                  <Repeat2 className="h-4 w-4" /> {p.reposts}
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-gold" />
              <span className="eyebrow text-gold">{t("community.channels")}</span>
            </div>
            <div className="mt-4 space-y-1">
              {channels.map((c) => (
                <button
                  key={c.name}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                >
                  <Hash className="h-4 w-4 text-gold/70" />
                  <span className="flex-1 text-left">{c.name}</span>
                  {c.live && <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-gold" />}
                  <span className="text-xs">{c.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gold" />
                <span className="eyebrow text-gold">{t("community.fanCircles")}</span>
              </div>
              <StatusChip status="Live" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t("community.circlesLine", { n: 3 })}</p>
            <Button variant="ghost-gold" className="mt-4 w-full">
              {t("community.discoverCircles")}
            </Button>
          </div>

          <EmptyState
            icon={<MessageCircle className="h-6 w-6" />}
            title={t("community.noDms")}
            description={t("community.noDmsDesc")}
          />
        </div>
      </div>
    </div>
  );
}
