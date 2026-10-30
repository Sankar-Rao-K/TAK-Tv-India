ALTER POLICY articles_public ON public.articles TO anon;
REVOKE ALL ON FUNCTION public.track_news_urls() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.validate_news_article() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.protect_live_story() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.reject_unsafe_news_html() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.body_html ~* '<(script|iframe|form|style|object|embed)(\s|>)' OR NEW.body_html ~* '\son[a-z]+\s*=' OR NEW.body_html ~* '(javascript|data):' THEN RAISE EXCEPTION 'Unsafe HTML is not allowed'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.reject_unsafe_news_html() FROM PUBLIC;
CREATE TRIGGER reject_unsafe_html BEFORE INSERT OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.reject_unsafe_news_html();