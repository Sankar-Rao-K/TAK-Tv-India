REVOKE ALL PRIVILEGES ON public.articles FROM anon;
GRANT SELECT(id,lang,title,slug,summary,body_html,category_id,cover_path,cover_alt,cover_credit,youtube_id,is_breaking,is_featured,reporter_name,location,tags,status,publish_at,published_at,created_at,updated_at,seo_title,seo_description) ON public.articles TO anon;
REVOKE ALL ON FUNCTION public.track_news_urls() FROM anon,authenticated;
REVOKE ALL ON FUNCTION public.create_news_profile() FROM anon,authenticated;