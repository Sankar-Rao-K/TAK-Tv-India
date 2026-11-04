import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Search, Menu, X, Home, Play, ArrowUpRight, Newspaper, ArrowRight, ArrowLeft, Copy, Check, ChevronLeft, ChevronRight, ChevronDown, Tv, LayoutGrid, Info, Mail, UserRound, Zap,
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, CloudFog, Snowflake, Quote, Ellipsis,
  Wheat, Droplets, Briefcase, Route, GraduationCap, HeartPulse, TrainFront, Bus, Building2, Anchor, Leaf, ShieldAlert, Fish, Mountain, Users, Baby, HandHeart, Landmark, Scale, Eye, Gavel, Vote, House, Cpu, Trophy, Clapperboard, TrendingUp, Flame,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { publicNewsOptions, publicStoryOptions, type Article, type Category } from '@/lib/news.functions';
import { weatherOptions, WEATHER_CITY, type WeatherKind } from '@/lib/weather.functions';
import { dictionary, newsDate, ht, buildTicker, visibleLangs, langLabel, type Lang, type TickerItem } from '@/lib/news';
import { YouTubePlayer } from './youtube';

export function categoryName(c: Category | undefined, lang: Lang) { return String((c?.names as Record<string, string> | undefined)?.[lang] || c?.id || ''); }
const homePath = (lang: Lang) => (lang === 'en' ? '/' : lang === 'hi' ? '/hi' : '/te');

/* ---------- category icons (names stored in categories.icon) ---------- */
const ICONS: Record<string, LucideIcon> = {
  wheat: Wheat, droplets: Droplets, briefcase: Briefcase, road: Route, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse, train: TrainFront, bus: Bus,
  'building-2': Building2, anchor: Anchor, leaf: Leaf, 'shield-alert': ShieldAlert, fish: Fish, mountain: Mountain, zap: Zap, users: Users, baby: Baby, 'hand-heart': HandHeart,
  landmark: Landmark, scale: Scale, eye: Eye, gavel: Gavel, vote: Vote, home: House, cpu: Cpu, trophy: Trophy, clapperboard: Clapperboard, newspaper: Newspaper, 'trending-up': TrendingUp, flame: Flame,
};
export function CategoryIcon({ c, size = 20 }: { c: Category | undefined; size?: number }) {
  const I = (c && ICONS[c.icon]) || Newspaper;
  return <I size={size} aria-hidden style={{ color: c?.colour || 'var(--primary)' }} />;
}

/* ---------- header pieces ---------- */
const WEATHER_ICON: Record<WeatherKind, LucideIcon> = { clear: Sun, partly: CloudSun, cloudy: Cloud, fog: CloudFog, rain: CloudRain, storm: CloudLightning, snow: Snowflake };
function WeatherChip({ lang }: { lang: Lang }) {
  const { data } = useQuery(weatherOptions);
  if (!data) return null;
  const I = WEATHER_ICON[data.kind];
  return <div className="hidden xl:flex items-center gap-2 leading-tight" title={WEATHER_CITY.names[lang]}><I size={30} className="text-yellow-200" aria-hidden /><div><strong className="block text-lg">{data.temp}°C</strong><span className="text-[11px] opacity-90">{WEATHER_CITY.names[lang]}</span></div></div>;
}

