import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkVideoHealth, fetchApi, fetchOEmbed } from './youtube.server';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const answer = (status: number, body: unknown) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

describe('YouTube server calls (mocked network)', () => {
  it('oEmbed: title on success, availability on errors, unknown when offline', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (u: string) => { calls.push(u); return answer(200, { title: 'MSP reality check', author_name: 'TAK TV India', thumbnail_url: 'x', width: 200, height: 113 }); }));
    expect(await fetchOEmbed('dQw4w9WgXcQ', true)).toMatchObject({ availability: 'ok', info: { title: 'MSP reality check', channel: 'TAK TV India' } });
    expect(decodeURIComponent(calls[0]!)).toContain('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    vi.stubGlobal('fetch', vi.fn(async () => answer(401, 'Unauthorized')));
    expect((await fetchOEmbed('dQw4w9WgXcQ')).availability).toBe('not_embeddable');
    vi.stubGlobal('fetch', vi.fn(async () => answer(404, 'Not Found')));
    expect((await fetchOEmbed('dQw4w9WgXcQ')).availability).toBe('unavailable');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect((await fetchOEmbed('dQw4w9WgXcQ')).availability).toBe('unknown');
  });
  it('Data API is used only when YOUTUBE_API_KEY is set, and the key never leaves the server call', async () => {
    const f = vi.fn(async () => answer(200, { items: [{ snippet: { title: 'T' }, contentDetails: { duration: 'PT59S' }, status: {} }] }));
    vi.stubGlobal('fetch', f);
    vi.stubEnv('YOUTUBE_API_KEY', '');
    expect(await fetchApi('dQw4w9WgXcQ')).toBeNull(); expect(f).not.toHaveBeenCalled();
    vi.stubEnv('YOUTUBE_API_KEY', 'k123');
    expect((await fetchApi('dQw4w9WgXcQ'))?.seconds).toBe(59);
    expect(String((f.mock.calls[0] as unknown[])[0])).toMatch(/^https:\/\/www\.googleapis\.com\/youtube\/v3\/videos\?part=snippet,contentDetails,status&id=dQw4w9WgXcQ&key=k123$/);
  });
  it('health check flags unavailable videos and keeps the old state when YouTube is unreachable', async () => {
    const rows = [{ id: '1', youtube_id: 'aaaaaaaaaaa', is_short: false }, { id: '2', youtube_id: 'bbbbbbbbbbb', is_short: false }, { id: '3', youtube_id: 'ccccccccccc', is_short: true }];
    const updates: [string, unknown][] = [];
    const q: any = { select: () => q, in: () => q, neq: () => q, order: () => q, limit: async () => ({ data: rows }), update: (v: unknown) => ({ eq: async (_: string, id: string) => { updates.push([id, v]); return {}; } }) }; // eslint-disable-line @typescript-eslint/no-explicit-any
    const db = { from: () => q };
    vi.stubGlobal('fetch', vi.fn(async (u: string) => (u.includes('aaaaaaaaaaa') ? answer(200, { title: 'ok' }) : u.includes('bbbbbbbbbbb') ? answer(404, 'Not Found') : Promise.reject(new Error('timeout')))));
    expect(await checkVideoHealth(db)).toEqual({ checked: 3, ok: 1, problems: 1, unknown: 1 });
    expect(updates.map(([id, v]) => [id, (v as { yt_status: string }).yt_status])).toEqual([['1', 'ok'], ['2', 'unavailable']]);
  });
});
