import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { EVIDENCE_TYPES, MAX_FILES, MAX_TOTAL_BYTES, bytesMatch, checkFile, detectType } from './evidence';

// Citizen submissions never touch the database from the browser. The flow is:
//  1. startIssue  — checks CAPTCHA, rate limit and the form, saves the issue, and hands back one-time signed upload tickets.
//  2. the browser uploads each file straight to the private `citizen-evidence` bucket with its ticket (≤150 MB videos).
//  3. finishIssue — reads the first bytes of every uploaded file, keeps only files whose real bytes match their type,
//     records them and notifies moderators.

const issueSchema = z.object({
  title: z.string().trim().min(8).max(160),
  body: z.string().trim().min(30).max(5000),
  category_id: z.string().trim().max(60).optional().default(''),
  district: z.string().trim().max(80).optional().default(''),
  mandal: z.string().trim().max(80).optional().default(''),
  location_text: z.string().trim().max(200).optional().default(''),
  started_at: z.string().trim().max(60).optional().default(''),
  people_affected: z.string().trim().max(60).optional().default(''),
  name: z.string().trim().max(100).optional().default(''),
  phone: z.string().trim().max(20).regex(/^[0-9+\-\s]*$/).optional().default(''),
  email: z.union([z.literal(''), z.string().trim().email().max(255)]).optional().default(''),
  anonymous: z.boolean(),
  consent_truth: z.literal(true),
  consent_use: z.literal(true),
  consent_public: z.boolean(),
  lat: z.number().min(-90).max(90).nullable().optional().default(null),
  lng: z.number().min(-180).max(180).nullable().optional().default(null),
  website: z.string().max(0).optional().default(''), // honeypot
});
const manifestSchema = z.array(z.object({ name: z.string().max(255), type: z.string().max(120), size: z.number().int().positive() })).max(MAX_FILES).default([]);
const startSchema = z.object({ issue: issueSchema, files: manifestSchema, captcha: z.string().max(2048).default('') });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomCode(len: number, alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}
const round5 = (n: number | null) => (n === null ? null : Math.round(n * 1e5) / 1e5);
type PendingFile = { path: string; type: string; size: number };

/** Public, non-secret settings the Raise-Issue form needs (Turnstile site key). */
export const getCitizenConfig = createServerFn({ method: 'GET' }).handler(async () => ({ turnstileSiteKey: process.env['TURNSTILE_SITE_KEY'] || '' }));

