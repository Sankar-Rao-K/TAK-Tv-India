import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Database } from '@/integrations/supabase/types';
import { cleanStory } from './news-sanitize';
import { isPublic, validateStory, canPublishRole, mediaUrl, ROLES, type Lang, type Role } from './news';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
export type Article = Database['public']['Tables']['articles']['Row'] & {cover_url?:string};
export type Category = Database['public']['Tables']['categories']['Row'];
export type Settings = Database['public']['Tables']['settings']['Row'];
export type Media = Database['public']['Tables']['media']['Row'] & {url?:string;thumb_url?:string};
const videoPublicColumns='id,slug,is_short,duration_seconds,yt_published_at,yt_channel,yt_status,title_te,title_en,description_te,description_en,youtube_id,category_id,tags,region,language,series,status,publish_at,published_at,is_featured,show_in_ticker,social_links,seo_title,seo_description,created_at,updated_at' as const;
const postListColumns='id,slug,post_type,cover_youtube_id,title_te,title_en,cover_path,cover_alt,cover_credit,category_id,tags,region,status,publish_at,published_at,seo_title,seo_description,created_at,updated_at' as const;
const postPublicColumns='id,slug,post_type,cover_youtube_id,title_te,title_en,body_te,body_en,cover_path,cover_alt,cover_credit,category_id,tags,region,status,publish_at,published_at,seo_title,seo_description,created_at,updated_at' as const;
const dataPublicColumns='id,name_te,name_en,unit,geography,data_year,comparison_year,chart_type,chart_data,source_id,verified_at,status,created_at,updated_at' as const;
const listColumns='id,lang,title,slug,summary,category_id,cover_path,cover_alt,cover_credit,youtube_id,is_breaking,is_featured,reporter_name,location,tags,status,publish_at,published_at,created_at,updated_at,seo_title,seo_description' as const;
const publicColumns='id,lang,title,slug,summary,body_html,category_id,cover_path,cover_alt,cover_credit,youtube_id,is_breaking,is_featured,reporter_name,location,tags,status,publish_at,published_at,created_at,updated_at,seo_title,seo_description' as const;
/** How many recent stories/videos/posts ride along with every public page. Older items are still reachable by their own address. */
export const PUBLIC_LIMITS={stories:300,videos:200,posts:150,dataCards:200} as const;
const liveAt=(x:{status:string;published_at:string|null;publish_at:string|null},now=Date.now())=>x.status==='published'?true:(x.status==='scheduled'&&!!x.publish_at&&new Date(x.publish_at).getTime()<=now);
async function requestOrigin(){try{const {getRequest}=await import('@tanstack/react-start/server');return new URL(getRequest().url).origin;}catch{return '';}}
/**
 * Everything the public pages share (lists, menus, ticker, settings). Story and post bodies are NOT included — each
 * story/post page loads its own full text — and photos use stable /media/ addresses, so this payload stays small.
 */
