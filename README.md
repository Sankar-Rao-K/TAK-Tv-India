# TAK TV India

Multilingual news portal using TanStack Start, React, Tailwind, TipTap and Lovable Cloud. The supplied PHP archive is a design/workflow reference, not an executable dependency.

## First newsroom administrator
1. Open **More → Cloud → Users → Add user → Create new user**.
2. Enter your real email address and a strong password (at least 10 characters). Do not share the password in chat.
3. The first account created when no newsroom roles exist receives Admin access automatically. Public signup is disabled. This uses a server-controlled lifecycle trigger, not client metadata.
4. Open `/admin`, sign in, go to **Account** to set your password if necessary, then **Site Settings** to add the real website address, contact details, and taglines.
5. Go to **Team** to invite reporters and editors. Invitations take recipients to `/reset-password` to set their password.

## Newsroom workflow
- **Write News**: choose English, Hindi, or Telugu, a category, headline, summary and body. Add a cover with caption and credit, optional YouTube link and tags.
- **Save Draft** keeps the story private. Autosave runs every 25 seconds while a titled draft has changes.
- Reporters **Submit for Review**; editors/admins can **Publish Now**.
- Set a future **Publish time (IST)** to schedule. Public queries reveal the record as soon as its timestamp is reached. There is no polling job; newsroom lists show due schedules as published. Already open pages refresh when navigated/reloaded.
- Live changes remain private until **Update Live Story**. Private previews require newsroom access.
- In **All Articles**, the action menu supports unpublish, archive, trash, restore and permanent deletion from Trash. Changed live slugs create redirects. Unpublished stories show a removed-story page.
- **Photo Library** resizes JPG/PNG/WebP images to at most 1600px and makes 640px thumbnails. Upload limit is 12MB. Only unused photos may be deleted.
- **Categories**, **Team**, **Site Settings** and **Pages** are Admin-only. Editors cannot manage these. Roles live separately from profiles; reporters cannot publish through direct data requests.

## Storage and security
News images use a private `news-media` bucket because workspace policy blocks public buckets. Public reads sign only image paths referenced in published/due stories. Internal notes and pending edits are not granted to anonymous readers. HTML is cleaned during server saves and reads. Row security and validation triggers enforce publishing boundaries.

## URLs and discovery
- `/` (English), `/te` (Telugu), `/hi` (Hindi — only when Settings → “Show Hindi” is on; otherwise 404)
- `/{lang}/news/{slug}`, `/{lang}/category/{categoryId}`, `/{lang}/search?q=`
- `/{lang}/videos`, `/{lang}/videos/{slug}`, `/{lang}/blog`, `/{lang}/blog/{slug}`, `/{lang}/data`, `/{lang}/followed`
- `/{lang}/raise-issue`, `/{lang}/track`
- `/about`, `/contact`, `/privacy`, `/terms`, `/editorial-policy`, `/corrections`
- `/admin` (private), `/auth`, `/reset-password`, `/preview/{id}` (private)
- `/sitemap.xml` (all public pages incl. videos, posts, Data, Followed; with hreflang pairs), `/news-sitemap.xml` (stories from the last 48 hours), `/feed/en.xml`, `/feed/te.xml`, `/feed/hi.xml` (Hindi only when on), `/robots.txt` (generated, absolute sitemap links)
- `/media/{path}` — stable public address of a photo used by a **live** story or post (the bucket stays private; used for social previews and in story bodies). Returns 404 as soon as the item is unpublished.

Set the real absolute website address (`https://…`) in Site Settings before submitting the sitemaps in Google Search Console; until then the request address is used. Canonical links are on every public page. `hreflang` is added only where a real translation exists: home/section/category pages (English + Telugu, + Hindi when on) and videos/posts that have both a Telugu and an English version. Stories are single-language records, so they carry no hreflang.

Public pages share one small payload (latest 300 stories, 200 videos, 150 posts — without story/post bodies); every story and post page loads its own full text, so older items stay reachable at their own address.

