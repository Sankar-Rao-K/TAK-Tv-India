import { Link } from '@tanstack/react-router';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Play, ArrowRight, ExternalLink, ShieldCheck, CalendarDays, Megaphone, BarChart3, BookOpen, CheckCircle2, Clock3, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicNewsOptions, publicPostOptions } from '@/lib/news.functions';
import { ht, newsDate, pick, sourceTypeLabel, isOlderData, type Lang } from '@/lib/news';
import { formatDuration } from '@/lib/youtube';
import { YouTubeThumb, YouTubePlayer, VideoLightbox, WatchOnYouTube } from './youtube';
import { PublicShell, NewsCard, categoryName } from './public-site';

function usePublic() { return useSuspenseQuery(publicNewsOptions); }
type Hub = ReturnType<typeof usePublic>['data'];
type Video = Hub['videos'][number];
type Post = Hub['posts'][number];
type Card = Hub['dataCards'][number];

const social = (v: unknown): Record<string, string> => (v && typeof v === 'object' ? (v as Record<string, string>) : {});
const sameLang = (v: { language: string }, lang: Lang) => v.language === (lang === 'te' ? 'te' : 'en');
/** Prefer items in the reader's language, then fill with the other language so a page is never empty. */
function preferLang<T extends { language: string }>(items: T[], lang: Lang, n: number): T[] { return [...items.filter((v) => sameLang(v, lang)), ...items.filter((v) => !sameLang(v, lang))].slice(0, n); }
const Missing = ({ lang, text, back, to }: { lang: Lang; text: string; back: string; to: '/$lang/videos' | '/$lang/blog' }) => <PublicShell lang={lang}><main className="news-wrap min-h-[450px] flex flex-col items-center justify-center"><h1 className="text-2xl font-bold">{text}</h1><Button asChild variant="link" className="mt-4"><Link to={to} params={{ lang }}>{back}<ArrowRight /></Link></Button></main></PublicShell>;

/** Video card: YouTube thumbnail + play badge. Click opens the video page with the player ready (or the lightbox when `onPlay` is given). */
export function VideoCard({ v, lang, onPlay }: { v: Video; lang: Lang; onPlay?: ((v: Video, opener: HTMLElement) => void) | undefined }) {
  const { data } = usePublic(); const cat = data.categories.find((c) => c.id === v.category_id); const title = pick(v.title_te, v.title_en, lang); const dur = formatDuration(v.duration_seconds);
  const body = <>
    <div className={`relative bg-muted ${v.is_short ? 'aspect-[9/16]' : 'aspect-[16/10]'}`}><YouTubeThumb id={v.youtube_id} isShort={v.is_short} alt={title} className="h-full w-full" />
      <span className="absolute bottom-3 right-3 bg-breaking text-breaking-foreground rounded-full p-3"><Play size={15} fill="currentColor" /></span>
      {v.is_short && <span className="absolute left-3 top-3 rounded bg-breaking px-2 py-0.5 text-[10px] font-bold uppercase text-breaking-foreground">{ht('short', lang)}</span>}
      {dur && <span className="absolute bottom-3 left-3 rounded bg-secondary/85 px-1.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">{dur}</span>}</div>
    <div className="p-5"><p className="text-breaking text-[10px] font-bold uppercase">{cat ? categoryName(cat, lang) : ''}{v.series ? ` · ${v.series}` : ''}</p><h3 className="text-base font-bold leading-snug mt-2 line-clamp-3">{title}</h3><time className="text-muted-foreground text-[11px] block mt-3">{newsDate(v.published_at || v.created_at, lang)}</time></div></>;
  if (onPlay) return <button type="button" onClick={(e) => onPlay(v, e.currentTarget)} className="news-card block w-full text-left" aria-label={`${ht('play', lang)}: ${title}`}>{body}</button>;
  return <Link to="/$lang/videos/$slug" params={{ lang, slug: v.slug }} search={{ play: 1 }} className="news-card block">{body}</Link>;
}
export function PostCard({ p, lang }: { p: Post; lang: Lang }) {
  const { data } = usePublic(); const cat = data.categories.find((c) => c.id === p.category_id);
  return <Link to="/$lang/blog/$slug" params={{ lang, slug: p.slug }} className="news-card block">
    <div className="relative bg-muted aspect-[16/10]">{p.cover_url ? <img src={p.cover_url} alt={p.cover_alt} className="h-full w-full object-cover" loading="lazy" /> : p.cover_youtube_id ? <YouTubeThumb id={p.cover_youtube_id} alt={pick(p.title_te, p.title_en, lang)} className="h-full w-full" /> : <BookOpen className="absolute inset-0 m-auto text-muted-foreground" size={34} />}</div>
    <div className="p-5"><p className="text-breaking text-[10px] font-bold uppercase">{cat ? categoryName(cat, lang) : ''}</p><h3 className="text-base font-bold leading-snug mt-2 line-clamp-3">{pick(p.title_te, p.title_en, lang)}</h3><time className="text-muted-foreground text-[11px] block mt-3">{newsDate(p.published_at || p.created_at, lang)}</time></div></Link>;
}

