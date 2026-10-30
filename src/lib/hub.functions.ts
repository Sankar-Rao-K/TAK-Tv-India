import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Database } from '@/integrations/supabase/types';
import { cleanStory } from './news-sanitize';
import { parseYouTubeLink, isTelugu, looksLikeShort, maybeShort, type Availability } from './youtube';

export type VideoRow = Database['public']['Tables']['videos']['Row'];
export type PostRow = Database['public']['Tables']['posts']['Row'];
export type DataCardRow = Database['public']['Tables']['data_cards']['Row'];
export type SourceRow = Database['public']['Tables']['sources']['Row'];
export type ContentSourceRow = Database['public']['Tables']['content_sources']['Row'];
export type PlannerRow = Database['public']['Tables']['planner_items']['Row'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type AuditRow = Database['public']['Tables']['audit_log']['Row'];

export const PLANNER_STAGES = ['idea', 'researching', 'script_draft', 'fact_check', 'ready_to_record', 'recorded', 'editing', 'published'] as const;
export const STAGE_LABELS: Record<(typeof PLANNER_STAGES)[number], string> = { idea: 'Idea', researching: 'Researching', script_draft: 'Script draft', fact_check: 'Fact-check', ready_to_record: 'Ready to record', recorded: 'Recorded', editing: 'Editing', published: 'Published' };
export const SOURCE_TYPES = ['government', 'audit_cag', 'parliament_qa', 'court_record', 'rti_reply', 'research', 'fact_check', 'news_report', 'other'] as const;
export const SOURCE_TYPE_LABELS: Record<(typeof SOURCE_TYPES)[number], string> = { government: 'Government data', audit_cag: 'Audit / CAG', parliament_qa: 'Parliament Q&A', court_record: 'Court record', rti_reply: 'RTI reply', research: 'Research', fact_check: 'Fact-check', news_report: 'News report', other: 'Other' };

/** Accepts a YouTube link (watch, youtu.be, shorts, live, embed) or a bare 11-character id. Returns '' when invalid. */
export function parseYouTubeId(input: string): string { return parseYouTubeLink(input)?.id || ''; }
export function slugFromTitle(title: string, fallback: string): string {
  const s = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');
  return s.length >= 3 ? s : fallback;
}
/** Parses the public YouTube channel feed (Atom) into simple entries. */
export function parseYouTubeFeed(xml: string): { id: string; title: string; description: string; published: string; isShort: boolean }[] {
  const out: { id: string; title: string; description: string; published: string; isShort: boolean }[] = [];
  const dec = (t: string) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1] || '';
    const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] || '';
    const title = dec(e.match(/<title>([^<]*)<\/title>/)?.[1] || '');
    const published = e.match(/<published>([^<]+)<\/published>/)?.[1] || '';
    const description = dec(e.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] || '').slice(0, 2000);
    const isShort = new RegExp(`/shorts/${id}`).test(e.match(/<link[^>]*rel="alternate"[^>]*>/)?.[0] || '');
    if (/^[A-Za-z0-9_-]{11}$/.test(id) && title) out.push({ id, title, description, published, isShort });
  }
  return out;
}
function fail(error: { code?: string; message?: string } | null, fallback: string): never {
  // P0001 = messages raised on purpose by our database rules (safe to show).
  if (error?.code === 'P0001' && error.message) throw new Error(error.message);
  if (error?.code === '23505') throw new Error('That web address is already used. Please change it.');
  if (error?.code === '42501') throw new Error('You do not have permission to do this.');
  throw new Error(fallback);
}
async function who(db: any, userId: string) {
  const [m, p, mod, adm] = await Promise.all([db.rpc('is_newsroom_member', { _user_id: userId }), db.rpc('can_publish', { _user_id: userId }), db.rpc('can_moderate', { _user_id: userId }), db.rpc('has_role', { _user_id: userId, _role: 'admin' })]);
  return { member: !!m.data, publish: !!p.data, moderate: !!mod.data, admin: !!adm.data };
}

