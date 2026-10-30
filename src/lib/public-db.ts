import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/**
 * Server-side client with the public (anonymous) key, so row security decides what is visible — exactly what a visitor
 * may see. Call only inside server handlers.
 */
export function publicDb() {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']; const url = process.env['SUPABASE_URL'];
  if (!key || !url) throw new Error('News is temporarily unavailable.');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) h.delete('Authorization'); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } } });
}

/** Points every story-body photo at its stable /media/ address (the stored src may be an expired signed URL). */
export function stableBodyImages(html: string): string {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    const path = tag.match(/data-path="([^"]+)"/)?.[1];
    return path && /^[A-Za-z0-9/_.-]+$/.test(path) ? tag.replace(/src="[^"]*"/, `src="/media/${path}"`) : tag;
  });
}