export const getPublicNews=createServerFn({method:'GET'}).handler(async()=>{
 const {publicDb}=await import('./public-db');const db=publicDb();
 const [a,c,s,p,r,d,vq,pq,dq,cq,sq]=await Promise.all([db.from('articles').select(listColumns).order('published_at',{ascending:false}).limit(PUBLIC_LIMITS.stories),db.from('categories').select('*').order('sort_order'),db.from('settings').select('*').single(),db.from('pages').select('*'),db.from('redirects').select('*'),db.from('removed_stories').select('*'),
 db.from('videos').select(videoPublicColumns).order('published_at',{ascending:false,nullsFirst:true}).limit(PUBLIC_LIMITS.videos),db.from('posts').select(postListColumns).order('published_at',{ascending:false,nullsFirst:true}).limit(PUBLIC_LIMITS.posts),db.from('data_cards').select(dataPublicColumns).order('updated_at',{ascending:false}).limit(PUBLIC_LIMITS.dataCards),db.from('content_sources').select('*').order('sort_order'),db.from('sources').select('id,ref,name,organisation,website,category,source_type')]);
 if(a.error||c.error||s.error)throw new Error('News could not be loaded. Please try again.');
 const articles=(a.data||[]).filter(x=>isPublic(x)).sort((a,b)=>new Date(b.published_at||b.publish_at||'').getTime()-new Date(a.published_at||a.publish_at||'').getTime()).map(x=>({...x,published_at:x.published_at||x.publish_at,body_html:'',cover_url:mediaUrl(x.cover_path)}));
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const hubNow=Date.now();
 const videos=(vq.data||[]).filter(x=>liveAt(x,hubNow)).map(x=>({...x,published_at:x.published_at||x.publish_at})).sort((a,b)=>new Date(b.published_at||b.created_at).getTime()-new Date(a.published_at||a.created_at).getTime());
 const posts=(pq.data||[]).filter(x=>liveAt(x,hubNow)).map(x=>({...x,published_at:x.published_at||x.publish_at,body_te:'',body_en:'',cover_url:mediaUrl(x.cover_path)})).sort((a,b)=>new Date(b.published_at||b.created_at).getTime()-new Date(a.published_at||a.created_at).getTime());
 const dataCards=(dq.data||[]).filter(x=>x.status==='published');
 const followed=await supabaseAdmin.from('queries').select('id,ref_no,title,category_id,district,mandal,status,followup_summary,updated_at').eq('published_followup',true).eq('is_blocked',false).order('updated_at',{ascending:false}).limit(100);
 const settings={...s.data,site_url:s.data.site_url||await requestOrigin()};
 return {articles,categories:c.data||[],settings,pages:(p.data||[]).map(p=>({...p,body_html:cleanStory(p.body_html)})),redirects:r.data||[],removed:d.data||[],videos,posts,dataCards,contentSources:cq.data||[],sources:sq.data||[],followed:followed.data||[]};
});
export const publicNewsOptions=queryOptions({queryKey:['public-news'],queryFn:()=>getPublicNews(),staleTime:15000});
const itemInput=z.object({lang:z.enum(['en','hi','te']),slug:z.string().trim().min(1).max(120)});
/** One live story with its full text (photos rewritten to stable /media/ addresses). null when not public. */
export const getPublicStory=createServerFn({method:'GET'}).inputValidator((d:{lang:string;slug:string})=>itemInput.parse(d)).handler(async({data})=>{
 const {publicDb,stableBodyImages}=await import('./public-db');const r=await publicDb().from('articles').select(publicColumns).eq('lang',data.lang).eq('slug',data.slug).maybeSingle();
 if(!r.data||!isPublic(r.data))return null;
 return {...r.data,published_at:r.data.published_at||r.data.publish_at,body_html:stableBodyImages(cleanStory(r.data.body_html)),cover_url:mediaUrl(r.data.cover_path)};
});
export const publicStoryOptions=(lang:string,slug:string)=>queryOptions({queryKey:['public-story',lang,slug],queryFn:()=>getPublicStory({data:{lang,slug}}),staleTime:15000});
/** One live blog/photo/data post with both language bodies. null when not public. */
export const getPublicPost=createServerFn({method:'GET'}).inputValidator((d:{slug:string})=>z.object({slug:z.string().trim().min(1).max(120)}).parse(d)).handler(async({data})=>{
 const {publicDb,stableBodyImages}=await import('./public-db');const r=await publicDb().from('posts').select(postPublicColumns).eq('slug',data.slug).maybeSingle();
 if(!r.data||!liveAt(r.data))return null;
 return {...r.data,published_at:r.data.published_at||r.data.publish_at,body_te:stableBodyImages(cleanStory(r.data.body_te)),body_en:stableBodyImages(cleanStory(r.data.body_en)),cover_url:mediaUrl(r.data.cover_path)};
});
export const publicPostOptions=(slug:string)=>queryOptions({queryKey:['public-post',slug],queryFn:()=>getPublicPost({data:{slug}}),staleTime:15000});
export const getNewsroom=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;const role=await db.from('user_roles').select('role').eq('user_id',context.userId).maybeSingle();const profile=await db.from('profiles').select('*').eq('id',context.userId).single();
 if(!role.data)return {role:null,profile:profile.data,articles:[],categories:[],media:[],settings:null,pages:[],team:[]};
 const [a,c,m,s,p,team]=await Promise.all([db.from('articles').select('*').order('updated_at',{ascending:false}),db.from('categories').select('*').order('sort_order'),db.from('media').select('*').order('uploaded_at',{ascending:false}),db.from('settings').select('*').single(),db.from('pages').select('*'),db.from('profiles').select('*')]);
 const media=await Promise.all((m.data||[]).map(async x=>{const u=await db.storage.from('news-media').createSignedUrl(x.path,3600);const t=await db.storage.from('news-media').createSignedUrl(x.thumb_path||x.path,3600);return {...x,url:u.data?.signedUrl||'',thumb_url:t.data?.signedUrl||''};}));
 const roles=role.data.role==='admin'?await db.from('user_roles').select('*'):null;
 return {role:role.data.role,profile:profile.data,articles:a.data||[],categories:c.data||[],media,settings:s.data,pages:p.data||[],team:(team.data||[]).map(x=>({...x,role:roles?.data?.find(r=>r.user_id===x.id)?.role||'reporter'}))};
});
export const newsroomOptions=queryOptions({queryKey:['newsroom'],queryFn:()=>getNewsroom(),staleTime:5000});
export const saveNews=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{article:Partial<Article>;action:string})=>d).handler(async({data,context})=>{
 const db=context.supabase;const {data:role}=await db.from('user_roles').select('role').eq('user_id',context.userId).single();if(!role)throw new Error('Newsroom access is required.');const privileged=canPublishRole(role.role);if(!privileged&&role.role!=='reporter')throw new Error('Your role cannot write news stories.');
 const old=data.article.id?(await db.from('articles').select('*').eq('id',data.article.id).single()).data:null;
 if(old&&!privileged&&(old.created_by!==context.userId||!['draft','review'].includes(old.status)))throw new Error('You cannot edit this story.');
 const allowed=['title','slug','summary','body_html','category_id','cover_path','cover_alt','cover_credit','youtube_id','is_breaking','is_featured','reporter_name','location','tags','lang','publish_at','seo_title','seo_description','editor_note'] as const;
 const fields:Record<string,unknown>={};for(const k of allowed)if(k in data.article)fields[k]=data.article[k];fields['body_html']=cleanStory(String(fields['body_html']||''));
 const merged={...old,...fields} as Article;
 let status='draft';if(data.action==='review')status='review';if(['publish','schedule','update','unpublish','archive','trash','restore','delete'].includes(data.action)&&!privileged)throw new Error('Only editors and admins can publish or remove stories.');
 if(data.action==='delete'){if(!old||!['trashed','archived'].includes(old.status))throw new Error('Move the story to Trash first.');const result=await db.from('articles').delete().eq('id',old.id);if(result.error)throw new Error('Story could not be deleted.');return {id:old.id};}
 if(['publish','schedule','update'].includes(data.action)){const errors=validateStory(merged);const paths=[merged.cover_path,...[...merged.body_html.matchAll(/data-path="([^"]+)"/g)].map(m=>m[1])].filter((p):p is string=>!!p);if(paths.length){const media=await db.from('media').select('path').in('path',paths);if(paths.some(p=>!media.data?.some(m=>m.path===p)))errors.push('A photo is missing from the library.');}if(errors.length)throw new Error(errors.join('\n'));status=merged.publish_at&&new Date(merged.publish_at).getTime()>Date.now()?'scheduled':'published';}
 if(data.action==='archive')status='archived';if(data.action==='trash')status='trashed';
 if(old&&isPublic(old)&&data.action==='draft'){const {error}=await db.from('articles').update({pending_edits:fields as Database['public']['Tables']['articles']['Row']['pending_edits']}).eq('id',old.id);if(error)throw new Error('Could not save changes.');return {id:old.id};}
 const patch={...fields,status,pending_edits:null,...(status==='published'?{published_at:old?.published_at||new Date().toISOString(),published_slug:merged.slug}:{})};
 const result=old?await db.from('articles').update(patch).eq('id',old.id).select('id').single():await db.from('articles').insert({...patch,slug:merged.slug,created_by:context.userId} as Database['public']['Tables']['articles']['Insert']).select('id').single();
 if(result.error)throw new Error(result.error.code==='23505'?'Another story already uses that web address.':'Could not save this story. Check the fields and try again.');return {id:result.data.id};
});
const sstr=(max:number)=>z.string().trim().max(max).optional();
/** Only known settings columns can be written; unknown keys are dropped. */
export const settingsSchema=z.object({site_name:sstr(120),site_url:z.union([z.literal(''),z.string().trim().max(200).regex(/^https?:\/\/[^\s/]+(\/.*)?$/,'Website address must start with https://')]).optional(),email:sstr(255),phone:sstr(40),address:sstr(500),youtube:sstr(300),facebook:sstr(300),x:sstr(300),instagram:sstr(300),whatsapp:sstr(300),privacy_contact:sstr(255),
 taglines:z.object({en:sstr(160),hi:sstr(160),te:sstr(160)}).optional(),
 youtube_channel_id:z.union([z.literal(''),z.string().trim().regex(/^UC[A-Za-z0-9_-]{22}$/,'The YouTube channel ID starts with UC and has 24 characters')]).optional(),
 ticker_count:z.coerce.number().int().min(1,'Ticker count must be 1–20').max(20,'Ticker count must be 1–20').optional(),
 hindi_enabled:z.boolean().optional(),maintenance_mode:z.boolean().optional()}).strip();
export const manageNewsroom=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{kind:string;value:Record<string,unknown>})=>d).handler(async({data,context})=>{
 const db=context.supabase;const admin=(await db.rpc('has_role',{_user_id:context.userId,_role:'admin'})).data;
 if(!admin)throw new Error('Admin access is required.');
 if(data.kind==='settings'){const parsed=settingsSchema.safeParse(data.value);if(!parsed.success)throw new Error('Please check the settings: '+parsed.error.issues.map(i=>i.message).join('; '));const patch=Object.fromEntries(Object.entries(parsed.data).filter(([,v])=>v!==undefined)) as Database['public']['Tables']['settings']['Update'];const {error}=await db.from('settings').update(patch).eq('id',1);if(error)throw new Error('Settings could not be saved.');}
 if(data.kind==='category'){const {error}=await db.from('categories').upsert(data.value as Database['public']['Tables']['categories']['Insert']);if(error)throw new Error('Category could not be saved.');}
 if(data.kind==='page'){data.value['body_html']=cleanStory(String(data.value['body_html']||''));const {error}=await db.from('pages').upsert(data.value as Database['public']['Tables']['pages']['Insert']);if(error)throw new Error('Page could not be saved.');}
 if(['invite','role','remove'].includes(data.kind)){
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 if(data.kind==='invite'){const email=String(data.value['email']||'');const name=String(data.value['name']||'');const role=String(data.value['role']||'reporter');if(!ROLES.includes(role as Role))throw new Error('Choose a valid role.');const {data:created,error}=await supabaseAdmin.auth.admin.inviteUserByEmail(email,{data:{name},redirectTo:new URL('/reset-password',(await import('@tanstack/react-start/server')).getRequest().url).href});if(error||!created.user)throw new Error('Invitation could not be sent. Check the email address.');await supabaseAdmin.from('user_roles').insert({user_id:created.user.id,role:role as 'admin'|'editor'|'reporter'});}
 else {const id=String(data.value['id']);if(id===context.userId)throw new Error('You cannot remove or change your own access.');const roles=await db.from('user_roles').select('*');const target=roles.data?.find(r=>r.user_id===id);if(target?.role==='admin'&&(roles.data?.filter(r=>r.role==='admin').length||0)<=1)throw new Error('The last admin cannot be removed.');if(data.kind==='remove'){await supabaseAdmin.from('user_roles').delete().eq('user_id',id);}else {const role=String(data.value['role']);if(!ROLES.includes(role as Role))throw new Error('Choose a valid role.');await supabaseAdmin.from('user_roles').update({role:role as Role}).eq('user_id',id);}}
 }
 return {ok:true};
});
