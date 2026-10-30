import { Link } from '@tanstack/react-router';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Check, Copy, MapPin, Printer, Search, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicNewsOptions } from '@/lib/news.functions';
import { startIssue, finishIssue, trackIssue, getCitizenConfig } from '@/lib/citizen.functions';
import { ACCEPT_ATTR, MAX_FILES, checkFile } from '@/lib/evidence';
import { newsDate, type Lang } from '@/lib/news';
import { PublicShell, categoryName } from './public-site';

const T = {
  en: {
    raise: 'Raise Your Issue', track: 'Track My Issue',
    intro: 'Tell our newsroom about a public problem in your area. Our team will review it; we may follow up before reporting.',
    title: 'Short headline of the issue', body: 'Describe what is happening (who, what, where, since when)', category: 'Topic', choose: 'Choose a topic',
    district: 'District', mandal: 'Mandal / Village', location: 'Exact location / landmark', since: 'Since when?', people: 'People affected (approx.)',
    contact: 'Your contact details (only seen by our moderators)', name: 'Name', phone: 'Phone', email: 'Email', anon: 'Submit anonymously (no contact details stored)',
    files: 'Evidence (optional): up to 5 files — photos (JPG, PNG, HEIC, up to 15 MB), videos (MP4/MOV, up to 150 MB), documents (PDF/DOCX, up to 15 MB)', add: 'Add files',
    useLocation: 'Add my current location', locationNote: 'Optional. Use it only if you are at the place of the problem. Only our team can see it.', locationAdded: 'Location added', remove: 'Remove', locationFail: 'Your location is not available. Please type the place above instead.',
    captcha: 'Please complete the “I am human” check.', uploading: 'Uploading files… please keep this page open.', partial: 'Your issue was received, but some files could not be uploaded or were not accepted. You can send them again through Raise Your Issue and mention your reference number.', badFile: 'This file type is not allowed', tooBig: 'This file is too large',
    c1: 'I confirm the information is true to the best of my knowledge.', c2: 'TAK TV India may use this information for verification and reporting.', c3: 'My name may be shown publicly if a story is published.',
    submit: 'Submit issue', sending: 'Sending…',
    done: 'Your issue has been received', keep: 'Save both codes. You need them to track your issue — we cannot recover the secret code.',
    ref: 'Reference number', secret: 'Secret code', copy: 'Copy', print: 'Print receipt', another: 'Submit another issue',
    trackIntro: 'Enter the reference number and secret code you received after submitting.', check: 'Check status', notfound: 'No issue matches these details. Check both codes and try again.',
    status: 'Current status', submitted: 'Submitted', updated: 'Last updated', update: 'Update from the newsroom',
    stages: { received: 'Received', review: 'Under review', info: 'More information needed', research: 'Being verified', production: 'In production', published: 'Published as a story', closed: 'Closed' },
  },
  hi: {
    raise: 'अपनी समस्या बताएं', track: 'मेरी समस्या ट्रैक करें',
    intro: 'अपने क्षेत्र की किसी सार्वजनिक समस्या के बारे में हमारे न्यूज़रूम को बताएं। हमारी टीम इसकी जांच करेगी।',
    title: 'समस्या का छोटा शीर्षक', body: 'क्या हो रहा है, विस्तार से बताएं (कौन, क्या, कहां, कब से)', category: 'विषय', choose: 'विषय चुनें',
    district: 'ज़िला', mandal: 'मंडल / गांव', location: 'सटीक स्थान / पहचान चिह्न', since: 'कब से?', people: 'प्रभावित लोग (लगभग)',
    contact: 'आपका संपर्क (केवल हमारे मॉडरेटर देखेंगे)', name: 'नाम', phone: 'फ़ोन', email: 'ईमेल', anon: 'गुमनाम रूप से भेजें (संपर्क जानकारी सहेजी नहीं जाएगी)',
    files: 'सबूत (वैकल्पिक): अधिकतम 5 फ़ाइलें — फ़ोटो (JPG, PNG, HEIC, 15 MB तक), वीडियो (MP4/MOV, 150 MB तक), दस्तावेज़ (PDF/DOCX, 15 MB तक)', add: 'फ़ाइलें जोड़ें',
    useLocation: 'मेरा वर्तमान स्थान जोड़ें', locationNote: 'वैकल्पिक। इसका उपयोग तभी करें जब आप समस्या की जगह पर हों। यह केवल हमारी टीम को दिखेगा।', locationAdded: 'स्थान जोड़ा गया', remove: 'हटाएं', locationFail: 'आपका स्थान नहीं मिल सका। कृपया ऊपर स्थान लिखें।',
    captcha: 'कृपया “मैं इंसान हूं” जांच पूरी करें।', uploading: 'फ़ाइलें अपलोड हो रही हैं… कृपया यह पेज बंद न करें।', partial: 'आपकी समस्या मिल गई है, लेकिन कुछ फ़ाइलें अपलोड नहीं हो सकीं या स्वीकार नहीं की गईं। आप अपनी संदर्भ संख्या लिखकर उन्हें दोबारा भेज सकते हैं।', badFile: 'यह फ़ाइल प्रकार अनुमत नहीं है', tooBig: 'फ़ाइल बहुत बड़ी है',
    c1: 'मैं पुष्टि करता/करती हूं कि जानकारी मेरी जानकारी के अनुसार सत्य है।', c2: 'TAK TV India इस जानकारी का उपयोग सत्यापन और रिपोर्टिंग के लिए कर सकता है।', c3: 'खबर प्रकाशित होने पर मेरा नाम सार्वजनिक रूप से दिखाया जा सकता है।',
    submit: 'समस्या भेजें', sending: 'भेजा जा रहा है…',
    done: 'आपकी समस्या प्राप्त हो गई है', keep: 'दोनों कोड सहेजें। ट्रैक करने के लिए इनकी ज़रूरत होगी — गुप्त कोड दोबारा नहीं मिल सकता।',
    ref: 'संदर्भ संख्या', secret: 'गुप्त कोड', copy: 'कॉपी', print: 'रसीद प्रिंट करें', another: 'एक और समस्या भेजें',
    trackIntro: 'भेजने के बाद मिली संदर्भ संख्या और गुप्त कोड दर्ज करें।', check: 'स्थिति देखें', notfound: 'इन विवरणों से कोई समस्या नहीं मिली। दोनों कोड जांचें।',
    status: 'वर्तमान स्थिति', submitted: 'भेजा गया', updated: 'अंतिम अपडेट', update: 'न्यूज़रूम से अपडेट',
    stages: { received: 'प्राप्त', review: 'समीक्षा में', info: 'और जानकारी चाहिए', research: 'सत्यापन जारी', production: 'तैयारी में', published: 'खबर के रूप में प्रकाशित', closed: 'बंद' },
  },
  te: {
    raise: 'మీ సమస్యను తెలపండి', track: 'నా సమస్యను ట్రాక్ చేయండి',
    intro: 'మీ ప్రాంతంలోని ప్రజా సమస్య గురించి మా న్యూస్‌రూమ్‌కు తెలపండి. మా బృందం దీనిని పరిశీలిస్తుంది.',
    title: 'సమస్య యొక్క చిన్న శీర్షిక', body: 'ఏమి జరుగుతోందో వివరించండి (ఎవరు, ఏమి, ఎక్కడ, ఎప్పటి నుంచి)', category: 'అంశం', choose: 'అంశాన్ని ఎంచుకోండి',
    district: 'జిల్లా', mandal: 'మండలం / గ్రామం', location: 'ఖచ్చితమైన ప్రదేశం / గుర్తు', since: 'ఎప్పటి నుంచి?', people: 'ప్రభావితులైన ప్రజలు (సుమారు)',
    contact: 'మీ సంప్రదింపు వివరాలు (మా మోడరేటర్లు మాత్రమే చూస్తారు)', name: 'పేరు', phone: 'ఫోన్', email: 'ఈమెయిల్', anon: 'అనామకంగా పంపండి (సంప్రదింపు వివరాలు నిల్వ చేయబడవు)',
    files: 'ఆధారాలు (ఐచ్ఛికం): గరిష్టంగా 5 ఫైళ్లు — ఫోటోలు (JPG, PNG, HEIC, 15 MB వరకు), వీడియోలు (MP4/MOV, 150 MB వరకు), పత్రాలు (PDF/DOCX, 15 MB వరకు)', add: 'ఫైళ్లు జోడించండి',
    useLocation: 'నా ప్రస్తుత ప్రదేశాన్ని జోడించండి', locationNote: 'ఐచ్ఛికం. మీరు సమస్య ఉన్న చోటే ఉంటే మాత్రమే వాడండి. ఇది మా బృందానికి మాత్రమే కనిపిస్తుంది.', locationAdded: 'ప్రదేశం జోడించబడింది', remove: 'తొలగించు', locationFail: 'మీ ప్రదేశం అందుబాటులో లేదు. దయచేసి ప్రదేశాన్ని పైన టైప్ చేయండి.',
    captcha: 'దయచేసి “నేను మనిషిని” పరీక్షను పూర్తి చేయండి.', uploading: 'ఫైళ్లు అప్‌లోడ్ అవుతున్నాయి… దయచేసి ఈ పేజీని మూసివేయవద్దు.', partial: 'మీ సమస్య అందింది, కానీ కొన్ని ఫైళ్లు అప్‌లోడ్ కాలేదు లేదా అంగీకరించబడలేదు. మీ రిఫరెన్స్ నంబర్‌ను పేర్కొంటూ వాటిని మళ్లీ పంపవచ్చు.', badFile: 'ఈ ఫైల్ రకం అనుమతించబడదు', tooBig: 'ఈ ఫైల్ చాలా పెద్దది',
    c1: 'ఈ సమాచారం నాకు తెలిసినంత వరకు నిజమని నిర్ధారిస్తున్నాను.', c2: 'ధృవీకరణ మరియు రిపోర్టింగ్ కోసం TAK TV India ఈ సమాచారాన్ని ఉపయోగించవచ్చు.', c3: 'కథనం ప్రచురితమైతే నా పేరు బహిరంగంగా చూపవచ్చు.',
    submit: 'సమస్యను పంపండి', sending: 'పంపుతోంది…',
    done: 'మీ సమస్య అందింది', keep: 'రెండు కోడ్‌లను భద్రపరచుకోండి. ట్రాక్ చేయడానికి ఇవి అవసరం — రహస్య కోడ్‌ను తిరిగి పొందలేము.',
    ref: 'రిఫరెన్స్ నంబర్', secret: 'రహస్య కోడ్', copy: 'కాపీ', print: 'రసీదు ప్రింట్', another: 'మరో సమస్యను పంపండి',
    trackIntro: 'పంపిన తర్వాత వచ్చిన రిఫరెన్స్ నంబర్ మరియు రహస్య కోడ్ నమోదు చేయండి.', check: 'స్థితి చూడండి', notfound: 'ఈ వివరాలతో ఏ సమస్యా లేదు. రెండు కోడ్‌లను సరిచూడండి.',
    status: 'ప్రస్తుత స్థితి', submitted: 'పంపిన తేదీ', updated: 'చివరి అప్‌డేట్', update: 'న్యూస్‌రూమ్ నుంచి అప్‌డేట్',
    stages: { received: 'అందింది', review: 'పరిశీలనలో', info: 'మరింత సమాచారం కావాలి', research: 'ధృవీకరణలో', production: 'తయారీలో', published: 'కథనంగా ప్రచురితం', closed: 'ముగిసింది' },
  },
} as const;
export const citizenText = T;

