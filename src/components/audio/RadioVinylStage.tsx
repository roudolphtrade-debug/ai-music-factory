import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { usePlayer } from "@/audio/PlayerProvider";
import type { PlayableTrack } from "@/audio/tracks";
import { useListening } from "@/i18n/listening";
import { homeTransport } from "@/i18n/home-editorial";
import { radioVinylCopy } from "@/i18n/radio-vinyl";
import { Button } from "@/components/ui/button";
import { LikeButton } from "@/components/premium/LikeButton";
import { ShareButton } from "@/components/premium/ShareButton";
import { PlayButton } from "./PlayButton";
import { Seekbar } from "./Seekbar";
import { VolumeControl } from "./VolumeControl";
import { QueuePanel } from "./QueuePanel";
import { needleAllowed, vinylArmPosition, vinylRunning } from "./radio-vinyl-state";
import { deckLayout } from "./radio-deck-layout";
import deck640 from "@/assets/radio/radio-deck-640.webp";
import deck1080 from "@/assets/radio/radio-deck-1080.webp";
import record480 from "@/assets/radio/radio-record-480.webp";
import record760 from "@/assets/radio/radio-record-760.webp";
import sheen480 from "@/assets/radio/radio-sheen-480.webp";
import sheen760 from "@/assets/radio/radio-sheen-760.webp";
import arm300 from "@/assets/radio/radio-arm-300.webp";
import arm500 from "@/assets/radio/radio-arm-500.webp";

const DECK_SIZES = "(max-width: 639px) 92vw, 560px";
const RECORD_SIZES = "(max-width: 639px) 60vw, 360px";
const ARM_SIZES = "(max-width: 639px) 40vw, 240px";
type Box = { left: number; top: number; width: number; height: number };
const box = (b: Box): CSSProperties => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });
const armStyle = {
  ...box(deckLayout.arm),
  "--radio-arm-origin": `${deckLayout.arm.originX}% ${deckLayout.arm.originY}%`,
  "--radio-arm-rest": `${deckLayout.armRestDeg}deg`,
} as CSSProperties;