## Citizen Voice portal
- **Form**: Telugu/English/Hindi, honeypot, 5 submissions per connection per hour, consent boxes, optional anonymous mode, optional “Add my current location” (saved to `queries.lat/lng`, rounded to ~1 m, visible only to the newsroom).
- **CAPTCHA**: Cloudflare Turnstile. Set `TURNSTILE_SITE_KEY` (public) and `TURNSTILE_SECRET_KEY` (secret) as server secrets. The token is verified on the server; if Cloudflare cannot be reached the submission is refused. Until the keys are added the form works without the widget (a warning is logged).
- **Evidence**: up to 5 files; videos MP4/MOV ≤150 MB, photos JPG/PNG/WebP/HEIC ≤15 MB, documents PDF/DOCX ≤15 MB, ≤300 MB in total. The server issues one-time signed upload tickets and the browser sends each file straight to the private `citizen-evidence` bucket (with a progress bar). Afterwards the server reads the first bytes of every file and deletes any file whose real content does not match its type. Migration 0007 sets the bucket limit (150 MB) and allowed types. Check that the project's global upload limit (Cloud → Storage settings) is at least 150 MB.
- **Moderator alerts**: a “new issues” badge in the newsroom menu (refreshes every minute), plus an e-mail to Admins, the Editor-in-Chief and Moderators when `RESEND_API_KEY` and `NOTIFY_FROM` are set (optional `NOTIFY_EMAILS` adds addresses). The e-mail carries only reference, title and place — never contact details or evidence. `POST /api/notify-moderators` (Bearer `LOVABLE_CRON_SECRET`) sends a catch-up digest; schedule it hourly if you like.
- **Desk**: filters (status, topic, district, assignee, date range, search), CSV export (no contact details), analytics row (status, top topics, top districts, median/average time to first response), reply templates in Telugu/English, *Convert to content idea* (creates a Content Planner card, moves the issue to “Content planned”, shows the linked card on the case page).

## Videos: YouTube links only
Staff never upload video files. Admin → Videos → Add video takes a YouTube link (watch, youtu.be, /shorts/, /live/, embed or bare ID), refuses duplicates, and fills the title/channel from YouTube oEmbed (no key) — plus description, length, date and tags when the optional `YOUTUBE_API_KEY` server secret is set (`lookupYouTube` in `src/lib/hub.functions.ts`, calls in `src/lib/youtube.server.ts`). Thumbnails are shown straight from `i.ytimg.com` (maxres → hq → mq, skipping YouTube’s grey 120×90 placeholder; Shorts try the vertical frame first) and are never stored. Players load only after a click, using `youtube-nocookie.com`. Shorts get vertical cards/players, a Shorts filter and a home-page row. Live videos are checked by “Check YouTube links” and the weekly job; unplayable ones show “Watch on YouTube”. Blog posts may use a YouTube thumbnail as their cover (`posts.cover_youtube_id`). Migration 0008 adds the video facts; 0009 creates the private `news-media` bucket on a fresh Supabase project.

## Scheduled jobs (optional)
Both routes need `Authorization: Bearer <LOVABLE_CRON_SECRET>` and use `POST`:
- `/api/cron/youtube-import` — hourly: adds new uploads from Settings → YouTube channel ID as **draft** videos (never published automatically).
- `/api/notify-moderators` — hourly: e-mails moderators about new issues not yet notified.
- `/api/cron/youtube-health` — weekly: flags live videos YouTube can no longer play (never unpublishes).
Ask Lovable to “schedule an hourly POST to /api/cron/youtube-import with the cron secret” (and the same for notify-moderators).

## Development and deployment
`npm install --legacy-peer-deps` (or `bun install`), `npx vite dev`, `npx vitest run`, `npx tsc --noEmit`, `npx vite build`. Publish through Lovable when ready, deploy to Vercel with `npm run build:vercel` (see `DEPLOY-VERCEL.md`), or to Hostinger’s Node.js Web Apps with `npm run build:node` (see `DEPLOY-HOSTINGER.md`). This full-stack SSR app needs a compatible server runtime; it cannot be deployed as plain static files.

Environment names only (values live in Lovable Cloud secrets, never in the repo or browser): browser `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`; server `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_CRON_SECRET`, and the optional `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_EMAILS`, `YOUTUBE_API_KEY`.

Database changes are in `drizzle/migrations` (0000–0009). Apply new ones in order (on Lovable: “apply drizzle/migrations/0008_youtube_link_videos.sql”, then 0009).

## Verified
See `CONTINUE.md` → “QA results” for exactly what was run: 39 unit tests, type check, production build, migrations 0000–0007 on PostgreSQL 16 with Supabase-like defaults, 103 role-by-role security checks, and browser end-to-end runs of the citizen form, tracking page, moderator desk, reporter limits and admin settings against a local API. The QA kit is in `qa/`.

## Newsroom guide
Manuals for the owner and staff are in `docs/` (user manual, Supabase setup guide, cheat sheet — Word and PDF). See also `NEWSROOM-GUIDE.md` (reporter → editor flow, adding a video with Sources & Proofs, adding a data card, working the planner, the citizen desk).
