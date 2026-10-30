import { createFileRoute } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { HomePage } from '@/components/news/public-site';
import { HomeHub } from '@/components/news/hub-public';
import { meta, dictionary, siteOrigin, absUrl, sectionHreflangs } from '@/lib/news';
export const Route = createFileRoute('/te')({ loader: ({ context }) => context.queryClient.ensureQueryData(publicNewsOptions),
  head: ({ loaderData }) => { const o = siteOrigin(loaderData?.settings); return meta(dictionary.te.latest, dictionary.te.tagline, false, { canonical: o ? absUrl(o, '/te') : undefined, alternates: sectionHreflangs(o, !!loaderData?.settings?.hindi_enabled, (l) => (l === 'en' ? '/' : `/${l}`)) }); }, component: () => <HomePage lang="te" extra={<HomeHub lang="te" />} /> });
