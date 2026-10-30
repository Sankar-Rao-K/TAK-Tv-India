-- 0006 — complete the Citizen Portal + Content Hub: role fixes, publishing rules, tighter public access, audit trail, source library, 45-day plan, basic pages.

-- 1. Editor-in-Chief can publish and review stories (previously only admin/editor).
CREATE OR REPLACE FUNCTION public.is_news_editor() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','editor','editor_in_chief'))
$$;
GRANT EXECUTE ON FUNCTION public.is_news_editor() TO authenticated, service_role;

-- 2. Settings: channel id for the YouTube auto-import (public value).
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS youtube_channel_id text NOT NULL DEFAULT '';

-- 3. Videos / posts / data cards: only publishers may publish; scheduled items appear at their time; validation.
CREATE OR REPLACE FUNCTION public.validate_video() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_publish() AND NEW.status IN ('published','scheduled','unpublished','archived') THEN
    RAISE EXCEPTION 'Only editors and admins can publish or remove videos';
  END IF;
  IF NEW.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(NEW.slug) < 3 OR length(NEW.slug) > 80 THEN RAISE EXCEPTION 'Web address must be 3–80 lowercase letters, numbers and hyphens'; END IF;
  IF NEW.youtube_id <> '' AND NEW.youtube_id !~ '^[A-Za-z0-9_-]{11}$' THEN RAISE EXCEPTION 'Invalid YouTube link'; END IF;
  IF NEW.status IN ('published','scheduled') THEN
    IF NEW.youtube_id = '' THEN RAISE EXCEPTION 'A YouTube link is required to publish a video'; END IF;
    IF length(trim(NEW.title_te)) = 0 AND length(trim(NEW.title_en)) = 0 THEN RAISE EXCEPTION 'A title is required'; END IF;
    IF NEW.category_id IS NULL THEN RAISE EXCEPTION 'Choose a category'; END IF;
    IF NEW.status = 'scheduled' AND NEW.publish_at IS NULL THEN RAISE EXCEPTION 'Publish time is required'; END IF;
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN NEW.published_at = now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.validate_post() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_publish() AND NEW.status IN ('published','scheduled','unpublished','archived') THEN
    RAISE EXCEPTION 'Only editors and admins can publish or remove posts';
  END IF;
  IF NEW.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(NEW.slug) < 3 OR length(NEW.slug) > 80 THEN RAISE EXCEPTION 'Web address must be 3–80 lowercase letters, numbers and hyphens'; END IF;
  IF NEW.body_te ~* '<(script|iframe|form|style|object|embed)(\s|>)' OR NEW.body_en ~* '<(script|iframe|form|style|object|embed)(\s|>)' OR NEW.body_te ~* '\son[a-z]+\s*=' OR NEW.body_en ~* '\son[a-z]+\s*=' OR NEW.body_te ~* 'javascript:' OR NEW.body_en ~* 'javascript:' THEN RAISE EXCEPTION 'Unsafe content was rejected'; END IF;
  IF NEW.status IN ('published','scheduled') THEN
    IF length(trim(NEW.title_te)) = 0 AND length(trim(NEW.title_en)) = 0 THEN RAISE EXCEPTION 'A title is required'; END IF;
    IF length(regexp_replace(NEW.body_te || NEW.body_en, '<[^>]*>', '', 'g')) < 40 THEN RAISE EXCEPTION 'The post needs at least 40 characters'; END IF;
    IF NEW.category_id IS NULL THEN RAISE EXCEPTION 'Choose a category'; END IF;
    IF NEW.cover_path <> '' AND trim(NEW.cover_alt) = '' THEN RAISE EXCEPTION 'Cover photo caption is required'; END IF;
    IF NEW.status = 'scheduled' AND NEW.publish_at IS NULL THEN RAISE EXCEPTION 'Publish time is required'; END IF;
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN NEW.published_at = now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.validate_data_card() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_publish() AND NEW.status IN ('published','archived') THEN
    RAISE EXCEPTION 'Only editors and admins can publish data cards';
  END IF;
  IF NEW.status = 'published' THEN
    IF NEW.source_id IS NULL OR NEW.data_year IS NULL OR NEW.verified_at IS NULL THEN RAISE EXCEPTION 'A data card needs a source, a data year and a verified date before publishing'; END IF;
    IF length(trim(NEW.name_te)) = 0 AND length(trim(NEW.name_en)) = 0 THEN RAISE EXCEPTION 'A name is required'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_video(), public.validate_post(), public.validate_data_card() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS validate_video ON public.videos;
DROP TRIGGER IF EXISTS validate_post ON public.posts;
DROP TRIGGER IF EXISTS validate_data_card ON public.data_cards;
CREATE TRIGGER validate_video BEFORE INSERT OR UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.validate_video();
CREATE TRIGGER validate_post BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_post();
CREATE TRIGGER validate_data_card BEFORE INSERT OR UPDATE ON public.data_cards FOR EACH ROW EXECUTE FUNCTION public.validate_data_card();

-- 4. Row policies: readable by the newsroom, writable by members, deletable only by publishers; the public sees only live items.
DROP POLICY IF EXISTS videos_public_read ON public.videos; DROP POLICY IF EXISTS videos_newsroom_all ON public.videos;
DROP POLICY IF EXISTS posts_public_read ON public.posts; DROP POLICY IF EXISTS posts_newsroom_all ON public.posts;
DROP POLICY IF EXISTS data_cards_public_read ON public.data_cards; DROP POLICY IF EXISTS data_cards_newsroom_all ON public.data_cards;
DROP POLICY IF EXISTS planner_items_newsroom_all ON public.planner_items; DROP POLICY IF EXISTS tasks_newsroom_all ON public.tasks;
DROP POLICY IF EXISTS sources_newsroom_write ON public.sources; DROP POLICY IF EXISTS content_sources_newsroom_write ON public.content_sources;
DROP POLICY IF EXISTS content_sources_public_read ON public.content_sources; DROP POLICY IF EXISTS sources_public_read ON public.sources;

