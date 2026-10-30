import { createFileRoute, notFound } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { DataPage } from '@/components/news/hub-public';
import { meta, ht, langAllowed, siteOrigin, absUrl, sectionHreflangs, type Lang } from '@/lib/news';
export const Route = createFileRoute('/$lang/data')({
  loader: async ({ context, params }) => { const d = await context.queryClient.ensureQueryData(publicNewsOptions); if (!langAllowed(params.lang, !!d.settings?.hindi_enabled)) throw notFound(); return d; },
  head: ({ loaderData, params }) => { const o = siteOrigin(loaderData?.settings); return meta(ht('dataLibrary', params.lang as Lang), ht('dataIntro', params.lang as Lang), false, { canonical: o ? absUrl(o, `/${params.lang}/data`) : undefined, alternates: sectionHreflangs(o, !!loaderData?.settings?.hindi_enabled, (l) => `/${l}/data`) }); },
  component: () => <DataPage lang={Route.useParams().lang as Lang} />,
});
