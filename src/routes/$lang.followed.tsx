import { createFileRoute, notFound } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { FollowedPage } from '@/components/news/hub-public';
import { meta, ht, langAllowed, siteOrigin, absUrl, sectionHreflangs, type Lang } from '@/lib/news';
export const Route = createFileRoute('/$lang/followed')({
  loader: async ({ context, params }) => { const d = await context.queryClient.ensureQueryData(publicNewsOptions); if (!langAllowed(params.lang, !!d.settings?.hindi_enabled)) throw notFound(); return d; },
  head: ({ loaderData, params }) => { const o = siteOrigin(loaderData?.settings); return meta(ht('followed', params.lang as Lang), ht('followedIntro', params.lang as Lang), false, { canonical: o ? absUrl(o, `/${params.lang}/followed`) : undefined, alternates: sectionHreflangs(o, !!loaderData?.settings?.hindi_enabled, (l) => `/${l}/followed`) }); },
  component: () => <FollowedPage lang={Route.useParams().lang as Lang} />,
});
