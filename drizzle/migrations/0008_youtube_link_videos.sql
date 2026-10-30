-- 0008 — YouTube-link-only videos: Shorts, details read from YouTube, availability health check, YouTube thumbnail as a post cover.
-- No video or thumbnail files are stored: only the YouTube id and facts about it.

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_short boolean NOT NULL DEFAULT false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0);
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS yt_published_at timestamptz;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS yt_channel text NOT NULL DEFAULT '';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS yt_status text NOT NULL DEFAULT 'unknown';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS yt_checked_at timestamptz;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'videos_yt_status_check') THEN
    ALTER TABLE public.videos ADD CONSTRAINT videos_yt_status_check CHECK (yt_status IN ('ok', 'not_embeddable', 'unavailable', 'unknown'));
  END IF;
END $$;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS cover_youtube_id text NOT NULL DEFAULT '';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_cover_youtube_id_check') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_cover_youtube_id_check CHECK (cover_youtube_id = '' OR cover_youtube_id ~ '^[A-Za-z0-9_-]{11}$');
  END IF;
END $$;

-- Visitors may read the new public facts (0006 limits visitors to listed columns).
GRANT SELECT (is_short, duration_seconds, yt_published_at, yt_channel, yt_status) ON public.videos TO anon;
GRANT SELECT (cover_youtube_id) ON public.posts TO anon;

-- One website entry per YouTube video. Created only when existing data has no duplicates; the server also refuses duplicates.
CREATE INDEX IF NOT EXISTS videos_youtube_id_idx ON public.videos (youtube_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT youtube_id FROM public.videos WHERE youtube_id <> '' GROUP BY youtube_id HAVING count(*) > 1)
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'videos_youtube_id_key') THEN
    CREATE UNIQUE INDEX videos_youtube_id_key ON public.videos (youtube_id) WHERE youtube_id <> '';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS videos_short_idx ON public.videos (is_short, published_at DESC);
