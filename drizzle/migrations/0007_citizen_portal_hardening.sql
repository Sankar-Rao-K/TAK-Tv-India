-- 0007 — citizen portal hardening: direct uploads of large evidence files, faster desk queries.

-- 1. Private evidence bucket: up to 150 MB per file; only the evidence types the form accepts.
--    Uploads happen with one-time signed tickets issued by the server, so no upload policy for the public is needed.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('citizen-evidence', 'citizen-evidence', false, 157286400, ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime',
  'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Indexes for the Citizen Issues desk (history, first-response time, rate limit, planner link).
CREATE INDEX IF NOT EXISTS query_events_query_event_idx ON public.query_events (query_id, event, created_at);
CREATE INDEX IF NOT EXISTS query_events_event_created_idx ON public.query_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS queries_status_created_idx ON public.queries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS planner_items_query_idx ON public.planner_items (query_id) WHERE query_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS query_files_path_key ON public.query_files (path);

-- 3. A citizen-shared map point must be a real coordinate.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'queries_lat_lng_check') THEN
    ALTER TABLE public.queries ADD CONSTRAINT queries_lat_lng_check
      CHECK ((lat IS NULL AND lng IS NULL) OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180));
  END IF;
END $$;

-- 4. Public story lists are read newest-first by publish time.
CREATE INDEX IF NOT EXISTS articles_live_idx ON public.articles (status, published_at DESC);

-- 5. The single settings row must exist (the public site and Settings screen read/update id = 1).
--    Earlier migrations created the table but never the row; this is a no-op where it already exists.
INSERT INTO public.settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