/** Collapsible "Sources & Proofs" list under a video or blog post. */
export function SourcesPanel({ type, id, lang }: { type: 'video' | 'post' | 'data_card'; id: string; lang: Lang }) {
  const { data } = usePublic(); const items = data.contentSources.filter((c) => c.content_type === type && c.content_id === id);
  if (!items.length) return null;
  return <details className="bg-card border border-border rounded-xl p-5 mt-8" open>
    <summary className="cursor-pointer font-bold flex items-center gap-2"><ShieldCheck size={18} className="text-primary" />{ht('sources', lang)} <span className="text-xs font-normal text-muted-foreground">— {ht('checkSources', lang)}</span></summary>
    <ul className="mt-4 divide-y divide-border">{items.map((s) => <li key={s.id} className="py-3 flex flex-wrap gap-x-4 gap-y-1 items-start justify-between">
      <div className="min-w-0"><a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary break-words inline-flex gap-1.5 items-start"><ExternalLink size={14} className="mt-1 shrink-0" />{s.title}</a>
        <p className="text-xs text-muted-foreground mt-1">{[s.data_year && `${ht('dataYear', lang)}: ${s.data_year}`, s.page_ref && `${ht('page', lang)}: ${s.page_ref}`, s.accessed_at && `${ht('accessed', lang)}: ${newsDate(s.accessed_at, lang)}`].filter(Boolean).join(' · ')}</p>{s.note && <p className="text-xs mt-1">{s.note}</p>}</div>
      <span className="text-[10px] uppercase font-bold tracking-wide bg-muted rounded px-2 py-1 shrink-0">{sourceTypeLabel(s.source_type, lang)}</span></li>)}</ul></details>;
}
function FollowBar({ lang }: { lang: Lang }) {
  const { data } = usePublic(); const s = data.settings; const links = [['YouTube', s?.youtube], ['Instagram', s?.instagram], ['Facebook', s?.facebook]].filter((x): x is [string, string] => !!x[1]);
  if (!links.length) return null;
  return <div className="flex flex-wrap items-center gap-3"><strong className="text-sm">{ht('follow', lang)}:</strong>{links.map(([n, u]) => <Button key={n} asChild variant="outline" size="sm"><a href={u} target="_blank" rel="noopener noreferrer">{n === 'YouTube' && <Youtube />}{n}</a></Button>)}</div>;
}
export function SubscribeButton({ lang }: { lang: Lang }) {
  const { data } = usePublic(); const u = data.settings?.youtube; if (!u) return null;
  return <Button asChild className="bg-breaking text-breaking-foreground hover:bg-breaking/90"><a href={u} target="_blank" rel="noopener noreferrer"><Youtube />{ht('subscribe', lang)}</a></Button>;
}

