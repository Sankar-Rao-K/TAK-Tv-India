// Cloudflare Turnstile check. The secret lives only in the server environment (TURNSTILE_SECRET_KEY).
let warned = false;

export function turnstileConfigured(): boolean { return !!process.env['TURNSTILE_SECRET_KEY']; }

/** Returns true when the token is valid, or when Turnstile has not been set up yet (a warning is logged once). */
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env['TURNSTILE_SECRET_KEY'];
  if (!secret) {
    if (!warned) { console.warn('[turnstile] TURNSTILE_SECRET_KEY is not set — citizen submissions are protected only by the rate limit and honeypot.'); warned = true; }
    return true;
  }
  if (!token || token.length > 2048) return false;
  const body = new FormData();
  body.append('secret', secret); body.append('response', token);
  if (ip && ip !== 'unknown') body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    if (!res.ok) return false;
    const out = (await res.json()) as { success?: boolean };
    return out.success === true;
  } catch (e) {
    console.error('[turnstile] verification request failed', e);
    return false;
  }
}
