import { createFileRoute, notFound } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { VideoPage } from '@/components/news/hub-public';
import { isoDuration } from '@/lib/youtube';
import { meta, langAllowed, siteOrigin, absUrl, pick, ytThumb, ldVideo, ldBreadcrumb, ht, hreflangs, type Lang } from '@/lib/news';
export const Route = createFileRoute('/$lang/videos_/$slug')({
  // ?play=1 — the visitor clicked a video card: open with the player already running.
  validateSearch: (s: Record<string, unknown>): { play?: 1 } => (s['play'] === 1 || s['play'] === '1' ? { play: 1 } : {}),
  loader: async ({ context, params }) => { const d = await context.queryClient.ensureQueryData(publicNewsOptions); if (!langAllowed(params.lang, !!d.settings?.hindi_enabled)) throw notFound(); return d; },
  head: ({ loaderData, params }) => {
    const lang = params.lang as Lang; const v = loaderData?.videos.find((x) => x.slug === params.slug); const o = siteOrigin(loaderData?.settings);
    if (!v) return meta('Video unavailable', 'This video is not available.', true);
    const title = v.seo_title || pick(v.title_te, v.title_en, lang); const desc = v.seo_description || pick(v.description_te, v.description_en, lang).slice(0, 155) || title; const url = o ? absUrl(o, `/${lang}/videos/${v.slug}`) : '';
    const alternates = v.title_te.trim() && v.title_en.trim() ? hreflangs(o, { en: `/en/videos/${v.slug}`, te: `/te/videos/${v.slug}` }, v.language === 'te' ? 'te' : 'en') : [];
    return meta(title, desc, false, { canonical: url || undefined, image: ytThumb(v.youtube_id), type: 'video.other', alternates, ld: url ? [ldVideo({ url, name: title, description: desc, youtubeId: v.youtube_id, uploaded: v.yt_published_at || v.published_at || v.created_at, duration: isoDuration(v.duration_seconds), isShort: v.is_short }), ldBreadcrumb([{ name: 'Home', url: absUrl(o, '/') }, { name: ht('latestVideos', lang), url: absUrl(o, `/${lang}/videos`) }, { name: title, url }])] : [] });
  },
  component: () => { const p = Route.useParams(); const q = Route.useSearch(); return <VideoPage lang={p.lang as Lang} slug={p.slug} autoplay={q.play === 1} />; },
});
