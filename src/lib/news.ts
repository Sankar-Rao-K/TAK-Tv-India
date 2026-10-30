export type Lang = 'en' | 'hi' | 'te';
export const langs: Lang[] = ['en','hi','te'];
export function language(value: string): Lang { return value==='hi'||value==='te'?value:'en'; }
export const dictionary = {
 en:{home:'Home',latest:'Latest News',breaking:'BREAKING',top:'Top Stories',videos:'Videos',search:'Search',searchph:'Search news…',nonews:'News will appear here soon.',noresults:'No results found.',more:'Load more',share:'Share',related:'Related news',updated:'Updated',by:'By',copied:'Link copied',about:'About us',contact:'Contact',privacy:'Privacy Policy',terms:'Terms & Conditions',follow:'Follow us',allrights:'All rights reserved.',tagline:'Truth without Delay',tags:'Tags',readmore:'Read more',watch:'Watch',menu:'Menu'},
 hi:{home:'होम',latest:'ताज़ा खबरें',breaking:'ब्रेकिंग',top:'मुख्य खबरें',videos:'वीडियो',search:'खोजें',searchph:'खबर खोजें…',nonews:'खबरें जल्द यहाँ दिखाई देंगी।',noresults:'कोई परिणाम नहीं मिला।',more:'और खबरें दिखाएँ',share:'शेयर करें',related:'संबंधित खबरें',updated:'अपडेट',by:'रिपोर्टर:',copied:'लिंक कॉपी हुआ',about:'हमारे बारे में',contact:'संपर्क करें',privacy:'गोपनीयता नीति',terms:'नियम और शर्तें',follow:'हमें फॉलो करें',allrights:'सर्वाधिकार सुरक्षित।',tagline:'बिना देरी के सच',tags:'टैग',readmore:'और पढ़ें',watch:'देखें',menu:'मेनू'},
 te:{home:'హోమ్',latest:'తాజా వార్తలు',breaking:'బ్రేకింగ్',top:'ప్రధాన వార్తలు',videos:'వీడియోలు',search:'వెతకండి',searchph:'వార్తలను వెతకండి…',nonews:'వార్తలు త్వరలో ఇక్కడ కనిపిస్తాయి.',noresults:'ఫలితాలు కనబడలేదు.',more:'మరిన్ని వార్తలు',share:'షేర్ చేయండి',related:'సంబంధిత వార్తలు',updated:'నవీకరించబడింది',by:'రిపోర్టర్:',copied:'లింక్ కాపీ అయ్యింది',about:'మా గురించి',contact:'సంప్రదించండి',privacy:'గోప్యతా విధానం',terms:'నిబంధనలు & షరతులు',follow:'మమ్మల్ని అనుసరించండి',allrights:'సర్వ హక్కులూ ప్రత్యేకించబడ్డాయి.',tagline:'ఆలస్యం లేకుండా నిజం',tags:'ట్యాగ్‌లు',readmore:'మరింత చదవండి',watch:'చూడండి',menu:'మెనూ'}
};
export const months = {en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],hi:['जन॰','फ़र॰','मार्च','अप्रैल','मई','जून','जुल॰','अग॰','सित॰','अक्टू॰','नव॰','दिस॰'],te:['జన','ఫిబ్ర','మార్చి','ఏప్రి','మే','జూన్','జూలై','ఆగ','సెప్టెం','అక్టో','నవం','డిసెం']};
export function newsDate(value:string,lang:Lang='en') { const d=new Date(new Date(value).getTime()+330*60000); return `${d.getUTCDate()} ${months[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}, ${d.getUTCHours()%12||12}:${String(d.getUTCMinutes()).padStart(2,'0')} ${d.getUTCHours()<12?'AM':'PM'} IST`; }
export function youtubeId(value:string) { if(!value.trim()) return ''; if(/^[\w-]{11}$/.test(value)) return value; try { const u=new URL(value); if(u.hostname==='youtu.be') return /^[\w-]{11}$/.test(u.pathname.slice(1))?u.pathname.slice(1):null; if(!['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)) return null; const id=u.searchParams.get('v')||u.pathname.split('/')[2]||''; return /^[\w-]{11}$/.test(id)?id:null; } catch { return null; } }
export function validSlug(s:string) { return s.length>=3&&s.length<=80&&/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s); }
export function makeSlug(title:string) { const s=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,75);return s.length>=3?s:`news-${new Date().toISOString().replace(/\D/g,'').slice(0,12)}-${crypto.randomUUID().slice(0,4)}`; }
export function isPublic(a:{status:string;published_at:string|null;publish_at:string|null},now=Date.now()) { return (a.status==='published'&&!!a.published_at&&new Date(a.published_at).getTime()<=now)||(a.status==='scheduled'&&!!a.publish_at&&new Date(a.publish_at).getTime()<=now); }
export function validateStory(a:{title:string;category_id:string|null;body_html:string;youtube_id:string;cover_path:string;cover_alt:string;slug:string}) { const errors:string[]=[]; if(!a.title.trim())errors.push('Headline is required.');if(!a.category_id)errors.push('Choose a category.');if(a.body_html.replace(/<[^>]*>/g,'').trim().length<40&&!a.youtube_id)errors.push('Write at least 40 characters or add a video.');if(a.youtube_id&&!/^[\w-]{11}$/.test(a.youtube_id))errors.push('Not a valid YouTube link.');if(a.cover_path&&!a.cover_alt.trim())errors.push('Add a cover photo caption.');if(!validSlug(a.slug))errors.push('Web address needs 3–80 lowercase letters, numbers and hyphens.');return errors; }
// ---------- roles ----------
export const ROLE_LABELS = { admin: 'Admin', editor: 'Editor', editor_in_chief: 'Editor-in-Chief', reporter: 'Reporter', research_analyst: 'Research Analyst', scriptwriter: 'Scriptwriter', video_editor: 'Video Editor', moderator: 'Citizen Desk Moderator', social_media_manager: 'Social Media Manager', web_admin: 'Web Admin' } as const;
export type Role = keyof typeof ROLE_LABELS;
export const ROLES = Object.keys(ROLE_LABELS) as Role[];
export const PUBLISH_ROLES: readonly string[] = ['admin', 'editor', 'editor_in_chief'];
export const MODERATE_ROLES: readonly string[] = ['admin', 'editor_in_chief', 'moderator'];
export const canPublishRole = (r?: string | null) => !!r && PUBLISH_ROLES.includes(r);
export const canModerateRole = (r?: string | null) => !!r && MODERATE_ROLES.includes(r);

// ---------- languages ----------
export function visibleLangs(hindiEnabled: boolean): Lang[] { return hindiEnabled ? ['en', 'hi', 'te'] : ['en', 'te']; }
export function langPath(l: Lang) { return l === 'en' ? '/' : `/${l}`; }
export const langLabel: Record<Lang, string> = { en: 'EN', hi: 'हिन्दी', te: 'తెలుగు' };
/** Text in the reader's language, falling back to the other language. */
export function pick(te: string | null | undefined, en: string | null | undefined, lang: Lang): string { return (lang === 'te' ? te || en : en || te) || ''; }

// ---------- ticker ----------
export type TickerItem = { id: string; title: string; kind: 'story' | 'video' | 'post'; slug: string; lang: Lang; at: string };
/** Latest published items across stories, videos and posts. Built at read time, so new content appears with no manual step. */
export function buildTicker(items: TickerItem[], lang: Lang, count = 5): TickerItem[] {
  return items.filter((x) => x.lang === lang || x.kind !== 'story').sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, Math.max(1, count));
}

// ---------- SEO ----------
export function absUrl(origin: string, path: string) { return `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`; }
export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export function ldBreadcrumb(items: { name: string; url: string }[]) { return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.url })) }; }
export function ldNewsArticle(o: { url: string; headline: string; description: string; image?: string | undefined; published: string; modified: string; author: string; siteName: string; logo: string; lang: Lang; section?: string; keywords?: string[] }) {
  return { '@context': 'https://schema.org', '@type': 'NewsArticle', mainEntityOfPage: o.url, headline: o.headline.slice(0, 110), description: o.description, ...(o.image ? { image: [o.image] } : {}), datePublished: o.published, dateModified: o.modified,
    author: { '@type': 'Person', name: o.author }, publisher: { '@type': 'Organization', name: o.siteName, logo: { '@type': 'ImageObject', url: o.logo } }, inLanguage: ({ en: 'en-IN', hi: 'hi-IN', te: 'te-IN' })[o.lang], ...(o.section ? { articleSection: o.section } : {}), ...(o.keywords?.length ? { keywords: o.keywords.join(', ') } : {}) };
}
export function ldVideo(o: { url: string; name: string; description: string; youtubeId: string; uploaded: string; duration?: string | undefined; isShort?: boolean }) {
  return { '@context': 'https://schema.org', '@type': 'VideoObject', name: o.name, description: o.description || o.name, thumbnailUrl: [ytThumb(o.youtubeId), `https://i.ytimg.com/vi/${o.youtubeId}/maxresdefault.jpg`], uploadDate: o.uploaded, embedUrl: `https://www.youtube.com/embed/${o.youtubeId}`, contentUrl: o.isShort ? `https://www.youtube.com/shorts/${o.youtubeId}` : `https://www.youtube.com/watch?v=${o.youtubeId}`, url: o.url, ...(o.duration ? { duration: o.duration } : {}) };
}
export function ldBlog(o: { url: string; headline: string; description: string; image?: string | undefined; published: string; modified: string; siteName: string; logo: string }) {
  return { '@context': 'https://schema.org', '@type': 'BlogPosting', mainEntityOfPage: o.url, headline: o.headline.slice(0, 110), description: o.description, ...(o.image ? { image: [o.image] } : {}), datePublished: o.published, dateModified: o.modified, author: { '@type': 'Organization', name: o.siteName }, publisher: { '@type': 'Organization', name: o.siteName, logo: { '@type': 'ImageObject', url: o.logo } } };
}
type MetaExtra = { canonical?: string | undefined; image?: string | undefined; type?: string | undefined; ld?: unknown[] | undefined; alternates?: { hrefLang: string; href: string }[] | undefined };
const HREFLANG: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };
/**
 * hreflang links for a page that exists in several languages. Only languages listed in `paths` are included, so callers
 * pass a language only when a real translation exists. Returns [] for a single language (nothing to point at).
 */
