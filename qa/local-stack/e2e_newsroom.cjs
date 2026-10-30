// End-to-end newsroom checks with injected sessions for the moderator, reporter and admin test users.
const { chromium } = require('playwright');
const fs = require('fs');
const keys = Object.fromEntries(fs.readFileSync(__dirname + '/keys.env', 'utf8').trim().split('\n').map((l) => l.split(/=(.*)/s).slice(0, 2)));
const users = { MOD: ['00000000-0000-0000-0000-000000000010', 'mod@test.local'], REPORTER: ['00000000-0000-0000-0000-00000000000c', 'reporter@test.local'], ADMIN: ['00000000-0000-0000-0000-00000000000a', 'admin@test.local'] };
const BASE = 'http://127.0.0.1:8080';
const say = (...a) => console.log(...a);

async function as(browser, who) {
  const [id, email] = users[who]; const token = keys[who + '_TOKEN'];
  const session = { access_token: token, token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'local', user: { id, aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {} } };
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.addInitScript((s) => { localStorage.setItem('sb-localhost-auth-token', s); }, JSON.stringify(session));
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', (e) => p.errors.push(e.message));
  await p.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await p.waitForSelector('nav >> text=Citizen Issues', { timeout: 30000 });
  return p;
}
const toast = async (p) => { await p.waitForTimeout(900); const t = await p.locator('[data-sonner-toast]').allInnerTexts(); return t.join(' | '); };

(async () => {
  const b = await chromium.launch();
  const ref = JSON.parse(fs.readFileSync(__dirname + '/last_ref.json', 'utf8')).ref;

  // ---------------- Moderator ----------------
  const m = await as(b, 'MOD');
  const badge = await m.locator('nav button:has-text("Citizen Issues") span').last().innerText().catch(() => '');
  say('MOD  new-issues badge in menu:', badge || '(none)');
  await m.click('nav >> text=Citizen Issues'); await m.waitForSelector('text=Time to first response');
  say('MOD  analytics row:', (await m.locator('.admin-panel').first().innerText()).replace(/\n/g, ' ').slice(0, 80));
  await m.selectOption('select[aria-label="District"]', 'Visakhapatnam');
  say('MOD  rows after district filter:', await m.locator('tbody tr').count());
  const [dl] = await Promise.all([m.waitForEvent('download'), m.click('button:has-text("Export CSV")')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  say('MOD  CSV file:', dl.suggestedFilename(), '| header:', csv.split('\r\n')[0].replace('﻿', '').slice(0, 70) + '…', '| has phone/email:', /9000000000|qa@example|phone|email/i.test(csv));
  await m.click(`tbody tr:has-text("${ref}")`); await m.waitForSelector('text=Contact & evidence');
  say('MOD  sees contact:', await m.locator('text=9000000000').count() > 0, '| evidence tiles:', await m.locator('section:has-text("Contact & evidence") a[target=_blank]').count(), '| map point:', await m.locator('a[href*="openstreetmap"]').count() > 0);
  await m.selectOption('select[aria-label="Insert a reply template"]', 'received:te');
  say('MOD  template inserted (Telugu):', (await m.locator('section:has-text("Update for the citizen") textarea').inputValue()).slice(0, 40) + '…');
  await m.click('button:has-text("Convert to content idea")'); say('MOD  convert ->', await toast(m));
  await m.waitForSelector('text=Open planner card');
  say('MOD  linked card shown:', (await m.locator('section:has-text("Content planner") .rounded-lg').innerText()).replace(/\n/g, ' · '));
  await m.click('button:has-text("Open planner card")'); await m.waitForSelector('text=Planner card');
  say('MOD  planner opened with card:', await m.locator('h2:has-text("Planner card")').count() === 1, '| linked note:', await m.locator('text=Linked to a citizen issue').count() > 0);
  say('MOD  page errors:', m.errors.length ? m.errors : 'none');

  // ---------------- Reporter ----------------
  const r = await as(b, 'REPORTER');
  await r.click('nav >> text=Citizen Issues'); await r.waitForSelector('text=Time to first response');
  await r.selectOption('select[aria-label="Status"]', 'all');
  await r.click(`tbody tr:has-text("${ref}")`); await r.waitForSelector('text=Contact & evidence');
  say('REP  contact hidden:', await r.locator('text=Only moderators, the Editor-in-Chief and admins can see contact details').count() === 1, '| phone visible:', await r.locator('text=9000000000').count() > 0);
  say('REP  status select disabled:', await r.locator('label:has-text("Status") select').isDisabled());
  say('REP  menu has Settings/Activity:', await r.locator('nav >> text=Site Settings').count() > 0, await r.locator('nav >> text=Activity Log').count() > 0);
  await r.click('nav >> text=Videos'); await r.waitForSelector('h1:has-text("Videos")');
  say('REP  can delete videos (trash buttons):', await r.locator('button[aria-label=Delete]').count(), '| Import button:', await r.locator('text=Import from YouTube').count());
  say('REP  page errors:', r.errors.length ? r.errors : 'none');

  // ---------------- Admin: settings ----------------
  const a = await as(b, 'ADMIN');
  await a.click('nav >> text=Site Settings'); await a.waitForSelector('text=Videos & homepage');
  const yt = a.locator('input[placeholder="UC…"]');
  await yt.fill('not-a-channel'); say('ADM  inline warning for bad id:', await a.locator('text=This does not look like a channel ID').count() === 1);
  await a.click('button:has-text("Save settings")'); say('ADM  save bad id ->', await toast(a));
  await yt.fill('UC1234567890123456789012');
  await a.fill('input[type=number]', '7');
  await a.check('text=Show Hindi on the public site');
  await a.click('button:has-text("Save settings")'); say('ADM  save good ->', await toast(a));
  say('ADM  page errors:', a.errors.length ? a.errors : 'none');
  await b.close();
})().catch((e) => { console.error('E2E FAILED', e.message); process.exit(1); });
