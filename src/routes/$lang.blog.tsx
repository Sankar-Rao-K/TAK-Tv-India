import { createFileRoute, notFound } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { PostsPage } from '@/components/news/hub-public';
import { meta, ht, langAllowed, siteOrigin, absUrl, sectionHreflangs, type Lang } from '@/lib/news';
export const Route = createFileRoute('/$lang/blog')({
  loader: async ({ context, params }) => { const d = await context.queryClient.ensureQueryData(publicNewsOptions); if (!langAllowed(params.lang, !!d.settings?.hindi_enabled)) throw notFound(); return d; },
  head: ({ loaderData, params }) => { const o = siteOrigin(loaderData?.settings); return meta(ht('blogs', params.lang as Lang), 'Blogs, photo stories and data stories from TAK TV India.', false, { canonical: o ? absUrl(o, `/${params.lang}/blog`) : undefined, alternates: sectionHreflangs(o, !!loaderData?.settings?.hindi_enabled, (l) => `/${l}/blog`) }); },
  component: () => <PostsPage lang={Route.useParams().lang as Lang} />,
});
