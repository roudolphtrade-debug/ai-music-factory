import { Link } from '@tanstack/react-router';
import { ArrowUpRight, AudioWaveform, Radio, Swords, Users } from 'lucide-react';
import { chartTracks } from '@/audio/tracks';
import { artists } from '@/data/mock';
import { useI18n } from '@/i18n/context';
import { Button } from '@/components/ui/button';
import { PlayButton } from '@/components/audio/PlayButton';
import { LikeButton } from './LikeButton';
import { ArtistCard } from './ArtistCard';
import { SectionHeading } from './SectionHeading';
import { DemoBadge } from './DemoBadge';

export function EditorialSelection() {
  const { t } = useI18n();
  return <section className="space-y-5">
    <SectionHeading eyebrow={t('editorial.collection')} title={t('editorial.selection')} action={<DemoBadge />} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {chartTracks.slice(0,4).map(track => <article key={track.id} className="group min-w-0">
        <div className="relative aspect-square overflow-hidden rounded-lg">
          <Link to="/artists/$artistId" params={{artistId:track.artistId}}><img src={track.cover} alt={track.artist} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></Link>
          <div className="absolute bottom-3 end-3"><PlayButton track={track} queue={chartTracks} label={t('charts.playTrack',{title:track.title,artist:track.artist})} /></div>
        </div>
        <div className="mt-3 flex items-center gap-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{track.title}</p><Link to="/artists/$artistId" params={{artistId:track.artistId}} className="truncate text-xs text-muted-foreground hover:text-gold">{track.artist}</Link></div><LikeButton trackId={track.id} size="sm" /></div>
      </article>)}
    </div>
  </section>;
}
export function ArtistDiscovery() {
  const { t } = useI18n();
  return <section className="space-y-5"><SectionHeading title={t('editorial.artists')} description={t('editorial.artistsDesc')} action={<Button asChild variant="ghost-gold" size="icon" aria-label={t('common.viewAll')}><Link to="/artists"><ArrowUpRight /></Link></Button>} /><p className="flex items-center gap-2 text-xs text-muted-foreground"><DemoBadge />{t('editorial.demoContext')}</p><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{artists.slice(0,4).map(artist=><ArtistCard key={artist.id} artist={artist} />)}</div></section>;
}
export function CreateAndConnect() {
  const { t } = useI18n();
  const destinations=[{key:'radio',to:'/radio',icon:Radio},{key:'challenges',to:'/battles',icon:Swords},{key:'community',to:'/community',icon:Users}] as const;
  return <>
    <section className="grid items-center gap-6 border-y border-border py-10 md:grid-cols-[1fr_auto]">
      <div><AudioWaveform className="mb-4 h-8 w-8 text-gold" /><h2 className="font-display text-4xl text-foreground">{t('editorial.create')}</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{t('editorial.createDesc')}</p></div>
      <Button asChild variant="gold" size="lg"><Link to="/studio">{t('home.hero.startCreating')}<ArrowUpRight className="h-4 w-4" /></Link></Button>
    </section>
    <section className="grid gap-6 md:grid-cols-3">{destinations.map(({key,to,icon:Icon})=><div key={key} className="min-w-0 border-b border-border pb-6"><Icon className="mb-4 h-6 w-6 text-gold" /><h2 className="font-display text-3xl">{t(`editorial.${key}`)}</h2><p className="mb-5 mt-2 text-sm leading-relaxed text-muted-foreground">{t(`editorial.${key}Desc`)}</p><Button asChild variant="outline"><Link to={to}>{t('editorial.open')}<ArrowUpRight className="h-4 w-4" /></Link></Button>{key!=='radio'&&<DemoBadge className="ms-3" />}</div>)}</section>
  </>;
}
