// LOCAL TEST ONLY: what the sandbox browser cannot fetch (YouTube images/player, Google Fonts, the Lovable-hosted logo)
// is answered with clearly fake demo images, the same open-source fonts, and the project's own logo file.
const fs = require('fs'); const path = require('path');
const Y = path.join(__dirname, 'yt'); const FS = path.join(__dirname, 'fonts/node_modules/@fontsource');
const LOGO = '/home/claude/proj/taktvindia-main/public/apple-touch-icon.png';
const face = (fam, file, w) => `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;font-display:swap;src:url(https://fonts.gstatic.com/local/${file}) format('woff2');}`;
let css = '';
for (const w of [400, 500, 600, 700, 800]) css += face('Poppins', `poppins/files/poppins-latin-${w}-normal.woff2`, w);
for (const w of [400, 600, 700, 800]) { css += face('Noto Sans Telugu', `noto-sans-telugu/files/noto-sans-telugu-telugu-${w}-normal.woff2`, w); css += face('Noto Sans Devanagari', `noto-sans-devanagari/files/noto-sans-devanagari-devanagari-${w}-normal.woff2`, w); }
exports.ytLog = [];
exports.prepare = async (ctx) => {
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: css }));
  await ctx.route('https://fonts.gstatic.com/local/**', (r) => { const f = path.join(FS, new URL(r.request().url()).pathname.replace('/local/', '')); return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(f) }) : r.fulfill({ status: 404 }); });
  await ctx.route('**/__l5e/assets-v1/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(LOGO) }));
  await ctx.route('https://challenges.cloudflare.com/**', (r) => r.abort());
  await ctx.route('https://i.ytimg.com/**', (r) => {
    const [, , id, name] = new URL(r.request().url()).pathname.split('/'); exports.ytLog.push(`${id}/${name}`);
    let file = null;
    if (name === 'maxresdefault.jpg') file = id === 'tAKtvDemo02' ? 'maxres_demo.jpg' : 'grey_placeholder.jpg'; // most demo videos have no maxres → grey 120×90
    else if (name === 'oardefault.jpg') file = id === 'tAKtvShrt01' ? 'oar_demo.jpg' : null;
    else if (name === 'hqdefault.jpg') file = 'hq_demo.jpg';
    else if (name === 'mqdefault.jpg') file = 'mq_demo.jpg';
    return file ? r.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(path.join(Y, file)) }) : r.fulfill({ status: 404, body: '' });
  });
  await ctx.route('https://www.youtube-nocookie.com/embed/**', (r) => { const u = new URL(r.request().url()); exports.ytLog.push('embed ' + u.pathname + u.search);
    return r.fulfill({ status: 200, contentType: 'text/html', body: `<html><body style="margin:0;background:#111;color:#fff;font:600 18px sans-serif;display:grid;place-items:center;height:100vh;text-align:center">▶ DEMO PLAYER<br><small style="font-weight:400;opacity:.7">(test stand-in for the YouTube player)<br>${u.pathname.split('/').pop()}</small></body></html>` }); });
};
