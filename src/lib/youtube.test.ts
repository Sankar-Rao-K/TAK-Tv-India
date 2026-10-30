import { describe, expect, it } from 'vitest';
import { availabilityFromStatus, embedUrl, formatDuration, isoDuration, isPlaceholderThumb, isTelugu, looksLikeShort, maybeShort, needsDetails, nextThumb, parseApiVideo, parseIsoDuration, parseOEmbed, parseYouTubeLink, thumbCandidates, watchUrl } from './youtube';
import { parseYouTubeFeed } from './hub.functions';

const ID = 'dQw4w9WgXcQ';
describe('YouTube link parsing', () => {
  it('reads every link shape the team will paste', () => {
    for (const u of [`https://www.youtube.com/watch?v=${ID}`, `https://youtube.com/watch?feature=share&v=${ID}&t=42s`, `https://m.youtube.com/watch?v=${ID}`, `https://youtu.be/${ID}?si=abc`, `youtu.be/${ID}`, `https://www.youtube.com/live/${ID}?si=x`, `https://www.youtube.com/embed/${ID}`, `https://www.youtube-nocookie.com/embed/${ID}`, `https://music.youtube.com/watch?v=${ID}`, ID])
      expect(parseYouTubeLink(u)).toEqual({ id: ID, isShort: false });
  });
  it('marks Shorts links as Shorts', () => {
    expect(parseYouTubeLink(`https://youtube.com/shorts/${ID}?feature=share`)).toEqual({ id: ID, isShort: true });
    expect(parseYouTubeLink(`https://www.youtube.com/shorts/${ID}`)?.isShort).toBe(true);
  });
  it('rejects look-alikes and garbage', () => {
    for (const u of ['', 'hello', `https://evil.example/watch?v=${ID}`, `https://youtube.com.evil.example/watch?v=${ID}`, 'https://www.youtube.com/@TAKTVIndia', 'https://www.youtube.com/watch?v=short', `https://www.youtube.com/playlist?list=PL123`, 'javascript:alert(1)'])
      expect(parseYouTubeLink(u)).toBeNull();
  });
  it('builds watch and privacy-friendly embed links', () => {
    expect(watchUrl(ID, true)).toBe(`https://www.youtube.com/shorts/${ID}`);
    expect(embedUrl(ID)).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?autoplay=1&rel=0/);
  });
  it('reads Shorts from the channel feed', () => {
    const xml = `<feed><entry><yt:videoId>${ID}</yt:videoId><title>A</title><link rel="alternate" href="https://www.youtube.com/shorts/${ID}"/><published>2026-10-26T01:00:00+00:00</published></entry><entry><yt:videoId>aaaaaaaaaaa</yt:videoId><title>B</title><link rel="alternate" href="https://www.youtube.com/watch?v=aaaaaaaaaaa"/></entry></feed>`;
    expect(parseYouTubeFeed(xml).map((e) => e.isShort)).toEqual([true, false]);
  });
});

describe('thumbnail fallback', () => {
  it('tries maxres → hq → mq, Shorts start with the vertical frame, then gives up', () => {
    const c = thumbCandidates(ID);
    expect(c.map((u) => u.split('/').pop())).toEqual(['maxresdefault.jpg', 'hqdefault.jpg', 'mqdefault.jpg']);
    expect(c.every((u) => u.startsWith('https://i.ytimg.com/vi/'))).toBe(true);
    expect(thumbCandidates(ID, true)[0]).toMatch(/oardefault\.jpg$/);
    expect(nextThumb(c, c[0]!)).toBe(c[1]); expect(nextThumb(c, c[2]!)).toBe('');
  });
  it("spots YouTube's grey 120×90 placeholder", () => { expect(isPlaceholderThumb(120)).toBe(true); expect(isPlaceholderThumb(1280)).toBe(false); expect(isPlaceholderThumb(0)).toBe(false); });
});

describe('Shorts, length and language', () => {
  it('reads ISO durations', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723); expect(parseIsoDuration('PT45S')).toBe(45); expect(parseIsoDuration('P1DT2S')).toBe(86402); expect(parseIsoDuration('nonsense')).toBeNull(); expect(parseIsoDuration('PT')).toBeNull();
    expect(isoDuration(3723)).toBe('PT1H2M3S'); expect(isoDuration(60)).toBe('PT1M'); expect(isoDuration(null)).toBeUndefined();
    expect(formatDuration(3723)).toBe('1:02:03'); expect(formatDuration(59)).toBe('0:59');
  });
  it('marks a Short only from a /shorts/ link or a vertical player; a short length is just a hint', () => {
    expect(looksLikeShort({ id: ID, isShort: true })).toBe(true);
    expect(looksLikeShort({ id: ID, isShort: false }, true)).toBe(true);
    expect(looksLikeShort({ id: ID, isShort: false })).toBe(false);
    expect(maybeShort({ id: ID, isShort: false }, 120)).toBe(true);
    expect(maybeShort({ id: ID, isShort: false }, 600)).toBe(false);
    expect(maybeShort({ id: ID, isShort: true }, 45)).toBe(false);
  });
  it('sends Telugu titles to the Telugu field', () => { expect(isTelugu('రైతుల సమస్య')).toBe(true); expect(isTelugu('Farmers')).toBe(false); });
});

describe('YouTube answers', () => {
  it('parses oEmbed and its error codes', () => {
    expect(parseOEmbed({ title: 'T', author_name: 'TAK TV', thumbnail_url: 'https://i.ytimg.com/vi/x/hqdefault.jpg', width: 200, height: 113 })).toEqual({ title: 'T', channel: 'TAK TV', thumbnail: 'https://i.ytimg.com/vi/x/hqdefault.jpg', vertical: false });
    expect(parseOEmbed({ title: 'S', width: 113, height: 200 })?.vertical).toBe(true);
    expect(parseOEmbed({})).toBeNull(); expect(parseOEmbed('Not Found')).toBeNull();
    expect([200, 401, 403, 404, 400, 500].map(availabilityFromStatus)).toEqual(['ok', 'not_embeddable', 'not_embeddable', 'unavailable', 'unavailable', 'unknown']);
  });
  it('parses the Data API answer', () => {
    const r = parseApiVideo({ items: [{ snippet: { title: 'T', description: 'D', channelTitle: 'C', publishedAt: '2026-10-01T05:00:00Z', tags: ['a', 'b'], liveBroadcastContent: 'none' }, contentDetails: { duration: 'PT2M5S' }, status: { embeddable: false, privacyStatus: 'public' } }] });
    expect(r).toEqual({ title: 'T', description: 'D', channel: 'C', publishedAt: '2026-10-01T05:00:00Z', tags: ['a', 'b'], seconds: 125, embeddable: false, privacy: 'public', live: false });
    expect(parseApiVideo({ items: [] })).toBeNull();
  });
  it('lists what a draft still needs', () => {
    expect(needsDetails({ category_id: null, title_te: '', title_en: 'T', youtube_id: ID }, 0)).toEqual(['category', 'Sources & Proofs']);
    expect(needsDetails({ category_id: 'health', title_te: 'త', title_en: '', youtube_id: ID }, 1)).toEqual([]);
  });
});
