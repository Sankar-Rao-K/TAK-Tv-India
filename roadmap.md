# TAK TV India
- [x] Three-language public site, logo, categories, videos, search, stories and information pages
- [x] Cloud stories, roles, media, settings and secure newsroom login
- [x] Write/review/publish/schedule workflow, sanitization and private live edits
- [x] Categories, team, settings, pages and photo library screens
- [x] Feeds, sitemaps, redirects and removed stories
- [x] Unit tests, public desktop/mobile checks and newsroom create/publish/update/remove flow with a real photo
- [x] Newsroom setup and owner guide
- [ ] Owner creates first newsroom account (requires owner's account details)
- [ ] Verify invitation and recovery emails (requires owner's real email/account)
- [ ] Native-speaker/legal review and first real news content (requires owner/editorial input)

## Citizen Voice Portal + Content Hub (Prompt 2)
- [x] Phase A — schema: new roles, 30 topic categories, videos/posts/data cards/sources/planner/tasks tables, citizen query tables with restricted contact & evidence access, audit log, private citizen-evidence bucket
- [x] Phase B — Raise Your Issue form, tracking page, protected submission function (reference number + secret code)
- [x] Phase C — Citizen Queries inbox, case page, status workflow, notes, assignment, history
- [x] Phase D — Videos & Blogs modules, Sources & Proofs panel, auto-updating ticker
- [x] Phase E — Content Planner (kanban + calendar), import 45-day plan + sources library, Data Library
- [x] Phase F — Roles polish, settings, SEO/JSON-LD, full QA pass


## Update (audit & completion pass)
- [x] Phase C inbox (existing) – type errors fixed
- [x] Phase D videos, blogs/posts, ticker, Sources & Proofs, followed page (UI + server); needs migration 0006 applied
- [x] Phase E planner, Data Library, Source Library, activity log (UI + server + seeds)
- [x] Phase F remaining items (completion pass below)

## Completion pass (Oct 2026)
- [x] Migration 0007 (evidence bucket 150 MB + allowed types, desk indexes, map-point check, settings row) — tested with 0000–0006 on PostgreSQL 16
- [x] Settings: YouTube channel ID, ticker count, Hindi switch (validated on the server)
- [x] Citizen desk: convert to content idea + linked planner card, filters, CSV export, analytics row, Telugu/English reply templates, new-issues badge
- [x] Citizen portal: Turnstile CAPTCHA (server-verified), direct signed uploads (MP4/MOV ≤150 MB, HEIC, PDF/DOCX), real-byte type checks, optional location, moderator e-mail + secured digest route
- [x] Sitemap/RSS with videos, posts, Data, Followed; 48-hour news sitemap; generated robots.txt
- [x] Smaller public payload, per-page full text, stable /media/ photo URLs, hreflang only where translations exist
- [x] Hourly YouTube import route (drafts only)
- [x] Fixed: video and blog detail pages showed the list page; YouTube import created junk “__noop__” sources and failed on IDs with “_”
- [x] Local QA: 103 role-by-role security checks + browser end-to-end runs (see CONTINUE.md)
- [ ] Apply 0006 + 0007 on Lovable Cloud and regenerate `src/integrations/supabase/types.ts` (owner/Lovable)
- [ ] Add Turnstile + e-mail keys, schedule the two hourly jobs (owner)
- [ ] Repeat the role checklist on the live Cloud database with real accounts (owner)
- [ ] Native-speaker review of Telugu/Hindi text and legal review of Privacy/Terms/Editorial pages (owner)

## YouTube-link-only videos + manuals (Oct 2026)
- [x] Paste-a-link video form: ID parsing, duplicate block, oEmbed title/channel, optional Data API details, Telugu/English field by script
- [x] YouTube thumbnails only (maxres → hq → mq, placeholder detection), click-to-play no-cookie player, home lightbox (Esc, focus return)
- [x] Shorts: vertical cards/player, Shorts filter, home Shorts row
- [x] Unavailable videos: “Watch on YouTube” fallback, “Check YouTube links” + weekly `/api/cron/youtube-health`
- [x] “Needs details” badge, one-click Publish, YouTube thumbnail as blog cover; VideoObject duration/uploadDate
- [x] Migrations 0008 (video facts) and 0009 (news-media bucket for fresh projects)
- [x] Manuals: `docs/TAKTV-USER-MANUAL`, `docs/SUPABASE-SETUP-FOR-BEGINNERS`, `docs/TAKTV-CHEAT-SHEET` (.docx + .pdf, text only by owner’s choice)
- [ ] Apply 0008 + 0009 on the live database; add `YOUTUBE_API_KEY` (optional); schedule the weekly health check (owner)
- [ ] Native-speaker review of the Telugu quick-start and new Telugu labels (owner)
