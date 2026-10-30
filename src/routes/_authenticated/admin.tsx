import {createFileRoute} from '@tanstack/react-router';
import {newsroomOptions} from '@/lib/news.functions';
import {Newsroom} from '@/components/newsroom/newsroom';
import {meta} from '@/lib/news';
export const Route=createFileRoute('/_authenticated/admin')({loader:({context})=>context.queryClient.ensureQueryData(newsroomOptions),head:()=>meta('Newsroom','Write, review and publish TAK TV India news.',true),component:Newsroom});
