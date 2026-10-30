import {createFileRoute,notFound} from '@tanstack/react-router';
import {publicNewsOptions} from '@/lib/news.functions';
import {ListingPage} from '@/components/news/public-site';
import {meta,language,dictionary} from '@/lib/news';
export const Route=createFileRoute('/$lang/search')({validateSearch:(s:Record<string,unknown>)=>({q:typeof s['q']==='string'?s['q']:''}),loader:({context,params})=>{if(!['en','hi','te'].includes(params.lang))throw notFound();return context.queryClient.ensureQueryData(publicNewsOptions);},head:({params})=>meta(dictionary[language(params.lang)].search,'Search published TAK TV India stories.',true),component:Page});
function Page(){return <ListingPage lang={language(Route.useParams().lang)} q={Route.useSearch().q}/>;}
