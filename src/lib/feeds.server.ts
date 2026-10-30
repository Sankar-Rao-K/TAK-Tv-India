import { isPublic, type Lang } from './news';
import { publicDb } from './public-db';
import { buildNewsSitemap, buildRobots, buildRss, buildSitemap, plain, type FeedInput } from './feeds';

const live = (x: { status: string; published_at: string | null; publish_at: string | null }) => x.status === 'published' || (x.status === 'scheduled' && !!x.publish_at && new Date(x.publish_at).getTime() <= Date.now());

/** Loads only what visitors may see (public key + row security) and shapes it for the feed builders. */
async function load(request: Request): Promise<FeedInput> {
  const db = publicDb();
  const [a, c, s, v, p] = await Promise.all([
    db.from('articles').select('lang,title,slug,summary,status,published_at,publish_at,updated_at').order('published_at', { ascending: false }).limit(5000),
    db.from('categories').select('id').order('sort_order'),
    db.from('settings').select('site_url,site_name,hindi_enabled').single(),
    db.from('videos').select('slug,title_te,title_en,description_te,description_en,status,published_at,publish_at,created_at,updated_at').order('published_at', { ascending: false, nullsFirst: true }).limit(5000),
    db.from('posts').select('slug,title_te,title_en,seo_description,body_te,body_en,status,published_at,publish_at,created_at,updated_at').order('published_at', { ascending: false, nullsFirst: true }).limit(5000),
  ]);
  return {
    origin: s.data?.site_url || new URL(request.url).origin,
    siteName: s.data?.site_name || 'TAK TV India',
    hindi: !!s.data?.hindi_enabled,
    categories: (c.data || []).map((x) => x.id),
    stories: (a.data || []).filter((x) => isPublic(x)).map((x) => ({ lang: x.lang, title: x.title, slug: x.slug, summary: x.summary, published: x.published_at || x.publish_at || x.updated_at, updated: x.updated_at })),
    videos: (v.data || []).filter(live).map((x) => ({ slug: x.slug, title_te: x.title_te, title_en: x.title_en, text_te: x.description_te.slice(0, 500), text_en: x.description_en.slice(0, 500), published: x.published_at || x.publish_at || x.created_at, updated: x.updated_at })),
    posts: (p.data || []).filter(live).map((x) => ({ slug: x.slug, title_te: x.title_te, title_en: x.title_en, text_te: x.seo_description || plain(x.body_te).slice(0, 300), text_en: x.seo_description || plain(x.body_en).slice(0, 300), published: x.published_at || x.publish_at || x.created_at, updated: x.updated_at })),
  };
}

export async function serveFeed(request: Request, kind: 'sitemap' | 'news' | 'rss' | 'robots', lang = 'en') {
  let data: FeedInput;
  try { data = await load(request); } catch { return new Response('Unavailable', { status: 503 }); }
  if (kind === 'robots') return new Response(buildRobots(data.origin), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  let body: string | null;
  if (kind === 'rss') body = ['en', 'hi', 'te'].includes(lang) ? buildRss(data, lang as Lang) : null;
  else if (kind === 'news') body = buildNewsSitemap(data);
  else body = buildSitemap(data);
  if (!body) return new Response('Not found', { status: 404 });
  return new Response(body, { headers: { 'Content-Type': kind === 'rss' ? 'application/rss+xml; charset=utf-8' : 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
