# TAK TV India — Newsroom guide

Sign in at `/admin`. What you can do depends on your role:

| Role | Write & save drafts | Publish / schedule / delete | Citizen contact details & evidence | Settings, Team, Pages, Activity Log |
|---|---|---|---|---|
| Admin | ✓ | ✓ | ✓ | ✓ |
| Editor-in-Chief | ✓ | ✓ | ✓ | — |
| Editor | ✓ | ✓ | — | — |
| Citizen Desk Moderator | ✓ (videos, posts, planner) | — | ✓ | — |
| Reporter | ✓ (own stories) | — | — | — |
| Research Analyst, Scriptwriter, Video Editor, Social Media Manager, Web Admin | ✓ (videos, posts, data, planner) | — | — | — |

The database enforces these rules, so a button that is missing for you would also be refused if tried another way.

## 1. Reporter → editor flow (stories)
1. **Write News** → choose language, category, headline, summary and story. Add a cover photo with a caption (required) and credit.
2. **Save Draft** often (autosave runs every 25 seconds once there is a headline). **Preview** shows the private preview.
3. Reporters press **Submit for Review**. The story appears under **Needs Review** for editors.
4. The editor checks facts, sources and wording, then **Publish Now** — or sets **Publish time (IST)** and presses **Schedule**. Scheduled stories appear on the site at that minute; nothing else is needed.
5. To change a live story, edit and press **Update Live Story**. Saving a draft of a live story keeps the change private until then.
6. To take a story down use the ⋯ menu: Unpublish, Archive or Move to Trash. Its address then shows “This story has been removed”.

## 2. Add a video (YouTube link only) with Sources & Proofs
**Post on YouTube first → paste the link here → add details → publish.** Never upload video files to the website; the thumbnail and player come straight from YouTube.
1. **Videos → Add video** and paste the YouTube link (normal, youtu.be, Shorts, live link or the 11-character ID). Click outside the box.
2. The thumbnail preview, title and channel appear. Telugu titles go to the Telugu field, others to English. With the `YOUTUBE_API_KEY` server secret, the description, length, date and tags are filled too.
3. “This video is already on the website.” → click **Open the existing entry**. A private/removed or non-embeddable video shows a warning.
4. Tick **This is a YouTube Short** if needed (automatic for /shorts/ links; the site reminds you for videos of 3 minutes or less).
5. Add descriptions, **Category**, series, region, tags and **Sources & Proofs** (Add a link / Add from Source Library: exact link, type, data year, date accessed, page).
6. Status *Draft* or *Ready for review*; editors publish or schedule. Drafts missing a title, category or source show **Needs details**; when complete, editors see a one-click **Publish** in the list.
7. **Import from YouTube** (and the hourly job) bring new channel uploads in as drafts with “Needs details”.
8. **Check YouTube links** (and the weekly job) flags live videos that YouTube can no longer play: “Video unavailable on YouTube” / “Embedding switched off”. Visitors then see a “Watch on YouTube” button instead of a broken player. Fix it on YouTube or unpublish.

## 3. Add a data card (Data Library)
Rules: **never type a number you cannot point to.** Every published card needs a source, a data year and a verified date.
1. **Data Library → New data card**. Names in Telugu and English, geography (India / Andhra Pradesh / district) and unit (%, ₹ lakh, persons).
2. **Data year** — the year the figure describes (not today’s year). **Baseline / comparison year** — e.g. 2011 for Census figures. A Census 2011 figure is a *baseline*, not a current number; say so in the name or text.
3. **Source** — choose it from the Source Library (add it there first if missing).
4. **Chart numbers** — one line per value: `Label, value` (e.g. `2011, 62.4`). Choose bars, line or table.
5. **Date verified** — the day you checked the figure against the source.
6. Data older than three years is labelled “Older data” on the site automatically. Add a newer figure when one exists.
7. Only editors and admins can publish a card.

## 4. Work the Content Planner
- **Board**: one column per stage — Idea → Researching → Script draft → Fact-check → Ready to record → Recorded → Editing → Published. Use the stage menu on a card to move it.
- **Calendar**: cards grouped by week of their planned publish date. **Tasks**: every task with owner and due date.
- Open a card to fill the core question, data to collect (2011 baseline → latest year), suggested sources and what to ask viewers; tick the checklist (data collected, sources verified, right of reply sent, script reviewed, thumbnail ready); write the script; add comments and tasks.
- **Create video draft** makes a linked draft video. Cards that came from a citizen issue say so; moving such a card to *Published* also marks the issue as published.
- The 45-day plan is pre-loaded as topics only (no statistics). Fill in data from real sources.

## 5. Citizen Issues desk
1. The menu badge shows how many issues are still **New**.
2. Filter by status, topic, district, assignee and dates; **Export CSV** downloads the current list (no contact details).
3. Open an issue: read it, check the map point and evidence (moderators, Editor-in-Chief and admins only — file links last 15 minutes), add internal notes, set status, priority and assignee.
4. **Convert to content idea** creates a planner card (contact details are not copied) and moves the issue to *Content planned*. The case page then shows the linked card with an **Open planner card** button.
5. **Update for the citizen**: pick a reply template (Telugu, English or both), edit it, then tick **Visible to the citizen**. Only this text and the stage are shown on the Track page.
6. Mark duplicates with the other issue’s reference; mark spam to block it.
7. Never publish a citizen’s name, phone, e-mail, exact home location or evidence without their consent and an editor’s approval. Nothing is published automatically.

## 6. Site Settings (admins)
Website address (must start with `https://`), contact details, social links, taglines, **YouTube channel ID** (`UC…`, 24 characters), **items in the top ticker** (1–20) and **Show Hindi on the public site**. Changes reach the public site immediately.
