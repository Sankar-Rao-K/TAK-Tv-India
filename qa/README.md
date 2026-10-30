# QA kit (local only — never run against the live project)

These files let a developer repeat the security and end-to-end checks on a throw-away local database.

- `supabase_standins.sql` — minimal stand-ins for the Supabase platform (roles `anon`/`authenticated`/`service_role`, Supabase-style default privileges, `auth.uid()`, `storage.buckets/objects`).
- `rls_qa.py` — 103 role-by-role checks (publishing rules, citizen contact/evidence privacy, anonymous access, admin-only areas). Needs one test user per role and the labelled QA rows (see the top of the script for the user ids).
- `rls-qa-results.txt` — the last run (103/103 passed).
- `local-stack/gateway.mjs` — a tiny stand-in for the Supabase gateway (REST via PostgREST, `auth/v1/user`, in-memory Storage with signed uploads and range reads) so the app can run locally.
- `local-stack/e2e_citizen.cjs`, `local-stack/e2e_newsroom.cjs` — Playwright runs of the citizen form/track page and of the moderator desk, reporter limits and admin settings.

Outline: create a PostgreSQL 16 database → run `supabase_standins.sql` → run `drizzle/migrations/0000…0007` in order → add test users/rows → `python3 rls_qa.py`. For the browser runs also start PostgREST (jwt secret, `db-anon-role = "anon"`, port 3001), `JWT_SECRET=… node local-stack/gateway.mjs`, and `npx vite dev` with `VITE_SUPABASE_URL`/`SUPABASE_URL` pointing at `http://localhost:54321` and locally signed anon/service keys.