export const getHub = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase; const access = await who(db, context.userId);
  if (!access.member) throw new Error('Newsroom access is required.');
  const [v, p, d, s, cs, pl, t, team] = await Promise.all([
    db.from('videos').select('*').order('updated_at', { ascending: false }).limit(500), db.from('posts').select('*').order('updated_at', { ascending: false }).limit(300),
    db.from('data_cards').select('*').order('updated_at', { ascending: false }).limit(300), db.from('sources').select('*').order('ref'), db.from('content_sources').select('*').order('sort_order'),
    db.from('planner_items').select('*').order('planned_date', { ascending: true, nullsFirst: false }).order('sort_order').limit(500), db.from('tasks').select('*').order('created_at', { ascending: false }).limit(300),
    db.from('profiles').select('id,name,email'),
  ]);
  if (v.error || p.error || d.error || s.error || pl.error) throw new Error('Content could not be loaded. Please try again.');
  const audit = access.admin ? await db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200) : null;
  return { access, videos: v.data || [], posts: p.data || [], dataCards: d.data || [], sources: s.data || [], contentSources: cs.data || [], planner: pl.data || [], tasks: t.data || [], team: team.data || [], audit: audit?.data || [] };
});
export const hubOptions = queryOptions({ queryKey: ['hub'], queryFn: () => getHub(), staleTime: 5000 });

export const getPlannerComments = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from('planner_comments').select('*').eq('item_id', data.id).order('created_at');
    if (error) throw new Error('Comments could not be loaded.');
    return rows || [];
  });

