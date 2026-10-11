import { Link } from '@tanstack/react-router';
import { ArrowUpRight, AudioWaveform, Radio, Swords, Users } from 'lucide-react';
import { chartTracks } from '@/audio/tracks';
import { artists, artistImages } from '@/data/mock';
import { useI18n } from '@/i18n/context';
import { Button } from '@/components/ui/button';
import { PlayButton } from '@/components/audio/PlayButton';
import { LikeButton } from './LikeButton';
import { SectionHeading } from './SectionHeading';
import { DemoBadge } from './DemoBadge';
import creationImage from '@/assets/home-creation.jpg';
import stageImage from '@/assets/hero-stage.jpg';

export function EditorialSelection() {
  const { t } = useI18n();
  const [lead, ...secondary] = chartTracks.slice(0, 4);
  if (!lead) return null;
  return <section className="space-y-5">
    <SectionHeading eyebrow={t('editorial.collection')} title={t('editorial.selection')} action={<DemoBadge />} />
    <div className="home-selection-grid">
      <article className="home-selection-lead group relative isolate min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <Link to="/artists/$artistId" params={{artistId:lead.artistId}} className="absolute inset-0 -z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"><img loading="lazy" src={lead.cover} alt={lead.artist} className="h-full w-full object-cover object-[center_25%] transition-transform duration-500 motion-safe:group-hover:scale-105" /></Link>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/10 to-transparent" />
        <div className="pointer-events-none relative flex h-full flex-col justify-between p-5 sm:p-6">
          <p className="eyebrow self-start border-b border-gold/60 pb-2 text-gold">01 · {t('home.hero.badge')}</p>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><div className="min-w-0"><Link to="/artists/$artistId" params={{artistId:lead.artistId}} className="pointer-events-auto block break-words font-display text-4xl font-semibold text-foreground hover:text-gold sm:text-5xl">{lead.title}</Link><p className="mt-2 text-sm text-foreground/85">{lead.artist} · {globalGenre(lead.id)}</p></div><div className="pointer-events-auto flex items-center gap-2"><LikeButton trackId={lead.id} size="md" /><PlayButton track={lead} queue={chartTracks} size="lg" label={t('charts.playTrack',{title:lead.title,artist:lead.artist})} /></div></div>
        </div>
      </article>
      {secondary.map((track,index) => <article key={track.id} className="home-selection-secondary group relative isolate min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <Link to="/artists/$artistId" params={{artistId:track.artistId}} className="absolute inset-0 -z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"><img loading="lazy" src={track.cover} alt={track.artist} className="h-full w-full object-cover object-[center_25%] transition-transform duration-500 motion-safe:group-hover:scale-105" /></Link>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/10 to-transparent" />
        <span className="absolute start-4 top-3 font-display text-xl text-gold">0{index+2}</span>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 p-4"><div className="min-w-0"><Link to="/artists/$artistId" params={{artistId:track.artistId}} className="pointer-events-auto block break-words font-display text-2xl font-semibold leading-tight text-foreground hover:text-gold">{track.title}</Link><p className="mt-1 text-xs text-foreground/85">{track.artist}</p></div><div className="pointer-events-auto flex flex-col items-center gap-2"><LikeButton trackId={track.id} size="sm" /><PlayButton track={track} queue={chartTracks} label={t('charts.playTrack',{title:track.title,artist:track.artist})} /></div></div>
      </article>)}
    </div>
  </section>;
}
function globalGenre(id: string) {
  return id === chartTracks[0]?.id ? 'Trap' : '';
}
export function DiscoveryCompanions() {
  const { t } = useI18n();
  return <aside className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1">
    <section className="relative isolate min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <img src={creationImage} alt="" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-background/20" />
      <div className="px-5 pb-6 pt-20"><AudioWaveform className="mb-3 h-6 w-6 text-gold" /><h2 className="break-words font-display text-3xl leading-tight">{t('editorial.create')}</h2><p className="mt-3 text-sm leading-relaxed text-foreground/85">{t('editorial.createDesc')}</p><Button asChild variant="gold" className="mt-5 h-auto min-h-11 max-w-full whitespace-normal text-start"><Link to="/studio">{t('home.hero.startCreating')}<ArrowUpRight className="h-4 w-4 shrink-0" /></Link></Button></div>
    </section>
    <section className="min-w-0 border-t border-border px-1 py-5"><div className="flex items-center gap-3"><Radio className="h-5 w-5 shrink-0 text-gold" /><h2 className="font-display text-3xl">{t('editorial.radio')}</h2></div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('editorial.radioDesc')}</p><Button asChild variant="outline" className="mt-4"><Link to="/radio">{t('editorial.open')}<ArrowUpRight className="h-4 w-4" /></Link></Button></section>
  </aside>;
}
export function ArtistDiscovery() {
  const { t } = useI18n();
  return <section className="space-y-5"><SectionHeading title={t('editorial.artists')} description={t('editorial.artistsDesc')} action={<Button asChild variant="ghost-gold" size="icon" aria-label={t('common.viewAll')}><Link to="/artists"><ArrowUpRight /></Link></Button>} /><p className="flex items-center gap-2 text-xs text-muted-foreground"><DemoBadge />{t('editorial.demoContext')}</p><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{artists.slice(0,4).map(artist=><Link key={artist.id} to="/artists/$artistId" params={{artistId:artist.id}} className="group min-w-0"><div className="relative aspect-[4/5] overflow-hidden rounded-lg"><img loading="lazy" src={artistImages[artist.id]} alt={artist.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div><h3 className="mt-3 break-words font-display text-xl font-semibold">{artist.name}</h3><p className="mt-1 text-xs text-muted-foreground">{artist.genres[0]}</p></Link>)}</div></section>;
}
export function CreateAndConnect() {
  const { t } = useI18n();
  const destinations=[{key:'radio',to:'/radio',icon:Radio,image:artistImages['art-3']},{key:'challenges',to:'/battles',icon:Swords,image:stageImage},{key:'community',to:'/community',icon:Users,image:artistImages['art-5']}] as const;
  return <>
    <section className="grid gap-5 md:grid-cols-3">{destinations.map(({key,to,icon:Icon,image})=><article key={key} className="group min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <Link to={to} aria-label={t(`editorial.${key}`)} className="relative block aspect-[16/10] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset"><img src={image} alt="" width={720} height={450} loading="lazy" className="h-full w-full object-cover object-[center_30%] transition-transform duration-500 motion-safe:group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" /><Icon className="absolute bottom-4 start-5 h-6 w-6 text-gold" /></Link>
      <div className="px-5 pb-6"><div className="flex items-center gap-3"><h2 className="min-w-0 break-words font-display text-3xl">{t(`editorial.${key}`)}</h2>{key!=='radio'&&<DemoBadge className="shrink-0" />}</div><p className="mb-5 mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">{t(`editorial.${key}Desc`)}</p><Button asChild variant="outline"><Link to={to}>{t('editorial.open')}<ArrowUpRight className="h-4 w-4" /></Link></Button></div>
    </article>)}</section>
  </>;
}
