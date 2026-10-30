import { describe, expect, it } from 'vitest';
import { buildNewsSitemap, buildRobots, buildRss, buildSitemap, type FeedInput } from './feeds';
import { hreflangs, mediaUrl, meta, sectionHreflangs } from './news';
import { youtubeSlug } from './hub.functions';
import { stableBodyImages } from './public-db';

const now = Date.parse('2026-10-30T06:00:00Z');
const input: FeedInput = {
  origin: 'https://taktv.example/', siteName: 'TAK TV India', hindi: false, categories: ['education'],
  stories: [
    { lang: 'te', title: 'తాజా వార్త', slug: 'fresh', summary: 'S', published: '2026-10-30T01:00:00Z', updated: '2026-10-30T02:00:00Z' },
    { lang: 'en', title: 'Old & story', slug: 'old', summary: 'S', published: '2026-10-01T01:00:00Z', updated: '2026-10-01T02:00:00Z' },
    { lang: 'hi', title: 'हिन्दी', slug: 'hindi', summary: 'S', published: '2026-10-30T01:00:00Z', updated: '2026-10-30T02:00:00Z' },
  ],
  videos: [{ slug: 'msp-check', title_te: 'MSP నిజమెంత?', title_en: 'MSP reality check', text_te: 'te', text_en: 'en', published: '2026-10-29T01:00:00Z', updated: '2026-10-29T01:00:00Z' }],
  posts: [{ slug: 'data-story', title_te: '', title_en: 'Data story', text_te: '', text_en: 'en', published: '2026-10-28T01:00:00Z', updated: '2026-10-28T01:00:00Z' }],
};

describe('sitemaps and feeds', () => {
  it('lists sections, videos, posts, data and followed pages; Hindi only when switched on', () => {
    const x = buildSitemap(input);
    for (const p of ['/en/videos', '/te/blog', '/en/data', '/te/followed', '/te/videos/msp-check', '/en/videos/msp-check', '/en/blog/data-story', '/te/news/fresh', '/editorial-policy', '/te/category/education']) expect(x).toContain(`<loc>https://taktv.example${p}</loc>`);
    expect(x).not.toContain('/te/blog/data-story'); // no Telugu version of that post
    expect(x).not.toContain('/hi');
    expect(x).toContain('hreflang="te-IN"');
    expect(buildSitemap({ ...input, hindi: true })).toContain('/hi/news/hindi');
  });
  it('keeps the news sitemap to stories from the last 48 hours', () => {
    const x = buildNewsSitemap(input, now);
    expect(x).toContain('/te/news/fresh'); expect(x).not.toContain('/en/news/old'); expect(x).not.toContain('/hi/news/hindi');
  });
  it('builds per-language RSS with videos and posts', () => {
    const te = buildRss(input, 'te')!; const en = buildRss(input, 'en')!;
    expect(te).toContain('/te/videos/msp-check'); expect(te).not.toContain('data-story');
    expect(en).toContain('/en/blog/data-story'); expect(en).toContain('Old &amp; story');
    expect(buildRss(input, 'hi')).toBeNull();
  });
  it('robots points at absolute sitemap addresses', () => { expect(buildRobots('https://taktv.example/')).toContain('Sitemap: https://taktv.example/sitemap.xml'); });
});

describe('SEO helpers', () => {
  it('adds hreflang only where a translation exists', () => {
    expect(hreflangs('https://x.in', { en: '/en/videos/a' })).toEqual([]);
    expect(hreflangs('https://x.in', { en: '/en/videos/a', te: '/te/videos/a' }).map((l) => l.hrefLang)).toEqual(['en-IN', 'te-IN', 'x-default']);
    expect(sectionHreflangs('https://x.in', false, (l) => `/${l}/data`).map((l) => l.hrefLang)).toEqual(['en-IN', 'te-IN', 'x-default']);
    const m = meta('T', 'D', false, { canonical: 'https://x.in/a', alternates: hreflangs('https://x.in', { en: '/a', te: '/te' }) });
    expect(m.links).toContainEqual({ rel: 'alternate', hrefLang: 'te-IN', href: 'https://x.in/te' });
  });
  it('uses stable photo addresses for social previews', () => {
    expect(mediaUrl('u/p.webp', 'https://x.in/')).toBe('https://x.in/media/u/p.webp');
    expect(stableBodyImages('<img src="https://x.supabase.co/sign/abc?token=1" data-path="u/p.webp" alt="a">')).toBe('<img src="/media/u/p.webp" data-path="u/p.webp" alt="a">');
  });
  it('makes valid web addresses for imported YouTube videos', () => {
    expect(youtubeSlug('aB_c-D12_-x')).toBe('yt-ab-c-d12-x');
    expect(youtubeSlug('__x__', 'q1')).toBe('yt-x-q1');
    for (const id of ['aB_c-D12_-x', '-_-_-_-_-_-', 'dQw4w9WgXcQ']) expect(youtubeSlug(id)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