const sourceLink = z.object({ source_id: z.string().uuid().nullable().optional(), title: z.string().trim().min(1).max(300), url: z.string().trim().max(1000).refine((u) => /^https?:\/\//i.test(u), 'Links must start with http:// or https://'), source_type: z.enum(SOURCE_TYPES), data_year: z.string().trim().max(20).default(''), accessed_at: z.string().nullable().optional(), page_ref: z.string().trim().max(100).default(''), note: z.string().trim().max(500).default('') });
const str = (max: number) => z.string().trim().max(max).default('');
const social = z.object({ youtube: str(500), instagram: str(500), facebook: str(500) }).default({ youtube: '', instagram: '', facebook: '' });
const dt = z.string().nullable().optional();
const schemas = {
  video: z.object({ id: z.string().uuid().optional(), slug: str(80), title_te: str(250), title_en: str(250), description_te: str(5000), description_en: str(5000), youtube: str(300), is_short: z.boolean().default(false), duration_seconds: z.number().int().min(0).max(864000).nullable().optional(), yt_published_at: dt, yt_channel: str(200), category_id: z.string().nullable().optional(), tags: z.array(z.string().trim().max(40)).max(15).default([]), region: str(100), language: z.enum(['te', 'en']).default('te'), series: str(100), status: z.enum(['draft', 'review', 'scheduled', 'published', 'unpublished', 'archived']).default('draft'), publish_at: dt, is_featured: z.boolean().default(false), show_in_ticker: z.boolean().default(true), social_links: social, seo_title: str(160), seo_description: str(300), sources: z.array(sourceLink).max(40).optional() }),
  post: z.object({ id: z.string().uuid().optional(), slug: str(80), post_type: z.enum(['blog', 'photo_story', 'data_story', 'quick_update']).default('blog'), title_te: str(250), title_en: str(250), body_te: z.string().max(200000).default(''), body_en: z.string().max(200000).default(''), cover_path: str(500), cover_alt: str(300), cover_credit: str(200), cover_youtube: str(300), category_id: z.string().nullable().optional(), tags: z.array(z.string().trim().max(40)).max(15).default([]), region: str(100), status: z.enum(['draft', 'review', 'scheduled', 'published', 'unpublished', 'archived']).default('draft'), publish_at: dt, seo_title: str(160), seo_description: str(300), sources: z.array(sourceLink).max(40).optional() }),
  data_card: z.object({ id: z.string().uuid().optional(), name_te: str(250), name_en: str(250), unit: str(60), geography: str(150), data_year: z.number().int().min(1900).max(2100).nullable().optional(), comparison_year: z.number().int().min(1900).max(2100).nullable().optional(), chart_type: z.enum(['bar', 'line', 'table']).default('bar'), chart_data: z.array(z.object({ label: z.string().trim().max(80), value: z.number() })).max(60).default([]), source_id: z.string().uuid().nullable().optional(), verified_at: dt, notes: str(2000), status: z.enum(['draft', 'published', 'archived']).default('draft') }),
  source: z.object({ id: z.string().uuid().optional(), ref: str(20), name: z.string().trim().min(2).max(300), organisation: str(300), website: str(300), category: str(120), source_type: z.enum(SOURCE_TYPES).default('government'), reliability_note: str(500), usage_tips: str(500) }),
  planner: z.object({ id: z.string().uuid().optional(), title_te: str(250), title_en: str(250), category_id: z.string().nullable().optional(), region: str(100), stage: z.enum(PLANNER_STAGES).default('idea'), planned_date: dt, due_date: dt, owner: z.string().uuid().nullable().optional(), core_question: str(2000), data_to_collect: str(2000), suggested_sources: str(2000), viewer_ask: str(500), script_html: z.string().max(200000).default(''), checklist: z.record(z.string(), z.boolean()).default({}), query_id: z.string().uuid().nullable().optional(), video_id: z.string().uuid().nullable().optional(), post_id: z.string().uuid().nullable().optional(), sort_order: z.number().int().default(0) }),
  task: z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(2).max(300), assignee: z.string().uuid().nullable().optional(), due_date: dt, status: z.enum(['open', 'in_progress', 'blocked', 'done']).default('open'), planner_item_id: z.string().uuid().nullable().optional() }),
};
const input = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('video'), value: schemas.video }), z.object({ kind: z.literal('post'), value: schemas.post }), z.object({ kind: z.literal('data_card'), value: schemas.data_card }),
  z.object({ kind: z.literal('source'), value: schemas.source }), z.object({ kind: z.literal('planner'), value: schemas.planner }), z.object({ kind: z.literal('task'), value: schemas.task }),
  z.object({ kind: z.literal('comment'), value: z.object({ item_id: z.string().uuid(), body: z.string().trim().min(1).max(2000) }) }),
  z.object({ kind: z.literal('delete'), value: z.object({ table: z.enum(['videos', 'posts', 'data_cards', 'sources', 'planner_items', 'tasks']), id: z.string().uuid() }) }),
]);
async function replaceSources(db: any, type: 'video' | 'post', id: string, items: z.infer<typeof sourceLink>[] | undefined) {
  if (!items) return;
  await db.from('content_sources').delete().eq('content_type', type).eq('content_id', id);
  if (!items.length) return;
  const { error } = await db.from('content_sources').insert(items.map((x, i) => ({ content_type: type, content_id: id, source_id: x.source_id || null, title: x.title, url: x.url, source_type: x.source_type, data_year: x.data_year, accessed_at: x.accessed_at || null, page_ref: x.page_ref, note: x.note, sort_order: i })));
  if (error) fail(error, 'Sources could not be saved.');
}

