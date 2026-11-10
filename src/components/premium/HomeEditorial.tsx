import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, AudioWaveform, ChevronLeft, ChevronRight, Library, Radio, Trophy, Users } from 'lucide-react';
import { chartTracks } from '@/audio/tracks';
import { artists, artistImages, globalCharts } from '@/data/mock';
import { useI18n } from '@/i18n/context';
import { Button } from '@/components/ui/button';
import { PlayButton } from '@/components/audio/PlayButton';
import { LikeButton } from './LikeButton';
import { SectionHeading } from './SectionHeading';
import { DemoBadge } from './DemoBadge';
import creationImage from '@/assets/home-creation.jpg';
import stageImage from '@/assets/hero-stage.jpg';

function globalGenre(id: string) {
  const track = chartTracks.find(track => track.id === id);
  return globalCharts.find(chart => chart.title === track?.title)?.genre ?? '';
}

export function ArtistDiscovery() {
  const { t } = useI18n();
  return <section className="space-y-5"><SectionHeading title={t('editorial.artists')} description={t('editorial.artistsDesc')} action={<Button asChild variant="ghost-gold" size="icon" aria-label={t('common.viewAll')}><Link to="/artists"><ArrowUpRight /></Link></Button>} /><p className="flex items-center gap-2 text-xs text-muted-foreground"><DemoBadge />{t('editorial.demoContext')}</p><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{artists.slice(0,4).map(artist=><Link key={artist.id} to="/artists/$artistId" params={{artistId:artist.id}} className="group min-w-0"><div className="relative aspect-[4/5] overflow-hidden rounded-lg"><img loading="lazy" src={artistImages[artist.id]} alt={artist.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div><h3 className="mt-3 break-words font-display text-xl font-semibold">{artist.name}</h3><p className="mt-1 text-xs text-muted-foreground">{artist.genres[0]}</p></Link>)}</div></section>;
}

/** Discovery block: five destinations, a carousel of picks and a compact community top. */
export function HomeDiscovery() {
  const { t } = useI18n();
  // One pick per artist so the carousel shows the full range of profiles.
  const picks = chartTracks.filter((track, i, all) => all.findIndex(o => o.artistId === track.artistId) === i);
  const top = chartTracks.slice(0, 3);
  const destinations = [
    { key: 'dStudio', to: '/studio', icon: AudioWaveform, image: creationImage, demo: false },
    { key: 'dRadio', to: '/radio', icon: Radio, image: artistImages['art-6'], demo: false },
    { key: 'dArtists', to: '/artists', icon: Users, image: artistImages['art-1'], demo: false },
    { key: 'dCollections', to: '/library', icon: Library, image: artistImages['art-2'], demo: false },
  ] as const;
  return <section className="home-discovery grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)] lg:gap-x-4 lg:gap-y-6 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(19rem,1.4fr)] xl:gap-x-3">
    <nav aria-label={t('editorial.destinations')} className="order-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:order-1 lg:col-span-2 xl:col-span-4 xl:grid-cols-subgrid">
      {destinations.map(({ key, to, icon: Icon, image, demo }, i) => <Link key={key} to={to} className={`group relative isolate flex min-h-36 min-w-0 flex-col justify-end overflow-hidden rounded-lg border ${i === 0 ? '' : 'border-border'} bg-card p-4 shadow-card transition-colors hover:border-[color-mix(in_oklab,var(--gold)_45%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:min-h-44 ${i === 0 ? 'border-[color-mix(in_oklab,var(--gold)_55%,transparent)] shadow-[0_0_32px_-12px_var(--gold)]' : ''}`}>
        <img src={image} alt="" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_25%] transition-transform duration-500 motion-safe:group-hover:scale-105" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <Icon className="mb-2 h-5 w-5 text-gold" aria-hidden="true" />
        <span className="flex flex-wrap items-center gap-2 break-words font-display text-xl font-semibold leading-tight text-foreground">{t(`editorial.${key}`)}{demo && <DemoBadge className="shrink-0" />}</span>
        <span className="mt-1 text-xs leading-snug text-foreground/80">{t(`editorial.${key}Desc`)}</span>
      </Link>)}
    </nav>
    <PicksCarousel picks={picks} />
    <aside className="order-2 grid min-w-0 content-start gap-3 lg:order-3">
      {/* Concours & Awards, placed above the community top as in the mockup. */}
      <Link to="/battles" className="group relative isolate flex min-h-28 min-w-0 flex-col justify-end overflow-hidden rounded-lg border border-border bg-card p-3 shadow-card transition-colors hover:border-[color-mix(in_oklab,var(--gold)_45%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
        <img src={stageImage} alt="" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_25%] transition-transform duration-500 motion-safe:group-hover:scale-105" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <Trophy className="mb-1.5 h-5 w-5 text-gold" aria-hidden="true" />
        <span className="flex flex-wrap items-center gap-2 break-words font-display text-lg font-semibold leading-tight text-foreground">{t('editorial.dContests')}<DemoBadge className="shrink-0" /></span>
        <span className="mt-0.5 text-xs leading-snug text-foreground/80">{t('editorial.dContestsDesc')}</span>
      </Link>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-1 flex items-center justify-between gap-2"><h2 className="min-w-0 font-display text-xl font-semibold">{t('editorial.top')}</h2><DemoBadge className="shrink-0" /></div>
        <ol className="divide-y divide-border/60">
          {top.map((track, i) => <li key={track.id} className="grid grid-cols-[1.25rem_2.25rem_minmax(0,1fr)_auto_auto] items-center gap-2 py-1.5">
            <span className="text-center font-display text-lg text-gold">{i + 1}</span>
            <img src={track.cover} alt="" loading="lazy" className="h-9 w-9 rounded-md object-cover" />
            <div className="min-w-0"><Link to="/artists/$artistId" params={{ artistId: track.artistId }} className="block truncate text-sm font-medium hover:text-gold">{track.title}</Link><p className="truncate text-xs text-muted-foreground">{track.artist}</p></div>
            <LikeButton trackId={track.id} size="sm" />
            <PlayButton track={track} queue={chartTracks} size="sm" label={t('charts.playTrack', { title: track.title, artist: track.artist })} />
          </li>)}
        </ol>
      </div>
      <Link to="/community" className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[color-mix(in_oklab,var(--gold)_35%,transparent)] bg-card p-3 transition-colors hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
        <Users className="h-6 w-6 text-gold" aria-hidden="true" />
        <span className="min-w-0"><span className="block font-display text-lg font-semibold leading-tight text-gold">{t('editorial.join')}</span><span className="block text-xs leading-snug text-muted-foreground">{t('editorial.joinDesc')}</span></span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold text-gold"><ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" /></span>
      </Link>
    </aside>
  </section>;
}