function Ticker({ lang }: { lang: Lang }) {
  const { data } = useSuspenseQuery(publicNewsOptions); const t = dictionary[lang]; const track = useRef<HTMLDivElement>(null);
  const tl = (te: string, en: string) => (lang === 'te' ? te || en : en || te);
  const items: TickerItem[] = [
    ...data.articles.filter((a) => a.lang === lang).map((a) => ({ id: a.id, title: a.title, kind: 'story' as const, slug: a.slug, lang, at: a.published_at || a.created_at })),
    ...data.videos.filter((v) => v.show_in_ticker).map((v) => ({ id: v.id, title: tl(v.title_te, v.title_en), kind: 'video' as const, slug: v.slug, lang, at: v.published_at || v.created_at })),
    ...data.posts.map((p) => ({ id: p.id, title: tl(p.title_te, p.title_en), kind: 'post' as const, slug: p.slug, lang, at: p.published_at || p.created_at })),
  ];
  const ticker = buildTicker(items, lang, Number(data.settings?.ticker_count) || 5);
  const breaking = data.articles.some((a) => a.lang === lang && a.is_breaking && Date.now() - new Date(a.published_at || '').getTime() < 48 * 3600000);
  if (!ticker.length) return null;
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.7, behavior: 'smooth' });
  return <div className="breaking-bar"><div className="news-wrap flex h-12 items-center gap-4">
    <strong className="flex shrink-0 items-center gap-2 text-sm font-extrabold tracking-wide"><Zap size={18} fill="currentColor" aria-hidden /><span className="hidden sm:inline">{breaking ? ht('breakingNews', lang) : ht('latestNews', lang)}:</span><span className="sm:hidden">{breaking ? t.breaking : ht('tickerLatest', lang)}</span></strong>
    <span className="h-6 w-px bg-white/50" aria-hidden />
    <div ref={track} className="ticker-track flex min-w-0 flex-1 items-center gap-5 overflow-x-auto whitespace-nowrap" aria-live="polite">
      {ticker.map((x, i) => <span key={x.id} className="flex items-center gap-5">{i > 0 && <span className="h-5 w-px bg-white/50" aria-hidden />}
        {x.kind === 'story' ? <Link to="/$lang/news/$slug" params={{ lang, slug: x.slug }} className="text-sm font-semibold hover:underline">{x.title}</Link>
          : x.kind === 'video' ? <Link to="/$lang/videos/$slug" params={{ lang, slug: x.slug }} search={{ play: 1 }} className="flex items-center gap-1.5 text-sm font-semibold hover:underline"><Play size={13} fill="currentColor" aria-hidden />{x.title}</Link>
            : <Link to="/$lang/blog/$slug" params={{ lang, slug: x.slug }} className="text-sm font-semibold hover:underline">{x.title}</Link>}</span>)}
    </div>
    <div className="flex shrink-0 gap-1"><button type="button" onClick={() => scroll(-1)} className="rounded-full p-1.5 hover:bg-white/15" aria-label={ht('previous', lang)}><ChevronLeft size={20} /></button><button type="button" onClick={() => scroll(1)} className="rounded-full p-1.5 hover:bg-white/15" aria-label={ht('next', lang)}><ChevronRight size={20} /></button></div>
  </div></div>;
}