export function RadioVinylStage({ station, queue }: { station: string; queue: PlayableTrack[] }) {
  const { l, lang } = useListening();
  const copy = radioVinylCopy[lang];
  const { current, isPlaying, status, currentTime, duration, prev, next, shuffle, toggleShuffle, repeat, cycleRepeat, retry } = usePlayer();
  // The global current track wins, including when filters change; no misleading artwork.
  const display = current ?? queue[0];
  const running = vinylRunning(current?.id, display?.id, isPlaying, status);
  const armPosition = vinylArmPosition(current?.id, display?.id, isPlaying, status, currentTime, duration);
  const [ambience, setAmbience] = useState(false);
  const [armed, setArmed] = useState(false);
  const used = useRef(false);
  const context = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;
  const repeatLabel = repeat === "one" ? l.repeatOne : repeat === "all" ? l.repeatAll : l.repeatOff;

  // A short local ambience, never connected to or analysing the music element.
  const armNeedle = () => {
    if (!ambience || running || used.current) return;
    try {
      const audio = context.current ?? new AudioContext();
      context.current = audio;
      void audio.resume().catch(() => {});
      setArmed(true);
    } catch { /* Optional ambience unavailable: real playback is unaffected. */ }
  };
  useEffect(() => {
    const audio = context.current;
    if (!audio || !needleAllowed(ambience, armed, used.current, running)) return;
    used.current = true;
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.35), audio.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * 0.045 * (1 - i / samples.length);
    const node = audio.createBufferSource();
    node.buffer = buffer;
    node.connect(audio.destination);
    source.current = node;
    node.start();
  }, [ambience, armed, running]);
  useEffect(() => {
    if (!running || !ambience) { source.current?.stop(); source.current = null; }
    if (status === "error") setArmed(false);
  }, [running, ambience, status]);
  useEffect(() => () => { source.current?.stop(); void context.current?.close(); }, []);

  if (!display) return <section className="py-8"><p>{l.emptyQueue}</p></section>;

  return (
    <section className="radio-vinyl-stage" data-testid="radio-stage" data-running={running} data-arm-position={armPosition} aria-label={copy.turntable}>
      <div className="radio-stage-layout">
        <div className="radio-turntable" role="img" aria-label={`${copy.turntable} · ${running ? l.playing : l.paused}`}>
          {/* Photoreal layers rendered top-down in Blender; the tilt comes from CSS so the record turns undistorted. */}
          <div className="radio-deck-tilt">
            <img className="radio-deck" src={deck1080} srcSet={`${deck640} 640w, ${deck1080} 1080w`} sizes={DECK_SIZES} alt="" decoding="async" />
            <div className="radio-record-layer" style={box(deckLayout.record)}>
              <span className="radio-record-glow" />
              <div className="radio-record" data-testid="radio-record">
                <img src={record760} srcSet={`${record480} 480w, ${record760} 760w`} sizes={RECORD_SIZES} alt="" decoding="async" />
                <div className="radio-label" style={{ width: `${deckLayout.labelPct}%`, height: `${deckLayout.labelPct}%` }}>
                  <img src={display.cover} alt="" data-testid="radio-label-cover" /><span className="radio-spindle" />
                </div>
              </div>
              <img className="radio-sheen" src={sheen760} srcSet={`${sheen480} 480w, ${sheen760} 760w`} sizes={RECORD_SIZES} alt="" decoding="async" />
            </div>
            <div className="radio-arm-layer" style={armStyle}>
              <img className="radio-arm" data-testid="radio-arm" src={arm500} srcSet={`${arm300} 300w, ${arm500} 500w`} sizes={ARM_SIZES} alt="" decoding="async" />
            </div>
          </div>
        </div>
        <div className="radio-stage-content min-w-0">
          <img className="radio-artist-portrait" src={display.cover} alt={display.artist} />
          <div className="radio-track-details relative">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full border border-gold/40 px-3 py-1 text-gold">{l.demoProgramming}</span><span className="text-muted-foreground">{station}</span></div>
            <h2 className="font-display text-4xl font-semibold text-foreground sm:text-5xl">{display.title}</h2>
            <p className="mt-2 text-base text-foreground">{display.artist}</p>
            <p className="mt-2 text-xs text-muted-foreground">{[display.genre, display.mood].filter(Boolean).join(" · ")}</p>
            <div role="group" aria-label={l.playbackOptions} className="radio-transport mt-5 flex items-center gap-1">
              <Button variant="ghost" size="icon" title={l.shuffle} aria-label={l.shuffle} aria-pressed={shuffle} onClick={toggleShuffle} className={shuffle ? "text-gold" : "text-muted-foreground"}><Shuffle className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title={homeTransport[lang].previous} aria-label={homeTransport[lang].previous} onClick={prev}><SkipBack className="h-5 w-5 rtl:-scale-x-100" /></Button>
              <div onClickCapture={armNeedle}><PlayButton track={display} queue={queue} size="lg" /></div>
              <Button variant="ghost" size="icon" title={homeTransport[lang].next} aria-label={homeTransport[lang].next} onClick={next}><SkipForward className="h-5 w-5 rtl:-scale-x-100" /></Button>
              <Button variant="ghost" size="icon" title={repeatLabel} aria-label={repeatLabel} aria-pressed={repeat !== "off"} onClick={cycleRepeat} className={repeat !== "off" ? "text-gold" : "text-muted-foreground"}><RepeatIcon className="h-4 w-4" /></Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2"><LikeButton trackId={display.id} /><ShareButton title={display.title} artist={display.artist} trackId={display.id} /><QueuePanel className="radio-queue-trigger" /><VolumeControl /></div>
            <p className="mt-3 min-h-5 text-xs text-muted-foreground" role="status">{current ? status === "error" ? l.error : status === "loading" ? l.loading : running ? l.playing : l.paused : l.demoProgramming}</p>
            {status === "error" && <Button variant="ghost-gold" size="sm" onClick={retry}>{l.retry}</Button>}
          </div>
        </div>
      </div>
      <div className="radio-spectrum" aria-hidden="true">{Array.from({ length: 80 }, (_, i) => <span key={i} className={`radio-spectrum-bar radio-spectrum-height-${(i * 7 + Math.floor(i / 6) * 3) % 12}`} />)}</div>
      <div dir="ltr"><Seekbar fallbackDuration={display.duration} /></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>{copy.decorative}</p>
        <label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" checked={ambience} onChange={e => setAmbience(e.target.checked)} className="h-4 w-4 accent-gold" />{copy.needle}</label>
      </div>
    </section>
  );
}