export const saveHub = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => input.parse(d)).handler(async ({ data, context }) => {
  const db = context.supabase as any; const uid = context.userId; const access = await who(db, uid);
  if (!access.member) throw new Error('Newsroom access is required.');
  const owner = (id?: string) => (id ? {} : { created_by: uid });
  if (data.kind === 'video') {
    const { id, youtube, sources, ...v } = data.value; const link = parseYouTubeLink(youtube); const yt = link?.id || '';
    if (youtube && !yt) throw new Error('That is not a valid YouTube link. Paste the normal video link.');
    if (yt) { const dup = await findDuplicate(db, yt, id); if (dup) throw new Error(`This video is already on the website (“${dup.title}”).`); }
    const row = { ...v, youtube_id: yt, is_short: v.is_short || !!link?.isShort, duration_seconds: v.duration_seconds ?? null, yt_published_at: v.yt_published_at || null, slug: v.slug || slugFromTitle(v.title_en || v.title_te, yt ? youtubeSlug(yt) : `video-${Date.now().toString(36)}`), publish_at: v.publish_at || null, category_id: v.category_id || null };
    const res = id ? await db.from('videos').update(row).eq('id', id).select('id').single() : await db.from('videos').insert({ ...row, ...owner() }).select('id').single();
    if (res.error) fail(res.error, 'The video could not be saved.');
    await replaceSources(db, 'video', res.data.id, sources); return { id: res.data.id as string };
  }
  if (data.kind === 'post') {
    const { id, sources, cover_youtube, ...v } = data.value; const coverYt = cover_youtube ? parseYouTubeLink(cover_youtube)?.id || '' : '';
    if (cover_youtube && !coverYt) throw new Error('The cover YouTube link is not valid.');
    const row = { ...v, cover_youtube_id: coverYt, body_te: cleanStory(v.body_te), body_en: cleanStory(v.body_en), slug: v.slug || slugFromTitle(v.title_en || v.title_te, `post-${Date.now().toString(36)}`), publish_at: v.publish_at || null, category_id: v.category_id || null };
    const res = id ? await db.from('posts').update(row).eq('id', id).select('id').single() : await db.from('posts').insert({ ...row, ...owner() }).select('id').single();
    if (res.error) fail(res.error, 'The post could not be saved.');
    await replaceSources(db, 'post', res.data.id, sources); return { id: res.data.id as string };
  }
  if (data.kind === 'data_card') {
    const { id, ...v } = data.value; const row = { ...v, verified_at: v.verified_at || null, source_id: v.source_id || null, data_year: v.data_year ?? null, comparison_year: v.comparison_year ?? null, ...(v.status === 'published' ? { verified_by: uid } : {}) };
    const res = id ? await db.from('data_cards').update(row).eq('id', id).select('id').single() : await db.from('data_cards').insert({ ...row, ...owner() }).select('id').single();
    if (res.error) fail(res.error, 'The data card could not be saved.'); return { id: res.data.id as string };
  }
  if (data.kind === 'source') {
    const { id, ...v } = data.value; const ref = v.ref || `S${String(Date.now()).slice(-6)}`;
    const res = id ? await db.from('sources').update({ ...v, ref }).eq('id', id).select('id').single() : await db.from('sources').insert({ ...v, ref }).select('id').single();
    if (res.error) fail(res.error, 'The source could not be saved.'); return { id: res.data.id as string };
  }
  if (data.kind === 'planner') {
    const { id, ...v } = data.value; const row = { ...v, planned_date: v.planned_date || null, due_date: v.due_date || null, owner: v.owner || null, category_id: v.category_id || null, query_id: v.query_id || null, video_id: v.video_id || null, post_id: v.post_id || null, script_html: cleanStory(v.script_html) };
    const res = id ? await db.from('planner_items').update(row).eq('id', id).select('id,query_id,stage').single() : await db.from('planner_items').insert({ ...row, ...owner() }).select('id,query_id,stage').single();
    if (res.error) fail(res.error, 'The planner card could not be saved.');
    if (res.data.stage === 'published' && res.data.query_id) { // keep the citizen issue in step with the content made from it
      const prev = await db.from('queries').select('status').eq('id', res.data.query_id).maybeSingle();
      if (prev.data && prev.data.status !== 'published') {
        const q = await db.from('queries').update({ status: 'published' }).eq('id', res.data.query_id);
        if (!q.error) await db.from('query_events').insert({ query_id: res.data.query_id, actor: uid, event: 'status', detail: { status: 'published', from: prev.data.status, via: 'content_planner' } });
      }
    }
    return { id: res.data.id as string };
  }
  if (data.kind === 'task') {
    const { id, ...v } = data.value; const row = { ...v, assignee: v.assignee || null, due_date: v.due_date || null, planner_item_id: v.planner_item_id || null };
    const res = id ? await db.from('tasks').update(row).eq('id', id).select('id').single() : await db.from('tasks').insert({ ...row, ...owner() }).select('id').single();
    if (res.error) fail(res.error, 'The task could not be saved.'); return { id: res.data.id as string };
  }
  if (data.kind === 'comment') {
    const { error } = await db.from('planner_comments').insert({ item_id: data.value.item_id, body: data.value.body, author: uid }); if (error) fail(error, 'The comment could not be saved.'); return { id: data.value.item_id };
  }
  if (!access.publish) throw new Error('Only editors and admins can delete items.');
  const { error } = await db.from(data.value.table).delete().eq('id', data.value.id); if (error) fail(error, 'The item could not be deleted.');
  if (data.value.table === 'videos') await db.from('content_sources').delete().eq('content_type', 'video').eq('content_id', data.value.id);
  if (data.value.table === 'posts') await db.from('content_sources').delete().eq('content_type', 'post').eq('content_id', data.value.id);
  return { id: data.value.id };
});

