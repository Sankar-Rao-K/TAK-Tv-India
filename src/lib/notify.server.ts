// E-mail moderators about new citizen issues. Server-only.
// Needs RESEND_API_KEY and NOTIFY_FROM (a sender on a domain verified with Resend). Optional NOTIFY_EMAILS (comma-separated) adds
// extra recipients. Without a key nothing is sent; the "new issues" badge in the newsroom still works.
// The e-mail contains only the reference, title, place and topic — never contact details or evidence.
import { supabaseAdmin } from '@/integrations/supabase/client.server';

type Pending = { id: string; ref_no: string; title: string; district: string; mandal: string; category_id: string | null; created_at: string };
export type NotifyResult = { sent: boolean; issues: number; recipients: number; reason?: string };

async function recipients(): Promise<string[]> {
  const roles = await supabaseAdmin.from('user_roles').select('user_id,role').in('role', ['admin', 'editor_in_chief', 'moderator']);
  const ids = (roles.data || []).map((r) => r.user_id);
  const prof = ids.length ? await supabaseAdmin.from('profiles').select('id,email').in('id', ids) : { data: [] as { id: string; email: string }[] };
  const extra = (process.env['NOTIFY_EMAILS'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([...(prof.data || []).map((p) => p.email), ...extra].filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))];
}

/** Sends one e-mail covering every new, not-yet-notified issue from the last 7 days (or only the given ids). */
export async function notifyModerators(opts: { ids?: string[]; origin?: string } = {}): Promise<NotifyResult> {
  const key = process.env['RESEND_API_KEY']; const from = process.env['NOTIFY_FROM'];
  if (!key || !from) return { sent: false, issues: 0, recipients: 0, reason: 'E-mail is not configured (RESEND_API_KEY / NOTIFY_FROM).' };
  let q = supabaseAdmin.from('queries').select('id,ref_no,title,district,mandal,category_id,created_at').eq('status', 'new').eq('is_blocked', false).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).order('created_at').limit(100);
  if (opts.ids?.length) q = q.in('id', opts.ids);
  const { data: rows } = await q;
  const candidates = (rows || []) as Pending[];
  if (!candidates.length) return { sent: false, issues: 0, recipients: 0, reason: 'Nothing new.' };
  const done = await supabaseAdmin.from('query_events').select('query_id').eq('event', 'moderators_notified').in('query_id', candidates.map((c) => c.id));
  const already = new Set((done.data || []).map((d) => d.query_id));
  const pending = candidates.filter((c) => !already.has(c.id));
  if (!pending.length) return { sent: false, issues: 0, recipients: 0, reason: 'Already notified.' };
  const to = await recipients();
  if (!to.length) return { sent: false, issues: pending.length, recipients: 0, reason: 'No moderator e-mail addresses.' };

  const settings = await supabaseAdmin.from('settings').select('site_url,site_name').single();
  const origin = (settings.data?.site_url || opts.origin || '').replace(/\/$/, '');
  const site = settings.data?.site_name || 'TAK TV India';
  const lines = pending.map((p) => `• ${p.ref_no} — ${p.title}${[p.mandal, p.district].filter(Boolean).length ? ` (${[p.mandal, p.district].filter(Boolean).join(', ')})` : ''}`);
  const text = `${pending.length} new citizen issue(s) are waiting in the ${site} newsroom:\n\n${lines.join('\n')}\n\nOpen the Citizen Issues desk to review them${origin ? `: ${origin}/admin` : '.'}\n\nContact details and evidence are only visible after signing in.`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: `${pending.length} new citizen issue(s) — ${site}`, text }),
  }).catch((e) => { console.error('[notify] request failed', e); return null; });
  if (!res || !res.ok) { console.error('[notify] e-mail provider refused', res?.status); return { sent: false, issues: pending.length, recipients: to.length, reason: 'The e-mail provider did not accept the message.' }; }
  await supabaseAdmin.from('query_events').insert(pending.map((p) => ({ query_id: p.id, actor: null, event: 'moderators_notified', detail: { recipients: to.length } })));
  return { sent: true, issues: pending.length, recipients: to.length };
}