/** Extra home-page sections: raise-issue banner, latest videos, blogs & data, followed issues, social bar. */
export function HomeHub({ lang }: { lang: Lang }) {
  const { data } = usePublic(); const videos = preferLang(data.videos.filter((v) => !v.is_short), lang, 4); const shorts = preferLang(data.videos.filter((v) => v.is_short), lang, 6); const posts = data.posts.slice(0, 3); const cards = data.dataCards.slice(0, 3);
  const [box, setBoxState] = useState<Video | null>(null); const [opener, setOpener] = useState<HTMLElement | null>(null);
  const setBox = (v: Video, el?: HTMLElement) => { setOpener(el || null); setBoxState(v); };
  const resolved = data.followed.filter((f) => f.status === 'resolved').length;
  return <>
    <section className="news-wrap mt-10"><div className="rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8 flex flex-wrap gap-5 items-center justify-between"><div className="flex gap-4 items-center"><Megaphone size={34} /><p className="text-lg sm:text-xl font-bold max-w-2xl">{ht('issueCta', lang)}</p></div>
      <Button asChild size="lg" variant="secondary"><Link to="/$lang/raise-issue" params={{ lang }}>{ht('raise', lang)}<ArrowRight /></Link></Button></div></section>
    {(videos.length > 0) && <section className="bg-secondary text-secondary-foreground py-8 mt-10"><div className="news-wrap"><div className="flex flex-wrap gap-3 justify-between items-center"><Link to="/$lang/videos" params={{ lang }} className="section-heading flex items-center gap-2"><Play />{ht('latestVideos', lang)}</Link><SubscribeButton lang={lang} /></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">{videos.map((v) => <VideoCard key={v.id} v={v} lang={lang} onPlay={v.yt_status === 'ok' || v.yt_status === 'unknown' ? setBox : undefined} />)}</div>
      {shorts.length > 0 && <><h3 className="section-heading !text-lg mt-8">{ht('latestShorts', lang)}</h3><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">{shorts.map((v) => <VideoCard key={v.id} v={v} lang={lang} onPlay={v.yt_status === 'ok' || v.yt_status === 'unknown' ? setBox : undefined} />)}</div></>}</div></section>}
    {videos.length === 0 && shorts.length > 0 && <section className="bg-secondary text-secondary-foreground py-8 mt-10"><div className="news-wrap"><div className="flex flex-wrap gap-3 justify-between items-center"><Link to="/$lang/videos" params={{ lang }} className="section-heading flex items-center gap-2"><Play />{ht('latestShorts', lang)}</Link><SubscribeButton lang={lang} /></div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">{shorts.map((v) => <VideoCard key={v.id} v={v} lang={lang} onPlay={setBox} />)}</div></div></section>}
    <VideoLightbox video={box ? { id: box.youtube_id, isShort: box.is_short, title: pick(box.title_te, box.title_en, lang) } : null} onClose={() => setBoxState(null)} returnFocusTo={opener} labels={{ watch: ht('watchYt', lang), close: ht('close', lang), open: ht('openVideoPage', lang) }}
      pageLink={box ? <Button asChild variant="outline"><Link to="/$lang/videos/$slug" params={{ lang, slug: box.slug }} onClick={() => setBoxState(null)}>{ht('openVideoPage', lang)}<ArrowRight /></Link></Button> : null} />
    {(posts.length > 0 || cards.length > 0) && <section className="news-wrap mt-10"><div className="flex justify-between items-center mb-5"><h2 className="section-heading">{ht('latestBlogs', lang)}</h2><Link to="/$lang/blog" params={{ lang }} className="text-sm text-primary font-semibold">{ht('blogs', lang)} <ArrowRight className="inline" size={14} /></Link></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{posts.map((p) => <PostCard key={p.id} p={p} lang={lang} />)}{cards.map((c) => <DataCard key={c.id} c={c} lang={lang} compact />)}</div></section>}
    {data.followed.length > 0 && <section className="news-wrap mt-10"><Link to="/$lang/followed" params={{ lang }} className="bg-card border border-border rounded-xl p-5 flex flex-wrap gap-4 justify-between items-center hover:border-primary"><div><h2 className="section-heading !text-lg">{ht('followed', lang)}</h2><p className="text-sm text-muted-foreground mt-1">{data.followed.length} · {ht('resolved', lang)}: {resolved}</p></div><ArrowRight /></Link></section>}
    <section className="news-wrap mt-8"><FollowBar lang={lang} /></section></>;
}

export function VideosPage({ lang }: { lang: Lang }) {
  const { data } = usePublic(); const [cat, setCat] = useState(''); const [count, setCount] = useState(12); const [kind, setKind] = useState<'all' | 'long' | 'short'>('all');
  const videos = preferLang(data.videos, lang, 500).filter((v) => (!cat || v.category_id === cat) && (kind === 'all' || (kind === 'short') === v.is_short));
  const stories = kind === 'short' ? [] : data.articles.filter((a) => a.lang === lang && a.youtube_id && (!cat || a.category_id === cat));
  const cats = data.categories.filter((c) => data.videos.some((v) => v.category_id === c.id) || data.articles.some((a) => a.youtube_id && a.category_id === c.id));
  const items = [...videos.map((v) => ({ k: 'v' as const, v, at: new Date(v.published_at || v.created_at).getTime() })), ...stories.map((a) => ({ k: 's' as const, a, at: new Date(a.published_at || a.created_at).getTime() }))].sort((x, y) => y.at - x.at);
  return <PublicShell lang={lang}><main className="news-wrap py-8 min-h-[420px]"><div className="flex flex-wrap gap-4 justify-between items-end mb-7"><h1 className="section-heading !text-3xl">{ht('latestVideos', lang)}</h1><div className="flex flex-wrap gap-3 items-center"><div className="flex rounded-full bg-muted p-1" role="group" aria-label={ht('shorts', lang)}>{([['all', ht('allVideos', lang)], ['long', ht('longVideos', lang)], ['short', ht('shorts', lang)]] as const).map(([k, l]) => <Button key={k} type="button" size="sm" variant="ghost" aria-pressed={kind === k} className={`rounded-full ${kind === k ? 'bg-card shadow-sm' : ''}`} onClick={() => { setKind(k); setCount(12); }}>{l}</Button>)}</div><select className="field !w-auto" aria-label={ht('allCategories', lang)} value={cat} onChange={(e) => { setCat(e.target.value); setCount(12); }}><option value="">{ht('allCategories', lang)}</option>{cats.map((c) => <option key={c.id} value={c.id}>{categoryName(c, lang)}</option>)}</select><SubscribeButton lang={lang} /></div></div>
    {items.length ? <><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{items.slice(0, count).map((x) => x.k === 'v' ? <VideoCard key={x.v.id} v={x.v} lang={lang} /> : <NewsCard key={x.a.id} a={x.a as never} lang={lang} />)}</div>{count < items.length && <div className="text-center mt-8"><Button onClick={() => setCount(count + 12)}>{ht('loadMore', lang)}</Button></div>}</> : <div className="news-empty"><p className="text-sm">{ht('noVideos', lang)}</p></div>}</main></PublicShell>;
}
export function VideoPage({ lang, slug, autoplay = false }: { lang: Lang; slug: string; autoplay?: boolean }) {
  const { data } = usePublic(); const v = data.videos.find((x) => x.slug === slug);
  if (!v) return <Missing lang={lang} text={lang === 'te' ? 'వీడియో కనబడలేదు' : 'Video not found'} back={ht('latestVideos', lang)} to="/$lang/videos" />;
  const cat = data.categories.find((c) => c.id === v.category_id); const title = pick(v.title_te, v.title_en, lang); const desc = pick(v.description_te, v.description_en, lang); const sl = social(v.social_links);
  const related = data.videos.filter((x) => x.id !== v.id && x.category_id === v.category_id).slice(0, 4);
  return <PublicShell lang={lang}><main className="news-wrap grid lg:grid-cols-[2.3fr_1fr] gap-8 py-7"><article className="min-w-0">
    <YouTubePlayer key={v.id} id={v.youtube_id} isShort={v.is_short} title={title} autoplay={autoplay} playable={v.yt_status !== 'unavailable' && v.yt_status !== 'not_embeddable'} labels={{ play: ht('play', lang), watch: ht('watchYt', lang), unavailable: ht('ytUnavailable', lang) }} />
    <div className="bg-card rounded-xl p-5 sm:p-8 mt-5"><div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground mb-3"><Link to={lang === 'en' ? '/' : '/te'}>{lang === 'te' ? 'హోమ్' : 'Home'}</Link> › <Link to="/$lang/videos" params={{ lang }}>{ht('latestVideos', lang)}</Link>{cat && <> › <Link to="/$lang/category/$categoryId" params={{ lang, categoryId: cat.id }}>{categoryName(cat, lang)}</Link></>}</div>
      <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">{title}</h1><div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-3 items-center"><span className="inline-flex gap-1 items-center"><CalendarDays size={13} />{newsDate(v.published_at || v.created_at, lang)}</span>{v.is_short && <span className="bg-breaking text-breaking-foreground rounded px-2 py-0.5 font-bold uppercase">{ht('short', lang)}</span>}{formatDuration(v.duration_seconds) && <span>{formatDuration(v.duration_seconds)}</span>}{v.series && <span className="bg-muted rounded px-2 py-0.5">{v.series}</span>}{v.region && <span>{v.region}</span>}</div>
      {desc && <p className="mt-5 whitespace-pre-line leading-relaxed">{desc}</p>}{v.tags.length > 0 && <p className="mt-4 text-xs text-muted-foreground">{v.tags.map((t) => `#${t}`).join('  ')}</p>}
      <div className="flex flex-wrap gap-3 mt-6"><WatchOnYouTube id={v.youtube_id} isShort={v.is_short} label={ht('watchYt', lang)} /><SubscribeButton lang={lang} />{sl['instagram'] && <Button asChild variant="outline"><a href={sl['instagram']} target="_blank" rel="noopener noreferrer">Instagram</a></Button>}{sl['facebook'] && <Button asChild variant="outline"><a href={sl['facebook']} target="_blank" rel="noopener noreferrer">Facebook</a></Button>}<Button asChild variant="outline"><Link to="/$lang/raise-issue" params={{ lang }}><Megaphone />{ht('raiseTopic', lang)}</Link></Button></div></div>
    <SourcesPanel type="video" id={v.id} lang={lang} /></article>
    <aside className="bg-card rounded-xl p-5 self-start"><h2 className="section-heading !text-lg mb-3">{ht('related', lang)}</h2>{related.length ? <div className="grid gap-4">{related.map((x) => <VideoCard key={x.id} v={x} lang={lang} />)}</div> : <p className="text-sm text-muted-foreground">{ht('noVideos', lang)}</p>}</aside></main></PublicShell>;
}
export function PostsPage({ lang }: { lang: Lang }) {
  const { data } = usePublic(); const [count, setCount] = useState(12);
  return <PublicShell lang={lang}><main className="news-wrap py-8 min-h-[420px]"><h1 className="section-heading !text-3xl mb-7">{ht('blogs', lang)}</h1>{data.posts.length ? <><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{data.posts.slice(0, count).map((p) => <PostCard key={p.id} p={p} lang={lang} />)}</div>{count < data.posts.length && <div className="text-center mt-8"><Button onClick={() => setCount(count + 12)}>{ht('loadMore', lang)}</Button></div>}</> : <div className="news-empty"><p className="text-sm">{ht('noPosts', lang)}</p></div>}</main></PublicShell>;
}
export function PostPage({ lang, slug }: { lang: Lang; slug: string }) {
  const { data } = usePublic(); const full = useQuery(publicPostOptions(slug)); const p = full.data;
  if (!p && full.isPending) return <PublicShell lang={lang}><main className="news-wrap min-h-[450px]" aria-busy="true" /></PublicShell>;
  if (!p) return <Missing lang={lang} text={lang === 'te' ? 'పోస్టు కనబడలేదు' : 'Post not found'} back={ht('blogs', lang)} to="/$lang/blog" />;
  const cat = data.categories.find((c) => c.id === p.category_id); const body = lang === 'te' ? p.body_te || p.body_en : p.body_en || p.body_te;
  return <PublicShell lang={lang}><main className="news-wrap py-7 max-w-[900px]"><article className="bg-card rounded-xl p-5 sm:p-8"><div className="flex gap-2 items-center text-xs text-muted-foreground mb-4"><Link to="/$lang/blog" params={{ lang }}>{ht('blogs', lang)}</Link>{cat && <> › <Link to="/$lang/category/$categoryId" params={{ lang, categoryId: cat.id }}>{categoryName(cat, lang)}</Link></>}</div>
    <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">{pick(p.title_te, p.title_en, lang)}</h1><time className="text-xs text-muted-foreground block mt-3">{newsDate(p.published_at || p.created_at, lang)}</time>
    {!p.cover_url && p.cover_youtube_id && <div className="my-6"><YouTubePlayer id={p.cover_youtube_id} title={pick(p.title_te, p.title_en, lang)} labels={{ play: ht('play', lang), watch: ht('watchYt', lang), unavailable: ht('ytUnavailable', lang) }} /></div>}{p.cover_url && <figure className="my-6"><img src={p.cover_url} alt={p.cover_alt} className="w-full aspect-video object-cover rounded-xl" />{p.cover_credit && <figcaption className="text-xs text-muted-foreground mt-2">{p.cover_credit}</figcaption>}</figure>}
    <div className="story-body" dangerouslySetInnerHTML={{ __html: body || '' }} /><div className="mt-8"><SubscribeButton lang={lang} /></div></article><SourcesPanel type="post" id={p.id} lang={lang} /></main></PublicShell>;
}

function Chart({ c }: { c: Card }) {
  const rows = (Array.isArray(c.chart_data) ? c.chart_data : []) as { label: string; value: number }[]; if (!rows.length) return null; const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  if (c.chart_type === 'table') return <table className="w-full text-sm mt-3"><tbody>{rows.map((r) => <tr key={r.label} className="border-b border-border"><td className="py-1.5">{r.label}</td><td className="py-1.5 text-right font-semibold">{r.value}{c.unit ? ` ${c.unit}` : ''}</td></tr>)}</tbody></table>;
  if (c.chart_type === 'line') { const w = 300, h = 110, step = rows.length > 1 ? w / (rows.length - 1) : w; const y = (v: number) => (h - (v / max) * (h - 16) - 4).toFixed(1); const pts = rows.map((r, i) => `${(i * step).toFixed(1)},${y(r.value)}`).join(' ');
    return <figure className="mt-3"><svg viewBox={`0 0 ${w} ${h + 14}`} role="img" aria-label={c.name_en || c.name_te} className="w-full"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />{rows.map((r, i) => <circle key={r.label} cx={i * step} cy={y(r.value)} r="3" className="fill-primary" />)}</svg><div className="flex justify-between text-[10px] text-muted-foreground">{rows.map((r) => <span key={r.label}>{r.label}</span>)}</div></figure>; }
  return <div className="mt-3 space-y-2">{rows.map((r) => <div key={r.label} className="text-xs"><div className="flex justify-between"><span>{r.label}</span><strong>{r.value}{c.unit ? ` ${c.unit}` : ''}</strong></div><div className="h-2.5 bg-muted rounded"><div className="h-2.5 bg-primary rounded" style={{ width: `${Math.max(2, (Math.abs(r.value) / max) * 100)}%` }} /></div></div>)}</div>;
}
export function DataCard({ c, lang, compact = false }: { c: Card; lang: Lang; compact?: boolean }) {
  const { data } = usePublic(); const src = data.sources.find((s) => s.id === c.source_id); const older = isOlderData(c.data_year);
  const href = src ? (/^https?:\/\//i.test(src.website) ? src.website : `https://${(src.website.split(/[\s/]+/)[0] || '')}`) : '';
  return <article className="bg-card border border-border rounded-xl p-5"><p className="text-breaking text-[10px] font-bold uppercase inline-flex gap-1 items-center"><BarChart3 size={12} />{ht('data', lang)}{c.geography ? ` · ${c.geography}` : ''}</p>
    <h3 className="font-bold leading-snug mt-2">{pick(c.name_te, c.name_en, lang)}</h3>
    <div className="flex flex-wrap gap-2 text-[11px] mt-3"><span className="bg-muted rounded px-2 py-0.5">{ht('dataYear', lang)}: {c.data_year}</span>{c.comparison_year && <span className="bg-muted rounded px-2 py-0.5">{ht('baseline', lang)}: {c.comparison_year}</span>}{older && <span className="bg-accent/20 text-accent-foreground rounded px-2 py-0.5 font-semibold">{ht('older', lang)}</span>}</div>
    {!compact && <Chart c={c} />}<p className="text-xs text-muted-foreground mt-4">{src && <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold">{src.name}</a>}{c.verified_at && <span className="inline-flex gap-1 items-center ml-2"><CheckCircle2 size={12} />{ht('verified', lang)}: {newsDate(c.verified_at, lang)}</span>}</p></article>;
}
export function DataPage({ lang }: { lang: Lang }) {
  const { data } = usePublic();
  return <PublicShell lang={lang}><main className="news-wrap py-8 min-h-[420px]"><h1 className="section-heading !text-3xl">{ht('dataLibrary', lang)}</h1><p className="text-sm text-muted-foreground mt-2 mb-7 max-w-2xl">{ht('dataIntro', lang)}</p>{data.dataCards.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{data.dataCards.map((c) => <DataCard key={c.id} c={c} lang={lang} />)}</div> : <div className="news-empty"><p className="text-sm">{ht('noData', lang)}</p></div>}</main></PublicShell>;
}
export function FollowedPage({ lang }: { lang: Lang }) {
  const { data } = usePublic();
  return <PublicShell lang={lang}><main className="news-wrap py-8 min-h-[420px] max-w-[900px]"><h1 className="section-heading !text-3xl">{ht('followed', lang)}</h1><p className="text-sm text-muted-foreground mt-2 mb-7">{ht('followedIntro', lang)}</p>
    {data.followed.length ? <div className="space-y-4">{data.followed.map((f) => { const done = f.status === 'resolved'; const cat = data.categories.find((c) => c.id === f.category_id); const place = [f.mandal, f.district].filter(Boolean).join(', ');
      return <article key={f.id} className="bg-card border border-border rounded-xl p-5"><div className="flex flex-wrap gap-2 justify-between items-start"><div><p className="text-breaking text-[10px] font-bold uppercase">{cat ? categoryName(cat, lang) : ''}{place ? ` · ${place}` : ''}</p><h2 className="font-bold mt-1">{f.title}</h2></div><span className={`text-xs font-bold rounded-full px-3 py-1 inline-flex gap-1 items-center ${done ? 'bg-primary/15 text-primary' : 'bg-muted'}`}>{done ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}{done ? ht('resolved', lang) : ht('ongoing', lang)}</span></div>{f.followup_summary && <p className="text-sm mt-3 whitespace-pre-line">{f.followup_summary}</p>}<time className="text-[11px] text-muted-foreground block mt-3">{newsDate(f.updated_at, lang)}</time></article>; })}</div> : <div className="news-empty"><p className="text-sm">{ht('noFollowed', lang)}</p></div>}
    <div className="mt-8"><Button asChild><Link to="/$lang/raise-issue" params={{ lang }}><Megaphone />{ht('raise', lang)}</Link></Button></div></main></PublicShell>;
}
/** Videos and blog posts shown under a category page. */
export function CategoryHub({ lang, categoryId }: { lang: Lang; categoryId: string }) {
  const { data } = usePublic(); const videos = data.videos.filter((v) => v.category_id === categoryId); const posts = data.posts.filter((p) => p.category_id === categoryId);
  if (!videos.length && !posts.length) return null;
  const section = (title: ReactNode, body: ReactNode) => <section className="mt-10"><h2 className="section-heading !text-xl mb-4">{title}</h2>{body}</section>;
  return <>{videos.length > 0 && section(ht('latestVideos', lang), <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{videos.slice(0, 8).map((v) => <VideoCard key={v.id} v={v} lang={lang} />)}</div>)}
    {posts.length > 0 && section(ht('blogs', lang), <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{posts.slice(0, 8).map((p) => <PostCard key={p.id} p={p} lang={lang} />)}</div>)}</>;
}
