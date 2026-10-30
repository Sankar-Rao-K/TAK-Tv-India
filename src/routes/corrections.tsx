import { createFileRoute } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { StaticPage } from '@/components/news/public-site';
import { meta, siteOrigin, absUrl } from '@/lib/news';
export const Route = createFileRoute('/corrections')({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicNewsOptions),
  head: ({ loaderData }) => { const o = siteOrigin(loaderData?.settings); return meta('Corrections Log', 'How TAK TV India verifies, reports and corrects.', false, { canonical: o ? absUrl(o, '/corrections') : undefined }); },
  component: () => <StaticPage id="corrections" />,
});
