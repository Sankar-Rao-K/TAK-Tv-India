import { createFileRoute } from '@tanstack/react-router';

// Hourly job: imports new uploads from the channel in Settings → YouTube channel ID as DRAFT videos (an editor still
// checks titles, adds the category and Sources & Proofs, and publishes). Secured with "Authorization: Bearer <LOVABLE_CRON_SECRET>".
export const Route = createFileRoute('/api/cron/youtube-import')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateCronRequest } = await import('@/integrations/supabase/cron-auth');
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { importChannelFeed } = await import('@/lib/hub.functions');
        try {
          const out = await importChannelFeed(supabaseAdmin, null);
          return Response.json({ ok: true, ...out }, { headers: { 'Cache-Control': 'no-store' } });
        } catch (e) {
          return Response.json({ ok: false, error: e instanceof Error ? e.message : 'Import failed' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
        }
      },
    },
  },
});
