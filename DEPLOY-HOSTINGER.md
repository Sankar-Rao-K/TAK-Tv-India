# Deploying TAK TV India on Hostinger (hPanel)

## Everything on Hostinger (owner's choice)
- **Website:** upgrade the plan to **Business** or **Cloud** (hPanel → Hosting Plan → Upgrade). Both run Node.js web apps.
- **Domain:** taktvindia.com is already on Hostinger, so it connects automatically. Hostinger can't switch an existing PHP website to Node.js in place, so:
  1. Back up the current site.
  2. Remove the existing website from hPanel, leaving **Delete email service** unticked. The domain, its DNS records and e-mail are not affected.
  3. Go to **Websites → Create site → Web App** and choose taktvindia.com.
  4. Deploy with the settings in section 2 below.
- **Database, logins and files (Supabase):** choose one.
  - **Supabase's own cloud** (simplest). Follow `docs/SUPABASE-SETUP-FOR-BEGINNERS`.
  - **Supabase on a Hostinger VPS** (keeps everything at Hostinger). Hostinger offers a VPS image with Supabase pre-installed. A VPS is self-managed: someone technical must handle updates, security and the 150 MB upload limit. This setup has not been tested with this website yet.
  - Hostinger's own MySQL databases can't replace Supabase without rewriting the whole website, because logins, private file storage and the security rules all depend on Supabase.

## If your plan is Premium or Single (no Node.js)
Premium and Single plans run only PHP websites, so this site cannot run on them. Keep using Hostinger for the **domain and e-mail**, and choose one option:

1. **Recommended — host on Lovable, keep the domain at Hostinger.** No code change, and the current Lovable Cloud backend keeps working. Custom domains need a **paid Lovable plan**.
   - In Lovable, **Publish** the project, then go to **Project → Settings → Domains → Connect domain** and enter `taktvindia.com`.
   - In hPanel, open **Domains → taktvindia.com → DNS / Nameservers → DNS records**. Add:
     - an `A` record for `@` pointing to `185.158.133.1`;
     - the `TXT` record for `_lovable` that Lovable shows (`lovable_verify=…`).
   - Delete any existing `A`/`AAAA` record for `@` that points to Hostinger's server (82.112.239.220). Do **not** touch the `MX` records, so Hostinger e-mail keeps working.
   - Wait until Lovable shows **Live**. This can take a few hours, and at most 72.
2. **Upgrade the Hostinger plan to Business** (hPanel → Hosting Plan → Upgrade). Then follow the rest of this guide. This also needs your own Supabase project.
3. **Cloudflare Workers** (for a developer). The normal `npm run build` already targets Workers. The free tier allows only 10 ms of CPU time per request, which a news page can go over, so plan on a paid Workers plan. You also need your own Supabase project. The domain's DNS must move to Cloudflare, and the e-mail MX records must be copied across.


This website is a server app. It needs Node.js, so it **cannot** run on plain PHP shared hosting by uploading files to `public_html`.

## 1. What you need first
- A Hostinger plan with **Node.js Web Apps** in hPanel: **Business Web Hosting** or **Cloud** (Startup / Professional / Enterprise / Enterprise Plus). Single and Premium plans can't run it. A VPS works too, but needs manual setup.
- Your **own Supabase project**, set up with `docs/SUPABASE-SETUP-FOR-BEGINNERS` (migrations 0000–0009, private buckets, first admin). Lovable Cloud does not give you the secret key, and the server needs that key.
- The code on GitHub (recommended) or as a zip **without** `node_modules`, `.output` and `.git`.

## 2. Create the app
1. hPanel → **Websites** → **Add Website** → **Node.js web app**.
2. Choose **Import your Git repository** (connect GitHub and pick the repo and branch), or **Upload your files** (the zip).
3. Use these settings:

| Field | Value |
|---|---|
| Framework preset | **Nitro** (or **Other**, see below) |
| Node.js version | 22 |
| Package manager | npm |
| Build command | `npm run build:node` |
| Output directory | `.output` |
| Entry file | `server/index.mjs` |

If you choose **Other**, leave the output directory empty and set the entry file to `.output/server/index.mjs`.

> Do not use plain `npm run build`. That makes the Cloudflare/Lovable version, which won't start on Hostinger. `build:node` makes the Node.js version.

4. **Environment variables** (add them all **before** the first build — the `VITE_` values are built into the pages):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) |
| `VITE_SUPABASE_PROJECT_ID` | Project reference (letters before `.supabase.co`) |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret key** (`sb_secret_…`) — server only |
| `LOVABLE_CRON_SECRET` | A long random password for the scheduled jobs |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (recommended) |
| `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_EMAILS` | Moderator e-mails (optional) |
| `YOUTUBE_API_KEY` | Video details from YouTube (optional) |

The repository's `.env` file holds the old Lovable Cloud values. The values you enter in Hostinger replace them, so make sure all three `VITE_` names are set.

5. Click **Deploy** and wait for the build to finish (a few minutes).

## 3. Domain and HTTPS
- Connect your domain to the web app in hPanel. If the domain is registered elsewhere, point its DNS to Hostinger as hPanel shows. Then make sure SSL is active.
- In the newsroom, set **Site Settings → Website address** to `https://yourdomain`.
- In Supabase, go to **Authentication → URL Configuration**. Set the Site URL to `https://yourdomain` and add the redirect `https://yourdomain/reset-password`.

## 4. Scheduled jobs
Each job is a `POST` with the header `Authorization: Bearer <LOVABLE_CRON_SECRET>`:
- `/api/cron/youtube-import` — hourly
- `/api/notify-moderators` — hourly
- `/api/cron/youtube-health` — weekly

The easiest place is **Supabase → Integrations → Cron → Create job → HTTP request** (see the Supabase guide, chapter 8). hPanel also has **Cron Jobs**, for example:
`curl -s -X POST -H "Authorization: Bearer YOUR_SECRET" https://yourdomain/api/cron/youtube-import`
(Hostinger's documentation doesn't say whether curl is allowed for Node.js apps; test it once.)

## 5. Check after deploying
- `/`, `/te`, a story, a video, `/en/raise-issue`, and `/admin` (sign in) all open.
- `/sitemap.xml` and `/robots.txt` show your real domain.
- Submit a test citizen issue with a small photo. Check that a moderator sees it, then delete it.
- **Updating:** push to the connected GitHub branch, and Hostinger rebuilds by itself. With a zip, upload the new zip.

## Notes
- Lovable can keep its own preview and hosting. The normal `npm run build` is unchanged, so Lovable is not affected.
- The Node.js build was tested locally: `npm run build:node`, then `node .output/server/index.mjs`. Home pages, stories, videos, Raise Issue, sign-in, the sitemap and robots all returned 200.