CREATE POLICY videos_public_read ON public.videos FOR SELECT TO anon, authenticated USING ((status = 'published' AND published_at <= now()) OR (status = 'scheduled' AND publish_at <= now()));
CREATE POLICY videos_member_read ON public.videos FOR SELECT TO authenticated USING (public.is_newsroom_member());
CREATE POLICY videos_member_insert ON public.videos FOR INSERT TO authenticated WITH CHECK (public.is_newsroom_member());
CREATE POLICY videos_member_update ON public.videos FOR UPDATE TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE POLICY videos_publisher_delete ON public.videos FOR DELETE TO authenticated USING (public.can_publish());

CREATE POLICY posts_public_read ON public.posts FOR SELECT TO anon, authenticated USING ((status = 'published' AND published_at <= now()) OR (status = 'scheduled' AND publish_at <= now()));
CREATE POLICY posts_member_read ON public.posts FOR SELECT TO authenticated USING (public.is_newsroom_member());
CREATE POLICY posts_member_insert ON public.posts FOR INSERT TO authenticated WITH CHECK (public.is_newsroom_member());
CREATE POLICY posts_member_update ON public.posts FOR UPDATE TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE POLICY posts_publisher_delete ON public.posts FOR DELETE TO authenticated USING (public.can_publish());

CREATE POLICY data_cards_public_read ON public.data_cards FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY data_cards_member_read ON public.data_cards FOR SELECT TO authenticated USING (public.is_newsroom_member());
CREATE POLICY data_cards_member_insert ON public.data_cards FOR INSERT TO authenticated WITH CHECK (public.is_newsroom_member());
CREATE POLICY data_cards_member_update ON public.data_cards FOR UPDATE TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE POLICY data_cards_publisher_delete ON public.data_cards FOR DELETE TO authenticated USING (public.can_publish());

CREATE POLICY sources_public_read ON public.sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY sources_member_insert ON public.sources FOR INSERT TO authenticated WITH CHECK (public.is_newsroom_member());
CREATE POLICY sources_member_update ON public.sources FOR UPDATE TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE POLICY sources_publisher_delete ON public.sources FOR DELETE TO authenticated USING (public.can_publish());

-- Sources attached to content are public only when the content itself is live (RLS of the referenced tables applies).
CREATE POLICY content_sources_public_read ON public.content_sources FOR SELECT TO anon, authenticated USING (
  (content_type = 'video' AND EXISTS (SELECT 1 FROM public.videos v WHERE v.id = content_id))
  OR (content_type = 'post' AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = content_id))
  OR (content_type = 'data_card' AND EXISTS (SELECT 1 FROM public.data_cards d WHERE d.id = content_id)));
CREATE POLICY content_sources_member_all ON public.content_sources FOR ALL TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());

CREATE POLICY planner_items_member_read ON public.planner_items FOR SELECT TO authenticated USING (public.is_newsroom_member());
CREATE POLICY planner_items_member_insert ON public.planner_items FOR INSERT TO authenticated WITH CHECK (public.is_newsroom_member());
CREATE POLICY planner_items_member_update ON public.planner_items FOR UPDATE TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE POLICY planner_items_publisher_delete ON public.planner_items FOR DELETE TO authenticated USING (public.can_publish());
CREATE POLICY tasks_member_read ON public.tasks FOR SELECT TO authenticated USING (public.is_newsroom_member());
CREATE POLICY tasks_member_insert ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.is_newsroom_member());
CREATE POLICY tasks_member_update ON public.tasks FOR UPDATE TO authenticated USING (public.is_newsroom_member()) WITH CHECK (public.is_newsroom_member());
CREATE POLICY tasks_publisher_delete ON public.tasks FOR DELETE TO authenticated USING (public.can_publish());

-- Hide internal columns from the public (internal notes, creators, verification staff).
REVOKE SELECT ON public.videos FROM anon;
GRANT SELECT (id, slug, title_te, title_en, description_te, description_en, youtube_id, category_id, tags, region, language, series, status, publish_at, published_at, is_featured, show_in_ticker, social_links, seo_title, seo_description, created_at, updated_at) ON public.videos TO anon;
REVOKE SELECT ON public.posts FROM anon;
GRANT SELECT (id, slug, post_type, title_te, title_en, body_te, body_en, cover_path, cover_alt, cover_credit, category_id, tags, region, status, publish_at, published_at, seo_title, seo_description, created_at, updated_at) ON public.posts TO anon;
REVOKE SELECT ON public.data_cards FROM anon;
GRANT SELECT (id, name_te, name_en, unit, geography, data_year, comparison_year, chart_type, chart_data, source_id, verified_at, status, created_at, updated_at) ON public.data_cards TO anon;
REVOKE SELECT ON public.sources FROM anon;
GRANT SELECT (id, ref, name, organisation, website, category, source_type) ON public.sources TO anon;

-- 5. Faster public lists.
CREATE INDEX IF NOT EXISTS videos_public_idx ON public.videos (status, published_at DESC);
CREATE INDEX IF NOT EXISTS posts_public_idx ON public.posts (status, published_at DESC);

