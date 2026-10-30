import {createFileRoute} from '@tanstack/react-router';
import {publicNewsOptions} from '@/lib/news.functions';
import {StaticPage} from '@/components/news/public-site';
import {meta} from '@/lib/news';
export const Route=createFileRoute('/about')({loader:({context})=>context.queryClient.ensureQueryData(publicNewsOptions),head:()=>meta('About us','About us — TAK TV India.'),component:()=> <StaticPage id="about"/>});
