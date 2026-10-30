import { createFileRoute } from '@tanstack/react-router';

// Weekly job: asks YouTube whether every live/scheduled video can still be played here and flags the ones that can't
// ("Video unavailable on YouTube" in Admin → Videos). It never unpublishes anything.
// Secured with "Authorization: Bearer <LOVABLE_CRON_SECRET>" (POST).
export const Route = createFileRoute('/api/cron/youtube-health')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateCronRequest } = await import('@/integrations/supabase/cron-auth');
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { checkVideoHealth } = await import('@/lib/youtube.server');
        const out = await checkVideoHealth(supabaseAdmin);
        return Response.json({ done: true, ...out }, { headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
