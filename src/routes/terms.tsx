import {createFileRoute} from '@tanstack/react-router';
import {publicNewsOptions} from '@/lib/news.functions';
import {StaticPage} from '@/components/news/public-site';
import {meta} from '@/lib/news';
export const Route=createFileRoute('/terms')({loader:({context})=>context.queryClient.ensureQueryData(publicNewsOptions),head:()=>meta('Terms & Conditions','Terms & Conditions — TAK TV India.'),component:()=> <StaticPage id="terms"/>});
