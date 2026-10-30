import {createFileRoute} from '@tanstack/react-router';
import {publicNewsOptions} from '@/lib/news.functions';
import {StaticPage} from '@/components/news/public-site';
import {meta} from '@/lib/news';
export const Route=createFileRoute('/privacy')({loader:({context})=>context.queryClient.ensureQueryData(publicNewsOptions),head:()=>meta('Privacy Policy','Privacy Policy — TAK TV India.'),component:()=> <StaticPage id="privacy"/>});
