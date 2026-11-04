# Deploying TAK TV India on Vercel with your Hostinger domain

Your domain (taktvindia.com) and e-mail stay at Hostinger. The website runs on Vercel, and Vercel builds it automatically from GitHub.

## Before you start
- **Your own Supabase project**, set up with `docs/SUPABASE-SETUP-FOR-BEGINNERS` (migrations 0000–0009, private buckets, sign-ups off, first admin). The server needs Supabase's **secret key**, and Lovable Cloud doesn't give you that.
- **The code on GitHub.** The Lovable project's GitHub connection is fine.
- **A Vercel account.** Vercel's own rules say the free **Hobby** plan is for **personal, non-commercial use only**. A news organisation should use **Pro** (US $20 per developer seat per month, plus tax; check vercel.com/pricing). You can start with Vercel's Pro trial.

## 1. Import the project
1. In Vercel, click **Add New → Project** and import the GitHub repository.
2. The settings come from `vercel.json` in the project: build command `npm run build:vercel`, install command `npm install`. Leave **Framework Preset = Other** and leave the output directory empty.
3. Before the first deploy, open **Environment Variables** and add the names below for **Production** (and Preview, if you use preview links):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) |
| `VITE_SUPABASE_PROJECT_ID` | Project reference (the letters before `.supabase.co`) |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret key** (`sb_secret_…`) — never anywhere else |
| `LOVABLE_CRON_SECRET` | A long random password for the scheduled jobs |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (recommended) |
| `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_EMAILS` | Moderator e-mails (optional) |
| `YOUTUBE_API_KEY` | Video details from YouTube (optional) |

The `.env` file in the repository holds the old Lovable Cloud values. The Vercel values replace them, so all three `VITE_` names must be set. The `VITE_` values are built into the pages, so if you change one later, **redeploy**.

4. Click **Deploy**. When it finishes, open the `….vercel.app` address and check that the home page loads.

## 2. Connect taktvindia.com (DNS at Hostinger)
1. In Vercel, go to **Project → Settings → Domains → Add** and enter `taktvindia.com`. Choose to redirect `www.taktvindia.com` to it (or the other way round).
2. Vercel shows the exact records to add. Use **its** values: they can differ per project. They are usually:
   - `A` record, name `@` → `76.76.21.21` (newer projects may show a different address, such as `216.198.79.1`)
   - `CNAME` record, name `www` → the `…vercel-dns…` target shown on the domain card
3. In hPanel, go to **Domains → taktvindia.com → DNS / Nameservers → DNS records**:
   - Delete the existing `A` record for `@` and any `AAAA` record for `@` (they point to Hostinger's server 82.112.239.220), and the old `www` record.
   - Add the records Vercel showed.
   - **Do not change the `MX`, `TXT` (SPF/DKIM) or e-mail records**, so Hostinger e-mail keeps working.
   - If there is a `CAA` record, make sure it allows `letsencrypt.org`.
4. Wait until Vercel shows the domain as **Valid**. HTTPS is issued automatically. DNS changes usually take minutes to a few hours.

## 3. After the domain works
- In the newsroom, set **Site Settings → Website address** to `https://taktvindia.com`.
- In Supabase, open **Authentication → URL Configuration**. Set the Site URL to `https://taktvindia.com` and add the redirect `https://taktvindia.com/reset-password`.
- **Scheduled jobs:** create them in **Supabase → Integrations → Cron** (HTTP request, POST, header `Authorization: Bearer <LOVABLE_CRON_SECRET>`):
  - `https://taktvindia.com/api/cron/youtube-import` — hourly
  - `https://taktvindia.com/api/notify-moderators` — hourly
  - `https://taktvindia.com/api/cron/youtube-health` — weekly

  Vercel's own cron jobs are not used. They send GET requests, while these routes accept only POST.
- Submit `https://taktvindia.com/sitemap.xml` and `/news-sitemap.xml` in Google Search Console.

## 4. Check
- `/`, `/te`, a story, a video, `/en/raise-issue`, `/en/track` and `/admin` (sign in) open.
- Submit a test citizen issue with a small photo and check that a moderator sees it. Then delete it.
- Updating the site: push to GitHub (or let Lovable push). Vercel redeploys by itself.

## Notes
- The Vercel build was tested locally: `npm run build:vercel` created the Vercel output, and its server function returned 200 for the home pages, a story, the videos page, Raise Issue, the sitemap and robots.txt. It has not yet been run on Vercel itself.
- Lovable's own build (`npm run build`) is unchanged.
