import { createFileRoute } from '@tanstack/react-router';

// Stable public address for photos used by live stories and posts: /media/<path>.
// The news-media bucket stays private; this route serves a photo only while a live story or post uses it
// (checked with the public key, so row security decides), which gives social networks a link that never expires.
const SAFE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}(-640)?\.(webp|jpe?g|png)$/i;
export const Route = createFileRoute('/media/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat || '';
        if (!SAFE.test(path)) return new Response('Not found', { status: 404 });
        const { publicDb } = await import('@/lib/public-db');
        const db = publicDb();
        const like = `*${path}*`; // PostgREST wildcard
        const [a, p] = await Promise.all([
          db.from('articles').select('id').or(`cover_path.eq.${path},body_html.like.${like}`).limit(1),
          db.from('posts').select('id').or(`cover_path.eq.${path},body_te.like.${like},body_en.like.${like}`).limit(1),
        ]);
        if (!a.data?.length && !p.data?.length) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const file = await supabaseAdmin.storage.from('news-media').download(path);
        if (file.error || !file.data) return new Response('Not found', { status: 404 });
        const type = file.data.type && file.data.type.startsWith('image/') ? file.data.type : path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
        return new Response(file.data, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600, s-maxage=86400', 'X-Content-Type-Options': 'nosniff' } });
      },
    },
  },
});
