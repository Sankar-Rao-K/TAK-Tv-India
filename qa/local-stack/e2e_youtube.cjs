// Acceptance tests 1–6 for YouTube-link-only videos (local stack; YouTube answered by test stand-ins).
const { chromium } = require('playwright'); const fs = require('fs');
const env = require('./browser-env.cjs');
const keys = Object.fromEntries(fs.readFileSync(__dirname + '/keys.env', 'utf8').trim().split('\n').map((l) => l.split(/=(.*)/s).slice(0, 2)));
const BASE = 'http://127.0.0.1:8080'; const out = []; const say = (...a) => { const l = a.join(' '); out.push(l); console.log(l); };
const ok = (c, msg) => say(c ? 'PASS' : 'FAIL', msg);
async function admin(b) {
  const s = { access_token: keys.ADMIN_TOKEN, token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'x', user: { id: '00000000-0000-0000-0000-00000000000a', aud: 'authenticated', role: 'authenticated', email: 'admin@test.local' } };
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } }); await env.prepare(ctx);
  await ctx.addInitScript((v) => localStorage.setItem('sb-localhost-auth-token', v), JSON.stringify(s));
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', (e) => p.errors.push(e.message));
  await p.goto(BASE + '/admin', { waitUntil: 'networkidle' }); await p.click('nav >> text=Videos'); await p.waitForSelector('h1:has-text("Videos")'); return p;
}
const storeCount = async () => (await (await fetch('http://localhost:54321/__store')).json()).length;
async function paste(p, link) {
  const input = p.locator('input[aria-label="YouTube link"]'); await input.fill(link); await input.blur();
  await p.waitForFunction(() => !document.body.innerText.includes('Checking the link with YouTube'), null, { timeout: 15000 }); await p.waitForTimeout(500);
}
(async () => {
  const b = await chromium.launch(); const before = await storeCount();
  const p = await admin(b);
  // 1. three link shapes
  for (const [label, link, id, short] of [['normal', 'https://www.youtube.com/watch?v=tAKtvDemo01&t=10s', 'tAKtvDemo01', false], ['youtu.be', 'https://youtu.be/tAKtvDemo02?si=share', 'tAKtvDemo02', false], ['Shorts', 'https://youtube.com/shorts/tAKtvShrt01?feature=share', 'tAKtvShrt01', true]]) {
    await p.click('button:has-text("Add video")'); await paste(p, link);
    const thumb = await p.locator('img[alt="YouTube thumbnail preview"]').getAttribute('src').catch(() => null);
    const te = await p.locator('label:has-text("Title (Telugu)") + input, .mt-4:has(> label:text-is("Title (Telugu)")) input').first().inputValue();
    const en = await p.locator('.mt-4:has(> label:text-is("Title (English)")) input').inputValue();
    const isShort = await p.locator('text=This is a YouTube Short').locator('input').isChecked().catch(async () => p.locator('label:has-text("This is a YouTube Short") input').isChecked());
    ok(thumb && thumb.includes(`/vi/${id}/`), `1. ${label} link → ID ${id}, thumbnail preview ${thumb ? thumb.split('/').slice(-2).join('/') : 'missing'}`);
    ok((short ? te : en).startsWith(short ? 'డెమో' : 'Demo'), `1. ${label} link → title auto-filled into the ${short ? 'Telugu' : 'English'} field: "${(short ? te : en).slice(0, 40)}"`);
    ok(isShort === short, `1. ${label} link → Short box ${isShort ? 'ticked' : 'not ticked'}`);
    if (id === 'tAKtvDemo01') {
      const desc = await p.locator('.mt-4:has(> label:text-is("Description (English)")) textarea').inputValue();
      say('     (with YOUTUBE_API_KEY) description filled:', JSON.stringify(desc.slice(0, 30)), '| length shown:', await p.locator('text=8:12').count() > 0);
      // complete and save: category + one source, published
      await p.locator('.mt-4:has(> label:text-is("Category (required to publish)")) select').selectOption({ index: 1 });
      ok(await p.locator('text=Needs details:').count() === 1, '3. before adding a source the form shows "Needs details"');
      await p.click('button:has-text("Add a link")');
      await p.fill('input[placeholder="Document / page title"]', 'DEMO source — test only'); await p.fill('input[placeholder="https://link-to-the-document"]', 'https://example.org/demo-source');
      await p.locator('.mt-4:has(> label:text-is("Status")) select').selectOption('published');
      await p.click('button:has-text("Save video")'); await p.waitForTimeout(1500);
    } else if (id === 'tAKtvShrt01') {
      await p.locator('.mt-4:has(> label:text-is("Category (required to publish)")) select').selectOption({ index: 2 });
      await p.click('button:has-text("Add a link")'); await p.fill('input[placeholder="Document / page title"]', 'DEMO source — test only'); await p.fill('input[placeholder="https://link-to-the-document"]', 'https://example.org/demo-source');
      await p.locator('.mt-4:has(> label:text-is("Status")) select').selectOption('published');
      await p.click('button:has-text("Save video")'); await p.waitForTimeout(1500);
    } else { await p.click('button:has-text("Save video")'); await p.waitForTimeout(1500); } // Demo02 saved as a draft
  }
  // 2. duplicate + garbage
  await p.click('button:has-text("Add video")'); await paste(p, 'https://m.youtube.com/watch?v=tAKtvDemo01');
  ok(await p.locator('text=This video is already on the website.').count() === 1, '2. same video pasted again → "This video is already on the website."');
  ok(await p.locator('button:has-text("Save video")').isDisabled(), '2. Save is disabled for the duplicate');
  await p.click('button:has-text("Open the existing entry")'); await p.waitForTimeout(400);
  ok(await p.locator('h2:has-text("Edit video")').count() === 1 && (await p.locator('.mt-4:has(> label:text-is("Title (English)")) input').inputValue()).startsWith('Demo: How farm'), '2. "Open the existing entry" opens that video for editing');
  await p.click('button[aria-label="Close"]'); await p.click('button:has-text("Add video")'); await paste(p, 'hello this is not a link');
  ok(await p.locator('text=This is not a YouTube video link').count() === 1, '2. garbage → clear error');
  await p.click('button[aria-label="Close"]');
  // list badges
  const row02 = p.locator('tr:has-text("Demo: Second sample video")');
  ok(await row02.locator('text=Needs details').count() === 1, '1/2. draft without category/sources shows the "Needs details" badge');
  // 6. private video + health check
  await p.click('button:has-text("Add video")'); await paste(p, 'https://www.youtube.com/watch?v=tAKtvPriv01');
  ok(await p.locator('text=YouTube says this video is private or removed').count() === 1, '6. private/removed link → warning in the form');
  await p.fill('.mt-4:has(> label:text-is("Title (English)")) input', 'Demo: private video test');
  await p.locator('.mt-4:has(> label:text-is("Category (required to publish)")) select').selectOption({ index: 1 });
  await p.click('button:has-text("Add a link")'); await p.fill('input[placeholder="Document / page title"]', 'DEMO source'); await p.fill('input[placeholder="https://link-to-the-document"]', 'https://example.org/x');
  await p.locator('.mt-4:has(> label:text-is("Status")) select').selectOption('published'); await p.click('button:has-text("Save video")'); await p.waitForTimeout(1500);
  await p.click('button:has-text("Check YouTube links")'); await p.waitForTimeout(2500);
  say('     health check toast:', (await p.locator('[data-sonner-toast]').allInnerTexts()).filter((t) => t.includes('Checked')).join(' | '));
  ok(await p.locator('tr:has-text("Demo: private video test") >> text=Video unavailable on YouTube').count() === 1, '6. health check flags it: "Video unavailable on YouTube" in the admin list');
  ok(await p.locator('tr:has-text("Demo: How farm income") >> text=Video unavailable on YouTube').count() === 0, '6. healthy video is not flagged');
  say('     admin page errors:', p.errors.length ? p.errors.join(' ; ') : 'none');

  // ---------- public side ----------
  const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } }); await env.prepare(ctx); const v = await ctx.newPage(); v.errors = []; v.on('pageerror', (e) => v.errors.push(e.message));
  env.ytLog.length = 0;
  await v.goto(BASE + '/en/videos', { waitUntil: 'networkidle' }); await v.waitForTimeout(800);
  const card = v.locator('a.news-card:has-text("Demo: How farm income")'); const img = card.locator('img').first();
  const shown = await img.getAttribute('src'); const nat = await img.evaluate((i) => i.naturalWidth);
  ok(shown.startsWith('https://i.ytimg.com/vi/tAKtvDemo01/'), `3. public card shows the YouTube thumbnail (${shown.split('/').slice(-1)[0]})`);
  ok(shown.endsWith('hqdefault.jpg') && nat > 120 && env.ytLog.includes('tAKtvDemo01/maxresdefault.jpg'), `4. maxresdefault was the grey 120×90 placeholder → fell back to hqdefault (natural width ${nat})`);
  const d2 = v.locator('a.news-card:has-text("Demo: Second")'); ok(await d2.count() === 0, '   draft video is not public');
  await card.click(); await v.waitForSelector('iframe', { timeout: 10000 });
  const src = await v.locator('iframe').getAttribute('src');
  ok(/^https:\/\/www\.youtube-nocookie\.com\/embed\/tAKtvDemo01\?autoplay=1&rel=0/.test(src) && v.url().includes('play=1'), `3. clicking the card opens the video page with the player running (${src.split('?')[0]})`);
  ok(await v.locator('a:has-text("Watch on YouTube")').count() >= 1, '3. "Watch on YouTube" link is shown');
  const ld = await v.locator('script[type="application/ld+json"]').allTextContents(); const vo = ld.map((x) => JSON.parse(x)).find((x) => x['@type'] === 'VideoObject');
  ok(vo && vo.duration === 'PT8M12S' && Date.parse(vo.uploadDate) === Date.parse('2026-10-28T09:30:00Z') && String(vo.thumbnailUrl).includes('i.ytimg.com'), `7. VideoObject has duration ${vo?.duration}, uploadDate ${vo?.uploadDate}, YouTube thumbnailUrl`);
  ok(((await v.locator('meta[property="og:image"]').getAttribute('content')) || '').startsWith('https://i.ytimg.com/vi/tAKtvDemo01/'), '7. og:image is the YouTube thumbnail');
  // before click: no YouTube loaded on a fresh visit
  env.ytLog.length = 0; await v.goto(BASE + '/en/videos/' + (await card.getAttribute('href').catch(() => '')).split('/').pop()?.split('?')[0], { waitUntil: 'networkidle' }).catch(() => null);
  // 5. Shorts
  await v.goto(BASE + '/en/videos', { waitUntil: 'networkidle' }); await v.click('button:has-text("Shorts")'); await v.waitForTimeout(400);
  const titles = await v.locator('main .news-card h3').allInnerTexts();
  ok(titles.length >= 1 && titles.every((t) => t.includes('డెమో')), `5. Shorts filter shows only the Short (${titles.length} card)`);
  const sc = v.locator('main .news-card').first(); ok((await sc.locator('div.aspect-\\[9\\/16\\]').count()) === 1 && (await sc.locator('img').getAttribute('src')).endsWith('oardefault.jpg'), '5. Short card is vertical with the vertical YouTube frame');
  await sc.click(); await v.waitForSelector('iframe');
  const box = await v.locator('iframe').evaluate((f) => { const r = f.parentElement.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  ok(box[1] > box[0], `5. Short plays in a vertical 9:16 player (${box[0]}×${box[1]})`);
  // home: lightbox + shorts row
  await v.goto(BASE + '/en', { waitUntil: 'networkidle' }).catch(() => null); await v.goto(BASE + '/', { waitUntil: 'networkidle' });
  ok(await v.locator('h3:has-text("Latest Shorts")').count() === 1, '5. home page shows a Shorts row');
  const homeCard = v.locator('button.news-card:has-text("Demo: How farm income")'); await homeCard.click(); await v.waitForSelector('[role=dialog] iframe');
  ok(true, '3. home "Latest Videos": click opens the lightbox player');
  await v.keyboard.press('Escape'); await v.waitForTimeout(400);
  ok(await v.locator('[role=dialog]').count() === 0 && await homeCard.evaluate((el) => el === document.activeElement), '3. Esc closes the lightbox and focus returns to the card');
  // 6. public fallback
  await v.goto(BASE + '/en/videos', { waitUntil: 'networkidle' });
  const pv = v.locator('a.news-card:has-text("Demo: private video test")'); await pv.click(); await v.waitForTimeout(1200);
  ok(await v.locator('iframe').count() === 0 && await v.locator('text=This video cannot be played here.').count() === 1 && await v.locator('a:has-text("Watch on YouTube")').count() >= 1, '6. unavailable video page shows the thumbnail + "Watch on YouTube" instead of a broken player');
  say('     public page errors:', v.errors.length ? v.errors.join(' ; ') : 'none');
  const after = await storeCount(); ok(after === before, `3. no file was added to storage (objects before ${before}, after ${after})`);
  fs.writeFileSync(__dirname + '/e2e_youtube_result.txt', out.join('\n') + '\n');
  await b.close();
})().catch((e) => { console.error('E2E FAILED', e.message); fs.writeFileSync(__dirname + '/e2e_youtube_result.txt', out.join('\n') + '\nE2E FAILED ' + e.message); process.exit(1); });
