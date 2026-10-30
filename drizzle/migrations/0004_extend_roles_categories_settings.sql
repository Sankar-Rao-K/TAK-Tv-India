ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor_in_chief';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'research_analyst';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'scriptwriter';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'video_editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'social_media_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'web_admin';

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS colour text NOT NULL DEFAULT '';

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS hindi_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ticker_count integer NOT NULL DEFAULT 5;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS privacy_contact text NOT NULL DEFAULT '';

INSERT INTO public.categories (id, names, sort_order, icon, colour) VALUES
  ('agriculture-farmers', '{"en":"Agriculture & Farmers","te":"వ్యవసాయం & రైతులు"}', 110, 'wheat', '#2E7D32'),
  ('irrigation-water', '{"en":"Irrigation & Water","te":"సాగునీరు & నీరు"}', 120, 'droplets', '#0288D1'),
  ('rural-employment', '{"en":"Rural Employment","te":"గ్రామీణ ఉపాధి"}', 130, 'briefcase', '#6D4C41'),
  ('rural-infrastructure', '{"en":"Rural Infrastructure","te":"గ్రామీణ మౌలిక సదుపాయాలు"}', 140, 'road', '#546E7A'),
  ('education', '{"en":"Education","te":"విద్య"}', 150, 'graduation-cap', '#4527A0'),
  ('health', '{"en":"Health","te":"ఆరోగ్యం"}', 160, 'heart-pulse', '#C62828'),
  ('railways', '{"en":"Railways","te":"రైల్వేలు"}', 170, 'train', '#283593'),
  ('roads-transport', '{"en":"Roads & Transport","te":"రోడ్లు & రవాణా"}', 180, 'bus', '#00838F'),
  ('visakhapatnam-city', '{"en":"Visakhapatnam City","te":"విశాఖపట్నం నగరం"}', 190, 'building-2', '#EF6C00'),
  ('vizag-industry-port', '{"en":"Vizag Industry & Port","te":"విశాఖ పరిశ్రమలు & పోర్టు"}', 200, 'anchor', '#37474F'),
  ('environment', '{"en":"Environment","te":"పర్యావరణం"}', 210, 'leaf', '#558B2F'),
  ('disaster-preparedness', '{"en":"Disaster Preparedness","te":"విపత్తు సిద్ధత"}', 220, 'shield-alert', '#D84315'),
  ('fisheries-coast', '{"en":"Fisheries & Coast","te":"మత్స్యకారులు & తీరం"}', 230, 'fish', '#0277BD'),
  ('tribal-areas', '{"en":"Tribal Areas","te":"గిరిజన ప్రాంతాలు"}', 240, 'mountain', '#5D4037'),
  ('power-energy', '{"en":"Power & Energy","te":"విద్యుత్ & శక్తి"}', 250, 'zap', '#F9A825'),
  ('youth-jobs', '{"en":"Youth & Jobs","te":"యువత & ఉద్యోగాలు"}', 260, 'users', '#7B1FA2'),
  ('women-children', '{"en":"Women & Children","te":"మహిళలు & పిల్లలు"}', 270, 'baby', '#AD1457'),
  ('welfare-schemes', '{"en":"Welfare Schemes","te":"సంక్షేమ పథకాలు"}', 280, 'hand-heart', '#00695C'),
  ('state-finances', '{"en":"State Finances","te":"రాష్ట్ర ఆర్థికం"}', 290, 'landmark', '#4E342E'),
  ('union-state-relations', '{"en":"Union–State Relations","te":"కేంద్ర–రాష్ట్ర సంబంధాలు"}', 300, 'scale', '#455A64'),
  ('governance-transparency', '{"en":"Governance & Transparency","te":"పాలన & పారదర్శకత"}', 310, 'eye', '#1565C0'),
  ('law-order', '{"en":"Law & Order","te":"శాంతిభద్రతలు"}', 320, 'gavel', '#B71C1C'),
  ('elections-democracy', '{"en":"Elections & Democracy","te":"ఎన్నికలు & ప్రజాస్వామ్యం"}', 330, 'vote', '#1B5E20'),
  ('land-housing', '{"en":"Land & Housing","te":"భూమి & గృహనిర్మాణం"}', 340, 'home', '#795548'),
  ('technology-it', '{"en":"Technology & IT","te":"సాంకేతికత & ఐటీ"}', 350, 'cpu', '#0097A7'),
  ('sports', '{"en":"Sports","te":"క్రీడలు"}', 360, 'trophy', '#F57F17'),
  ('entertainment-cinema', '{"en":"Entertainment / Cinema","te":"వినోదం / సినిమా"}', 370, 'clapperboard', '#8E24AA'),
  ('media-misinformation', '{"en":"Media & Misinformation","te":"మీడియా & తప్పుడు సమాచారం"}', 380, 'newspaper', '#5E35B1'),
  ('prices-economy', '{"en":"Prices & Economy","te":"ధరలు & ఆర్థిక వ్యవస్థ"}', 390, 'trending-up', '#2E7D32'),
  ('trending-explainers', '{"en":"Trending / Explainers","te":"ట్రెండింగ్ / వివరణలు"}', 400, 'flame', '#E64A19')
ON CONFLICT (id) DO NOTHING;