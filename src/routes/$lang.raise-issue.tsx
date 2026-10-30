import { createFileRoute, notFound } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { RaiseIssuePage, citizenText } from '@/components/news/citizen';
import { meta, language } from '@/lib/news';

export const Route = createFileRoute('/$lang/raise-issue')({
  loader: ({ context, params }) => { if (!['en', 'hi', 'te'].includes(params.lang)) throw notFound(); return context.queryClient.ensureQueryData(publicNewsOptions); },
  head: ({ params }) => meta(citizenText[language(params.lang)].raise, 'Report a public issue in your area to the TAK TV India newsroom and track it with a reference number.'),
  component: Page,
});
function Page() { return <RaiseIssuePage lang={language(Route.useParams().lang)} />; }
