import { createFileRoute } from '@tanstack/react-router';

// Secured digest: e-mails moderators about new citizen issues that have not been notified yet (last 7 days).
// Call with POST and "Authorization: Bearer <LOVABLE_CRON_SECRET>" — e.g. from an hourly scheduled job, as a safety net
// for the immediate e-mail sent when an issue arrives.
export const Route = createFileRoute('/api/notify-moderators')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateCronRequest } = await import('@/integrations/supabase/cron-auth');
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { notifyModerators } = await import('@/lib/notify.server');
        const out = await notifyModerators({ origin: new URL(request.url).origin });
        return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
