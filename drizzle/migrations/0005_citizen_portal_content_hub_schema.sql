-- Helper functions (created before policies that use them)
CREATE OR REPLACE FUNCTION public.is_newsroom_member(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY (_roles))
$$;

CREATE OR REPLACE FUNCTION public.can_publish(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_user_id, ARRAY['admin','editor','editor_in_chief']::public.app_role[])
$$;

CREATE OR REPLACE FUNCTION public.can_moderate(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_user_id, ARRAY['admin','editor_in_chief','moderator']::public.app_role[])
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity text, _entity_id text, _detail jsonb DEFAULT '{}')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (actor, action, entity, entity_id, detail)
  VALUES (auth.uid(), _action, _entity, _entity_id, _detail);
END $$;

REVOKE EXECUTE ON FUNCTION public.is_newsroom_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_publish(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_moderate(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_newsroom_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_publish(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_moderate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) TO authenticated;

-- Videos
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_te text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  description_te text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  youtube_id text NOT NULL DEFAULT '',
  category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  region text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'te',
  series text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','scheduled','published','unpublished','archived')),
  publish_at timestamptz,
  published_at timestamptz,
  is_featured boolean NOT NULL DEFAULT false,
  show_in_ticker boolean NOT NULL DEFAULT true,
  social_links jsonb NOT NULL DEFAULT '{}',
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY videos_public_read ON public.videos FOR SELECT TO anon USING (status = 'published');
CREATE POLICY videos_newsroom_all ON public.videos FOR ALL TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE TRIGGER videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Posts (blog / photo story / data story / quick update)
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  post_type text NOT NULL DEFAULT 'blog' CHECK (post_type IN ('blog','photo_story','data_story','quick_update')),
  title_te text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  body_te text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  cover_path text NOT NULL DEFAULT '',
  cover_alt text NOT NULL DEFAULT '',
  cover_credit text NOT NULL DEFAULT '',
  category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  region text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','scheduled','published','unpublished','archived')),
  publish_at timestamptz,
  published_at timestamptz,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_public_read ON public.posts FOR SELECT TO anon USING (status = 'published');
CREATE POLICY posts_newsroom_all ON public.posts FOR ALL TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Source library
CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL DEFAULT '' UNIQUE,
  name text NOT NULL,
  organisation text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'other' CHECK (source_type IN ('government','audit_cag','parliament_qa','court_record','rti_reply','research','fact_check','news_report','other')),
  reliability_note text NOT NULL DEFAULT '',
  usage_tips text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY sources_public_read ON public.sources FOR SELECT TO anon USING (true);
CREATE POLICY sources_newsroom_write ON public.sources FOR ALL TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());

-- Sources attached to a piece of content
CREATE TABLE public.content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('video','post','data_card')),
  content_id uuid NOT NULL,
  source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'other' CHECK (source_type IN ('government','audit_cag','parliament_qa','court_record','rti_reply','research','fact_check','news_report','other')),
  data_year text NOT NULL DEFAULT '',
  accessed_at date,
  page_ref text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.content_sources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_sources TO authenticated;
GRANT ALL ON public.content_sources TO service_role;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_sources_public_read ON public.content_sources FOR SELECT TO anon USING (true);
CREATE POLICY content_sources_newsroom_write ON public.content_sources FOR ALL TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());

-- Data cards
CREATE TABLE public.data_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_te text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  geography text NOT NULL DEFAULT '',
  data_year integer,
  comparison_year integer,
  chart_type text NOT NULL DEFAULT 'bar' CHECK (chart_type IN ('bar','line','table')),
  chart_data jsonb NOT NULL DEFAULT '[]',
  source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  verified_at date,
  verified_by uuid,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.data_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_cards TO authenticated;
GRANT ALL ON public.data_cards TO service_role;
ALTER TABLE public.data_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY data_cards_public_read ON public.data_cards FOR SELECT TO anon USING (status = 'published');
CREATE POLICY data_cards_newsroom_all ON public.data_cards FOR ALL TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE TRIGGER data_cards_updated_at BEFORE UPDATE ON public.data_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Citizen queries (no anonymous access; submissions arrive via a server function)
CREATE SEQUENCE public.query_ref_seq START 1;

CREATE TABLE public.queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no text NOT NULL UNIQUE,
  secret_hash text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  district text NOT NULL DEFAULT '',
  mandal text NOT NULL DEFAULT '',
  location_text text NOT NULL DEFAULT '',
  lat double precision,
  lng double precision,
  started_at text NOT NULL DEFAULT '',
  people_affected text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','under_review','need_more_info','researching','verified','content_planned','published','resolved','rejected','duplicate','spam')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assignee uuid,
  consent_truth boolean NOT NULL DEFAULT false,
  consent_use boolean NOT NULL DEFAULT false,
  consent_public boolean NOT NULL DEFAULT false,
  submitter_name text NOT NULL DEFAULT '',
  is_blocked boolean NOT NULL DEFAULT false,
  published_followup boolean NOT NULL DEFAULT false,
  followup_summary text NOT NULL DEFAULT '',
  merged_into uuid REFERENCES public.queries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queries TO authenticated;
