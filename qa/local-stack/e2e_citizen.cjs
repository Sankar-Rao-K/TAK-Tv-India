// End-to-end: a citizen raises an issue with files and location, then tracks it.
const { chromium } = require('playwright');
const F = __dirname + '/files/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ geolocation: { latitude: 17.686815, longitude: 83.218482 }, permissions: ['geolocation'] });
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://127.0.0.1:8080/te/raise-issue', { waitUntil: 'networkidle' });
  await p.fill('input[name=title]', 'QA: పెందుర్తిలో కల్వర్టు కూలిపోయింది');
  await p.fill('textarea[name=body]', 'QA test — the culvert near the bus stop collapsed two weeks ago and water floods the road every evening.');
  await p.fill('input[name=district]', 'Visakhapatnam');
  await p.fill('input[name=mandal]', 'Pendurthi');
  await p.fill('input[name=name]', 'QA Citizen');
  await p.fill('input[name=phone]', '9000000000');
  await p.click('text=నా ప్రస్తుత ప్రదేశాన్ని జోడించండి');
  await p.waitForSelector('text=ప్రదేశం జోడించబడింది');
  const input = p.locator('input[type=file]');
  await input.setInputFiles([F + 'photo.png', F + 'clip.mp4', F + 'fake.mp4', F + 'IMG_0001.HEIC', F + 'tool.exe']);
  await p.waitForTimeout(400);
  const listed = await p.locator('main form ul li').allInnerTexts();
  console.log('files listed in form:', listed.map((x) => x.split(' · ')[0]).join(', '));
  const toasts = await p.locator('[data-sonner-toast]').allInnerTexts();
  console.log('client-side rejections:', toasts.join(' | ') || '(none)');
  await p.check('input[name=c1]'); await p.check('input[name=c2]');
  await p.click('main form button[type=submit]');

  await p.waitForSelector('text=మీ సమస్య అందింది', { timeout: 30000 });
  const codes = await p.locator('.font-mono.text-xl').allInnerTexts();
  const partial = await p.locator('[role=alert]').count();
  console.log('reference:', codes[0], 'secret:', codes[1] ? '(shown, ' + codes[1].length + ' chars)' : 'missing', '| partial-upload warning shown:', partial > 0);
  // Track it
  await p.goto('http://127.0.0.1:8080/en/track', { waitUntil: 'networkidle' });
  await p.fill('input[name=ref]', codes[0]); await p.fill('input[name=secret]', 'WRONG123');
  await p.click('main form button[type=submit]'); await p.waitForTimeout(800);
  console.log('wrong secret ->', (await p.locator('[role=alert]').innerText()).slice(0, 40));
  await p.fill('input[name=secret]', codes[1]); await p.click('main form button[type=submit]');
  await p.waitForSelector('text=Current status');
  console.log('right secret -> status:', await p.locator('section .rounded-full.bg-primary').first().innerText());
  console.log('page errors:', errors.length ? errors : 'none');
  require('fs').writeFileSync(__dirname + '/last_ref.json', JSON.stringify({ ref: codes[0], secret: codes[1] }));
  await b.close();
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
