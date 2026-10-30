import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { publicNewsOptions } from '@/lib/news.functions';
import { HomePage } from '@/components/news/public-site';
import { HomeHub } from '@/components/news/hub-public';
import { meta, siteOrigin, absUrl, sectionHreflangs } from '@/lib/news';
/** First visit only: send readers whose saved or browser language is Telugu to the Telugu home page. */
function Home() {
  const go = useNavigate();
  useEffect(() => {
    try { if (sessionStorage.getItem('tak-lang-checked')) return; sessionStorage.setItem('tak-lang-checked', '1'); const saved = localStorage.getItem('tak-language'); const pref = saved || (navigator.language || '').slice(0, 2); if (pref === 'te') void go({ to: '/te', replace: true }); } catch { /* storage unavailable */ }
  }, [go]);
  return <HomePage extra={<HomeHub lang="en" />} />;
}
export const Route = createFileRoute('/')({ loader: ({ context }) => context.queryClient.ensureQueryData(publicNewsOptions),
  head: ({ loaderData }) => { const o = siteOrigin(loaderData?.settings); return meta('Latest News', 'TAK TV India — verified, evidence-based reporting in Telugu and English. Truth without Delay.', false, { canonical: o ? absUrl(o, '/') : undefined, alternates: sectionHreflangs(o, !!loaderData?.settings?.hindi_enabled, (l) => (l === 'en' ? '/' : `/${l}`)) }); }, component: Home });
