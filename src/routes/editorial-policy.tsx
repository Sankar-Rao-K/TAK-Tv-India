import { createFileRoute } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { StaticPage } from '@/components/news/public-site';
import { meta, siteOrigin, absUrl } from '@/lib/news';
export const Route = createFileRoute('/editorial-policy')({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicNewsOptions),
  head: ({ loaderData }) => { const o = siteOrigin(loaderData?.settings); return meta('Editorial & Corrections Policy', 'How TAK TV India verifies, reports and corrects.', false, { canonical: o ? absUrl(o, '/editorial-policy') : undefined }); },
  component: () => <StaticPage id="editorial-policy" />,
});