/** Safe web address for an imported YouTube video (YouTube ids may contain "_" and capital letters). */
export function youtubeSlug(id: string, salt = ''): string {
  const part = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'video';
  return ['yt', part, salt].filter(Boolean).join('-').replace(/-+/g, '-');
}
/** Adds new uploads from the channel feed as draft videos (never published automatically). Shared by the button and the hourly job. */
export async function importChannelFeed(db: any, createdBy: string | null): Promise<{ found: number; added: number }> {
  const s = await db.from('settings').select('youtube_channel_id').single(); const channel = (s.data?.youtube_channel_id || '').trim();
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(channel)) throw new Error('Add your YouTube channel ID (starts with UC…) in Settings first.');
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`, { headers: { 'user-agent': 'TAKTV-import/1.0' } });
  if (!res.ok) throw new Error('YouTube did not return the channel feed. Check the channel ID.');
  const entries = parseYouTubeFeed(await res.text());
  if (!entries.length) return { found: 0, added: 0 };
  const have = await db.from('videos').select('youtube_id').in('youtube_id', entries.map((e) => e.id)); const known = new Set((have.data || []).map((x: any) => x.youtube_id));
  let added = 0;
  for (const e of entries.filter((x) => !known.has(x.id))) {
    const te = /[\u0C00-\u0C7F]/.test(e.title);
    const row = { youtube_id: e.id, is_short: e.isShort, yt_published_at: e.published || null, title_te: te ? e.title : '', title_en: te ? '' : e.title, description_te: te ? e.description : '', description_en: te ? '' : e.description, language: te ? 'te' : 'en', status: 'draft', created_by: createdBy };
    let { error } = await db.from('videos').insert({ ...row, slug: youtubeSlug(e.id) });
    if (error?.code === '23505') ({ error } = await db.from('videos').insert({ ...row, slug: youtubeSlug(e.id, Math.random().toString(36).slice(2, 6)) }));
    if (!error) added++; else console.error('[youtube import]', e.id, error.message);
  }
  return { found: entries.length, added };
}
export const importYouTube = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase as any; const a = await who(db, context.userId);
  if (!a.publish) throw new Error('Only editors and admins can import from YouTube.');
  return importChannelFeed(db, context.userId);
});

export const convertQueryToIdea = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any; const a = await who(db, context.userId);
    if (!a.moderate && !a.publish) throw new Error('Only the citizen desk or editors can do this.');
    const q = await db.from('queries').select('id,ref_no,title,body,category_id,district,mandal,status').eq('id', data.id).single();
    if (q.error || !q.data) throw new Error('That issue could not be found.');
    const exists = await db.from('planner_items').select('id').eq('query_id', data.id).maybeSingle();
    if (exists.data) return { id: exists.data.id as string, existing: true };
    const region = [q.data.mandal, q.data.district].filter(Boolean).join(', ');
    const ins = await db.from('planner_items').insert({ title_te: '', title_en: q.data.title, category_id: q.data.category_id, region, stage: 'idea', core_question: `Citizen issue ${q.data.ref_no}: ${String(q.data.body).slice(0, 400)}`, query_id: data.id, created_by: context.userId }).select('id').single();
    if (ins.error) fail(ins.error, 'The content idea could not be created.');
    if (!['content_planned', 'published', 'resolved'].includes(q.data.status)) {
      await db.from('queries').update({ status: 'content_planned' }).eq('id', data.id);
      await db.from('query_events').insert({ query_id: data.id, actor: context.userId, event: 'status', detail: { status: 'content_planned', from: q.data.status, via: 'convert_to_idea' } });
    }
    return { id: ins.data.id as string, existing: false };
  });

type Dup = { id: string; slug: string; title: string; status: string };
async function findDuplicate(db: any, youtubeId: string, exceptId?: string): Promise<Dup | null> {
  let q = db.from('videos').select('id,slug,title_te,title_en,status').eq('youtube_id', youtubeId).limit(1);
  if (exceptId) q = q.neq('id', exceptId);
  const { data } = await q;
  const r = data?.[0]; return r ? { id: r.id, slug: r.slug, title: r.title_te || r.title_en || r.slug, status: r.status } : null;
}

export type YouTubeLookup = {
  id: string; isShort: boolean; maybeShort: boolean; duplicate: Dup | null; availability: Availability;
  title: string; titleField: 'te' | 'en'; channel: string; description: string; seconds: number | null; publishedAt: string; tags: string[];
  usedApi: boolean;
};
/**
 * Reads a pasted YouTube link: checks it, refuses duplicates, and fetches the title/channel (oEmbed, no key) plus — when the
 * YOUTUBE_API_KEY server secret is set — description, length, publish date and tags. Nothing is saved here.
 */
export const lookupYouTube = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { link: string; exceptId?: string | null }) => z.object({ link: z.string().trim().min(1).max(300), exceptId: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<YouTubeLookup> => {
    const db = context.supabase as any; const a = await who(db, context.userId);
    if (!a.member) throw new Error('Newsroom access is required.');
    const link = parseYouTubeLink(data.link);
    if (!link) throw new Error('That is not a YouTube video link. Copy the link from the YouTube app (Share → Copy link) and paste it here.');
    const duplicate = await findDuplicate(db, link.id, data.exceptId || undefined);
    const { fetchOEmbed, fetchApi } = await import('./youtube.server');
    const [oe, api] = await Promise.all([fetchOEmbed(link.id, link.isShort), fetchApi(link.id)]);
    const title = api?.title || oe.info?.title || '';
    const availability: Availability = api ? (api.privacy === 'private' ? 'unavailable' : api.embeddable ? 'ok' : 'not_embeddable') : oe.availability;
    return {
      id: link.id, isShort: looksLikeShort(link, !!oe.info?.vertical), maybeShort: maybeShort(link, api?.seconds) && !oe.info?.vertical, duplicate, availability,
      title, titleField: isTelugu(title) ? 'te' : 'en', channel: api?.channel || oe.info?.channel || '', description: api?.description || '',
      seconds: api?.seconds ?? null, publishedAt: api?.publishedAt || '', tags: api?.tags || [], usedApi: !!api,
    };
  });

/** Runs the YouTube availability check now (editors/admins). The same check runs weekly from /api/cron/youtube-health. */
export const checkYouTubeHealth = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase as any; const a = await who(db, context.userId);
  if (!a.publish) throw new Error('Only editors and admins can run the YouTube check.');
  const { checkVideoHealth } = await import('./youtube.server');
  return checkVideoHealth(db);
});
