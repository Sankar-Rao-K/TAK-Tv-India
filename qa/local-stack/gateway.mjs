// Tiny local stand-in for the Supabase API gateway: REST via PostgREST, auth "user" lookup, and an in-memory Storage API.
// For local QA only.
import http from 'node:http';
import crypto from 'node:crypto';

const SECRET = process.env.JWT_SECRET;
const PGRST = 'http://127.0.0.1:3001';
const store = new Map(); // "bucket/path" -> { bytes: Buffer, type }
const tokens = new Map(); // upload token -> "bucket/path"
const LIMITS = { 'citizen-evidence': 157286400 };
const ALLOWED = { 'citizen-evidence': ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] };
export const log = [];

const b64 = (s) => Buffer.from(s).toString('base64url');
export function sign(payload) { const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' })); const p = b64(JSON.stringify(payload)); return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`; }
function verify(t) { const [h, p, s] = (t || '').split('.'); if (!s) return null; const ok = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url') === s; return ok ? JSON.parse(Buffer.from(p, 'base64url').toString()) : null; }
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD', 'access-control-expose-headers': '*' };
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', ...cors }); res.end(JSON.stringify(obj)); };
const body = (req) => new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (u.pathname.startsWith('/rest/v1')) {
    const target = PGRST + u.pathname.slice('/rest/v1'.length) + u.search;
    const headers = { ...req.headers }; delete headers.host; delete headers['content-length'];
    const buf = ['GET', 'HEAD'].includes(req.method) ? undefined : await body(req);
    const r = await fetch(target, { method: req.method, headers, body: buf });
    const out = Buffer.from(await r.arrayBuffer()); const h = { ...cors }; r.headers.forEach((v, k) => { if (!['content-encoding', 'transfer-encoding', 'connection'].includes(k)) h[k] = v; });
    res.writeHead(r.status, h); return res.end(out);
  }
  if (u.pathname === '/auth/v1/user') {
    const c = verify((req.headers.authorization || '').replace('Bearer ', ''));
    if (!c?.sub) return json(res, 401, { message: 'invalid JWT' });
    return json(res, 200, { id: c.sub, aud: 'authenticated', role: c.role, email: c.email || '' });
  }
  const m = u.pathname.match(/^\/storage\/v1\/(object\/upload\/sign|object\/sign|object)\/(.+)$/);
  if (m) {
    const [, kind, rest] = m; const key = decodeURIComponent(rest);
    log.push(`${req.method} ${kind} ${key}`);
    if (kind === 'object/upload/sign' && req.method === 'POST') { const t = crypto.randomUUID(); tokens.set(t, key); return json(res, 200, { url: `/object/upload/sign/${key}?token=${t}` }); }
    if (kind === 'object/upload/sign' && req.method === 'PUT') {
      if (tokens.get(u.searchParams.get('token')) !== key) return json(res, 400, { statusCode: '403', error: 'invalid token' });
      const raw = await body(req); const bucket = key.split('/')[0];
      let bytes = raw; let type = req.headers['content-type'] || '';
      if (type.startsWith('multipart/form-data')) { const fd = await new Response(raw, { headers: { 'content-type': type } }).formData(); const f = [...fd.values()].find((v) => typeof v === 'object'); bytes = Buffer.from(await f.arrayBuffer()); type = f.type; }
      if (LIMITS[bucket] && bytes.length > LIMITS[bucket]) return json(res, 413, { statusCode: '413', error: 'Payload too large' });
      if (ALLOWED[bucket] && !ALLOWED[bucket].includes(type)) return json(res, 415, { statusCode: '415', error: 'invalid_mime_type' });
      if (store.has(key)) return json(res, 400, { statusCode: '409', error: 'Duplicate' });
      store.set(key, { bytes, type }); tokens.delete(u.searchParams.get('token'));
      return json(res, 200, { Key: key });
    }
    if (kind === 'object/sign' && req.method === 'POST') { if (!store.has(key)) return json(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' }); return json(res, 200, { signedURL: `/object/sign/${key}?token=t` }); }
    if ((kind === 'object/sign' || kind === 'object') && req.method === 'GET') {
      const f = store.get(key); if (!f) return json(res, 400, { statusCode: '404', error: 'not_found' });
      const range = req.headers.range?.match(/bytes=(\d+)-(\d+)?/);
      if (range) { const s = Number(range[1]); const e = Math.min(f.bytes.length - 1, range[2] ? Number(range[2]) : f.bytes.length - 1); res.writeHead(206, { 'content-type': f.type, 'content-range': `bytes ${s}-${e}/${f.bytes.length}`, 'content-length': e - s + 1, ...cors }); return res.end(f.bytes.subarray(s, e + 1)); }
      res.writeHead(200, { 'content-type': f.type, 'content-length': f.bytes.length, ...cors }); return res.end(f.bytes);
    }
    if (kind === 'object' && req.method === 'DELETE') { const { prefixes = [] } = JSON.parse((await body(req)).toString() || '{}'); const removed = prefixes.filter((p) => store.delete(`${key}/${p}`)); return json(res, 200, removed.map((name) => ({ name }))); }
    if (kind === 'object' && req.method === 'POST') { const raw = await body(req); store.set(key, { bytes: raw, type: req.headers['content-type'] || 'application/octet-stream' }); return json(res, 200, { Key: key }); }
  }
  if (u.pathname === '/__store') return json(res, 200, [...store.entries()].map(([k, v]) => ({ key: k, type: v.type, size: v.bytes.length })));
  if (u.pathname === '/__log') return json(res, 200, log);
  json(res, 404, { message: 'not mocked: ' + req.method + ' ' + u.pathname });
}).listen(54321, () => console.log('gateway on 54321'));