-- 6. Activity log: who changed what (publishing, roles, settings).
CREATE OR REPLACE FUNCTION public.audit_changes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id text; _detail jsonb := '{}'::jsonb; _new jsonb; _old jsonb;
BEGIN
  _new := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  _old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  IF TG_TABLE_NAME = 'user_roles' THEN
    _id := COALESCE(_new->>'user_id', _old->>'user_id'); _detail := jsonb_build_object('role', COALESCE(_new->>'role', _old->>'role'));
  ELSIF TG_TABLE_NAME = 'settings' THEN
    _id := '1';
  ELSE
    _id := COALESCE(_new->>'id', _old->>'id'); _detail := jsonb_build_object('status', COALESCE(_new->>'status', _old->>'status'), 'title', left(COALESCE(_new->>'title', _new->>'title_en', _new->>'title_te', _new->>'name_en', _old->>'title', _old->>'title_en', _old->>'title_te', ''), 120));
    IF TG_OP = 'UPDATE' AND (_old->>'status') IS NOT DISTINCT FROM (_new->>'status') THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO public.audit_log (actor, action, entity, entity_id, detail) VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, _id, _detail);
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE ALL ON FUNCTION public.audit_changes() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS audit_articles ON public.articles; DROP TRIGGER IF EXISTS audit_videos ON public.videos; DROP TRIGGER IF EXISTS audit_posts ON public.posts;
DROP TRIGGER IF EXISTS audit_data_cards ON public.data_cards; DROP TRIGGER IF EXISTS audit_roles ON public.user_roles; DROP TRIGGER IF EXISTS audit_settings ON public.settings;
CREATE TRIGGER audit_articles AFTER INSERT OR UPDATE OR DELETE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
CREATE TRIGGER audit_videos AFTER INSERT OR UPDATE OR DELETE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
CREATE TRIGGER audit_posts AFTER INSERT OR UPDATE OR DELETE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
CREATE TRIGGER audit_data_cards AFTER INSERT OR UPDATE OR DELETE ON public.data_cards FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
CREATE TRIGGER audit_settings AFTER UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- 7. Seed: trusted Source Library (from the content plan workbook).
INSERT INTO public.sources (ref, name, organisation, website, category, source_type, reliability_note, usage_tips) VALUES
  ('S01','MoSPI — Ministry of Statistics & Programme Implementation','MoSPI — Ministry of Statistics & Programme Implementation','mospi.gov.in','All / National data','government','Check the latest PLFS/NSS release year each time','PLFS (jobs), NSS surveys, CPI inflation, national accounts, state GDP'),
  ('S02','Census of India','Census of India','censusindia.gov.in','All / National data','government','Confirm what newer census data has been published before using 2011','Census 2011 tables (your baseline) and any newer census releases'),
  ('S03','Open Government Data Platform','Open Government Data Platform','data.gov.in','All / National data','government','Verify dataset year and publisher','Downloadable datasets from ministries and states'),
  ('S04','NITI Aayog','NITI Aayog','niti.gov.in','All / National data','research','Use for state comparisons','SDG India Index, state indicators, reports'),
  ('S05','RBI — Handbook of Statistics on Indian States; State Finances','RBI — Handbook of Statistics on Indian States; State Finances','rbi.org.in','All / National data','government','Best source for 2011→latest comparisons','Long time series 2011→latest on state economy and finances'),
  ('S06','PRS Legislative Research','PRS Legislative Research','prsindia.org','All / National data','research','Neutral summaries; check original documents','Budget analysis, bills, MPs'' attendance/questions'),
  ('S07','Parliament of India (Lok Sabha / Rajya Sabha)','Parliament of India (Lok Sabha / Rajya Sabha)','sansad.in','All / National data','parliament_qa','Search by state/topic; cite question number & date','Questions & answers on any state or scheme'),
  ('S08','Comptroller & Auditor General (CAG)','Comptroller & Auditor General (CAG)','cag.gov.in','All / National data','audit_cag','Strongest evidence for gaps in delivery','Audit reports on states, schemes, railways, finances'),
  ('S09','Union Budget','Union Budget','indiabudget.gov.in','All / National data','government','Use with PRS analysis','Budget documents, expenditure by ministry'),
  ('S10','World Bank / UNDP / WHO / FAO','World Bank / UNDP / WHO / FAO','data.worldbank.org / hdr.undp.org / who.int / fao.org','All / National data','research','For international context only','Global comparisons'),
  ('S11','Agricultural Statistics at a Glance (DES)','Agricultural Statistics at a Glance (DES)','desagri.gov.in','Agriculture & Farmers','government','Compare 2011→latest','Crop area, production, yield time series'),
  ('S12','Commission for Agricultural Costs & Prices (CACP)','Commission for Agricultural Costs & Prices (CACP)','cacp.dacnet.nic.in','Agriculture & Farmers','government','Cite report year','MSP reports and cost of cultivation'),
  ('S13','Agmarknet / e-NAM','Agmarknet / e-NAM','agmarknet.gov.in / enam.gov.in','Agriculture & Farmers','government','Download price series to compare with MSP','Daily mandi prices and arrivals'),
  ('S14','PM-KISAN & scheme dashboards','PM-KISAN & scheme dashboards','pmkisan.gov.in','Agriculture & Farmers','government','Check dashboard date','Beneficiary counts and payments'),
  ('S15','Central Water Commission — reservoir bulletins','Central Water Commission — reservoir bulletins','cwc.gov.in','Irrigation & Water','government','Cite bulletin date','Weekly storage in major reservoirs'),
  ('S16','India-WRIS','India-WRIS','indiawris.gov.in','Irrigation & Water','government','Maps and data downloads','Rivers, rainfall, groundwater, projects'),
  ('S17','State irrigation departments (AP / Telangana)','State irrigation departments (AP / Telangana)','State government portals','Irrigation & Water','government','Locate official portal; verify URL','Project status reports'),
  ('S18','MGNREGA MIS','MGNREGA MIS','nrega.nic.in','Rural Employment & Infrastructure','government','Public MIS reports — no login needed','Work days, wages, payments by district'),
  ('S19','Jal Jeevan Mission dashboard','Jal Jeevan Mission dashboard','jaljeevanmission.gov.in','Rural Employment & Infrastructure','government','Check update date','Tap connection coverage'),
  ('S20','PMGSY (rural roads)','PMGSY (rural roads)','omms.nic.in','Rural Employment & Infrastructure','government','State-wise reports','Habitations connected, road progress'),
  ('S21','UDISE+','UDISE+','udiseplus.gov.in','Education','government','Use latest year','Schools, teachers, facilities'),
  ('S22','ASER (Pratham)','ASER (Pratham)','asercentre.org','Education','research','Survey-based; cite year','Learning outcomes in rural India'),
  ('S23','AISHE','AISHE','aishe.gov.in','Education','government','Annual report','Higher education data'),
  ('S24','National Health Profile / HMIS','National Health Profile / HMIS','nhp.gov.in / hmis.mohfw.gov.in','Health','government','Check data year','Facilities, staff, services, hospital data'),
  ('S25','National Family Health Survey (NFHS)','National Family Health Survey (NFHS)','rchiips.org / nfhs.rchiips.org','Health','other','Compare NFHS rounds; check for the newest round','Nutrition, anaemia, maternal/child health by state/district'),
  ('S26','Indian Railways Year Book / Railway Board','Indian Railways Year Book / Railway Board','indianrailways.gov.in','Railways','government','Use latest Year Book','Passenger, safety, finance data'),
  ('S27','CAG railway audit reports','CAG railway audit reports','cag.gov.in','Railways','audit_cag','Strong evidence source','Safety, finance, project audits'),
  ('S28','MoRTH — Road Accidents in India','MoRTH — Road Accidents in India','morth.nic.in','Roads & Transport','government','Annual report','Accidents, deaths, black spots by state'),
  ('S29','NCRB — Accidental Deaths & Suicides in India','NCRB — Accidental Deaths & Suicides in India','ncrb.gov.in','Roads & Transport','government','Annual report','Accident deaths'),
  ('S30','NCRB — Crime in India','NCRB — Crime in India','ncrb.gov.in','Law & Order','government','Annual report; note reporting delays','Crime rates, conviction, police strength'),
  ('S31','National Judicial Data Grid (eCourts)','National Judicial Data Grid (eCourts)','njdg.ecourts.gov.in','Law & Order','court_record','Live dashboard — note date','Pending cases by court/state'),
  ('S32','RTI Online','RTI Online','rtionline.gov.in','Governance & Transparency','government','Use for data not published','File central RTI applications'),
  ('S33','Central/State Information Commissions','Central/State Information Commissions','cic.gov.in / state IC sites','Governance & Transparency','government','Locate state IC site','Annual reports: pending appeals'),
  ('S34','Election Commission of India','Election Commission of India','eci.gov.in','Elections & Democracy','government','Official results','Results, turnout, electoral rolls'),
  ('S35','ADR / MyNeta','ADR / MyNeta','adrindia.org / myneta.info','Elections & Democracy','research','Based on affidavits; cite election year','Candidate affidavits: assets & criminal cases'),
  ('S36','CPCB','CPCB','cpcb.nic.in','Environment & Disasters','government','Station-wise data','Air quality, pollution data'),
  ('S37','India Meteorological Department','India Meteorological Department','imd.gov.in','Environment & Disasters','government','Archive for past cyclones','Cyclone tracks, rainfall data'),
  ('S38','NDMA','NDMA','ndma.gov.in','Environment & Disasters','government','State disaster authority reports','Disaster guidelines & reports'),
  ('S39','Central Electricity Authority','Central Electricity Authority','cea.nic.in','Power & Energy','government','Monthly/annual reports','Generation, demand, losses'),
  ('S40','Grid-India','Grid-India','grid-india.in','Power & Energy','government','For supply/demand claims','Real-time grid and demand'),
  ('S41','POSHAN Tracker (Ministry of WCD)','POSHAN Tracker (Ministry of WCD)','poshantracker.in','Women, Children & Welfare','government','Check month','Anganwadi services data'),
  ('S42','National Food Security Act portal','National Food Security Act portal','nfsa.gov.in','Women, Children & Welfare','government','State pages','Ration coverage'),
  ('S43','PMAY MIS','PMAY MIS','pmaymis.gov.in','Housing & Land','government','State-wise','Houses sanctioned/completed'),
  ('S44','DILRMP — Department of Land Resources','DILRMP — Department of Land Resources','dolr.gov.in','Housing & Land','government','Progress reports','Land record digitisation'),
  ('S45','Labour Bureau (CPI-AL/RL)','Labour Bureau (CPI-AL/RL)','labourbureau.gov.in','Prices & Economy','government','Monthly','Rural/agri-labour price indices'),
  ('S46','GST Council / GST Portal','GST Council / GST Portal','gst.gov.in','Prices & Economy','government','Check notification date','Rates and collection data'),
  ('S47','Department of Fisheries','Department of Fisheries','dof.gov.in','Fisheries & Tribal','government','Annual handbook','Fisheries statistics'),
  ('S48','Ministry of Tribal Affairs','Ministry of Tribal Affairs','tribal.nic.in','Fisheries & Tribal','government','Monthly FRA reports','FRA claims/titles, tribal statistics'),
  ('S49','STPI / MeitY / TRAI','STPI / MeitY / TRAI','stpi.in / meity.gov.in / trai.gov.in','Technology & IT','government','Annual/quarterly','IT exports, telecom subscribers'),
  ('S50','National Cyber Crime Reporting Portal','National Cyber Crime Reporting Portal','cybercrime.gov.in','Technology & IT','government','Use with NCRB','Cyber crime categories & reporting'),
  ('S51','Sports Authority of India / Khelo India','Sports Authority of India / Khelo India','sportsauthorityofindia.nic.in / kheloindia.gov.in','Sports','government','Check scheme year','Facilities, schemes, funding'),
  ('S52','CBFC','CBFC','cbfcindia.gov.in','Entertainment / Cinema','government','Combine with state GOs','Film certification data'),
  ('S53','PIB Fact Check / Alt News / BOOM','PIB Fact Check / Alt News / BOOM','pib.gov.in / altnews.in / boomlive.in','Media & Misinformation','fact_check','Cross-check across at least two','Verified fact-checks'),
  ('S54','GVMC — Greater Visakhapatnam Municipal Corporation','GVMC — Greater Visakhapatnam Municipal Corporation','gvmc.gov.in','Visakhapatnam','government','Use RTI where data is missing','Budgets, services, complaints'),
  ('S55','VMRDA / Visakhapatnam Port Authority / RINL','VMRDA / Visakhapatnam Port Authority / RINL','vmrda.gov.in / vizagport.com / vizagsteel.com','Visakhapatnam','government','Annual reports','Master plan, port traffic, steel plant reports'),
  ('S56','Smart Cities Mission','Smart Cities Mission','smartcities.gov.in','Visakhapatnam','government','Dashboard','Project status'),
  ('S57','AP government portals — Finance, Planning, Directorate of Economics & Statistics','AP government portals — Finance, Planning, Directorate of Economics & Statistics','ap.gov.in (departments linked)','State: Andhra Pradesh','government','Locate exact department portals; URLs change','State budget, socio-economic survey, statistics'),
  ('S58','Telangana government portals — Finance, Planning; Open Data','Telangana government portals — Finance, Planning; Open Data','finance.telangana.gov.in / data.telangana.gov.in','State: Telangana','government','Verify URLs','Budget, Socio-Economic Outlook, open datasets'),
  ('S59','CESS (Hyderabad), CPR, IndiaSpend, Down To Earth / CSE','CESS (Hyderabad), CPR, IndiaSpend, Down To Earth / CSE','cess.ac.in / cprindia.org / indiaspend.com / cseindia.org','Research & Data Journalism','research','Secondary sources — go back to primary data','Analyses for context'),
  ('S60','India Code','India Code','indiacode.nic.in','Law & Acts','government','Cite section numbers','Acts and rules, e.g., AP Reorganisation Act 2014')