function PicksCarousel({ picks }: { picks: typeof chartTracks }) {
  const { t } = useI18n();
  const ref = useRef<HTMLUListElement>(null);
  const move = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const step = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 240;
    el.scrollBy({ left: dir * (step + 12) * (rtl ? -1 : 1), behavior: 'smooth' });
  };
  return <section aria-roledescription="carousel" aria-label={t('editorial.moment')} className="order-1 min-w-0 lg:order-2 xl:col-span-4">
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="flex min-w-0 items-center gap-2"><h2 className="truncate font-display text-2xl font-semibold sm:text-3xl">{t('editorial.moment')}</h2><DemoBadge className="shrink-0" /></div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="hidden h-9 xl:inline-flex"><Link to="/artists">{t('common.viewAll')}<ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" /></Link></Button>
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label={t('editorial.prev')} onClick={() => move(-1)}><ChevronLeft className="h-4 w-4 rtl:-scale-x-100" /></Button>
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label={t('editorial.next')} onClick={() => move(1)}><ChevronRight className="h-4 w-4 rtl:-scale-x-100" /></Button>
      </div>
    </div>
    <ul ref={ref} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {picks.map((track, i) => <li key={track.id} aria-roledescription="slide" aria-label={`${i + 1} / ${picks.length}`} className="group relative isolate aspect-[5/6] w-[31%] min-w-[7.5rem] shrink-0 lg:min-w-0 snap-start overflow-hidden rounded-lg border border-border bg-card shadow-card sm:w-[23%] lg:w-[calc((100%-2.25rem)/4)] xl:w-[calc((100%-3.75rem)/6)]">
        <Link to="/artists/$artistId" params={{ artistId: track.artistId }} className="absolute inset-0 -z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"><img loading="lazy" src={track.cover} alt={track.artist} className="h-full w-full object-cover object-[center_25%] transition-transform duration-500 motion-safe:group-hover:scale-105" /></Link>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/10 to-transparent" />
        <span className="pointer-events-none absolute start-2.5 top-2 font-display text-base text-gold">{String(i + 1).padStart(2, '0')}</span>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-1.5 p-2.5">
          <div className="min-w-0"><Link to="/artists/$artistId" params={{ artistId: track.artistId }} className="pointer-events-auto block truncate text-sm font-semibold leading-tight text-foreground hover:text-gold">{track.title}</Link><p className="mt-0.5 truncate text-[0.7rem] text-foreground/80">{track.artist} · {globalGenre(track.id)}</p></div>
          <div className="pointer-events-auto flex flex-col items-center gap-1.5"><LikeButton trackId={track.id} size="sm" /><PlayButton track={track} queue={chartTracks} size="sm" label={t('charts.playTrack', { title: track.title, artist: track.artist })} /></div>
        </div>
      </li>)}
    </ul>
  </section>;
}