GRANT ALL ON public.queries TO service_role;
GRANT USAGE ON SEQUENCE public.query_ref_seq TO service_role;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY queries_newsroom_read ON public.queries FOR SELECT TO authenticated USING (public.is_newsroom_member());
CREATE POLICY queries_newsroom_update ON public.queries FOR UPDATE TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE TRIGGER queries_updated_at BEFORE UPDATE ON public.queries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Submitter contact details: moderators and leadership only
CREATE TABLE public.query_contacts (
  query_id uuid PRIMARY KEY REFERENCES public.queries(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.query_contacts TO authenticated;
GRANT ALL ON public.query_contacts TO service_role;
ALTER TABLE public.query_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY query_contacts_moderator_all ON public.query_contacts FOR ALL TO authenticated USING (public.can_moderate()) WITH CHECK (public.can_moderate());

-- Evidence files (private bucket paths)
CREATE TABLE public.query_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  path text NOT NULL,
  kind text NOT NULL DEFAULT 'photo' CHECK (kind IN ('photo','video','document')),
  content_type text NOT NULL DEFAULT '',
  size bigint NOT NULL DEFAULT 0,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.query_files TO authenticated;
GRANT ALL ON public.query_files TO service_role;
ALTER TABLE public.query_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY query_files_moderator_all ON public.query_files FOR ALL TO authenticated USING (public.can_moderate()) WITH CHECK (public.can_moderate());

-- Immutable case history
CREATE TABLE public.query_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  actor uuid,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.query_events TO authenticated;
GRANT ALL ON public.query_events TO service_role;
ALTER TABLE public.query_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY query_events_newsroom_read ON public.query_events FOR SELECT TO authenticated USING (public.is_newsroom_member());
CREATE POLICY query_events_newsroom_insert ON public.query_events FOR INSERT TO authenticated WITH CHECK (public.is_newsroom_member());

-- Internal notes (never public)
CREATE TABLE public.query_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  author uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.query_notes TO authenticated;
GRANT ALL ON public.query_notes TO service_role;
ALTER TABLE public.query_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY query_notes_newsroom_read ON public.query_notes FOR SELECT TO authenticated USING (public.is_newsroom_member());
CREATE POLICY query_notes_newsroom_insert ON public.query_notes FOR INSERT TO authenticated WITH CHECK (public.is_newsroom_member());

-- Content planner
CREATE TABLE public.planner_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_te text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  region text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'idea' CHECK (stage IN ('idea','researching','script_draft','fact_check','ready_to_record','recorded','editing','published')),
  planned_date date,
  owner uuid,
  due_date date,
  checklist jsonb NOT NULL DEFAULT '{}',
  script_html text NOT NULL DEFAULT '',
  core_question text NOT NULL DEFAULT '',
  data_to_collect text NOT NULL DEFAULT '',
  suggested_sources text NOT NULL DEFAULT '',
  viewer_ask text NOT NULL DEFAULT '',
  query_id uuid REFERENCES public.queries(id) ON DELETE SET NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_items TO authenticated;
GRANT ALL ON public.planner_items TO service_role;
ALTER TABLE public.planner_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY planner_items_newsroom_all ON public.planner_items FOR ALL TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE TRIGGER planner_items_updated_at BEFORE UPDATE ON public.planner_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.planner_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.planner_items(id) ON DELETE CASCADE,
  author uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.planner_comments TO authenticated;
GRANT ALL ON public.planner_comments TO service_role;
ALTER TABLE public.planner_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY planner_comments_newsroom_read ON public.planner_comments FOR SELECT TO authenticated USING (public.is_newsroom_member());
CREATE POLICY planner_comments_newsroom_insert ON public.planner_comments FOR INSERT TO authenticated WITH CHECK (public.is_newsroom_member());

-- Team tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  assignee uuid,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','blocked','done')),
  planner_item_id uuid REFERENCES public.planner_items(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_newsroom_all ON public.tasks FOR ALL TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit log (admin read; writes via log_audit)
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  action text NOT NULL,
  entity text NOT NULL DEFAULT '',
  entity_id text NOT NULL DEFAULT '',
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_admin_read ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Citizen evidence bucket: moderators/leadership read via signed URLs; uploads only via the service role (server function)
CREATE POLICY citizen_evidence_moderator_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'citizen-evidence' AND public.can_moderate());
CREATE POLICY citizen_evidence_moderator_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'citizen-evidence' AND public.has_role(auth.uid(), 'admin'));