ON CONFLICT (ref) DO NOTHING;

-- 8. Seed: 45-day content plan (topics only; no statistics).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.planner_items) THEN
    INSERT INTO public.planner_items (title_te, title_en, category_id, region, stage, planned_date, core_question, data_to_collect, suggested_sources, viewer_ask, sort_order) VALUES
  ('రైతు ఆదాయం: మద్దతు ధర నిజంగా అందుతోందా?','Farmer Income: Is the MSP Really Reaching Farmers?','agriculture-farmers','AP + Telangana','idea','2026-10-26','What share of paddy/cotton/chilli farmers sell at or above MSP, and what is the average net income of a farm household?','Farm household income (NSS 2012-13 vs latest survey); MSP vs mandi price; procurement quantity 2011→latest','CACP reports, Agmarknet, MoSPI (NSS), State Civil Supplies','Photos of mandi price boards / sale receipts',1),
  ('సాగునీటి ప్రాజెక్టులు: వాగ్దానం vs వాస్తవం','Irrigation Projects: Promised vs Completed','irrigation-water','AP + Telangana','idea','2026-10-27','Which major projects are delayed, by how many years, and by how much has the cost increased?','Sanctioned vs spent cost; ayacut promised vs created; reservoir storage trends','CWC reservoir bulletins, India-WRIS, state irrigation dept, CAG','Photos of dry canals / tail-end fields',2),
  ('ఉపాధి హామీ: 100 రోజుల పని ఎందుకు దొరకడం లేదు?','MGNREGA: Why Do Few Households Get 100 Days of Work?','rural-employment','AP + Telangana','idea','2026-10-28','What is the average days of work per household, wage-payment delay and pending wage liability by district?','MGNREGA MIS 2011→latest; wage rate vs minimum wage; households completing 100 days','nrega.nic.in (MIS), Ministry of Rural Development, PRS','Job card & wage-delay stories',3),
  ('గ్రామాల్లో రోడ్లు, తాగునీరు: పరిస్థితి ఏమిటి?','Villages Without Basics: Roads, Drinking Water, Connectivity','rural-infrastructure','AP + Telangana','idea','2026-10-29','How many habitations lack an all-weather road and how many households lack a tap connection?','Census 2011 amenities vs latest JJM / PMGSY dashboards','Jal Jeevan Mission dashboard, PMGSY (OMMS), Census of India','Photos of broken roads / water sources',4),
  ('ప్రభుత్వ పాఠశాలలు: టీచర్లు, భవనాలు, ఫలితాలు','Government Schools: Teachers, Buildings, Learning Outcomes','education','AP + Telangana','idea','2026-10-30','How many schools lack teachers, toilets or labs, and are children actually learning?','UDISE+ (PTR, facilities) and ASER 2011→latest','UDISE+, ASER (Pratham), AISHE','Photos of school buildings / toilets',5),
  ('ప్రభుత్వ ఆరోగ్య సేవలు: PHCలు, డాక్టర్లు, మందులు','Public Health: PHCs, Doctors and Medicines','health','AP + Telangana','idea','2026-10-31','What are the doctor/bed ratios, vacancies in PHCs/CHCs and out-of-pocket spending?','Rural Health Statistics, NFHS-3/4/5/latest, HMIS','National Health Profile, HMIS, NFHS (IIPS), NITI Aayog','Hospital wait / medicine shortage experiences',6),
  ('విశాఖ రైల్వే జోన్ & ప్రయాణికుల సౌకర్యాలు','Railways: Vizag Zone, Safety and Passenger Facilities','railways','AP + Telangana','idea','2026-11-02','What is the real status of promised railway infrastructure, safety (Kavach) coverage, delays and amenities on AP/TG routes?','Year Book data, accident/derailment stats, CAG audit findings, station amenity spend','Indian Railways Year Book, Railway Board, CAG, Sansad Q&A','Photos of station facilities, coach conditions',7),
  ('రోడ్డు ప్రమాదాలు: ఎందుకు తగ్గడం లేదు?','Road Accidents: Why Are Deaths Not Falling?','roads-transport','AP + Telangana','idea','2026-11-03','How many identified black spots are fixed and how fast do ambulances reach?','MoRTH Road Accidents in India 2011→latest; district black-spot data','MoRTH, NCRB (ADSI), state police','Photos of dangerous junctions / potholes',8),
  ('విశాఖ నగరం: డ్రైనేజీ, చెత్త, ట్రాఫిక్','Visakhapatnam: Drainage, Garbage and Traffic','visakhapatnam-city','Visakhapatnam','idea','2026-11-04','How much did the city corporation budget vs spend on drainage and solid waste and how many complaints are resolved on time?','GVMC budgets and audit reports; Swachh Survekshan ranks','GVMC, MoHUA / SBM-Urban, state audit','Ward-wise drainage / garbage photos',9),
  ('విశాఖ ఉక్కు, ఓడరేవు: ఉద్యోగాలు ఎక్కడ?','Vizag Steel, Port and Industry: Where Are the Jobs?','vizag-industry-port','Visakhapatnam','idea','2026-11-05','How many jobs were promised vs created, and what is the current status of the public sector units?','Company annual reports; jobs/employment data; Parliament answers','RINL, Visakhapatnam Port Authority, Sansad Q&A','Workers'' / contract employees'' accounts',10),
  ('విశాఖ గాలి నాణ్యత & తీర కోత','Vizag: Air Quality and Coastal Erosion','environment','Visakhapatnam','idea','2026-11-06','How many days are ''poor'' on AQI and are pollution norms enforced for industry?','CPCB AQI (2011→latest), coastal erosion studies','CPCB, State Pollution Control Board, NCCR','Photos/videos of pollution & erosion',11),
  ('తుఫాన్ సన్నద్ధత: హెచ్చరికలు, షెల్టర్లు','Cyclone Preparedness: Warnings, Shelters, Compensation','disaster-preparedness','AP coast','idea','2026-11-07','Are there enough cyclone shelters per coastal mandal and how long does compensation take?','IMD cyclone records; NDMA/SDMA data; relief paid vs assessed damage','IMD, NDMA, State Disaster Management Authority','Experiences from last cyclone',12),
  ('మత్స్యకారులు: జీవనోపాధి & సహాయం','Fishermen: Livelihoods and Relief','fisheries-coast','AP coast','idea','2026-11-09','Is ban-period relief keeping pace with prices and are harbour facilities adequate?','Fisheries statistics, relief amounts over time','Dept of Fisheries, CMFRI, state fisheries dept','Fishing-harbour photos & issues',13),
  ('గిరిజన ప్రాంతాలు: రోడ్లు, ఆసుపత్రులు, అటవీ హక్కులు','Tribal Areas: Roads, Hospitals, Forest Rights','tribal-areas','AP agency / Telangana','idea','2026-11-10','How many Forest Rights claims are pending and what is health access in agency areas?','FRA claims vs titles; NFHS tribal indicators','Ministry of Tribal Affairs, NFHS, ITDA reports','Stories from agency villages',14),
  ('విద్యుత్ ఛార్జీలు & సరఫరా: ఎవరిపై భారం?','Electricity: Tariffs, Supply and Who Bears the Burden','power-energy','AP + Telangana','idea','2026-11-11','What are DISCOM losses, tariff changes and farm-supply hours?','Tariff orders, DISCOM ratings, T&D loss 2011→latest','CEA, PFC, Grid-India, State Electricity Regulatory Commission','Electricity bill photos / outage logs',15),
  ('యువత ఉద్యోగాలు: నిరుద్యోగం వాస్తవాలు','Youth and Jobs: The Unemployment Reality','youth-jobs','AP + Telangana','idea','2026-11-12','What is the unemployment rate by age/education and how many government vacancies are unfilled?','NSS 2011-12 vs latest PLFS; vacancy data; skill-programme outcomes','MoSPI (PLFS), DGE, state recruitment boards','Job-seeker experiences',16),
  ('మహిళలు, పిల్లలు: భద్రత & పోషణ','Women and Children: Safety and Nutrition','women-children','AP + Telangana','idea','2026-11-13','How are anaemia/stunting trending and what is the conviction rate in crimes against women?','NFHS-3/4/5/latest; NCRB; Anganwadi functioning (POSHAN Tracker)','NFHS, NCRB, POSHAN Tracker, WCD Ministry','Anganwadi service experiences',17),
  ('సంక్షేమ పథకాలు: నిజంగా అందుతున్నాయా?','Welfare Schemes: Do Benefits Reach the Right People?','welfare-schemes','AP + Telangana','idea','2026-11-14','What are exclusion errors in pension/ration schemes and how long do grievances take?','PDS coverage, pension beneficiaries, social-audit findings','NFSA portal, state DBT portals, social audit reports','Ration / pension problems',18),
  ('రాష్ట్ర అప్పులు: బడ్జెట్ ఏం చెబుతోంది?','State Debt and Budget: What the Numbers Say','state-finances','AP + Telangana','idea','2026-11-16','What are debt-to-GSDP, revenue deficit and off-budget borrowings over time?','RBI State Finances 2011→latest; CAG finance accounts','RBI, CAG, PRS Legislative Research, state finance depts','Questions viewers want asked',19),
  ('కేంద్ర నిధులు & విభజన హామీలు: ఏం వచ్చింది?','Central Funds and Bifurcation Promises: What Was Delivered?','union-state-relations','AP + Telangana','idea','2026-11-17','Which provisions of the AP Reorganisation Act 2014 are implemented and which are pending?','Act text; Finance Commission devolution; Parliament replies','India Code, Finance Commission reports, Sansad Q&A','Questions viewers want asked',20),
  ('పాలనలో పారదర్శకత: RTI, ఆడిట్ నివేదికలు','Transparency: RTI and Audit Reports','governance-transparency','AP + Telangana','idea','2026-11-18','How many RTI appeals are pending and which audit objections remain unresolved?','Information Commission annual reports; CAG audit reports','RTI Online, CAG, State Information Commission','Your RTI experiences',21),
  ('నేరాలు & శాంతిభద్రతలు: గణాంకాలు ఏం చెబుతున్నాయి?','Crime and Law & Order: What NCRB Data Shows','law-order','AP + Telangana','idea','2026-11-19','How have crime rates, case pendency and police vacancies changed?','NCRB Crime in India 2011→latest; court pendency','NCRB, NJDG (eCourts), BPR&D','Safety concerns in your area',22),
  ('ఎన్నికలు & ప్రజాస్వామ్యం: అభ్యర్థులు, ఓటింగ్','Elections and Democracy: Candidates, Turnout, Funding','elections-democracy','AP + Telangana','idea','2026-11-20','What share of candidates have declared criminal cases or high assets and how is turnout trending?','ECI turnout; ADR candidate analysis','ECI, ADR, MyNeta','Voting-day issues',23),
  ('భూ రికార్డులు, ఇళ్ల వివాదాలు','Land Records and Housing Disputes','land-housing','AP + Telangana','idea','2026-11-21','How many land disputes are pending and how far has record digitisation progressed?','Land records stats; PMAY houses sanctioned vs completed','DILRMP, PMAY MIS, NJDG, state revenue dept','Land-record problems (with documents)',24),
  ('ఐటీ & డిజిటల్ సేవలు','IT and Digital Services','technology-it','Vizag + Hyderabad','idea','2026-11-23','What are IT jobs/exports, digital-service reliability and cyber-fraud trends?','STPI exports; NCRB cyber crime; TRAI connectivity','STPI, MeitY, TRAI, cybercrime.gov.in','Digital-service failures',25),
  ('క్రీడా సౌకర్యాలు & ప్రోత్సాహం','Sports: Facilities and Support for Athletes','sports','AP + Telangana','idea','2026-11-24','Are coaches, stadiums and incentives available to athletes?','Khelo India funding; medal-winner incentives','Sports Authority of India, MYAS, Sansad Q&A','Local sports-facility issues',26),
  ('తెలుగు సినిమా & ప్రభుత్వం','Telugu Cinema and Government','entertainment-cinema','Telugu film industry','idea','2026-11-25','What are the policies on ticket pricing, incentives and censorship and who benefits?','Government orders; CBFC data','CBFC, state I&PR / government orders','Theatre-price experiences',27),
  ('ఫేక్ న్యూస్: ఎలా గుర్తించాలి?','Fake News: How to Spot and Verify','media-misinformation','National','idea','2026-11-26','How do rumours spread and how can citizens verify claims?','Fact-check case studies','PIB Fact Check, Alt News, BOOM','Forwarded messages to verify',28),
  ('ధరలు & GST: సామాన్యుడిపై భారం','Prices and GST: The Burden on Households','prices-economy','AP + Telangana','idea','2026-11-27','How much have essential prices and the tax share in daily purchases risen?','CPI 2011→latest; CPI-AL/RL; GST rates','MoSPI (CPI), Labour Bureau, GST Council','Your monthly grocery bills',29),
  ('ఈ వారం ముఖ్య వార్త: విశ్లేషణ','This Week Explained','trending-explainers','Flexible slot','idea','2026-11-28','Pick the most-discussed issue of the week and apply the standard 6-step method.','Depends on topic','PIB, official releases, Google Trends','Topic suggestions',30),
  ('విశాఖ 2011 vs ఇప్పుడు: జనాభా, నగరీకరణ','Reality Check: Vizag 2011 vs Today','visakhapatnam-city','Visakhapatnam','idea','2026-11-30','How have population, housing and services changed since Census 2011 and are services keeping up?','Census 2011 vs latest census/estimates','Census of India, GVMC, MoHUA','Locality changes you have seen',31),
  ('రైతులు 2011 vs ఇప్పుడు','Reality Check: Farmers 2011 vs Today','agriculture-farmers','AP + Telangana','idea','2026-12-01','What changed in costs, income, debt and land-holding since 2011?','NSS 2012-13 vs latest SAS; input-cost indices','MoSPI, Agricultural Statistics at a Glance, RBI','Cost-of-cultivation receipts',32),
  ('గ్రామీణ ఉపాధి & వలసలు','Reality Check: Rural Jobs and Migration','rural-employment','AP + Telangana','idea','2026-12-02','Are people leaving villages for work and what is government doing to keep livelihoods local?','Census 2011 migration vs latest data; MGNREGA demand','Census, PLFS, MGNREGA MIS','Migration stories from villages',33),
  ('ప్రజల గళం #1: మీరు పంపిన టాప్ 5 సమస్యలు','Citizen Voice #1: Top 5 Problems You Sent','trending-explainers','Viewers','idea','2026-12-03','Which verified citizen problems need a government answer first?','Verified submissions from the portal','Portal (verified), local officials','Keep sending problems with photos/videos',34),
  ('ప్రజల గళం #2: గ్రౌండ్ రిపోర్ట్','Citizen Voice #2: Ground Report','trending-explainers','Viewers','idea','2026-12-04','What do we find on site and what do officials say?','On-site evidence; official response','Portal, field visit, department reply','Follow-up photos after fix',35),
  ('ప్రజల గళం #3: ఏం మారింది?','Citizen Voice #3: What Changed After Our Reports?','trending-explainers','Viewers','idea','2026-12-05','Which reported problems were fixed, which are pending, why?','Tracked outcomes from the query history','Portal history, departments','Before/after photos',36),
  ('రైల్వే ఫాలో-అప్','Follow-up: Railways','railways','AP + Telangana','idea','2026-12-07','What responses/updates came after the first railways video?','New official data & replies','Railway Board, Sansad Q&A','Updates from your station',37),
  ('వ్యవసాయం ఫాలో-అప్: మీ ప్రశ్నలు','Follow-up: Agriculture (Your Questions)','agriculture-farmers','AP + Telangana','idea','2026-12-08','Answer the most-asked viewer questions with data.','Selected data points','CACP, Agmarknet, state agriculture dept','Farmer questions',38),
  ('పార్లమెంట్ వాచ్: AP/తెలంగాణ ప్రశ్నలు','Parliament Watch: Questions on AP and Telangana','union-state-relations','Parliament','idea','2026-12-09','What did the Union government say in Parliament about AP/Telangana issues and is it consistent with data?','Lok Sabha / Rajya Sabha Q&A (check session dates)','Sansad.in, PRS','Issues to raise with MPs',39),
  ('బడ్జెట్ 10 నిమిషాల్లో','Budget in 10 Minutes: AP and Telangana','state-finances','AP + Telangana','idea','2026-12-10','Where does each rupee come from and go?','State budget documents; PRS analysis','State finance depts, PRS, RBI','Which budget head do you want explained?',40),
  ('RTI ఎలా వేయాలి? లైవ్ డెమో','How to File an RTI (Live Demo)','governance-transparency','Citizen empowerment','idea','2026-12-11','How can any citizen get official data in 30 days?','RTI procedure, fees, appeals','RTI Online, CIC / State IC','Your RTI success/failure stories',41),
  ('పథకాల రిపోర్ట్ కార్డ్','Scheme Report Card: Claims vs Data','welfare-schemes','AP + Telangana','idea','2026-12-12','For 3 flagship schemes, what is claimed and what do official dashboards show?','Dashboards, audit findings','Scheme portals, CAG, PRS','Scheme problems you face',42),
  ('విశాఖ రిపోర్ట్ కార్డ్','Vizag Report Card: Rankings and Reality','visakhapatnam-city','Visakhapatnam','idea','2026-12-14','How does Vizag score on cleanliness, mobility and livability and what is behind the ranks?','Swachh Survekshan, Smart Cities, ease-of-living indices','MoHUA, Smart Cities Mission, GVMC','Rate your ward',43),
  ('ఇతర రాష్ట్రాల నుంచి నేర్చుకునేవి','Solutions: What Other States Did Right','trending-explainers','Policy lessons','idea','2026-12-15','Which proven policies could be adapted in AP/Telangana and what would they cost?','Case studies with outcome data','NITI Aayog, research institutes, state reports','Ideas from viewers',44),
  ('నెల సమీక్ష & ప్రభుత్వానికి 10 ప్రశ్నలు','Month-1 Review: 10 Questions to the Government','trending-explainers','All','idea','2026-12-16','What are the 10 most important questions backed by evidence and verified citizen reports?','Compiled from days 1–44','All sources used','Vote on priorities',45);
  END IF;