export const startIssue = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => {
    const parsed = startSchema.safeParse(d);
    if (!parsed.success) throw new Error('Please check the form: ' + [...new Set(parsed.error.issues.map((i) => i.path.slice(-1).join('.')))].join(', '));
    let total = 0;
    const files = parsed.data.files.map((f) => {
      const c = checkFile(f.name, f.type, f.size);
      if (!c.ok) throw new Error(c.reason === 'type' ? 'Only JPG, PNG, WEBP, HEIC photos, MP4/MOV videos and PDF/DOCX documents are allowed.' : 'Videos can be up to 150 MB; photos and documents up to 15 MB.');
      total += f.size; return { type: c.type, size: f.size };
    });
    if (total > MAX_TOTAL_BYTES) throw new Error('All files together must be 300 MB or smaller.');
    return { issue: parsed.data.issue, files, captcha: parsed.data.captcha };
  })
  .handler(async ({ data }) => {
    const { getRequestHeader } = await import('@tanstack/react-start/server');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { verifyTurnstile } = await import('./turnstile.server');
    const ip = getRequestHeader('cf-connecting-ip') || getRequestHeader('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!(await verifyTurnstile(data.captcha, ip))) throw new Error('Please complete the “I am human” check and try again.');
    const ipHash = await sha256('tak-ip:' + ip);
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from('query_events').select('id', { count: 'exact', head: true }).eq('event', 'submitted').gte('created_at', since).contains('detail', { ip: ipHash });
    if ((count || 0) >= 5) throw new Error('Too many submissions from your connection. Please try again in an hour.');

    const i = data.issue;
    if (i.category_id) {
      const c = await db.from('categories').select('id').eq('id', i.category_id).maybeSingle();
      if (!c.data) i.category_id = '';
    }
    const d = new Date();
    const ref = `TAK-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}-${randomCode(6)}`;
    const secret = randomCode(8);
    const secretHash = await sha256(ref + ':' + secret);
    const hasPoint = typeof i.lat === 'number' && typeof i.lng === 'number';
    const ins = await db.from('queries').insert({
      ref_no: ref, secret_hash: secretHash, title: i.title, body: i.body,
      category_id: i.category_id || null, district: i.district, mandal: i.mandal, location_text: i.location_text,
      lat: hasPoint ? round5(i.lat) : null, lng: hasPoint ? round5(i.lng) : null,
      started_at: i.started_at, people_affected: i.people_affected,
      consent_truth: true, consent_use: true, consent_public: i.consent_public,
      submitter_name: i.anonymous ? '' : i.name,
    }).select('id').single();
    if (ins.error || !ins.data) { console.error('startIssue insert', ins.error); throw new Error('Your issue could not be saved. Please try again.'); }
    const id = ins.data.id;
    if (!i.anonymous && (i.name || i.phone || i.email)) {
      await db.from('query_contacts').insert({ query_id: id, name: i.name, phone: i.phone, email: i.email });
    }
    const pending: PendingFile[] = []; const uploads: { path: string; token: string; type: string }[] = [];
    for (const f of data.files) {
      const path = `${id}/${crypto.randomUUID()}.${EVIDENCE_TYPES[f.type]!.ext}`;
      const t = await db.storage.from('citizen-evidence').createSignedUploadUrl(path);
      if (t.error || !t.data) { console.error('signed upload', t.error); continue; }
      pending.push({ path, type: f.type, size: f.size }); uploads.push({ path, token: t.data.token, type: f.type });
    }
    await db.from('query_events').insert({ query_id: id, event: 'submitted', detail: { ip: ipHash, files: data.files.length, pending } });
    if (!pending.length) {
      const { notifyModerators } = await import('./notify.server');
      await notifyModerators({ ids: [id] }).catch((e) => console.error('[notify]', e));
    }
    return { ref, secret, uploads };
  });

/** Reads up to `n` bytes from the start of a stored file and reports its total size, without downloading all of it. */
async function head(url: string, n = 64): Promise<{ bytes: Uint8Array; size: number } | null> {
  const res = await fetch(url, { headers: { Range: `bytes=0-${n - 1}` } });
  if (!res.ok || !res.body) return null;
  const range = res.headers.get('content-range'); const len = Number(res.headers.get('content-length') || 0);
  const size = range ? Number(range.split('/')[1]) : len;
  const reader = res.body.getReader(); const chunks: Uint8Array[] = []; let got = 0;
  while (got < n) { const { done, value } = await reader.read(); if (done || !value) break; chunks.push(value); got += value.length; }
  await reader.cancel().catch(() => undefined);
  const bytes = new Uint8Array(Math.min(got, n)); let o = 0;
  for (const c of chunks) { const part = c.slice(0, n - o); bytes.set(part, o); o += part.length; if (o >= n) break; }
  return { bytes, size: Number.isFinite(size) ? size : 0 };
}

export const finishIssue = createServerFn({ method: 'POST' })
  .inputValidator((d: { ref: string; secret: string }) => z.object({ ref: z.string().trim().toUpperCase().min(5).max(40), secret: z.string().trim().toUpperCase().min(4).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const q = await db.from('queries').select('id,secret_hash,created_at').eq('ref_no', data.ref).maybeSingle();
    if (!q.data || q.data.secret_hash !== (await sha256(data.ref + ':' + data.secret))) throw new Error('Issue not found.');
    if (Date.now() - new Date(q.data.created_at).getTime() > 6 * 3600_000) throw new Error('This upload has expired.');
    const id = q.data.id;
    const [sub, fin] = await Promise.all([
      db.from('query_events').select('detail').eq('query_id', id).eq('event', 'submitted').maybeSingle(),
      db.from('query_events').select('id', { count: 'exact', head: true }).eq('query_id', id).eq('event', 'files_added'),
    ]);
    if ((fin.count || 0) > 0) return { accepted: 0, rejected: 0 };
    const pending = (((sub.data?.detail || {}) as { pending?: PendingFile[] }).pending || []).filter((p) => typeof p.path === 'string' && p.path.startsWith(`${id}/`));
    let accepted = 0; let rejected = 0;
    for (const p of pending) {
      const info = EVIDENCE_TYPES[p.type]; if (!info) continue;
      const signed = await db.storage.from('citizen-evidence').createSignedUrl(p.path, 120);
      if (signed.error || !signed.data) continue; // never uploaded
      const h = await head(signed.data.signedUrl).catch(() => null);
      if (!h) continue;
      const detected = detectType(h.bytes);
      const sizeOk = h.size > 0 && h.size <= p.size + 1024 && checkFile(`x.${info.ext}`, p.type, h.size).ok;
      if (!bytesMatch(p.type, detected) || !sizeOk) {
        await db.storage.from('citizen-evidence').remove([p.path]); rejected++; continue;
      }
      const r = await db.from('query_files').insert({ query_id: id, path: p.path, kind: info.kind, content_type: p.type, size: h.size });
      if (!r.error) accepted++;
    }
    await db.from('query_events').insert({ query_id: id, event: 'files_added', detail: { files: accepted, rejected } });
    const { notifyModerators } = await import('./notify.server');
    await notifyModerators({ ids: [id] }).catch((e) => console.error('[notify]', e));
    return { accepted, rejected };
  });

const PUBLIC_STATUS: Record<string, string> = {
  new: 'received', under_review: 'review', need_more_info: 'info', researching: 'research', verified: 'research',
  content_planned: 'production', published: 'published', resolved: 'closed', rejected: 'closed', duplicate: 'closed', spam: 'closed',
};

export const trackIssue = createServerFn({ method: 'POST' })
  .inputValidator((d: { ref: string; secret: string }) =>
    z.object({ ref: z.string().trim().toUpperCase().min(5).max(40), secret: z.string().trim().toUpperCase().min(4).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const q = await db.from('queries').select('id,ref_no,secret_hash,title,status,created_at,updated_at,published_followup,followup_summary').eq('ref_no', data.ref).maybeSingle();
    const hash = await sha256(data.ref + ':' + data.secret);
    if (!q.data || q.data.secret_hash !== hash) return { found: false as const };
    const ev = await db.from('query_events').select('event,detail,created_at').eq('query_id', q.data.id).in('event', ['submitted', 'status', 'status_changed']).order('created_at');
    const timeline = (ev.data || []).map((e) => ({
      stage: e.event === 'submitted' ? 'received' : PUBLIC_STATUS[String((e.detail as Record<string, unknown>)?.['status'] || (e.detail as Record<string, unknown>)?.['to'] || '')] || 'review',
      at: e.created_at,
    }));
    return {
      found: true as const,
      ref: q.data.ref_no, title: q.data.title, stage: PUBLIC_STATUS[q.data.status] || 'review',
      created_at: q.data.created_at, updated_at: q.data.updated_at,
      followup: q.data.published_followup ? q.data.followup_summary : '',
      timeline,
    };
  });