export function hreflangs(origin: string, paths: Partial<Record<Lang, string>>, xDefault: Lang = 'en'): { hrefLang: string; href: string }[] {
  const langsWithPage = (Object.keys(paths) as Lang[]).filter((l) => paths[l]);
  if (!origin || langsWithPage.length < 2) return [];
  const out = langsWithPage.map((l) => ({ hrefLang: HREFLANG[l], href: absUrl(origin, paths[l]!) }));
  const def = paths[xDefault] || paths[langsWithPage[0]!]!;
  return [...out, { hrefLang: 'x-default', href: absUrl(origin, def) }];
}
/** Same page in every language the public site shows (English, Telugu, and Hindi when switched on). */
export function sectionHreflangs(origin: string, hindiEnabled: boolean, path: (l: Lang) => string) {
  return hreflangs(origin, Object.fromEntries(visibleLangs(hindiEnabled).map((l) => [l, path(l)])) as Partial<Record<Lang, string>>);
}
/** Stable public address of a published photo (served by /media/…; never expires, safe for social previews). */
export function mediaUrl(path: string | null | undefined, origin = ''): string { return path ? `${origin.replace(/\/$/, '')}/media/${path}` : ''; }
export function meta(title: string, description: string, noindex = false, extra: MetaExtra = {}) {
  const full = `${title} | TAK TV India`;
  return {
    meta: [{ title: full }, { name: 'description', content: description }, { property: 'og:title', content: full }, { property: 'og:description', content: description }, { property: 'og:type', content: extra.type || 'website' },
      ...(extra.image ? [{ property: 'og:image', content: extra.image }, { name: 'twitter:image', content: extra.image }] : []), { name: 'twitter:card', content: 'summary_large_image' }, ...(noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : [])],
    ...(extra.canonical && !noindex ? { links: [{ rel: 'canonical', href: extra.canonical }, ...(extra.alternates || []).map((a) => ({ rel: 'alternate', hrefLang: a.hrefLang, href: a.href }))] } : {}),
    ...(extra.ld?.length ? { scripts: extra.ld.map((x) => ({ type: 'application/ld+json', children: JSON.stringify(x) })) } : {}),
  };
}