END $$;

-- 9. Basic information pages (created only when missing; edit them in the admin "Pages" screen and have them reviewed).
INSERT INTO public.pages (id, title, body_html) VALUES
  ('about', 'About us', '<p>TAK TV India is a Telugu and English public-interest news platform. Our promise: Truth without Delay.</p><h2>What we do</h2><p>We use verified data from trusted sources to ask clear questions of governments, explain local problems and encourage solutions. Citizens can send us issues from their own localities.</p><h2>Our standards</h2><p>See our Editorial & Corrections Policy for how we verify, give the right of reply and correct mistakes.</p>'),
  ('contact', 'Contact us', '<p>Send news tips, feedback and correction requests to our newsroom. To report a local problem, use the Raise Your Issue page.</p>'),
  ('privacy', 'Privacy Policy', '<p>TAK TV India respects your privacy. Readers do not need an account to read our content. Issues submitted through the Raise Your Issue form are used only to verify and report on the problem. Contact details are visible only to our citizen desk team and are never published. You may ask us to delete your submission at any time using the privacy contact in Settings. Embedded YouTube videos and social buttons may set their own cookies under their own policies.</p>'),
  ('terms', 'Terms & Conditions', '<p>By using this website you agree to use it lawfully. Content is provided for information and may be updated or corrected. Do not copy our content without permission. Links to other websites are provided for convenience and we are not responsible for their content.</p>'),
  ('editorial-policy', 'Editorial & Corrections Policy', '<h2>Our approach</h2><p>TAK TV India publishes evidence-based reports. Every statistic we publish shows its source, the year of the data and the date we last verified it. We question every government equally and give the concerned department a chance to reply before publishing serious findings.</p><h2>Citizen reports</h2><p>Issues sent by citizens are leads, not proof. We verify them independently, protect identities, and publish personal details or photos only with consent.</p><h2>Corrections</h2><p>If we make a mistake, we correct it openly and quickly. To request a correction, use the Contact page and tell us the page, the error and the source of the correct information.</p>'),
  ('corrections', 'Corrections Log', '<p>Corrections to our published work are listed here with the date and what was changed. No corrections have been published yet.</p>')
ON CONFLICT (id) DO NOTHING;
