-- 0009 — make sure the private news-photo bucket exists on a brand-new Supabase project.
-- Lovable Cloud created it outside the migrations; on your own Supabase project nothing else would.
-- Existing buckets are left exactly as they are (no change on Lovable Cloud).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('news-media', 'news-media', false, 12582912, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
