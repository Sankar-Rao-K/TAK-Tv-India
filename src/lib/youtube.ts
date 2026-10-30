// Pure YouTube helpers: link parsing, Shorts detection, thumbnail fallback order, oEmbed / Data API parsing.
// No network or server code here, so the browser and the tests can use it.

export type ParsedLink = { id: string; isShort: boolean };

/**
 * Reads a YouTube video id from any common link: watch?v=, youtu.be/, /shorts/, /live/, /embed/, /v/,
 * youtube-nocookie.com and m./music. hosts, or a bare 11-character id. Returns null when it is not a YouTube video link.
 */
export function parseYouTubeLink(input: string): ParsedLink | null {
  const v = (input || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return { id: v, isShort: false };
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); } catch { return null; }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  const ok = (id: string | undefined | null) => (id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null);
  if (host === 'youtu.be') { const id = ok(u.pathname.split('/')[1]); return id ? { id, isShort: false } : null; }
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] === 'watch') { const id = ok(u.searchParams.get('v')); return id ? { id, isShort: false } : null; }
  if (['shorts', 'live', 'embed', 'v', 'e'].includes(parts[0] || '')) { const id = ok(parts[1]); return id ? { id, isShort: parts[0] === 'shorts' } : null; }
  return null;
}

export const watchUrl = (id: string, isShort = false) => (isShort ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`);
/** Privacy-friendly player, loaded only after the visitor clicks. */
export const embedUrl = (id: string, autoplay = true) => `https://www.youtube-nocookie.com/embed/${id}?${autoplay ? 'autoplay=1&' : ''}rel=0&playsinline=1`;

/**
 * Thumbnail addresses to try, best first. Thumbnails are always shown straight from YouTube (i.ytimg.com) —
 * never downloaded or stored by us. Shorts first try YouTube's vertical frame.
 */
export function thumbCandidates(id: string, isShort = false): string[] {
  const base = `https://i.ytimg.com/vi/${id}`;
  return [...(isShort ? [`${base}/oardefault.jpg`] : []), `${base}/maxresdefault.jpg`, `${base}/hqdefault.jpg`, `${base}/mqdefault.jpg`];
}
/** A thumbnail that always exists for a public video (used for social previews). */
export const shareThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
/** YouTube answers a missing size with a tiny grey 120×90 picture instead of an error. */
export function isPlaceholderThumb(naturalWidth: number): boolean { return naturalWidth > 0 && naturalWidth <= 120; }
/** Next thumbnail to try after `current` failed or turned out to be the grey placeholder ('' = show our neutral placeholder). */
export function nextThumb(candidates: string[], current: string): string {
  const i = candidates.indexOf(current);
  return i >= 0 && i + 1 < candidates.length ? candidates[i + 1]! : '';
}

/** ISO-8601 duration from the Data API (e.g. PT1H2M3S) → seconds. Returns null when it cannot be read. */
export function parseIsoDuration(s: string | null | undefined): number | null {
  const m = (s || '').match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!m || s === 'P' || s === 'PT') return null;
  const [, d, h, mi, se] = m;
  return Math.round(Number(d || 0) * 86400 + Number(h || 0) * 3600 + Number(mi || 0) * 60 + Number(se || 0));
}
export function isoDuration(seconds: number | null | undefined): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || (!h && !m) ? `${s}S` : ''}`;
}
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
/** Shorts are vertical videos of up to 3 minutes. Without the link we can only suggest it from the length; staff confirm. */
export const SHORT_MAX_SECONDS = 180;
/** Certain only from a /shorts/ link (or a vertical player reported by YouTube). */
export function looksLikeShort(link: ParsedLink | null, vertical = false): boolean { return !!link?.isShort || vertical; }
/** Up to 3 minutes long but not a /shorts/ link: could be a Short or a normal short video — staff decide. */
export function maybeShort(link: ParsedLink | null, seconds: number | null | undefined): boolean {
  return !link?.isShort && !!seconds && seconds > 0 && seconds <= SHORT_MAX_SECONDS;
}
/** Telugu script → Telugu field, anything else → English field. */
export const isTelugu = (s: string) => /[ఀ-౿]/.test(s || '');

export type OEmbedInfo = { title: string; channel: string; thumbnail: string; vertical: boolean };
/** Parses YouTube's oEmbed answer (no key needed). */
export function parseOEmbed(json: unknown): OEmbedInfo | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const title = typeof o['title'] === 'string' ? o['title'] : '';
  if (!title) return null;
  const w = Number(o['width'] || 0), h = Number(o['height'] || 0);
  return { title, channel: typeof o['author_name'] === 'string' ? o['author_name'] : '', thumbnail: typeof o['thumbnail_url'] === 'string' ? o['thumbnail_url'] : '', vertical: w > 0 && h > w };
}
/** oEmbed status → availability: 200 ok, 401/403 embedding switched off by the owner, 400/404 private or removed. */
export type Availability = 'ok' | 'not_embeddable' | 'unavailable' | 'unknown';
export function availabilityFromStatus(status: number): Availability {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 401 || status === 403) return 'not_embeddable';
  if (status === 400 || status === 404) return 'unavailable';
  return 'unknown';
}

export type ApiInfo = { title: string; description: string; channel: string; publishedAt: string; tags: string[]; seconds: number | null; embeddable: boolean; privacy: string; live: boolean };
/** Parses one item of the YouTube Data API `videos.list?part=snippet,contentDetails,status` answer. */
export function parseApiVideo(json: unknown): ApiInfo | null {
  const item = (json as { items?: unknown[] } | null)?.items?.[0] as Record<string, Record<string, unknown>> | undefined;
  if (!item) return null;
  const sn = item['snippet'] || {}, cd = item['contentDetails'] || {}, st = item['status'] || {};
  return {
    title: String(sn['title'] || ''), description: String(sn['description'] || ''), channel: String(sn['channelTitle'] || ''),
    publishedAt: String(sn['publishedAt'] || ''), tags: Array.isArray(sn['tags']) ? (sn['tags'] as unknown[]).map(String).slice(0, 15) : [],
    seconds: parseIsoDuration(String(cd['duration'] || '')), embeddable: st['embeddable'] !== false, privacy: String(st['privacyStatus'] || ''),
    live: String(sn['liveBroadcastContent'] || 'none') !== 'none',
  };
}

/** A video draft is missing details the editor must add before it can go live. */
export function needsDetails(v: { category_id: string | null; title_te: string; title_en: string; youtube_id: string }, sourceCount: number): string[] {
  const miss: string[] = [];
  if (!v.youtube_id) miss.push('YouTube link');
  if (!v.title_te.trim() && !v.title_en.trim()) miss.push('title');
  if (!v.category_id) miss.push('category');
  if (sourceCount < 1) miss.push('Sources & Proofs');
  return miss;
}
