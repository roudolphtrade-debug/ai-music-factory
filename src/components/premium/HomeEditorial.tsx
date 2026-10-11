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
  return <section className="space-y-5">
    <SectionHeading eyebrow={t('editorial.collection')} title={t('editorial.selection')} action={<DemoBadge />} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {chartTracks.slice(0,4).map(track => <article key={track.id} className="group min-w-0">
        <div className="relative aspect-square overflow-hidden rounded-lg">
          <Link to="/artists/$artistId" params={{artistId:track.artistId}}><img loading="lazy" src={track.cover} alt={track.artist} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></Link>
          <div className="absolute bottom-3 end-3"><PlayButton track={track} queue={chartTracks} label={t('charts.playTrack',{title:track.title,artist:track.artist})} /></div>
        </div>
        <div className="mt-3 flex items-center gap-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{track.title}</p><Link to="/artists/$artistId" params={{artistId:track.artistId}} className="block truncate text-xs text-muted-foreground hover:text-gold">{track.artist}</Link></div><LikeButton trackId={track.id} size="sm" /></div>
      </article>)}
    </div>
  </section>;
}
export function ArtistDiscovery() {
  const { t } = useI18n();
  return <section className="space-y-5"><SectionHeading title={t('editorial.artists')} description={t('editorial.artistsDesc')} action={<Button asChild variant="ghost-gold" size="icon" aria-label={t('common.viewAll')}><Link to="/artists"><ArrowUpRight /></Link></Button>} /><p className="flex items-center gap-2 text-xs text-muted-foreground"><DemoBadge />{t('editorial.demoContext')}</p><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{artists.slice(0,4).map(artist=><Link key={artist.id} to="/artists/$artistId" params={{artistId:artist.id}} className="group min-w-0"><div className="relative aspect-[4/5] overflow-hidden rounded-lg"><img loading="lazy" src={artistImages[artist.id]} alt={artist.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div><h3 className="mt-3 break-words font-display text-xl font-semibold">{artist.name}</h3><p className="mt-1 text-xs text-muted-foreground">{artist.genres[0]}</p></Link>)}</div></section>;
}
export function CreateAndConnect() {
  const { t } = useI18n();
  const destinations=[{key:'radio',to:'/radio',icon:Radio,image:artistImages['art-3']},{key:'challenges',to:'/battles',icon:Swords,image:stageImage},{key:'community',to:'/community',icon:Users,image:artistImages['art-5']}] as const;
  return <>
    <section className="relative isolate overflow-hidden border-y border-border">
      <img src={creationImage} alt="" width={1536} height={1024} loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/80 to-background/20" />
      <div className="max-w-xl px-6 py-10 sm:px-9 sm:py-14"><AudioWaveform className="mb-5 h-7 w-7 text-gold" /><h2 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">{t('editorial.create')}</h2><p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/85">{t('editorial.createDesc')}</p><Button asChild variant="gold" size="lg" className="mt-6 max-w-full whitespace-normal"><Link to="/studio">{t('home.hero.startCreating')}<ArrowUpRight className="h-4 w-4 shrink-0" /></Link></Button></div>
    </section>
    <section className="grid gap-5 md:grid-cols-3">{destinations.map(({key,to,icon:Icon,image})=><article key={key} className="group min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <Link to={to} aria-label={t(`editorial.${key}`)} className="relative block aspect-[16/10] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset"><img src={image} alt="" width={720} height={450} loading="lazy" className="h-full w-full object-cover object-[center_30%] transition-transform duration-500 motion-safe:group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" /><Icon className="absolute bottom-4 start-5 h-6 w-6 text-gold" /></Link>
      <div className="px-5 pb-6"><div className="flex items-center gap-3"><h2 className="min-w-0 break-words font-display text-3xl">{t(`editorial.${key}`)}</h2>{key!=='radio'&&<DemoBadge className="shrink-0" />}</div><p className="mb-5 mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">{t(`editorial.${key}Desc`)}</p><Button asChild variant="outline"><Link to={to}>{t('editorial.open')}<ArrowUpRight className="h-4 w-4" /></Link></Button></div>
    </article>)}</section>
  </>;
}