// ---------- extra public wording (Telugu / English; Hindi kept for when it is switched on) ----------
const HUB_TEXT = {
  blogs: ['Blogs', 'ब्लॉग', 'బ్లాగులు'], data: ['Data', 'आंकड़े', 'డేటా'], followed: ['Issues Followed', 'फॉलो-अप मुद्दे', 'ఫాలో-అప్ సమస్యలు'], raise: ['Raise Your Issue', 'अपनी समस्या बताएं', 'మీ సమస్యను తెలపండి'],
  track: ['Track Issue', 'ट्रैक करें', 'ట్రాక్ చేయండి'], sources: ['Sources & Proofs', 'स्रोत और प्रमाण', 'ఆధారాలు & మూలాలు'], checkSources: ['Check the sources yourself', 'स्रोत खुद जांचें', 'మూలాలను మీరే పరిశీలించండి'],
  subscribe: ['Subscribe on YouTube', 'यूट्यूब पर सब्सक्राइब करें', 'యూట్యూబ్‌లో సబ్‌స్క్రైబ్ చేయండి'], latestVideos: ['Latest Videos', 'ताज़ा वीडियो', 'తాజా వీడియోలు'], latestBlogs: ['Latest Blogs & Data', 'ताज़ा ब्लॉग और आंकड़े', 'తాజా బ్లాగులు & డేటా'],
  dataYear: ['Data year', 'डेटा वर्ष', 'డేటా సంవత్సరం'], verified: ['Last verified', 'अंतिम सत्यापन', 'చివరి ధృవీకరణ'], older: ['Older data', 'पुराना डेटा', 'పాత డేటా'], baseline: ['Baseline', 'आधार वर्ष', 'ఆధార సంవత్సరం'],
  dataLibrary: ['Data Library', 'डेटा लाइब्रेरी', 'డేటా లైబ్రరీ'], dataIntro: ['Every figure shows its source, the year of the data and the date we verified it.', 'हर आंकड़े के साथ स्रोत, डेटा का वर्ष और सत्यापन की तारीख दी गई है।', 'ప్రతి సంఖ్యతో పాటు మూలం, డేటా సంవత్సరం, ధృవీకరించిన తేదీ ఇవ్వబడతాయి.'],
  followedIntro: ['Problems you sent us and what happened next. Only issues we verified and chose to publish appear here.', 'आपकी भेजी समस्याएं और उसके बाद क्या हुआ। यहां केवल वे मुद्दे हैं जिन्हें हमने सत्यापित कर प्रकाशित किया।', 'మీరు పంపిన సమస్యలు, ఆ తర్వాత ఏమైందో ఇక్కడ చూడండి. మేము ధృవీకరించి ప్రచురించిన సమస్యలే ఇక్కడ ఉంటాయి.'],
  resolved: ['Resolved', 'समाधान हुआ', 'పరిష్కారమైంది'], ongoing: ['Ongoing', 'जारी', 'కొనసాగుతోంది'], raiseTopic: ['Raise an issue on this topic', 'इस विषय पर अपनी समस्या बताएं', 'ఈ అంశంపై మీ సమస్యను తెలపండి'],
  editorial: ['Editorial & Corrections Policy', 'संपादकीय और सुधार नीति', 'సంపాదకీయ & దిద్దుబాటు విధానం'], corrections: ['Corrections Log', 'सुधार लॉग', 'దిద్దుబాట్ల జాబితా'], noVideos: ['No videos yet.', 'अभी कोई वीडियो नहीं।', 'ఇంకా వీడియోలు లేవు.'],
  noPosts: ['No posts yet.', 'अभी कोई पोस्ट नहीं।', 'ఇంకా పోస్టులు లేవు.'], noData: ['No data cards yet.', 'अभी कोई डेटा कार्ड नहीं।', 'ఇంకా డేటా కార్డులు లేవు.'], noFollowed: ['No followed issues yet.', 'अभी कोई फॉलो-अप मुद्दा नहीं।', 'ఇంకా ఫాలో-అప్ సమస్యలు లేవు.'],
  related: ['Related', 'संबंधित', 'సంబంధితం'], accessed: ['Accessed', 'देखा गया', 'చూసిన తేదీ'], page: ['Page', 'पृष्ठ', 'పేజీ'], follow: ['Follow us', 'हमें फॉलो करें', 'మమ్మల్ని అనుసరించండి'],
  tickerLatest: ['LATEST', 'ताज़ा', 'తాజా'], allCategories: ['All categories', 'सभी श्रेणियां', 'అన్ని విభాగాలు'], loadMore: ['Load more', 'और दिखाएं', 'మరిన్ని చూపించు'],
  watchYt: ['Watch on YouTube', 'YouTube पर देखें', 'యూట్యూబ్‌లో చూడండి'], shorts: ['Shorts', 'शॉर्ट्स', 'షార్ట్స్'], short: ['Short', 'शॉर्ट', 'షార్ట్'], allVideos: ['All', 'सभी', 'అన్నీ'], longVideos: ['Videos', 'वीडियो', 'వీడియోలు'],
  play: ['Play', 'चलाएं', 'ప్లే చేయండి'], close: ['Close', 'बंद करें', 'మూసివేయండి'], openVideoPage: ['Open the video page', 'वीडियो पेज खोलें', 'వీడియో పేజీ తెరవండి'],
  ytUnavailable: ['This video cannot be played here.', 'यह वीडियो यहां नहीं चल सकता।', 'ఈ వీడియోను ఇక్కడ ప్లే చేయడం సాధ్యం కాదు.'], latestShorts: ['Latest Shorts', 'ताज़ा शॉर्ट्स', 'తాజా షార్ట్స్'],
  issueCta: ['See a problem in your area? Tell us with photos, videos or documents.', 'अपने इलाके में कोई समस्या है? फोटो, वीडियो या दस्तावेज़ के साथ बताइए।', 'మీ ప్రాంతంలో సమస్య ఉందా? ఫోటోలు, వీడియోలు లేదా పత్రాలతో మాకు తెలపండి.'],
} as const;
export type HubKey = keyof typeof HUB_TEXT;
export function ht(key: HubKey, lang: Lang): string { return HUB_TEXT[key][lang === 'en' ? 0 : lang === 'hi' ? 1 : 2]; }
export const SOURCE_TYPE_TEXT: Record<string, [string, string, string]> = {
  government: ['Government data', 'सरकारी डेटा', 'ప్రభుత్వ డేటా'], audit_cag: ['Audit / CAG', 'ऑडिट / कैग', 'ఆడిట్ / CAG'], parliament_qa: ['Parliament Q&A', 'संसद प्रश्नोत्तर', 'పార్లమెంట్ ప్రశ్నలు-సమాధానాలు'], court_record: ['Court record', 'अदालत रिकॉर्ड', 'కోర్టు రికార్డు'],
  rti_reply: ['RTI reply', 'आरटीआई जवाब', 'RTI సమాధానం'], research: ['Research', 'शोध', 'పరిశోధన'], fact_check: ['Fact-check', 'फैक्ट-चेक', 'ఫ్యాక్ట్ చెక్'], news_report: ['News report', 'समाचार रिपोर्ट', 'వార్తా నివేదిక'], other: ['Other', 'अन्य', 'ఇతరం'] };
export function sourceTypeLabel(t: string, lang: Lang): string { const x = SOURCE_TYPE_TEXT[t] || SOURCE_TYPE_TEXT['other']!; return x[lang === 'en' ? 0 : lang === 'hi' ? 1 : 2]; }
/** A data figure is "older" when its data year is more than `years` behind the current year. */
export function isOlderData(year: number | null | undefined, now = new Date(), years = 3): boolean { return !!year && now.getFullYear() - year > years; }

/** Is this language available on the public site? English and Telugu always; Hindi only when switched on in Settings. */
export function langAllowed(lang: string, hindiEnabled: boolean): boolean { return lang === 'en' || lang === 'te' || (lang === 'hi' && hindiEnabled); }
export const siteOrigin = (settings: { site_url?: string | null } | null | undefined) => (settings?.site_url || '').replace(/\/$/, '');
