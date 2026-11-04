import { createFileRoute, notFound } from '@tanstack/react-router';
import { publicNewsOptions, publicPostOptions } from '@/lib/news.functions';
import { PostPage } from '@/components/news/hub-public';
import { meta, langAllowed, siteOrigin, absUrl, pick, ldBlog, ldBreadcrumb, ht, hreflangs, mediaUrl, type Lang } from '@/lib/news';
export const Route = createFileRoute('/$lang/blog_/$slug')({
  loader: async ({ context, params }) => { const d = await context.queryClient.ensureQueryData(publicNewsOptions); if (!langAllowed(params.lang, !!d.settings?.hindi_enabled)) throw notFound(); const post = await context.queryClient.ensureQueryData(publicPostOptions(params.slug)); return { settings: d.settings, post }; },
  head: ({ loaderData, params }) => {
    const lang = params.lang as Lang; const p = loaderData?.post; const o = siteOrigin(loaderData?.settings);
    if (!p) return meta('Post unavailable', 'This post is not available.', true);
    const title = p.seo_title || pick(p.title_te, p.title_en, lang); const text = (lang === 'te' ? p.body_te || p.body_en : p.body_en || p.body_te).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const desc = p.seo_description || text.slice(0, 155) || title; const url = o ? absUrl(o, `/${lang}/blog/${p.slug}`) : ''; const img = p.cover_path && o ? mediaUrl(p.cover_path, o) : p.cover_youtube_id ? `https://i.ytimg.com/vi/${p.cover_youtube_id}/hqdefault.jpg` : undefined;
    // hreflang only when the post really has both a Telugu and an English version.
    const alternates = p.title_te.trim() && p.title_en.trim() && p.body_te.replace(/<[^>]+>/g, '').trim() && p.body_en.replace(/<[^>]+>/g, '').trim() ? hreflangs(o, { en: `/en/blog/${p.slug}`, te: `/te/blog/${p.slug}` }) : [];
    return meta(title, desc, false, { canonical: url || undefined, image: img, type: 'article', alternates, ld: url ? [ldBlog({ url, headline: title, description: desc, image: img, published: p.published_at || p.created_at, modified: p.updated_at, siteName: loaderData?.settings?.site_name || 'TAK TV India', logo: absUrl(o, '/apple-touch-icon.png') }), ldBreadcrumb([{ name: 'Home', url: absUrl(o, '/') }, { name: ht('blogs', lang), url: absUrl(o, `/${lang}/blog`) }, { name: title, url }])] : [] });
  },
  component: () => { const p = Route.useParams(); const d = Route.useLoaderData(); return <PostPage key={p.slug} lang={p.lang as Lang} slug={p.slug} initial={d.post} />; },
});
