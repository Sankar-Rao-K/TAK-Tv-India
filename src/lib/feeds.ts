// Pure builders for sitemap.xml, news-sitemap.xml, RSS and robots.txt (no database access — easy to test).
import type { Lang } from './news';

export type FeedStory = { lang: string; title: string; slug: string; summary: string; published: string; updated: string };
export type FeedBilingual = { slug: string; title_te: string; title_en: string; text_te: string; text_en: string; published: string; updated: string };
export type FeedInput = { origin: string; siteName: string; hindi: boolean; categories: string[]; stories: FeedStory[]; videos: FeedBilingual[]; posts: FeedBilingual[] };

export const xml = (s: unknown) => String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] || c);
const iso = (d: string) => { const t = new Date(d); return Number.isNaN(t.getTime()) ? '' : t.toISOString(); };
const HREF: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };
export const feedLangs = (hindi: boolean): Lang[] => (hindi ? ['en', 'hi', 'te'] : ['en', 'te']);
const langsOf = (x: FeedBilingual): Lang[] => [...(x.title_en.trim() ? (['en'] as Lang[]) : []), ...(x.title_te.trim() ? (['te'] as Lang[]) : [])];

function url(origin: string, path: string, lastmod?: string, alternates: [Lang, string][] = []) {
  const alt = alternates.length > 1 ? alternates.map(([l, p]) => `<xhtml:link rel="alternate" hreflang="${HREF[l]}" href="${xml(origin + p)}"/>`).join('') : '';
  const lm = lastmod && iso(lastmod) ? `<lastmod>${iso(lastmod)}</lastmod>` : '';
  return `<url><loc>${xml(origin + path)}</loc>${lm}${alt}</url>`;
}

/** Every public page: home pages, sections, categories, policies, live stories, videos and posts. */
export function buildSitemap(d: FeedInput): string {
  const o = d.origin.replace(/\/$/, ''); const L = feedLangs(d.hindi); const home = (l: Lang) => (l === 'en' ? '/' : `/${l}`);
  const homeAlt = L.map((l) => [l, home(l)] as [Lang, string]);
  const parts: string[] = L.map((l) => url(o, home(l), undefined, homeAlt));
  for (const p of ['/about', '/contact', '/privacy', '/terms', '/editorial-policy', '/corrections']) parts.push(url(o, p));
  for (const section of ['videos', 'blog', 'data', 'followed', 'raise-issue']) { const alt = L.map((l) => [l, `/${l}/${section}`] as [Lang, string]); for (const l of L) parts.push(url(o, `/${l}/${section}`, undefined, alt)); }
  for (const c of d.categories) { const alt = L.map((l) => [l, `/${l}/category/${c}`] as [Lang, string]); for (const l of L) parts.push(url(o, `/${l}/category/${c}`, undefined, alt)); }
  for (const s of d.stories) if (L.includes(s.lang as Lang)) parts.push(url(o, `/${s.lang}/news/${s.slug}`, s.updated));
  for (const [kind, list] of [['videos', d.videos], ['blog', d.posts]] as const) for (const x of list) {
    const ls = langsOf(x); const alt = ls.map((l) => [l, `/${l}/${kind}/${x.slug}`] as [Lang, string]);
    for (const l of ls) parts.push(url(o, `/${l}/${kind}/${x.slug}`, x.updated, alt));
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${parts.join('')}</urlset>`;
}

/** Google News sitemap: stories published in the last 48 hours only. */
export function buildNewsSitemap(d: FeedInput, now = Date.now()): string {
  const o = d.origin.replace(/\/$/, ''); const L = feedLangs(d.hindi);
  const items = d.stories.filter((s) => L.includes(s.lang as Lang) && now - new Date(s.published).getTime() <= 48 * 3600000 && new Date(s.published).getTime() <= now);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items.map((a) => `<url><loc>${xml(`${o}/${a.lang}/news/${a.slug}`)}</loc><news:news><news:publication><news:name>${xml(d.siteName)}</news:name><news:language>${a.lang}</news:language></news:publication><news:publication_date>${iso(a.published)}</news:publication_date><news:title>${xml(a.title)}</news:title></news:news></url>`).join('')}</urlset>`;
}

/** RSS for one language: stories in that language plus videos and posts that have a title in it. */
export function buildRss(d: FeedInput, lang: Lang, limit = 50): string | null {
  if (!feedLangs(d.hindi).includes(lang)) return null;
  const o = d.origin.replace(/\/$/, '');
  type Item = { title: string; link: string; description: string; at: string; category: string };
  const items: Item[] = d.stories.filter((s) => s.lang === lang).map((s) => ({ title: s.title, link: `${o}/${lang}/news/${s.slug}`, description: s.summary, at: s.published, category: 'News' }));
  const pickT = (x: FeedBilingual) => (lang === 'te' ? x.title_te : lang === 'en' ? x.title_en : '');
  const pickD = (x: FeedBilingual) => (lang === 'te' ? x.text_te : x.text_en);
  for (const v of d.videos) if (pickT(v).trim()) items.push({ title: pickT(v), link: `${o}/${lang}/videos/${v.slug}`, description: pickD(v), at: v.published, category: 'Video' });
  for (const p of d.posts) if (pickT(p).trim()) items.push({ title: pickT(p), link: `${o}/${lang}/blog/${p.slug}`, description: pickD(p), at: p.published, category: 'Blog' });
  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const top = items.slice(0, limit); const self = `${o}/feed/${lang}.xml`;
  const date = (s: string) => { const t = new Date(s); return Number.isNaN(t.getTime()) ? '' : t.toUTCString(); };
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(d.siteName)}</title><link>${xml(o + (lang === 'en' ? '/' : `/${lang}`))}</link><atom:link href="${xml(self)}" rel="self" type="application/rss+xml"/><description>${xml(d.siteName)} — news, videos and data stories</description><language>${lang}-IN</language>${top[0] ? `<lastBuildDate>${date(top[0].at)}</lastBuildDate>` : ''}${top.map((i) => `<item><title>${xml(i.title)}</title><link>${xml(i.link)}</link><guid isPermaLink="true">${xml(i.link)}</guid><category>${i.category}</category><description>${xml(i.description.slice(0, 500))}</description><pubDate>${date(i.at)}</pubDate></item>`).join('')}</channel></rss>`;
}

export function buildRobots(origin: string): string {
  const o = origin.replace(/\/$/, '');
  return ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /auth', 'Disallow: /reset-password', 'Disallow: /preview/', 'Disallow: /api/', 'Disallow: /en/search', 'Disallow: /hi/search', 'Disallow: /te/search', 'Disallow: /en/track', 'Disallow: /hi/track', 'Disallow: /te/track', '', `Sitemap: ${o}/sitemap.xml`, `Sitemap: ${o}/news-sitemap.xml`, ''].join('\n');
}

/** Plain text from stored HTML (for feed descriptions). */
export const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
