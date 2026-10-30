"""Role-by-role row-security QA against the local database built from the project migrations.
Each check runs in its own transaction as the given role/user and is rolled back."""
import json, subprocess, sys

U = {
    'admin': '00000000-0000-0000-0000-00000000000a', 'eic': '00000000-0000-0000-0000-00000000000b', 'reporter': '00000000-0000-0000-0000-00000000000c',
    'analyst': '00000000-0000-0000-0000-00000000000d', 'script': '00000000-0000-0000-0000-00000000000e', 'video': '00000000-0000-0000-0000-00000000000f',
    'moderator': '00000000-0000-0000-0000-000000000010', 'social': '00000000-0000-0000-0000-000000000011', 'webadmin': '00000000-0000-0000-0000-000000000012',
    'editor': '00000000-0000-0000-0000-000000000013', 'outsider': '00000000-0000-0000-0000-000000000014',
}
Q1 = '40000000-0000-0000-0000-000000000001'

def run(who, sql):
    if who == 'anon':
        pre = "SET LOCAL ROLE anon;"
    else:
        pre = f"SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claims', '{json.dumps({'sub': U[who], 'role': 'authenticated'})}', true);"
    full = f"BEGIN; {pre} {sql}; ROLLBACK;"
    p = subprocess.run(['psql', '-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', 'tak', '-At', '-q', '-v', 'ON_ERROR_STOP=1', '-c', full], capture_output=True, text=True)
    out = [l for l in p.stdout.strip().splitlines() if l and l not in ('BEGIN', 'ROLLBACK', 'SET')]
    if who != 'anon' and out: out = out[1:]  # drop set_config output
    return (p.returncode == 0, out[-1] if out else '', p.stderr.strip().splitlines()[-1] if p.stderr.strip() else '')

checks = []
def expect(name, who, sql, want):
    ok, val, err = run(who, sql)
    if want == 'error': passed = not ok
    elif want == 'none': passed = (not ok) or val == '0'  # refused outright, or zero rows visible
    elif want == 'ok': passed = ok
    else: passed = ok and val == str(want)
    checks.append((passed, who, name, want, val if ok else ('ERROR: ' + err[:110])))

# --- Publishing rules ---------------------------------------------------------------------------
expect('Reporter can save own draft story', 'reporter', f"INSERT INTO articles (lang,title,slug,body_html,status,created_by) VALUES ('te','r','qa-reporter-draft','<p>x</p>','draft','{U['reporter']}') RETURNING 1", 1)
expect('Reporter cannot publish a story', 'reporter', f"INSERT INTO articles (lang,title,slug,body_html,category_id,status,created_by) VALUES ('te','Reporter publish','qa-reporter-pub','<p>{'x'*60}</p>','education','published','{U['reporter']}')", 'error')
expect('Reporter cannot delete a story', 'reporter', "WITH d AS (DELETE FROM articles WHERE id='10000000-0000-0000-0000-000000000002' RETURNING 1) SELECT count(*) FROM d", 0)
expect('Reporter cannot publish a video', 'reporter', "UPDATE videos SET status='published' WHERE id='20000000-0000-0000-0000-000000000002'", 'error')
expect('Reporter cannot delete a video', 'reporter', "WITH d AS (DELETE FROM videos WHERE id='20000000-0000-0000-0000-000000000002' RETURNING 1) SELECT count(*) FROM d", 0)
expect('Reporter cannot publish a post', 'reporter', "UPDATE posts SET status='published' WHERE id='30000000-0000-0000-0000-000000000002'", 'error')
expect('Reporter cannot delete a post', 'reporter', "WITH d AS (DELETE FROM posts WHERE id='30000000-0000-0000-0000-000000000002' RETURNING 1) SELECT count(*) FROM d", 0)
expect('Reporter cannot publish a data card', 'reporter', "INSERT INTO data_cards (name_en,status) VALUES ('x','published')", 'error')
for who in ['analyst', 'script', 'video', 'social', 'webadmin', 'moderator']:
    expect('Cannot publish a video', who, "UPDATE videos SET status='published' WHERE id='20000000-0000-0000-0000-000000000002'", 'error')
    expect('Can edit a video draft', who, "WITH u AS (UPDATE videos SET title_en='edited' WHERE id='20000000-0000-0000-0000-000000000002' RETURNING 1) SELECT count(*) FROM u", 1)
for who in ['eic', 'editor', 'admin']:
    expect('Can publish a video', who, "WITH u AS (UPDATE videos SET status='published' WHERE id='20000000-0000-0000-0000-000000000002' RETURNING 1) SELECT count(*) FROM u", 1)
    expect('Can delete a video', who, "WITH d AS (DELETE FROM videos WHERE id='20000000-0000-0000-0000-000000000002' RETURNING 1) SELECT count(*) FROM d", 1)
    expect('Can publish a story', who, "WITH u AS (UPDATE articles SET status='published', category_id='education', body_html='<p>'||repeat('Long enough story text. ',4)||'</p>' WHERE id='10000000-0000-0000-0000-000000000002' RETURNING 1) SELECT count(*) FROM u", 1)
expect('Data card needs source + year + verified date', 'eic', "INSERT INTO data_cards (name_en,status) VALUES ('x','published')", 'error')
expect('Editor-in-Chief can publish a sourced data card', 'eic', "WITH i AS (INSERT INTO data_cards (name_en,status,source_id,data_year,verified_at) SELECT 'QA card','published',id,2024,current_date FROM sources LIMIT 1 RETURNING 1) SELECT count(*) FROM i", 1)

