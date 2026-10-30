// Server-only YouTube calls. oEmbed needs no key; the optional YOUTUBE_API_KEY (server secret) adds description,
// length, publish date and tags. Nothing here downloads or stores video files or thumbnails.
import { availabilityFromStatus, parseApiVideo, parseOEmbed, watchUrl, type ApiInfo, type Availability, type OEmbedInfo } from './youtube';

async function get(url: string, ms = 8000): Promise<Response | null> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { signal: ctl.signal, headers: { 'user-agent': 'TAKTV/1.0' } }); } catch { return null; } finally { clearTimeout(t); }
}

export async function fetchOEmbed(id: string, isShort = false): Promise<{ availability: Availability; info: OEmbedInfo | null }> {
  const res = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(id, isShort))}`);
  if (!res) return { availability: 'unknown', info: null };
  const availability = availabilityFromStatus(res.status);
  const info = availability === 'ok' ? parseOEmbed(await res.json().catch(() => null)) : null;
  return { availability, info };
}

export const apiKeyConfigured = () => !!process.env['YOUTUBE_API_KEY'];
export async function fetchApi(id: string): Promise<ApiInfo | null> {
  const key = process.env['YOUTUBE_API_KEY'];
  if (!key) return null;
  const res = await get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}`);
  if (!res || !res.ok) return null;
  return parseApiVideo(await res.json().catch(() => null));
}

/**
 * Weekly health check: asks oEmbed about every live or scheduled video and records whether YouTube can still play it
 * (`ok`, `not_embeddable`, `unavailable`, or `unknown` when YouTube could not be reached). Never unpublishes anything.
 */
export async function checkVideoHealth(db: any, limit = 500): Promise<{ checked: number; ok: number; problems: number; unknown: number }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await db.from('videos').select('id,youtube_id,is_short').in('status', ['published', 'scheduled']).neq('youtube_id', '').order('yt_checked_at', { ascending: true, nullsFirst: true }).limit(limit);
  let ok = 0, problems = 0, unknown = 0;
  for (const v of (data || []) as { id: string; youtube_id: string; is_short: boolean }[]) {
    const { availability } = await fetchOEmbed(v.youtube_id, v.is_short);
    if (availability === 'unknown') { unknown++; continue; } // YouTube not reachable: keep the last known state
    await db.from('videos').update({ yt_status: availability, yt_checked_at: new Date().toISOString() }).eq('id', v.id);
    if (availability === 'ok') ok++; else problems++;
  }
  return { checked: (data || []).length, ok, problems, unknown };
}
