import { useDemoPageMetadata } from "@/i18n/useDemoPageMetadata";
import { channelText, demoPageHead } from "@/i18n/demo-details";
import { useId } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare, Hash, Heart, MessageCircle, Repeat2, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/premium/SectionHeading";
import { GoldBadge, StatusChip } from "@/components/premium/Chips";
import { EmptyState } from "@/components/premium/EmptyState";
import { artistImages } from "@/data/mock";
import { useI18n } from "@/i18n/context";
import { demoContent } from "@/i18n/demo-content";
import { useDemoHonesty } from "@/i18n/demo-honesty";
import { DemoNotice } from "@/components/premium/DemoNotice";

export const Route = createFileRoute("/_app/community")({
  head: () => demoPageHead("community"),
  component: CommunityPage,
});

const posts = [
  {
    id: "c-1",
    artistId: "art-2" as const,
    author: "Seraphine 9",
    channel: "#releases",
    time: "12m",
    likes: 842,
    replies: 96,
    reposts: 41,
  },
  {
    id: "c-2",
    artistId: "art-4" as const,
    author: "MIDAS PRIME",
    channel: "#battles",
    time: "38m",
    likes: 1290,
    replies: 210,
    reposts: 88,
  },
  {
    id: "c-3",
    artistId: "art-1" as const,
    author: "SØL Aurelius",
    channel: "#golden-hour",
    time: "1h",
    likes: 564,
    replies: 73,
    reposts: 29,
  },
];

const channels = [
  { name: "releases", count: "2.1K", live: true },
  { name: "battles", count: "4.8K", live: true },
  { name: "golden-hour", count: "980", live: false },
  { name: "prompt-lab", count: "1.5K", live: true },
  { name: "label-houses", count: "620", live: false },
];

function CommunityPage() {
  useDemoPageMetadata("community");
  const { t, lang } = useI18n();
  const honesty = useDemoHonesty();
  const postNoteId = useId();
  const circlesNoteId = useId();
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={t("community.eyebrow")}
        title={t("community.title")}
        description={t("community.desc")}
        action={
          <Button variant="gold" size="lg" disabled aria-describedby={postNoteId}>
            <Sparkles className="h-4 w-4" /> {t("community.newPost")}
          </Button>
        }
      />
      <DemoNotice kind="demoContent" />
      <p id={postNoteId} className="text-xs text-muted-foreground">
        {honesty.noPosting}
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* FEED */}
        <div className="space-y-4">
          {posts.map((p) => (
            <article key={p.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <img
                  loading="lazy"
                  src={artistImages[p.artistId]}
                  alt={p.author}
                  className="h-11 w-11 rounded-lg object-cover ring-1 ring-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{p.author}</p>
                  <p className="text-xs text-muted-foreground">
                    #{channelText(lang, p.channel.slice(1))} · {p.time}
                  </p>
                </div>
                <GoldBadge variant="outline">{t("community.verified")}</GoldBadge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                {t(`community.posts.${p.id}`)}
              </p>
              <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Heart aria-hidden="true" className="h-4 w-4" /> {p.likes}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle aria-hidden="true" className="h-4 w-4" /> {p.replies}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Repeat2 aria-hidden="true" className="h-4 w-4" /> {p.reposts}
                </span>
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
                <div
                  key={c.name}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground"
                >
                  <Hash className="h-4 w-4 text-gold/70" />
                  <span className="min-w-0 flex-1 break-words text-start">{c.name === "label-houses" ? demoContent[lang].labelHouses : channelText(lang, c.name)}</span>
                  {c.live && (
                    <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-gold" />
                  )}
                  <span className="text-xs">{c.count}</span>
                </div>
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
            <p className="mt-3 text-sm text-muted-foreground">
              {t("community.circlesLine", { n: 3 })}
            </p>
            <Button variant="ghost-gold" className="mt-4 w-full" disabled aria-describedby={circlesNoteId}>
              {t("community.discoverCircles")}
            </Button>
            <p id={circlesNoteId} className="mt-2 text-xs text-muted-foreground">
              {honesty.noCircles}
            </p>
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
