import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const QUERY_STATUSES = ['new', 'under_review', 'need_more_info', 'researching', 'verified', 'content_planned', 'published', 'resolved', 'rejected', 'duplicate', 'spam'] as const;
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

async function access(db: any, userId: string) {
  const [m, mod, pub] = await Promise.all([
    db.rpc('is_newsroom_member', { _user_id: userId }),
    db.rpc('can_moderate', { _user_id: userId }),
    db.rpc('can_publish', { _user_id: userId }),
  ]);
  return { member: !!m.data, moderate: !!mod.data, manage: !!mod.data || !!pub.data };
}

export const listQueries = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase;
  const a = await access(db, context.userId);
  if (!a.member) throw new Error('Newsroom access is required.');
  const { data, error } = await db.from('queries').select('id,ref_no,title,status,priority,assignee,district,mandal,category_id,created_at,updated_at,submitter_name').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error('Citizen issues could not be loaded.');
  const ids = (data || []).map((x) => x.id);
  // First action by a newsroom member (events written by the citizen/system have no actor).
  const [ev, pl] = ids.length ? await Promise.all([
    db.from('query_events').select('query_id,created_at').in('query_id', ids).not('actor', 'is', null).order('created_at', { ascending: true }).limit(5000),
    db.from('planner_items').select('id,query_id').in('query_id', ids),
  ]) : [{ data: [] as { query_id: string; created_at: string }[] }, { data: [] as { id: string; query_id: string | null }[] }];
  const first = new Map<string, string>(); for (const e of ev.data || []) if (!first.has(e.query_id)) first.set(e.query_id, e.created_at);
  const planner = new Map<string, string>(); for (const p of pl.data || []) if (p.query_id) planner.set(p.query_id, p.id);
  return { items: (data || []).map((x) => ({ ...x, first_response_at: first.get(x.id) || null, planner_id: planner.get(x.id) || null })), access: a };
});

/** Number of issues still marked "new" — drives the badge in the newsroom menu. */
export const countNewIssues = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { count, error } = await context.supabase.from('queries').select('id', { count: 'exact', head: true }).eq('status', 'new').eq('is_blocked', false);
  return { count: error ? 0 : count || 0 };
});
export const newIssuesOptions = queryOptions({ queryKey: ['citizen-new-count'], queryFn: () => countNewIssues(), staleTime: 30000, refetchInterval: 60000, refetchIntervalInBackground: false });
export const queriesOptions = queryOptions({ queryKey: ['citizen-queries'], queryFn: () => listQueries(), staleTime: 5000 });

export const getQuery = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const a = await access(db, context.userId);
    if (!a.member) throw new Error('Newsroom access is required.');
    const q = await db.from('queries').select('*').eq('id', data.id).single();
    if (q.error || !q.data) throw new Error('Issue not found.');
    const { secret_hash: _s, ...query } = q.data;
    const [notes, events, plan] = await Promise.all([
      db.from('query_notes').select('*').eq('query_id', data.id).order('created_at'),
      db.from('query_events').select('id,actor,event,detail,created_at').eq('query_id', data.id).order('created_at'),
      db.from('planner_items').select('id,title_te,title_en,stage,planned_date,owner,video_id,post_id').eq('query_id', data.id).maybeSingle(),
    ]);
    let contact = null as null | { name: string; phone: string; email: string };
    let files: { id: string; kind: string; content_type: string; size: number; url: string }[] = [];
    if (a.moderate) {
      const c = await db.from('query_contacts').select('name,phone,email').eq('query_id', data.id).maybeSingle();
      contact = c.data;
      const f = await db.from('query_files').select('*').eq('query_id', data.id).order('uploaded_at');
      files = await Promise.all((f.data || []).map(async (x) => {
        const u = await db.storage.from('citizen-evidence').createSignedUrl(x.path, 900);
        return { id: x.id, kind: x.kind, content_type: x.content_type, size: x.size, url: u.data?.signedUrl || '' };
      }));
    }
    return {
      query, contact, files, access: a, planner: plan.data || null,
      notes: notes.data || [],
      events: (events.data || []).map((e) => { const d: Record<string, string> = {}; for (const [k, v] of Object.entries((e.detail || {}) as Record<string, unknown>)) if (k !== 'ip' && k !== 'pending') d[k] = v == null ? '' : String(v); return { ...e, detail: d }; }),
    };
  });

export const updateQuery = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(QUERY_STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    assignee: z.string().uuid().nullable().optional(),
    followup_summary: z.string().trim().max(2000).optional(),
    published_followup: z.boolean().optional(),
    merged_into_ref: z.string().trim().max(40).optional(),
    is_blocked: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const a = await access(db, context.userId);
    if (!a.manage) throw new Error('Only moderators, editors and admins can change an issue.');
    const old = (await db.from('queries').select('status,priority,assignee').eq('id', data.id).single()).data;
    if (!old) throw new Error('Issue not found.');
    const { id, merged_into_ref, ...patch } = data;
    const update: Record<string, unknown> = { ...patch };
    if (merged_into_ref) {
      const target = await db.from('queries').select('id').eq('ref_no', merged_into_ref.toUpperCase()).maybeSingle();
      if (!target.data || target.data.id === id) throw new Error('Duplicate target reference not found.');
      update['merged_into'] = target.data.id; update['status'] = 'duplicate';
    }
    const { error } = await db.from('queries').update(update as never).eq('id', id);
    if (error) throw new Error('Issue could not be updated.');
    const events: { query_id: string; actor: string; event: string; detail: Record<string, string | boolean | null> }[] = [];
    if (update['status'] && update['status'] !== old.status) events.push({ query_id: id, actor: context.userId, event: 'status', detail: { status: String(update['status']), from: old.status } });
    if (patch.priority && patch.priority !== old.priority) events.push({ query_id: id, actor: context.userId, event: 'priority', detail: { priority: patch.priority } });
    if (patch.assignee !== undefined && patch.assignee !== old.assignee) events.push({ query_id: id, actor: context.userId, event: 'assigned', detail: { assignee: patch.assignee } });
    if (patch.followup_summary !== undefined || patch.published_followup !== undefined) events.push({ query_id: id, actor: context.userId, event: 'public_update', detail: { visible: !!patch.published_followup } });
    if (patch.is_blocked !== undefined) events.push({ query_id: id, actor: context.userId, event: patch.is_blocked ? 'blocked' : 'unblocked', detail: {} });
    if (events.length) await db.from('query_events').insert(events);
    return { ok: true };
  });

export const addQueryNote = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { error } = await db.from('query_notes').insert({ query_id: data.id, author: context.userId, body: data.body });
    if (error) throw new Error('Note could not be saved.');
    await db.from('query_events').insert({ query_id: data.id, actor: context.userId, event: 'note', detail: {} });
    return { ok: true };
  });
