import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Play, Youtube, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { embedUrl, isPlaceholderThumb, nextThumb, thumbCandidates, watchUrl } from '@/lib/youtube';

/**
 * Thumbnail straight from YouTube (never stored by us). Tries maxres → hq → mq (Shorts: vertical frame first),
 * skips YouTube's grey 120×90 "missing" picture, and ends on a neutral placeholder if nothing loads.
 */
export function YouTubeThumb({ id, isShort = false, alt, className = '', eager = false }: { id: string; isShort?: boolean; alt: string; className?: string; eager?: boolean }) {
  const candidates = useMemo(() => thumbCandidates(id, isShort), [id, isShort]);
  const [src, setSrc] = useState(candidates[0] || '');
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => { setSrc(candidates[0] || ''); }, [candidates]);
  // Move on from `from` only once, even if the load/error handler and the mount check both notice the same failure.
  const advance = (from: string) => setSrc((s) => (s === from ? nextThumb(candidates, from) : s));
  const check = (img: HTMLImageElement) => { if (img.complete && (img.naturalWidth === 0 || isPlaceholderThumb(img.naturalWidth))) advance(img.getAttribute('src') || ''); };
  // The picture may finish loading before React attaches its handlers (server-rendered page): check once on mount.
  useEffect(() => { if (ref.current) check(ref.current); }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!id || !src) return <div className={`grid place-items-center bg-muted text-muted-foreground ${className}`} role="img" aria-label={alt}><Play size={32} /></div>;
  return <img ref={ref} src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" width={isShort ? 360 : 480} height={isShort ? 640 : 270} referrerPolicy="no-referrer"
    className={`object-cover ${className}`} data-thumb={src.split('/').pop()}
    onLoad={(e) => { if (isPlaceholderThumb(e.currentTarget.naturalWidth)) advance(src); }}
    onError={() => advance(src)} />;
}

export function WatchOnYouTube({ id, isShort = false, label, className = '' }: { id: string; isShort?: boolean; label: string; className?: string }) {
  return <a href={watchUrl(id, isShort)} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold hover:border-primary ${className}`}><Youtube size={16} className="text-breaking" />{label}</a>;
}

type PlayerProps = { id: string; isShort?: boolean; title: string; autoplay?: boolean; playable?: boolean; labels: { play: string; watch: string; unavailable: string } };
/**
 * Click-to-play: shows the thumbnail with a play button; the privacy-friendly youtube-nocookie player (and its cookies/scripts)
 * loads only after the click. When YouTube says the video can't be played here, shows a "Watch on YouTube" button instead.
 */
export function YouTubePlayer({ id, isShort = false, title, autoplay = false, playable = true, labels }: PlayerProps) {
  const [play, setPlay] = useState(autoplay && playable);
  const box = isShort ? 'mx-auto aspect-[9/16] w-full max-w-[360px]' : 'aspect-video w-full';
  return <div className={`relative overflow-hidden rounded-xl bg-secondary ${box}`}>
    {play ? <iframe className="h-full w-full" title={title} src={embedUrl(id)} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      : playable ? <button type="button" className="group h-full w-full" onClick={() => setPlay(true)} aria-label={`${labels.play}: ${title}`}>
        <YouTubeThumb id={id} isShort={isShort} alt={title} eager className="h-full w-full" />
        <span className="absolute inset-0 m-auto grid h-20 w-20 place-items-center rounded-full bg-breaking text-breaking-foreground shadow-lg transition-transform group-hover:scale-105"><Play size={34} fill="currentColor" /></span>
      </button>
      : <div className="relative h-full w-full">
        <YouTubeThumb id={id} isShort={isShort} alt={title} eager className="h-full w-full opacity-40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-secondary-foreground"><p className="text-sm font-semibold">{labels.unavailable}</p><WatchOnYouTube id={id} isShort={isShort} label={labels.watch} className="text-foreground" /></div>
      </div>}
  </div>;
}

/** Watch without leaving the page (home "Latest Videos"). Esc closes it and focus returns to the card (Radix Dialog). */
export function VideoLightbox({ video, onClose, labels, pageLink, returnFocusTo }: { video: { id: string; isShort: boolean; title: string } | null; onClose: () => void; labels: { watch: string; close: string; open: string }; pageLink: ReactNode; returnFocusTo?: HTMLElement | null | undefined }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Start on the close button, not inside the player: keys pressed inside YouTube's frame (like Esc) never reach this page.
  return <Dialog open={!!video} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent onOpenAutoFocus={(e) => { e.preventDefault(); closeRef.current?.focus(); }} onCloseAutoFocus={(e) => { if (returnFocusTo?.isConnected) { e.preventDefault(); returnFocusTo.focus(); } }} className={`gap-3 p-3 sm:p-4 ${video?.isShort ? 'max-w-[400px]' : 'max-w-4xl'} [&>button:last-child]:hidden`}>
      {video && <>
        <DialogTitle className="pr-10 text-base leading-snug">{video.title}</DialogTitle>
        <DialogDescription className="sr-only">{labels.watch}</DialogDescription>
        <div className={`overflow-hidden rounded-lg bg-secondary ${video.isShort ? 'mx-auto aspect-[9/16] w-full' : 'aspect-video w-full'}`}><iframe className="h-full w-full" title={video.title} src={embedUrl(video.id)} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
        <div className="flex flex-wrap items-center gap-3">{pageLink}<WatchOnYouTube id={video.id} isShort={video.isShort} label={labels.watch} /></div>
        <DialogClose ref={closeRef} className="absolute right-3 top-3 rounded-full p-2 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={labels.close}><X size={18} /></DialogClose>
      </>}
    </DialogContent>
  </Dialog>;
}
