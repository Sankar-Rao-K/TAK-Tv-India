import { createFileRoute, notFound } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { HomePage } from '@/components/news/public-site';
import { HomeHub } from '@/components/news/hub-public';
import { meta, dictionary, siteOrigin, absUrl, sectionHreflangs } from '@/lib/news';
// Hindi is switched off by default (Settings → Hindi). When off, this page is not available.
export const Route = createFileRoute('/hi')({ loader: async ({ context }) => { const d = await context.queryClient.ensureQueryData(publicNewsOptions); if (!d.settings?.hindi_enabled) throw notFound(); return d; },
  head: ({ loaderData }) => { const o = siteOrigin(loaderData?.settings); return meta(dictionary.hi.latest, dictionary.hi.tagline, false, { canonical: o ? absUrl(o, '/hi') : undefined, alternates: sectionHreflangs(o, !!loaderData?.settings?.hindi_enabled, (l) => (l === 'en' ? '/' : `/${l}`)) }); }, component: () => <HomePage lang="hi" extra={<HomeHub lang="hi" />} /> });