const field = 'w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

function CopyRow({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  const [ok, setOk] = useState(false);
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-4">
    <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-mono text-xl font-bold tracking-wider">{value}</p></div>
    <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => { navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); }}>{ok ? <Check size={14} /> : <Copy size={14} />}{copyLabel}</Button>
  </div>;
}

declare global { interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id?: string) => void } } }

/** Cloudflare Turnstile widget (rendered only when a site key is configured on the server). */
function Turnstile({ siteKey, onToken, resetKey }: { siteKey: string; onToken: (t: string) => void; resetKey: number }) {
  const ref = useRef<HTMLDivElement>(null); const cb = useRef(onToken); cb.current = onToken;
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let id: string | undefined; let cancelled = false;
    const render = () => { if (cancelled || !ref.current || !window.turnstile) return; id = window.turnstile.render(ref.current, { sitekey: siteKey, callback: (t: string) => cb.current(t), 'expired-callback': () => cb.current(''), 'error-callback': () => cb.current('') }); };
    if (window.turnstile) render();
    else {
      let el = document.getElementById('cf-turnstile') as HTMLScriptElement | null;
      if (!el) { el = document.createElement('script'); el.id = 'cf-turnstile'; el.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; el.async = true; el.defer = true; document.head.appendChild(el); }
      el.addEventListener('load', render, { once: true });
    }
    return () => { cancelled = true; if (id && window.turnstile) window.turnstile.remove(id); };
  }, [siteKey, resetKey]);
  return <div ref={ref} className="min-h-[65px]" />;
}

