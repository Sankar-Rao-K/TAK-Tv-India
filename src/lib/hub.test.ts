import { describe, expect, it } from 'vitest';
import { parseYouTubeId, slugFromTitle, parseYouTubeFeed } from './hub.functions';
import { buildTicker, canPublishRole, canModerateRole, isOlderData, ldVideo, langAllowed, visibleLangs, pick, meta } from './news';

describe('YouTube helpers', () => {
  it('reads every common link shape', () => {
    for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/live/dQw4w9WgXcQ?si=x', 'dQw4w9WgXcQ']) expect(parseYouTubeId(u)).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBe('');
    expect(parseYouTubeId('not a link')).toBe('');
  });
  it('parses the channel feed', () => {
    const xml = '<feed><entry><yt:videoId>dQw4w9WgXcQ</yt:videoId><title>A &amp; B</title><published>2026-10-26T01:00:00+00:00</published><media:group><media:description>Hello</media:description></media:group></entry></feed>';
    expect(parseYouTubeFeed(xml)).toEqual([{ id: 'dQw4w9WgXcQ', title: 'A & B', description: 'Hello', published: '2026-10-26T01:00:00+00:00', isShort: false }]);
  });
  it('makes safe web addresses', () => { expect(slugFromTitle('Farmer Income: Is MSP Reaching?', 'x')).toBe('farmer-income-is-msp-reaching'); expect(slugFromTitle('రైతు', 'video-abc')).toBe('video-abc'); });
});
describe('roles and languages', () => {
  it('lets only editors publish and the citizen desk moderate', () => {
    expect(['admin', 'editor', 'editor_in_chief'].every(canPublishRole)).toBe(true);
    expect(['reporter', 'scriptwriter', 'moderator', 'research_analyst'].some(canPublishRole)).toBe(false);
    expect(canModerateRole('moderator')).toBe(true); expect(canModerateRole('reporter')).toBe(false);
  });
  it('hides Hindi unless switched on', () => { expect(visibleLangs(false)).toEqual(['en', 'te']); expect(visibleLangs(true)).toEqual(['en', 'hi', 'te']); expect(langAllowed('hi', false)).toBe(false); expect(langAllowed('te', false)).toBe(true); });
  it('falls back between Telugu and English', () => { expect(pick('తెలుగు', '', 'en')).toBe('తెలుగు'); expect(pick('', 'English', 'te')).toBe('English'); });
});
describe('ticker, data freshness and SEO', () => {
  it('shows the newest items automatically, across stories, videos and posts', () => {
    const t = buildTicker([{ id: '1', title: 'old', kind: 'story', slug: 'a', lang: 'te', at: '2026-10-01T00:00:00Z' }, { id: '2', title: 'new video', kind: 'video', slug: 'b', lang: 'te', at: '2026-10-20T00:00:00Z' }, { id: '3', title: 'english story', kind: 'story', slug: 'c', lang: 'en', at: '2026-10-25T00:00:00Z' }], 'te', 5);
    expect(t.map((x) => x.id)).toEqual(['2', '1']);
  });
  it('flags data older than three years', () => { const now = new Date('2026-10-26'); expect(isOlderData(2011, now)).toBe(true); expect(isOlderData(2024, now)).toBe(false); expect(isOlderData(null, now)).toBe(false); });
  it('builds video structured data and canonical links', () => {
    expect(ldVideo({ url: 'https://x.in/te/videos/a', name: 'A', description: '', youtubeId: 'dQw4w9WgXcQ', uploaded: '2026-10-26' })).toMatchObject({ '@type': 'VideoObject', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' });
    const m = meta('T', 'D', false, { canonical: 'https://x.in/a' }); expect(m.links?.[0]).toEqual({ rel: 'canonical', href: 'https://x.in/a' });
    expect(meta('T', 'D', true, { canonical: 'https://x.in/a' }).links).toBeUndefined();
  });
});
