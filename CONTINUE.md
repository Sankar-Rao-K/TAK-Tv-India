# Latest pass — public site redesign (4 Nov 2026)

Built from the owner's mockup. Colours are taken from the logo: orange #FE7201, dark orange #E05A00, red #D7261E, peach #FFF1E6.
- **Orange header:** logo, Home, Live TV (the YouTube channel's `/live` page, shown only when a channel is set), Categories menu, About, Contact, More, search, weather chip, language switch, and an **Admin** button at the top right that opens `/admin`. On mobile everything is in a menu drawer.
- **Weather chip:** shows the real Visakhapatnam temperature from Open-Meteo (free, no key, cached for 30 minutes). It is hidden when the weather can't be read. To change the city, edit `WEATHER_CITY` in `src/lib/weather.functions.ts`.
- **News ticker:** "BREAKING NEWS:" when there is a breaking story from the last 48 hours, otherwise "LATEST NEWS:". It has ‹ › arrows.
- **Category sidebar** (desktop): left side, with icons, a "More categories" toggle, and the current category highlighted.
- **Story page:**
  - Left: the video (or cover photo), plus a peach quote card. The quote card shows the first quotation in the story; an attribution is a last line starting with "—".
  - Right: category pill and date with weekday, serif headline, summary between orange rules, and the body starting with a bold "Location:".
  - Bottom: Back to News, Previous / n of N / Next.
- **Bug fixed:** the story and blog pages flashed "loading" on first view (hydration mismatch). They now use the server's data straight away.
- Checks run: `tsc` 0 errors · `vitest` 59 tests / 10 files pass · `vite build` succeeds · browser check of home, category, story, dropdown and mobile (no page errors). The weather chip was not seen live (no network here).

---

# Latest pass — YouTube-link-only videos + manuals (30 Oct 2026)

**Built:** paste-a-link video form (watch / youtu.be / shorts / live / embed / bare ID), duplicate block with "Open the existing entry", oEmbed title + channel (no key) and optional `YOUTUBE_API_KEY` details (description, length, date, tags), Telugu/English field by script; thumbnails straight from YouTube with maxres → hq → mq fallback and grey-placeholder detection (nothing stored); click-to-play `youtube-nocookie` player loaded only after the click; home "Latest Videos" lightbox (Esc closes, focus returns); Shorts (vertical cards/player, Shorts filter, home row); "Watch on YouTube" fallback for private/removed/non-embeddable videos; "Check YouTube links" button + weekly `POST /api/cron/youtube-health`; "Needs details" badge and one-click Publish; YouTube thumbnail as a blog cover; VideoObject duration/uploadDate; og:image = YouTube thumbnail. Admin accepts no video files (only JPG/PNG/WebP photos). Citizen portal unchanged.
**Migrations:** `0008_youtube_link_videos.sql` (is_short, duration, YouTube date/channel, availability; unique YouTube id when existing data has no duplicates), `0009_news_media_bucket.sql` (creates the private photo bucket on a fresh Supabase project; no change where it exists). Both applied twice locally without errors.
**Manuals (docs/):** `TAKTV-USER-MANUAL`, `SUPABASE-SETUP-FOR-BEGINNERS`, `TAKTV-CHEAT-SHEET` — .docx + .pdf. Text-only (no screenshots, at the owner's request); "What you will see" boxes describe the screens. Supabase facts were checked against Supabase's docs and pricing page on 30 Oct 2026; steps that could not be confirmed on a live dashboard are marked "Check this — not verified". The Telugu quick-start is marked for native-speaker review.

**Acceptance results (actually run):**
- `npx tsc --noEmit` 0 errors · `npx vitest run` 55 tests / 9 files pass · `npx vite build` succeeds.
- Browser run (`qa/youtube-acceptance-results.txt`, 33 checks pass). YouTube is blocked in the test sandbox, so YouTube's answers, thumbnails and player were simulated with clearly fake demo data (`qa/local-stack/yt-mock.mjs`, `browser-env.cjs`). Results: normal/youtu.be/Shorts links → ID, preview, title in the right language, Short box; duplicate blocked with link to the entry; garbage → clear error; published card shows the YouTube thumbnail, click → video page with the player running; grey maxres placeholder → hqdefault; Short vertical (360×640) and under the Shorts filter; private video flagged by the health check and shown with "Watch on YouTube"; no file added to storage; no YouTube player loaded before a click.
- Citizen Voice end-to-end re-run: unchanged behaviour (fake .mp4 rejected, 3 files accepted, tracking works).
- Security checks: **107/107 pass** (`qa/rls-qa-results.txt`), including new checks for the video columns.
- Not tested against real YouTube or a real Supabase dashboard (no network/accounts here).

**Owner still needs to:** apply 0008 + 0009; optionally add `YOUTUBE_API_KEY`; schedule the weekly health check (and the two hourly jobs); decide Lovable Cloud vs own Supabase (guide recommends own Supabase before launch) and follow the Supabase guide; Turnstile keys and an e-mail sender; backups and a restore test; native-speaker review of Telugu/Hindi text; legal review of Privacy/Terms/Editorial/Corrections pages; fill the contact/escalation table in the manual.

---

# TAK TV — status after the completion pass

All nine tasks from the continuation prompt are built. Two things could not be done from outside Lovable Cloud and are listed under **Owner / Lovable steps**: applying the migrations to the Cloud database (with the regenerated types file), and repeating the QA on the live database with real accounts. Everything was tested on a local PostgreSQL 16 database built from the same migrations, with Supabase-style default privileges.

## What changed in this pass
| Task | Done | Where |
|---|---|---|
| 1. Migration | New `0007_citizen_portal_hardening.sql`: evidence bucket 150 MB + allowed types, desk indexes, map-point check, and the missing `settings` row (no migration created it before, so a fresh database could not load the site). 0000–0007 apply cleanly and 0007 can be re-run. Seeds confirmed: 60 sources, 45 planner cards, 6 pages, 30 categories, 1 settings row. | `drizzle/migrations/0007…`, `meta/_journal.json` |
| 2. Settings | YouTube channel ID, ticker count (1–20), Hindi switch, privacy contact. Validated on the server: only known columns are written, and `https://` addresses and `UC…` IDs are checked. | `newsroom.tsx`, `news.functions.ts` (`settingsSchema`) |
| 3. Citizen desk | Convert to content idea, linked planner card with "Open planner card", filters (status/topic/district/assignee/date/search), CSV export (no contact data, formula-safe), analytics row (status, topics, districts, median/average first response), reply templates in Telugu/English/both, new-issues badge | `queries.tsx`, `lib/issues.ts`, `queries.functions.ts` |
| 4. Portal hardening | Turnstile checked on the server (refuses if Cloudflare can't be reached), signed direct uploads with progress, type check on the real bytes (MP4/MOV/HEIC/JPG/PNG/WebP/PDF/DOCX), mismatches deleted, optional location, moderator e-mail + secured digest route | `citizen.tsx`, `citizen.functions.ts`, `lib/evidence.ts`, `turnstile.server.ts`, `notify.server.ts`, `routes/api.notify-moderators.tsx` |
| 5. Sitemap/RSS | Sitemap includes videos, posts, Data, Followed, raise-issue, policies, with hreflang pairs; news sitemap = stories from the last 48 h; RSS per language includes videos/posts; Hindi URLs only when Hindi is on; robots.txt generated with absolute sitemap URLs | `lib/feeds.ts`, `feeds.server.ts`, `routes/robots[.]txt.tsx` |
| 6. Performance/SEO | Shared payload trimmed (300/200/150 newest, no bodies); story/post pages fetch their own full text (older items still work); `/media/…` stable photo URLs for og:image and story bodies (no signed-URL expiry); hreflang only where translations exist; richer NewsArticle JSON-LD | `news.functions.ts`, `public-db.ts`, `routes/media.$.tsx`, route heads |
| 7. YouTube job | `POST /api/cron/youtube-import` (Bearer `LOVABLE_CRON_SECRET`) adds new uploads as drafts | `hub.functions.ts` (`importChannelFeed`), `routes/api.cron.youtube-import.tsx` |
| 8. QA | See "QA results" below | `qa/` |
| 9. Docs | README, roadmap, `NEWSROOM-GUIDE.md` | — |

**Bugs found and fixed along the way**
- `/{lang}/videos/{slug}` and `/{lang}/blog/{slug}` showed the *list* page (the detail routes were nested under the list routes, which have no outlet) and printed two canonical links. The detail routes are now `$lang.videos_.$slug.tsx` and `$lang.blog_.$slug.tsx`. Same URLs.
- "Import from YouTube" created a junk `__noop__` source on every run, and failed silently for video IDs that contain `_` or start/end with `-`. Fixed with `youtubeSlug()`.
- The issue timeline on the Track page ignored status changes made by the planner/convert actions. Status events now use one format, and older events are still read.
- `/hi/category/…` was reachable while Hindi was switched off. It now returns 404, like the other Hindi pages.

## QA results (what was actually run)
- `npx tsc --noEmit` → 0 errors · `npx vitest run` → **39 tests, 7 files, all pass** · `npx vite build` → succeeds.
- Migrations 0000–0007 on PostgreSQL 16 with Supabase-style default privileges (`qa/supabase_standins.sql`).
- **103/103 role-by-role security checks pass** (`qa/rls-qa-results.txt`). There was one test user per role: Admin, Editor-in-Chief, Editor, Reporter, Research Analyst, Scriptwriter, Video Editor, Moderator, Social Media Manager, Web Admin, plus a signed-in user with no role. The checks confirmed:
  - Reporters and the non-publishing roles cannot publish or delete stories, videos, posts or data cards. Editor, Editor-in-Chief and Admin can.
  - Only Admin, Editor-in-Chief and Moderator see contact details, the evidence list and the private bucket.
  - Anonymous visitors see only live stories, videos and posts, including schedules once due. They see no drafts or future schedules, no internal columns, and nothing from the planner, tasks, issues, notes, events, audit log, profiles or roles. They cannot insert issues.
  - Only Admin reads the activity log and changes settings. Nobody can grant themselves a role.
- Browser end-to-end runs (Playwright, against the app running locally with PostgREST and a stand-in storage gateway):
  - **Citizen**: a Telugu form submitted with location and 5 files. The `.exe` was blocked in the browser. A fake `.mp4` (HTML inside) was uploaded, then rejected and deleted by the server. PNG, MP4 and HEIC were accepted, and the partial-upload warning was shown. lat/lng was saved (17.68682, 83.21848) and the contact went to the private table. Track page: wrong secret refused, right secret shows "Received".
  - **Moderator**: badge shows new issues, analytics, district filter, CSV download (checked: no phone/e-mail), contact, evidence and map visible, Telugu template inserted, Convert to content idea → issue "Content planned" → linked card → planner opens on that card.
  - **Reporter**: contact hidden behind the lock message, status controls disabled, no Settings, Activity or delete buttons, no YouTube import.
  - **Admin**: a bad channel ID is refused (inline and on the server). A valid ID, ticker = 7 and Hindi on were saved to the database, after which `/hi` and `/hi/videos` returned 200.
  - **Public**: all page types 200; future story → "Story not found"; a scheduled video/post appears as soon as its time passes, with no job. `/media/…` serves a photo only while a live story uses it, returns 404 after unpublishing, and rejects path tricks. The secured routes return 401 without the secret.
- Not run here: real Cloudflare Turnstile and Resend calls (no keys or network). Both are covered by unit tests with mocked responses. Real Supabase Storage limits were also not tested; a stand-in was used.

## Owner / Lovable steps still needed
1. **Apply migrations** 0006 (if not yet) and **0007** on Lovable Cloud, then **regenerate `src/integrations/supabase/types.ts`**. No new columns were added in 0007; the file was hand-edited earlier for `settings.youtube_channel_id`. Also check that the Cloud global upload limit is at least 150 MB.
2. **Secrets**: `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile, free); `RESEND_API_KEY` + `NOTIFY_FROM` (a sender on a domain verified with Resend; optional `NOTIFY_EMAILS`). `LOVABLE_CRON_SECRET` is managed by Lovable.
3. **Schedule** hourly `POST /api/cron/youtube-import` and `POST /api/notify-moderators` (both optional).
4. In **Settings**, add the real website address (`https://…`) and the YouTube channel ID.
5. **Repeat the role checklist on the live database** with one real account per role (README → Newsroom guide table), and do mobile and Telugu-font checks on real phones.
6. **Reviews**: native-speaker review of the Telugu text (including the new reply templates) and the Hindi text before switching Hindi on; legal review of Privacy/Terms/Editorial/Corrections pages; the e-mail and location wording on the form.
7. Delete any test accounts or rows you create on the live site.

## How to run locally
`npm install --legacy-peer-deps` · `npx tsc --noEmit` · `npx vitest run` · `npx vite build` · local QA kit: `qa/README.md`