/** Sends one file straight to the private evidence bucket with its one-time ticket, reporting progress. */
function putEvidence(path: string, token: string, file: File, type: string, onProgress: (p: number) => void): Promise<boolean> {
  const base = String(import.meta.env['VITE_SUPABASE_URL'] || '').replace(/\/+$/, ''); const key = String(import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || '');
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${base}/storage/v1/object/upload/sign/citizen-evidence/${path}?token=${encodeURIComponent(token)}`);
    if (key) xhr.setRequestHeader('apikey', key);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false); xhr.ontimeout = () => resolve(false);
    const form = new FormData(); form.append('cacheControl', '3600'); form.append('', new File([file], file.name, { type }));
    xhr.send(form);
  });
}

type Picked = { file: File; type: string; progress: number; failed?: boolean };

export function RaiseIssuePage({ lang }: { lang: Lang }) {
  const t = T[lang];
  const { data } = useSuspenseQuery(publicNewsOptions);
  const config = useQuery({ queryKey: ['citizen-config'], queryFn: () => getCitizenConfig(), staleTime: 3600_000 }).data;
  const start = useServerFn(startIssue); const finish = useServerFn(finishIssue);
  const [files, setFiles] = useState<Picked[]>([]);
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null); const [locating, setLocating] = useState(false);
  const [captcha, setCaptcha] = useState(''); const [captchaKey, setCaptchaKey] = useState(0);
  const [result, setResult] = useState<{ ref: string; secret: string; partial: boolean } | null>(null);
  const siteKey = config?.turnstileSiteKey || '';

  function pick(list: File[]) {
    const ok: Picked[] = [];
    for (const f of list) {
      const c = checkFile(f.name, f.type, f.size);
      if (!c.ok) { toast.error(`${f.name}: ${c.reason === 'type' ? t.badFile : t.tooBig}`); continue; }
      ok.push({ file: f, type: c.type, progress: 0 });
    }
    setFiles((prev) => [...prev, ...ok].slice(0, MAX_FILES));
  }
  function locate() {
    if (!('geolocation' in navigator)) { toast.error(t.locationFail); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((p) => { setPoint({ lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 }); setLocating(false); }, () => { toast.error(t.locationFail); setLocating(false); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (siteKey && !captcha) { toast.error(t.captcha); return; }
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) || '');
    const issue = {
      title: s('title'), body: s('body'), category_id: s('category_id'), district: s('district'), mandal: s('mandal'),
      location_text: s('location_text'), started_at: s('started_at'), people_affected: s('people_affected'),
      name: anon ? '' : s('name'), phone: anon ? '' : s('phone'), email: anon ? '' : s('email'), anonymous: anon,
      consent_truth: f.get('c1') === 'on', consent_use: f.get('c2') === 'on', consent_public: !anon && f.get('c3') === 'on', website: s('website'),
      lat: point?.lat ?? null, lng: point?.lng ?? null,
    };
    setBusy(true);
    try {
      const r = await start({ data: { issue, files: files.map((x) => ({ name: x.file.name, type: x.type, size: x.file.size })), captcha } });
      let partial = r.uploads.length < files.length;
      if (r.uploads.length) {
        setUploading(true);
        const results = await Promise.all(r.uploads.map((u, i) => { const item = files[i]!; return putEvidence(u.path, u.token, item.file, u.type, (p) => setFiles((prev) => prev.map((x, j) => (j === i ? { ...x, progress: p } : x)))).then((ok) => { if (!ok) setFiles((prev) => prev.map((x, j) => (j === i ? { ...x, failed: true } : x))); return ok; }); }));
        const fin = await finish({ data: { ref: r.ref, secret: r.secret } }).catch(() => ({ accepted: 0, rejected: r.uploads.length }));
        partial = partial || results.some((ok) => !ok) || fin.rejected > 0 || fin.accepted < r.uploads.length;
      }
      setResult({ ref: r.ref, secret: r.secret, partial }); window.scrollTo({ top: 0 });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Something went wrong.'); setCaptcha(''); setCaptchaKey((k) => k + 1); }
    finally { setBusy(false); setUploading(false); }
  }

  return <PublicShell lang={lang}><main className="news-wrap py-10"><div className="mx-auto max-w-[760px]">
    {result ? <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3 text-primary"><Check /></div>
      <h1 className="text-2xl font-extrabold">{t.done}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.keep}</p>
      {result.partial && <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{t.partial}</p>}
      <div className="mt-6 grid gap-3"><CopyRow label={t.ref} value={result.ref} copyLabel={t.copy} /><CopyRow label={t.secret} value={result.secret} copyLabel={t.copy} /></div>
      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        <Button onClick={() => window.print()}><Printer size={16} />{t.print}</Button>
        <Button asChild variant="outline"><Link to="/$lang/track" params={{ lang }}>{t.track}</Link></Button>
        <Button variant="ghost" onClick={() => { setResult(null); setFiles([]); setPoint(null); setCaptcha(''); setCaptchaKey((k) => k + 1); }}>{t.another}</Button>
      </div>
    </section> : <>
      <h1 className="text-3xl font-extrabold">{t.raise}</h1>
      <p className="mt-2 text-muted-foreground">{t.intro}</p>
      <form onSubmit={onSubmit} className="mt-8 grid gap-5 rounded-xl border border-border bg-card p-5 sm:p-7">
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <label className="grid gap-1.5 text-sm font-medium">{t.title} *<input name="title" required minLength={8} maxLength={160} className={field} /></label>
        <label className="grid gap-1.5 text-sm font-medium">{t.body} *<textarea name="body" required minLength={30} maxLength={5000} rows={6} className={field} /></label>
        <label className="grid gap-1.5 text-sm font-medium">{t.category}<select name="category_id" className={field} defaultValue=""><option value="">{t.choose}</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{categoryName(c, lang)}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">{t.district}<input name="district" maxLength={80} className={field} /></label>
          <label className="grid gap-1.5 text-sm font-medium">{t.mandal}<input name="mandal" maxLength={80} className={field} /></label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">{t.location}<input name="location_text" maxLength={200} className={field} /></label>
          <div className="grid gap-1.5 text-sm sm:col-span-2">
            {point ? <p className="flex flex-wrap items-center gap-2"><MapPin size={15} className="text-primary" />{t.locationAdded}: <span className="font-mono text-xs">{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</span><Button type="button" variant="ghost" size="sm" onClick={() => setPoint(null)}>{t.remove}</Button></p>
              : <Button type="button" variant="outline" className="w-fit" disabled={locating} onClick={locate}><MapPin size={15} />{t.useLocation}</Button>}
            <span className="text-xs text-muted-foreground">{t.locationNote}</span>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">{t.since}<input name="started_at" maxLength={60} className={field} /></label>
          <label className="grid gap-1.5 text-sm font-medium">{t.people}<input name="people_affected" maxLength={60} className={field} /></label>
        </div>
        <fieldset className="grid gap-4 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-semibold">{t.contact}</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />{t.anon}</label>
          {!anon && <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm">{t.name}<input name="name" maxLength={100} className={field} /></label>
            <label className="grid gap-1.5 text-sm">{t.phone}<input name="phone" type="tel" maxLength={20} pattern="[0-9+\-\s]*" className={field} /></label>
            <label className="grid gap-1.5 text-sm">{t.email}<input name="email" type="email" maxLength={255} className={field} /></label>
          </div>}
        </fieldset>
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t.files}</p>
          {files.length < MAX_FILES && <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm hover:border-primary"><Upload size={16} />{t.add}
            <input type="file" multiple className="sr-only" accept={ACCEPT_ATTR} disabled={busy} onChange={(e) => { pick([...(e.target.files || [])]); e.target.value = ''; }} />
          </label>}
          {files.length > 0 && <ul className="grid gap-1 text-sm">{files.map((f, i) => <li key={i} className="relative overflow-hidden rounded bg-muted px-3 py-1.5">
            {uploading && <span className={`absolute inset-y-0 left-0 ${f.failed ? 'bg-destructive/20' : 'bg-primary/20'}`} style={{ width: `${Math.round((f.failed ? 1 : f.progress) * 100)}%` }} />}
            <span className="relative flex items-center justify-between gap-3"><span className="truncate">{f.file.name} · {(f.file.size / 1048576).toFixed(1)} MB{uploading ? ` · ${f.failed ? '✕' : `${Math.round(f.progress * 100)}%`}` : ''}</span>{!busy && <button type="button" aria-label={t.remove} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={14} /></button>}</span>
          </li>)}</ul>}
        </div>
        <div className="grid gap-2 text-sm">
          <label className="flex gap-2"><input type="checkbox" name="c1" required />{t.c1} *</label>
          <label className="flex gap-2"><input type="checkbox" name="c2" required />{t.c2} *</label>
          {!anon && <label className="flex gap-2"><input type="checkbox" name="c3" />{t.c3}</label>}
        </div>
        {siteKey && <Turnstile siteKey={siteKey} onToken={setCaptcha} resetKey={captchaKey} />}
        {uploading && <p className="text-sm font-medium text-primary" role="status">{t.uploading}</p>}
        <Button type="submit" disabled={busy} className="h-11">{busy ? t.sending : t.submit}</Button>
      </form>
    </>}
  </div></main></PublicShell>;
}

type Tracked = Awaited<ReturnType<typeof trackIssue>>;

export function TrackIssuePage({ lang }: { lang: Lang }) {
  const t = T[lang];
  const track = useServerFn(trackIssue);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Tracked | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try { setRes(await track({ data: { ref: String(f.get('ref') || ''), secret: String(f.get('secret') || '') } })); }
    catch { setRes({ found: false }); }
    finally { setBusy(false); }
  }
  return <PublicShell lang={lang}><main className="news-wrap py-10"><div className="mx-auto max-w-[680px]">
    <h1 className="text-3xl font-extrabold">{t.track}</h1>
    <p className="mt-2 text-muted-foreground">{t.trackIntro}</p>
    <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="grid gap-1.5 text-sm font-medium">{t.ref}<input name="ref" required placeholder="TAK-202610-XXXXXX" className={`${field} font-mono uppercase`} /></label>
      <label className="grid gap-1.5 text-sm font-medium">{t.secret}<input name="secret" required type="password" autoComplete="off" className={`${field} font-mono uppercase`} /></label>
      <Button type="submit" disabled={busy} className="h-11"><Search size={16} />{t.check}</Button>
    </form>
    {res && !res.found && <p role="alert" className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">{t.notfound}</p>}
    {res && res.found && <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <p className="font-mono text-xs text-muted-foreground">{res.ref}</p>
      <h2 className="mt-1 text-xl font-bold">{res.title}</h2>
      <p className="mt-4 text-sm text-muted-foreground">{t.status}</p>
      <p className="inline-block rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground">{t.stages[res.stage as keyof typeof t.stages] || res.stage}</p>
      <ol className="mt-6 grid gap-3 border-l-2 border-border pl-5">
        {res.timeline.map((e, i) => <li key={i} className="relative text-sm"><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-primary" /><strong>{t.stages[e.stage as keyof typeof t.stages] || e.stage}</strong><span className="ml-2 text-muted-foreground">{newsDate(e.at, lang)}</span></li>)}
      </ol>
      <p className="mt-5 text-xs text-muted-foreground">{t.submitted}: {newsDate(res.created_at, lang)} · {t.updated}: {newsDate(res.updated_at, lang)}</p>
      {res.followup && <div className="mt-5 rounded-lg bg-muted p-4 text-sm"><p className="mb-1 font-semibold">{t.update}</p><p className="whitespace-pre-line">{res.followup}</p></div>}
    </section>}
  </div></main></PublicShell>;
}
