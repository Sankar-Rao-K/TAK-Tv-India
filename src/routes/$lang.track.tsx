import { createFileRoute, notFound } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { TrackIssuePage, citizenText } from '@/components/news/citizen';
import { meta, language } from '@/lib/news';

export const Route = createFileRoute('/$lang/track')({
  loader: ({ context, params }) => { if (!['en', 'hi', 'te'].includes(params.lang)) throw notFound(); return context.queryClient.ensureQueryData(publicNewsOptions); },
  head: ({ params }) => meta(citizenText[language(params.lang)].track, 'Check the status of an issue you raised with TAK TV India using your reference number and secret code.', true),
  component: Page,
});
function Page() { return <TrackIssuePage lang={language(Route.useParams().lang)} />; }
