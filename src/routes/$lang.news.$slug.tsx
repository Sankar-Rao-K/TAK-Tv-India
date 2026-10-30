import {createFileRoute,redirect,notFound} from '@tanstack/react-router';
import {publicNewsOptions,publicStoryOptions} from '@/lib/news.functions';
import {StoryPage} from '@/components/news/public-site';
import {meta,language,siteOrigin,absUrl,ldBreadcrumb,ldNewsArticle,mediaUrl} from '@/lib/news';
export const Route=createFileRoute('/$lang/news/$slug')({
 loader:async({context,params})=>{if(!['en','hi','te'].includes(params.lang))throw notFound();const d=await context.queryClient.ensureQueryData(publicNewsOptions);const r=d.redirects.find(r=>r.lang===params.lang&&r.old_slug===params.slug);if(r)throw redirect({to:'/$lang/news/$slug',params:{lang:params.lang,slug:r.new_slug},statusCode:301});const story=await context.queryClient.ensureQueryData(publicStoryOptions(params.lang,params.slug));return {settings:d.settings,categories:d.categories,story};},
 head:({loaderData})=>{const a=loaderData?.story;const o=siteOrigin(loaderData?.settings);
  if(!a)return meta('Story unavailable','This story is not available.',true);
  const url=o?absUrl(o,`/${a.lang}/news/${a.slug}`):undefined;const image=a.cover_path&&o?mediaUrl(a.cover_path,o):a.youtube_id?`https://i.ytimg.com/vi/${a.youtube_id}/hqdefault.jpg`:undefined;
  const section=loaderData?.categories.find(c=>c.id===a.category_id);const sectionName=section?String((section.names as Record<string,string>)[a.lang]||section.id):undefined;
  const ld:unknown[]=url&&o?[ldBreadcrumb([{name:'Home',url:absUrl(o,a.lang==='en'?'/':`/${a.lang}`)},...(section?[{name:sectionName||section.id,url:absUrl(o,`/${a.lang}/category/${section.id}`)}]:[]),{name:a.title,url}]),ldNewsArticle({url,headline:a.title,description:a.seo_description||a.summary,image,published:a.published_at||a.created_at,modified:a.updated_at,author:a.reporter_name||loaderData?.settings?.site_name||'TAK TV India',siteName:loaderData?.settings?.site_name||'TAK TV India',logo:absUrl(o,'/apple-touch-icon.png'),lang:a.lang==='hi'||a.lang==='te'?a.lang:'en',...(sectionName?{section:sectionName}:{}),keywords:a.tags})]:[];
  const h=meta(a.seo_title||a.title,a.seo_description||a.summary||'TAK TV India news story.',false,{canonical:url,image,type:'article',ld});
  return {...h,meta:[...h.meta,...(a.published_at?[{property:'article:published_time',content:a.published_at}]:[]),{property:'article:modified_time',content:a.updated_at}]};},
 component:Page});
function Page(){const p=Route.useParams();return <StoryPage lang={language(p.lang)} slug={p.slug}/>;}
