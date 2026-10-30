CREATE OR REPLACE FUNCTION public.create_news_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.profiles(id,email,name) VALUES(NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'name',''));
IF NOT EXISTS(SELECT 1 FROM public.user_roles) THEN INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'admin'); END IF;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.create_news_profile() FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.protect_live_story() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF TG_OP='UPDATE' AND ((OLD.status='published' AND OLD.published_at<=now()) OR (OLD.status='scheduled' AND OLD.publish_at<=now())) AND NEW.status=OLD.status AND NEW.pending_edits IS NOT NULL AND (NEW.title<>OLD.title OR NEW.body_html<>OLD.body_html OR NEW.slug<>OLD.slug) THEN RAISE EXCEPTION 'Live edits must be published explicitly'; END IF; RETURN NEW; END $$;
CREATE TRIGGER protect_live BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.protect_live_story();