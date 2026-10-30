// LOCAL TEST ONLY: answers the app server's calls to YouTube (blocked in this sandbox) with clearly fake demo data.
const real = globalThis.fetch;
const DEMO = {
  tAKtvDemo01: { title: 'Demo: How farm income is measured', author: 'TAK TV India (demo)', w: 200, h: 113, dur: 'PT8M12S', desc: 'DEMO video description used for testing only.', tags: ['demo', 'agriculture'] },
  tAKtvDemo02: { title: 'Demo: Second sample video', author: 'TAK TV India (demo)', w: 200, h: 113, dur: 'PT4M5S', desc: 'DEMO description two.', tags: ['demo'] },
  tAKtvShrt01: { title: 'డెమో: రైతు ఆదాయం ఒక్క నిమిషంలో', author: 'TAK TV India (demo)', w: 113, h: 200, dur: 'PT45S', desc: 'డెమో వివరణ — పరీక్ష కోసం మాత్రమే.', tags: ['demo'] },
  tAKtvNoEmb1: { title: 'Demo: embedding switched off', author: 'Other channel (demo)', w: 200, h: 113, dur: 'PT2M', desc: '', tags: [], noembed: true },
};
const PRIVATE = new Set(['tAKtvPriv01']);
export const mockLog = [];
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('https://www.youtube.com/oembed')) {
    const target = decodeURIComponent(new URL(url).searchParams.get('url') || ''); const id = (target.match(/(?:v=|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
    process.stdout.write(`[yt-mock] oembed ${id}\n`);
    if (PRIVATE.has(id) || !DEMO[id]) return new Response('Not Found', { status: 404 });
    if (DEMO[id].noembed) return new Response('Unauthorized', { status: 401 });
    const d = DEMO[id]; return Response.json({ title: d.title, author_name: d.author, thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, width: d.w, height: d.h, type: 'video' });
  }
  if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) {
    const id = new URL(url).searchParams.get('id'); process.stdout.write(`[yt-mock] api ${id}\n`);
    const d = DEMO[id]; if (!d) return Response.json({ items: [] });
    return Response.json({ items: [{ id, snippet: { title: d.title, description: d.desc, channelTitle: d.author, publishedAt: '2026-10-28T09:30:00Z', tags: d.tags, liveBroadcastContent: 'none' }, contentDetails: { duration: d.dur }, status: { embeddable: !d.noembed, privacyStatus: 'public' } }] });
  }
  if (url.startsWith('https://www.youtube.com/feeds/videos.xml')) {
    return new Response(`<feed><entry><yt:videoId>tAKtvDemo02</yt:videoId><title>Demo: Second sample video</title><link rel="alternate" href="https://www.youtube.com/watch?v=tAKtvDemo02"/><published>2026-10-29T10:00:00+00:00</published><media:group><media:description>DEMO description two.</media:description></media:group></entry></feed>`, { status: 200 });
  }
  return real(input, init);
};