# --- Citizen contact details & private evidence -------------------------------------------------
for who, n in [('admin', 1), ('eic', 1), ('moderator', 1), ('reporter', 0), ('analyst', 0), ('script', 0), ('video', 0), ('social', 0), ('webadmin', 0), ('editor', 0), ('outsider', 0)]:
    expect('Sees citizen contact details' if n else 'Cannot see citizen contact details', who, f"SELECT count(*) FROM query_contacts WHERE query_id='{Q1}'", n)
    expect('Sees evidence file list' if n else 'Cannot see evidence file list', who, f"SELECT count(*) FROM query_files WHERE query_id='{Q1}'", n)
    expect('Can open evidence in private bucket' if n else 'Cannot open evidence in private bucket', who, "SELECT count(*) FROM storage.objects WHERE bucket_id='citizen-evidence'", n)
expect('Newsroom member sees the issue (no contact)', 'reporter', f"SELECT count(*) FROM queries WHERE id='{Q1}'", 1)
expect('Signed-in non-member sees no issues', 'outsider', "SELECT count(*) FROM queries", 0)
expect('Reporter cannot add contact details', 'reporter', f"INSERT INTO query_contacts (query_id,name) VALUES ('40000000-0000-0000-0000-000000000002','x')", 'error')

# --- Anonymous visitors ---------------------------------------------------------------------------
expect('Anon sees only live stories (published + due schedule)', 'anon', "SELECT count(*) FROM articles WHERE title LIKE 'QA %'", 2)
expect('Anon cannot read internal story columns', 'anon', "SELECT editor_note FROM articles LIMIT 1", 'error')
expect('Anon sees only live videos (published + due schedule)', 'anon', "SELECT count(*) FROM videos WHERE slug LIKE 'qa-video-%'", 2)
expect('Anon cannot see future scheduled video', 'anon', "SELECT count(*) FROM videos WHERE slug='qa-video-future'", 0)
expect('Anon sees only live posts', 'anon', "SELECT count(*) FROM posts WHERE slug LIKE 'qa-post-%'", 2)
expect('Anon cannot read video created_by', 'anon', "SELECT created_by FROM videos LIMIT 1", 'error')
expect('Anon cannot read data card internal notes', 'anon', "SELECT notes FROM data_cards LIMIT 1", 'error')
expect('Anon cannot read source reliability notes', 'anon', "SELECT reliability_note FROM sources LIMIT 1", 'error')
for t in ['planner_items', 'planner_comments', 'tasks', 'queries', 'query_contacts', 'query_files', 'query_notes', 'query_events', 'audit_log']:
    expect(f'Anon cannot read {t}', 'anon', f"SELECT count(*) FROM {t}", 'none')
expect('Anon cannot open citizen evidence', 'anon', "SELECT count(*) FROM storage.objects WHERE bucket_id='citizen-evidence'", 0)
expect('Anon cannot insert an issue directly', 'anon', "INSERT INTO queries (ref_no,secret_hash,title) VALUES ('X','x','x')", 'error')
expect('Anon cannot see sources attached to a draft video', 'anon', "SELECT count(*) FROM content_sources WHERE content_id='20000000-0000-0000-0000-000000000002'", 0)
expect('Anon sees sources attached to a live video', 'anon', "SELECT count(*) FROM content_sources WHERE content_id='20000000-0000-0000-0000-000000000001'", 1)
expect('Anon can read new public video facts (Short, length)', 'anon', "SELECT count(*) FROM (SELECT is_short, duration_seconds, yt_status FROM videos) x WHERE true", 'ok')
expect('Anon cannot read when a video was health-checked', 'anon', "SELECT yt_checked_at FROM videos LIMIT 1", 'error')
expect('Reporter cannot publish a video by changing the YouTube status', 'reporter', "UPDATE videos SET yt_status='ok', status='published' WHERE id='20000000-0000-0000-0000-000000000002'", 'error')

# --- Admin-only areas -----------------------------------------------------------------------------
expect('Admin reads the activity log', 'admin', "SELECT (count(*)>0)::int FROM audit_log", 1)
for who in ['eic', 'editor', 'reporter', 'moderator', 'webadmin']:
    expect('Cannot read the activity log', who, "SELECT count(*) FROM audit_log", 0)
    expect('Cannot change site settings', who, "WITH u AS (UPDATE settings SET site_name='x' RETURNING 1) SELECT count(*) FROM u", 0)
expect('Admin can change site settings', 'admin', "WITH u AS (UPDATE settings SET ticker_count=7 RETURNING 1) SELECT count(*) FROM u", 1)
expect('Reporter cannot change own role', 'reporter', "WITH u AS (UPDATE user_roles SET role='admin' WHERE user_id=auth.uid() RETURNING 1) SELECT count(*) FROM u", 'none')
expect('Reporter cannot grant a role', 'reporter', f"INSERT INTO user_roles (user_id, role) VALUES ('{U['outsider']}','admin')", 'error')
expect('Anon cannot read team profiles', 'anon', "SELECT count(*) FROM profiles", 'none')
expect('Anon cannot read roles', 'anon', "SELECT count(*) FROM user_roles", 'none')

fails = [c for c in checks if not c[0]]
w = max(len(c[2]) for c in checks)
for passed, who, name, want, got in checks:
    print(f"{'PASS' if passed else 'FAIL'}  {who:<10} {name:<{w}}  expected={want}  got={got}")
print(f"\n{len(checks) - len(fails)}/{len(checks)} checks passed")
sys.exit(1 if fails else 0)
