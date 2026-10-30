import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile.server';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Turnstile check (server side)', () => {
  it('rejects a missing or refused token once the secret is configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyTurnstile('', '1.2.3.4')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await verifyTurnstile('bad-token', '1.2.3.4')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('accepts a token Cloudflare confirms, and fails closed when Cloudflare cannot be reached', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })));
    expect(await verifyTurnstile('good-token', '1.2.3.4')).toBe(true);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await verifyTurnstile('good-token', '1.2.3.4')).toBe(false);
  });
  it('lets submissions through (with a warning) until the owner adds the keys', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await verifyTurnstile('', 'x')).toBe(true);
    warn.mockRestore();
  });
});