export function PublicShell({ lang = 'en', children }: { lang?: Lang; children: ReactNode }) {
  const { data } = useSuspenseQuery(publicNewsOptions); const t = dictionary[lang]; const [menu, setMenu] = useState(false); const [q, setQ] = useState(''); const navigate = useNavigate();
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const s = data.settings; const live = s?.youtube ? `${s.youtube.replace(/\/+$/, '')}/live` : '';
  const search = (e: React.FormEvent) => { e.preventDefault(); setMenu(false); navigate({ to: '/$lang/search', params: { lang }, search: { q } }); };
  const more = [
    { to: '/$lang/videos' as const, label: t.videos }, { to: '/$lang/blog' as const, label: ht('blogs', lang) }, { to: '/$lang/data' as const, label: ht('data', lang) },
    { to: '/$lang/followed' as const, label: ht('followed', lang) }, { to: '/$lang/raise-issue' as const, label: ht('raise', lang) }, { to: '/$lang/track' as const, label: ht('track', lang) },
  ];
  const langSwitch = <div className="flex items-center rounded-full bg-white/15 p-1">{visibleLangs(!!s?.hindi_enabled).map((l) => <Link key={l} to={homePath(l)} onClick={() => { try { localStorage.setItem('tak-language', l); } catch { /* storage blocked */ } setMenu(false); }} className={`rounded-full px-3 py-1.5 text-xs font-bold ${lang === l ? 'bg-white text-primary-dark' : 'text-white hover:bg-white/15'}`}>{langLabel[l]}</Link>)}</div>;
  return <>
    <header className="news-header">
      <div className="news-wrap flex items-center gap-4 py-2 lg:gap-5">
        <Link to={homePath(lang)} className="shrink-0" aria-label={s?.site_name || 'TAK TV India'}><img src="/apple-touch-icon.png" alt={s?.site_name || 'TAK TV India'} width="84" height="84" className="h-14 w-14 rounded-lg sm:h-[84px] sm:w-[84px]" /></Link>
        <span className="divider hidden lg:block" aria-hidden />
        <nav aria-label="Main" className="top-nav hidden items-center gap-1 lg:flex">
          <Link to={homePath(lang)} activeOptions={{ exact: true }} activeProps={{ className: 'active' }}><Home size={20} />{t.home}</Link>
          {live && <a href={live} target="_blank" rel="noopener noreferrer"><Tv size={20} />{ht('liveTv', lang)}</a>}
          <div><DropdownMenu modal={false}><DropdownMenuTrigger asChild><button type="button"><LayoutGrid size={20} />{ht('categories', lang)}<ChevronDown size={16} /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="grid max-h-[70vh] w-[min(720px,90vw)] grid-cols-2 gap-1 overflow-y-auto p-3 md:grid-cols-3">
              {data.categories.map((c) => <DropdownMenuItem key={c.id} asChild><Link to="/$lang/category/$categoryId" params={{ lang, categoryId: c.id }} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm"><CategoryIcon c={c} size={18} />{categoryName(c, lang)}</Link></DropdownMenuItem>)}
            </DropdownMenuContent></DropdownMenu></div>
          <Link to="/about" activeProps={{ className: 'active' }}><Info size={20} />{t.about}</Link>
          <Link to="/contact" activeProps={{ className: 'active' }}><Mail size={20} />{t.contact}</Link>
          <div><DropdownMenu modal={false}><DropdownMenuTrigger asChild><button type="button" aria-label={ht('more', lang)}><Ellipsis size={20} />{ht('more', lang)}<ChevronDown size={16} /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2">{more.map((m) => <DropdownMenuItem key={m.to} asChild><Link to={m.to} params={{ lang }} className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium">{m.label}</Link></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
        </nav>
        <div className="ml-auto flex items-center gap-3 lg:gap-4">
          <form onSubmit={search} className="header-pill hidden items-center overflow-hidden md:flex" role="search"><input aria-label={t.search} placeholder={t.searchph} value={q} onChange={(e) => setQ(e.target.value)} className="w-40 min-w-0 bg-transparent px-5 py-2.5 text-sm outline-none xl:w-56" /><button type="submit" className="px-4 py-2.5" aria-label={t.search}><Search size={20} /></button></form>
          <WeatherChip lang={lang} />
          <div className="hidden sm:block">{langSwitch}</div>
          <Link to="/admin" className="flex items-center gap-2 rounded-full border-2 border-white/80 px-2.5 py-1.5 text-sm font-bold hover:bg-white hover:text-primary-dark sm:px-4" aria-label={ht('admin', lang)}><UserRound size={20} /><span className="hidden sm:inline">{ht('admin', lang)}</span></Link>
          <button type="button" className="rounded-lg p-2 hover:bg-white/15 lg:hidden" aria-label={menu ? 'Close menu' : t.menu} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
        </div>
      </div>
      {menu && <div className="border-t border-white/20 bg-primary-dark lg:hidden"><div className="news-wrap grid gap-4 py-4">
        <form onSubmit={search} className="header-pill flex items-center overflow-hidden md:hidden" role="search"><input aria-label={t.search} placeholder={t.searchph} value={q} onChange={(e) => setQ(e.target.value)} className="min-w-0 flex-1 bg-transparent px-5 py-2.5 text-sm outline-none" /><button type="submit" className="px-4" aria-label={t.search}><Search size={20} /></button></form>
        <div className="sm:hidden">{langSwitch}</div>
        <nav aria-label="Main" className="grid grid-cols-2 gap-1 text-sm font-semibold">
          <Link to={homePath(lang)} onClick={() => setMenu(false)} className="rounded-lg px-3 py-2 hover:bg-white/15">{t.home}</Link>
          {live && <a href={live} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-2 hover:bg-white/15">{ht('liveTv', lang)}</a>}
          {more.map((m) => <Link key={m.to} to={m.to} params={{ lang }} onClick={() => setMenu(false)} className="rounded-lg px-3 py-2 hover:bg-white/15">{m.label}</Link>)}
          <Link to="/about" onClick={() => setMenu(false)} className="rounded-lg px-3 py-2 hover:bg-white/15">{t.about}</Link>
          <Link to="/contact" onClick={() => setMenu(false)} className="rounded-lg px-3 py-2 hover:bg-white/15">{t.contact}</Link>
        </nav>
        <p className="text-xs font-bold uppercase opacity-80">{ht('categories', lang)}</p>
        <div className="grid grid-cols-2 gap-1 text-sm">{data.categories.map((c) => <Link key={c.id} to="/$lang/category/$categoryId" params={{ lang, categoryId: c.id }} onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-foreground"><CategoryIcon c={c} size={16} /><span className="truncate">{categoryName(c, lang)}</span></Link>)}</div>
      </div></div>}
    </header>
    <Ticker lang={lang} />
    {children}
    <footer className="mt-12 bg-secondary text-secondary-foreground"><div className="news-wrap py-10"><div className="grid gap-10 md:grid-cols-[1.1fr_1.4fr_1fr]">
      <div><Link to={homePath(lang)} className="inline-flex items-center gap-3"><img src="/apple-touch-icon.png" alt="" className="h-16 w-16 rounded-lg" /><div><strong className="block text-xl">{s?.site_name || 'TAK TV India'}</strong><small className="text-secondary-foreground/70">{String((s?.taglines as Record<string, string>)?.[lang] || t.tagline)}</small></div></Link>
        {s?.email && <p className="mt-5 text-sm"><a href={`mailto:${s.email}`}>{s.email}</a></p>}{s?.phone && <p className="text-sm"><a href={`tel:${s.phone}`}>{s.phone}</a></p>}
        <div className="mt-5 flex gap-4 text-xs">{(['youtube', 'facebook', 'x', 'instagram', 'whatsapp'] as const).filter((k) => s?.[k]).map((k) => <a key={k} href={s?.[k]} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-primary">{k}</a>)}</div></div>
      <div><h3 className="mb-4 font-semibold">{ht('categories', lang)}</h3><div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs text-secondary-foreground/70">{data.categories.map((c) => <Link key={c.id} to="/$lang/category/$categoryId" params={{ lang, categoryId: c.id }} className="hover:text-primary">{categoryName(c, lang)}</Link>)}</div></div>
      <div><h3 className="mb-4 font-semibold">{s?.site_name || 'TAK TV India'}</h3><div className="flex flex-col gap-2 text-sm text-secondary-foreground/70">
        <Link to="/$lang/raise-issue" params={{ lang }} className="font-semibold text-primary">{ht('raise', lang)}</Link><Link to="/$lang/track" params={{ lang }}>{ht('track', lang)}</Link>
        <Link to="/about">{t.about}</Link><Link to="/contact">{t.contact}</Link><Link to="/privacy">{t.privacy}</Link><Link to="/terms">{t.terms}</Link><Link to="/editorial-policy">{ht('editorial', lang)}</Link><Link to="/corrections">{ht('corrections', lang)}</Link><a href={`/feed/${lang}.xml`}>RSS</a></div></div>
    </div><div className="mt-9 flex flex-wrap justify-between gap-2 border-t border-secondary-foreground/15 pt-5 text-xs text-secondary-foreground/60"><span>© {new Date().getFullYear()} {s?.site_name || 'TAK TV India'}. {t.allrights}</span><span>{t.tagline}</span></div></div></footer>
  </>;
}

/* ---------- left category sidebar (as in the design) ---------- */
export function CategorySidebar({ lang, active }: { lang: Lang; active?: string | null }) {
  const { data } = useSuspenseQuery(publicNewsOptions); const [all, setAll] = useState(false);
  const activeIndex = data.categories.findIndex((c) => c.id === active);
  const shown = all || activeIndex >= 8 ? data.categories : data.categories.slice(0, 8);
  return <aside className="hidden lg:block"><nav aria-label={ht('categories', lang)} className="cat-side sticky top-[124px] rounded-2xl bg-card p-3 shadow-[var(--news-shadow)]">
    <Link to={homePath(lang)} className={!active ? 'active' : ''}><Home size={20} aria-hidden className="text-primary" />{ht('allNews', lang)}</Link>
    {shown.map((c) => <Link key={c.id} to="/$lang/category/$categoryId" params={{ lang, categoryId: c.id }} className={c.id === active ? 'active' : ''}><CategoryIcon c={c} /><span className="flex-1 truncate">{categoryName(c, lang)}</span><ChevronRight size={16} className="opacity-50" aria-hidden /></Link>)}
    {data.categories.length > 8 && activeIndex < 8 && <button type="button" onClick={() => setAll(!all)} className="mt-1 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-semibold hover:bg-accent"><LayoutGrid size={20} className="text-secondary" aria-hidden />{all ? ht('fewerCats', lang) : ht('moreCats', lang)}</button>}
  </nav></aside>;
}
function NewsLayout({ lang, active, children }: { lang: Lang; active?: string | null; children: ReactNode }) {
  return <main className="news-wrap grid gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]"><CategorySidebar lang={lang} active={active ?? null} /><div className="min-w-0">{children}</div></main>;
}

export function EmptyNews({ lang, search = false }: { lang: Lang; search?: boolean }) { return <div className="news-empty"><div className="rounded-full bg-muted p-5"><Newspaper size={34} strokeWidth={1.2} /></div><p className="text-sm">{search ? dictionary[lang].noresults : dictionary[lang].nonews}</p></div>; }

export function NewsCard({ a, lang, lead = false, row = false }: { a: Article; lang: Lang; lead?: boolean; row?: boolean }) {
  const { data } = useSuspenseQuery(publicNewsOptions); const cat = data.categories.find((c) => c.id === a.category_id);
  return <Link to="/$lang/news/$slug" params={{ lang, slug: a.slug }} className={`news-card ${row ? 'flex gap-3 border-b border-border p-3 !rounded-none !shadow-none' : 'block'}`}>
    <div className={`relative bg-muted ${row ? 'h-24 w-24 shrink-0 overflow-hidden rounded-md' : lead ? 'aspect-video' : 'aspect-[16/10]'}`}>
      {a.cover_url ? <img src={a.cover_url} alt={a.cover_alt} className="h-full w-full object-cover" loading={lead ? 'eager' : 'lazy'} /> : <Newspaper className="absolute inset-0 m-auto text-muted-foreground" size={35} />}
      {a.youtube_id && <span className="absolute bottom-3 right-3 rounded-full bg-primary p-3 text-primary-foreground"><Play size={15} fill="currentColor" /></span>}
    </div>
    <div className={row ? 'min-w-0' : 'p-5'}><p className="text-[10px] font-bold uppercase text-primary-dark">{categoryName(cat, lang)}</p>
      <h3 className={`${lead ? 'headline-serif text-2xl sm:text-3xl' : 'text-base font-bold'} mt-2 line-clamp-3 leading-snug`}>{a.title}</h3>
      {lead && <p className="mt-3 text-sm text-muted-foreground">{a.summary}</p>}
      <time className="mt-3 block text-[11px] text-muted-foreground">{newsDate(a.published_at || a.created_at, lang)}</time></div>
  </Link>;
}

export function HomePage({ lang = 'en', extra }: { lang?: Lang; extra?: ReactNode }) {
  const { data } = useSuspenseQuery(publicNewsOptions); const t = dictionary[lang];
  const articles = data.articles.filter((a) => a.lang === lang);
  const lead = articles.slice(0, 30).find((a) => a.is_featured) || articles[0];
  const top = articles.filter((a) => a.id !== lead?.id).slice(0, 4);
  const latest = articles.filter((a) => a.id !== lead?.id && !top.some((x) => x.id === a.id)).slice(0, 12);
  return <PublicShell lang={lang}>
    <NewsLayout lang={lang}>
      <div className="flex items-end justify-between border-b border-border pb-4"><h1 className="headline-serif text-2xl sm:text-3xl">{t.latest}</h1><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{lang === 'en' ? 'ENGLISH EDITION' : lang === 'hi' ? 'हिन्दी संस्करण' : 'తెలుగు ఎడిషన్'}</span></div>
      {lead ? <><section className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]"><NewsCard a={lead as Article} lang={lang} lead /><aside className="rounded-xl bg-card p-5 shadow-[var(--news-shadow)]"><h2 className="section-heading mb-3 !text-lg">{t.top}</h2>{top.map((a) => <NewsCard key={a.id} a={a as Article} lang={lang} row />)}</aside></section>
        {latest.length > 0 && <section className="mt-9"><h2 className="section-heading mb-5">{t.latest}</h2><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{latest.map((a) => <NewsCard key={a.id} a={a as Article} lang={lang} />)}</div></section>}</>
        : <div className="mt-6"><EmptyNews lang={lang} /></div>}
      <section className="mb-2 mt-8 lg:hidden"><h2 className="section-heading mb-5">{ht('categories', lang)}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{data.categories.map((c) => <Link key={c.id} to="/$lang/category/$categoryId" params={{ lang, categoryId: c.id }} className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold hover:border-primary"><CategoryIcon c={c} size={18} /><span className="min-w-0 flex-1 break-words">{categoryName(c, lang)}</span><ArrowUpRight size={15} className="text-muted-foreground" /></Link>)}</div></section>
    </NewsLayout>
    {extra}
    {!data.videos.length && articles.some((a) => a.youtube_id) && <section className="mt-10 bg-secondary py-8 text-secondary-foreground"><div className="news-wrap"><Link to="/$lang/videos" params={{ lang }} className="flex justify-between"><h2 className="section-heading"><Play className="mr-2 inline" />{t.videos}</h2><ArrowRight /></Link><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{articles.filter((a) => a.youtube_id).slice(0, 4).map((a) => <NewsCard key={a.id} a={a as Article} lang={lang} />)}</div></div></section>}
    {data.categories.filter((c) => articles.some((a) => a.category_id === c.id)).slice(0, 6).map((c) => <section key={c.id} className="news-wrap pt-8"><Link to="/$lang/category/$categoryId" params={{ lang, categoryId: c.id }}><h2 className="section-heading mb-5 flex items-center gap-2"><CategoryIcon c={c} size={22} />{categoryName(c, lang)} ›</h2></Link><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{articles.filter((a) => a.category_id === c.id).slice(0, 4).map((a) => <NewsCard key={a.id} a={a as Article} lang={lang} />)}</div></section>)}
  </PublicShell>;
}

export function ListingPage({ lang, categoryId, videos = false, q, extra }: { lang: Lang; categoryId?: string; videos?: boolean; q?: string; extra?: ReactNode }) {
  const { data } = useSuspenseQuery(publicNewsOptions); const [count, setCount] = useState(12); const t = dictionary[lang];
  const words = (q || '').toLowerCase().split(/\s+/).filter(Boolean); const cat = data.categories.find((c) => c.id === categoryId);
  const list = data.articles.filter((a) => a.lang === lang && (!categoryId || a.category_id === categoryId) && (!videos || a.youtube_id) && (q === undefined || words.every((w) => `${a.title} ${a.summary} ${a.tags.join(' ')}`.toLowerCase().includes(w)))).slice(0, 60);
  const title = q !== undefined ? `${t.search}${q ? ` — ${q}` : ''}` : videos ? t.videos : categoryName(cat, lang);
  return <PublicShell lang={lang}><NewsLayout lang={lang} active={categoryId ?? null}><div className="min-h-[420px]">
    <div className="mb-4 text-xs text-muted-foreground"><Link to={homePath(lang)}>{t.home}</Link> / {title}</div>
    <h1 className="headline-serif mb-7 flex items-center gap-3 text-3xl">{cat && <CategoryIcon c={cat} size={30} />}{title}</h1>
    {list.length ? <><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{list.slice(0, count).map((a) => <NewsCard key={a.id} a={a as Article} lang={lang} />)}</div>{count < list.length && <div className="mt-8 text-center"><Button onClick={() => setCount(count + 12)}>{t.more}</Button></div>}</> : <EmptyNews lang={lang} search={q !== undefined} />}
    {extra}
  </div></NewsLayout></PublicShell>;
}

/* ---------- story page (layout from the design) ---------- */
const WEEKDAYS: Record<Lang, string[]> = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'], te: ['ఆదివారం', 'సోమవారం', 'మంగళవారం', 'బుధవారం', 'గురువారం', 'శుక్రవారం', 'శనివారం'] };
/** "27 Oct 2025, Monday" in India time. */
export function storyDate(iso: string, lang: Lang) { const d = new Date(new Date(iso).getTime() + 330 * 60000); return `${newsDate(iso, lang).split(',')[0]}, ${WEEKDAYS[lang][d.getUTCDay()]}`; }
const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
/** Takes the first quotation in the story out of the body so it can be shown as a highlighted quote under the media. */
export function splitQuote(html: string): { body: string; quote: { text: string; by: string } | null } {
  const m = html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
  if (!m) return { body: html, quote: null };
  const parts = [...m[1]!.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((p) => plain(p[1]!)).filter(Boolean);
  const lines = parts.length ? parts : [plain(m[1]!)];
  const last = lines[lines.length - 1] || '';
  const by = lines.length > 1 && /^[—–-]\s*/.test(last) ? last.replace(/^[—–-]\s*/, '') : '';
  const text = (by ? lines.slice(0, -1) : lines).join(' ');
  return text ? { body: html.replace(m[0], ''), quote: { text, by } } : { body: html, quote: null };
}
/** Puts the dateline ("New Delhi:") in bold at the start of the first paragraph, like a print story. */
export function withDateline(html: string, location: string) {
  if (!location.trim()) return html;
  return /<p[^>]*>/i.test(html) ? html.replace(/<p([^>]*)>/i, `<p$1><strong>${esc(location.trim())}:</strong> `) : `<p><strong>${esc(location.trim())}:</strong></p>${html}`;
}

export function StoryPage({ lang, slug, previewArticle, initial }: { lang: Lang; slug: string; previewArticle?: Article; initial?: Awaited<ReturnType<NonNullable<ReturnType<typeof publicStoryOptions>['queryFn']>>> | undefined }) {
  // `initial` is the story the server already loaded for this page, so the first browser render matches the server HTML.
  const { data } = useSuspenseQuery(publicNewsOptions); const story = useQuery({ ...publicStoryOptions(lang, slug), enabled: !previewArticle, ...(initial !== undefined ? { initialData: initial } : {}) });
  const a = previewArticle || (story.data as Article | null | undefined) || undefined;
  const [copied, setCopied] = useState(false); const t = dictionary[lang]; const navigate = useNavigate();
  const redir = data.redirects.find((r) => r.lang === lang && r.old_slug === slug);
  useEffect(() => { if (redir) navigate({ to: '/$lang/news/$slug', params: { lang, slug: redir.new_slug }, replace: true }); }, [redir, navigate, lang]);
  if (!a && !previewArticle && story.isPending) return <PublicShell lang={lang}><main className="news-wrap min-h-[450px]" aria-busy="true" /></PublicShell>;
  if (!a) return <PublicShell lang={lang}><main className="news-wrap flex min-h-[450px] flex-col items-center justify-center"><h1 className="text-2xl font-bold">{data.removed.some((r) => r.lang === lang && r.slug === slug) ? 'This story has been removed' : 'Story not found'}</h1><Button asChild variant="link" className="mt-4"><Link to={homePath(lang)}>{t.home}<ArrowRight /></Link></Button></main></PublicShell>;
  const cat = data.categories.find((c) => c.id === a.category_id);
  const { body, quote } = splitQuote(a.body_html);
  const list = data.articles.filter((x) => x.lang === lang); const idx = list.findIndex((x) => x.id === a.id);
  const newer = idx > 0 ? list[idx - 1] : undefined; const older = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined;
  const hasMedia = !!(a.youtube_id || a.cover_url);
  const share = (name: string) => { const u = encodeURIComponent(window.location.href); window.open(name === 'WhatsApp' ? `https://wa.me/?text=${encodeURIComponent(a.title)}%20${u}` : name === 'Facebook' ? `https://www.facebook.com/sharer/sharer.php?u=${u}` : `https://twitter.com/intent/tweet?url=${u}`, '_blank', 'noopener,noreferrer'); };
  const labels = { play: ht('play', lang), watch: ht('watchYt', lang), unavailable: ht('ytUnavailable', lang) };
  return <PublicShell lang={lang}><NewsLayout lang={lang} active={a.category_id}>
    <article className="rounded-2xl bg-card p-4 shadow-[var(--news-shadow)] sm:p-6">
      <div className={hasMedia ? 'grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]' : ''}>
        {hasMedia && <div className="min-w-0 space-y-4 lg:sticky lg:top-[124px] lg:self-start">
          {a.youtube_id ? <YouTubePlayer id={a.youtube_id} title={a.title} labels={labels} /> : <figure><img src={a.cover_url} alt={a.cover_alt} className="aspect-video w-full rounded-xl object-cover" /><figcaption className="mt-2 text-xs text-muted-foreground">{[a.cover_alt, a.cover_credit].filter(Boolean).join(' — ')}</figcaption></figure>}
          {quote && <blockquote className="quote-card flex gap-4 p-5"><Quote size={40} className="shrink-0 rotate-180 text-primary" fill="currentColor" aria-hidden /><div><p className="headline-serif text-lg font-normal italic leading-relaxed">{quote.text}</p>{quote.by && <footer className="mt-2 text-right text-sm font-semibold text-primary-dark">— {quote.by}</footer>}</div></blockquote>}
        </div>}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 text-sm">{cat && <Link to="/$lang/category/$categoryId" params={{ lang, categoryId: cat.id }} className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground"><CategoryIcon c={{ ...cat, colour: 'currentColor' }} size={15} />{categoryName(cat, lang)}</Link>}<span className="h-4 w-px bg-border" aria-hidden /><time className="font-medium text-muted-foreground">{storyDate(a.published_at || a.created_at, lang)}</time></div>
          <h1 className="headline-serif mt-4 text-3xl leading-tight sm:text-[2.6rem]">{a.title}</h1>
          <hr className="rule-orange my-5" />
          {a.summary && <><p className="headline-serif text-lg font-normal leading-relaxed text-foreground/80">{a.summary}</p><hr className="rule-orange my-5" /></>}
          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span>{t.by} <strong className="text-foreground">{a.reporter_name || data.settings?.site_name}</strong></span>{a.published_at && new Date(a.updated_at).getTime() - new Date(a.published_at).getTime() > 3600000 && <span>{t.updated}: {newsDate(a.updated_at, lang)}</span>}
            <span className="ml-auto flex flex-wrap gap-2">{['WhatsApp', 'Facebook', 'X'].map((n) => <Button key={n} variant="outline" size="sm" className="h-8" onClick={() => share(n)}>{n}</Button>)}<Button variant="outline" size="sm" className="h-8" onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check /> : <Copy />}{copied ? t.copied : 'Copy link'}</Button></span></div>
          <div className="story-body headline-serif !font-normal" dangerouslySetInnerHTML={{ __html: withDateline(body, a.location || '') }} />
          {a.tags.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{a.tags.map((tag) => <span className="rounded-full bg-muted px-3 py-1 text-xs" key={tag}>{tag}</span>)}</div>}
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button asChild variant="outline" className="h-11 rounded-full px-5"><Link to={cat ? '/$lang/category/$categoryId' : homePath(lang)} params={cat ? { lang, categoryId: cat.id } : {}}><ArrowLeft />{ht('backToNews', lang)}</Link></Button>
        {idx >= 0 && <div className="ml-auto flex items-center gap-3">
          {newer ? <Button asChild variant="outline" className="h-11 rounded-full px-5"><Link to="/$lang/news/$slug" params={{ lang, slug: newer.slug }}><ChevronLeft />{ht('previous', lang)}</Link></Button> : <Button variant="outline" className="h-11 rounded-full px-5" disabled><ChevronLeft />{ht('previous', lang)}</Button>}
          <span className="min-w-14 text-center text-lg font-semibold tabular-nums">{idx + 1} / {list.length}</span>
          {older ? <Button asChild className="h-11 rounded-full px-6"><Link to="/$lang/news/$slug" params={{ lang, slug: older.slug }}>{ht('next', lang)}<ArrowRight /></Link></Button> : <Button className="h-11 rounded-full px-6" disabled>{ht('next', lang)}<ArrowRight /></Button>}
        </div>}
      </div>
    </article>
    {data.articles.some((x) => x.lang === lang && x.category_id === a.category_id && x.id !== a.id) && <section className="mt-8"><h2 className="section-heading mb-5">{t.related}</h2><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.articles.filter((x) => x.lang === lang && x.category_id === a.category_id && x.id !== a.id).slice(0, 6).map((x) => <NewsCard key={x.id} a={x as Article} lang={lang} />)}</div></section>}
  </NewsLayout></PublicShell>;
}

export function StaticPage({ id }: { id: string }) {
  const { data } = useSuspenseQuery(publicNewsOptions); const p = data.pages.find((x) => x.id === id); const s = data.settings;
  return <PublicShell><main className="news-wrap min-h-[440px] py-10"><div className="mx-auto max-w-[860px] rounded-2xl bg-card p-6 shadow-[var(--news-shadow)] sm:p-10"><h1 className="headline-serif mb-7 text-3xl">{p?.title || id}</h1><div className="story-body" dangerouslySetInnerHTML={{ __html: p?.body_html || '' }} />
    {id === 'contact' && <div className="mt-6">{s?.email && <p>Email: <a href={`mailto:${s.email}`} className="text-primary">{s.email}</a></p>}{s?.phone && <p>Phone: <a href={`tel:${s.phone}`}>{s.phone}</a></p>}{s?.address && <p>{s.address}</p>}</div>}</div></main></PublicShell>;
}
