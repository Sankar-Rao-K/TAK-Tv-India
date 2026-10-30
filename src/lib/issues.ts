// Pure helpers for the Citizen Issues desk (filters, CSV export, analytics, reply templates).
// Kept free of server/database imports so they can be unit-tested and used in the browser.

export type IssueListItem = {
  id: string; ref_no: string; title: string; status: string; priority: string; assignee: string | null;
  district: string; mandal: string; category_id: string | null; created_at: string; updated_at: string;
  first_response_at?: string | null; planner_id?: string | null;
};
export type IssueFilters = { status: string; q: string; category: string; district: string; assignee: string; from: string; to: string };
export const EMPTY_FILTERS: IssueFilters = { status: 'open', q: '', category: '', district: '', assignee: '', from: '', to: '' };
export const CLOSED_STATUSES = ['resolved', 'rejected', 'duplicate', 'spam', 'published'];

/** IST calendar date (YYYY-MM-DD) of a timestamp, so date filters match what the newsroom sees. */
export function istDate(iso: string): string { return new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 10); }

export function filterIssues<T extends IssueListItem>(items: T[], f: IssueFilters): T[] {
  const q = f.q.trim().toLowerCase(); const district = f.district.trim().toLowerCase();
  return items.filter((x) => {
    if (f.status === 'open' ? CLOSED_STATUSES.includes(x.status) : f.status !== 'all' && x.status !== f.status) return false;
    if (q && !`${x.title} ${x.ref_no} ${x.district} ${x.mandal}`.toLowerCase().includes(q)) return false;
    if (f.category && (f.category === '__none' ? !!x.category_id : x.category_id !== f.category)) return false;
    if (district && x.district.trim().toLowerCase() !== district) return false;
    if (f.assignee && (f.assignee === '__none' ? !!x.assignee : x.assignee !== f.assignee)) return false;
    const d = istDate(x.created_at);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    return true;
  });
}

/** Hours between submission and the first action by a newsroom member (null when nobody has acted yet). */
export function responseHours(x: { created_at: string; first_response_at?: string | null }): number | null {
  if (!x.first_response_at) return null;
  return Math.max(0, (new Date(x.first_response_at).getTime() - new Date(x.created_at).getTime()) / 3600000);
}

function median(nums: number[]): number | null {
  if (!nums.length) return null; const s = [...nums].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
function top(counts: Map<string, number>, n: number) { return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n); }

export function issueStats(items: IssueListItem[]) {
  const byCategory = new Map<string, number>(); const byDistrict = new Map<string, number>(); const byStatus = new Map<string, number>();
  const hours: number[] = []; let waiting = 0;
  for (const x of items) {
    byCategory.set(x.category_id || '', (byCategory.get(x.category_id || '') || 0) + 1);
    const d = x.district.trim() || ''; byDistrict.set(d, (byDistrict.get(d) || 0) + 1);
    byStatus.set(x.status, (byStatus.get(x.status) || 0) + 1);
    const h = responseHours(x); if (h === null) { if (!CLOSED_STATUSES.includes(x.status)) waiting++; } else hours.push(h);
  }
  return {
    total: items.length, byCategory: top(byCategory, 5), byDistrict: top(byDistrict, 5), byStatus: top(byStatus, 11),
    medianResponseHours: median(hours), averageResponseHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null,
    responded: hours.length, awaitingFirstResponse: waiting,
  };
}
export function formatHours(h: number | null): string {
  if (h === null) return '—';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} h`;
  return `${(h / 24).toFixed(1)} days`;
}

/** One CSV cell. Quotes when needed and defuses spreadsheet formulas (cells starting with = + - @ tab or CR). */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(header: string[], rows: unknown[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
/** CSV of the issue list. Contact details and evidence are never included. */
export function issuesCsv(items: IssueListItem[], names: { category: (id: string | null) => string; member: (id: string | null) => string }): string {
  return toCsv(
    ['Reference', 'Title', 'Status', 'Priority', 'Topic', 'District', 'Mandal / village', 'Assigned to', 'Received (IST)', 'First response (hours)', 'Content idea'],
    items.map((x) => { const h = responseHours(x); return [x.ref_no, x.title, x.status, x.priority, names.category(x.category_id), x.district, x.mandal, names.member(x.assignee), istDate(x.created_at), h === null ? '' : h.toFixed(1), x.planner_id ? 'yes' : '']; }),
  );
}

/**
 * Ready-made replies for the "Update for the citizen" box (shown on the Track My Issue page).
 * Telugu wording should be checked by a native speaker before regular use.
 */
export const REPLY_TEMPLATES: { id: string; label: string; en: string; te: string }[] = [
  { id: 'received', label: 'Received – under review',
    en: 'Thank you for writing to TAK TV India. We have received your issue and our team is reviewing it. We will update this page when there is progress.',
    te: 'TAK TV Indiaకు రాసినందుకు ధన్యవాదాలు. మీ సమస్య మాకు అందింది. మా బృందం దీనిని పరిశీలిస్తోంది. పురోగతి ఉన్నప్పుడు ఈ పేజీలో తెలియజేస్తాం.' },
  { id: 'more_info', label: 'Need more information',
    en: 'We need a little more information to verify this issue: the exact location or a landmark, since when the problem has existed, and any photos or documents you have. Please send them through “Raise Your Issue” and mention your reference number.',
    te: 'ఈ సమస్యను ధృవీకరించడానికి మాకు మరికొంత సమాచారం కావాలి: ఖచ్చితమైన ప్రదేశం లేదా గుర్తు, సమస్య ఎప్పటి నుంచి ఉంది, మీ వద్ద ఉన్న ఫోటోలు లేదా పత్రాలు. దయచేసి “మీ సమస్యను తెలపండి” ద్వారా పంపి, మీ రిఫరెన్స్ నంబర్‌ను పేర్కొనండి.' },
  { id: 'verifying', label: 'Being verified',
    en: 'Our reporters are checking the facts with official records and the people concerned. This can take some time. Thank you for your patience.',
    te: 'మా రిపోర్టర్లు అధికారిక రికార్డులు మరియు సంబంధిత వ్యక్తులతో వాస్తవాలను పరిశీలిస్తున్నారు. దీనికి కొంత సమయం పట్టవచ్చు. మీ ఓపికకు ధన్యవాదాలు.' },
  { id: 'planned', label: 'Story planned',
    en: 'Your issue has been verified and we are preparing a story on it. We will share the link here once it is published.',
    te: 'మీ సమస్య ధృవీకరించబడింది. దీనిపై మేము కథనాన్ని సిద్ధం చేస్తున్నాం. ప్రచురించిన తర్వాత లింక్‌ను ఇక్కడ పంచుకుంటాం.' },
  { id: 'published', label: 'Story published',
    en: 'We have published a story on this issue. You can find it on our website and YouTube channel. Thank you for bringing it to us.',
    te: 'ఈ సమస్యపై మేము కథనాన్ని ప్రచురించాం. మా వెబ్‌సైట్ మరియు యూట్యూబ్ ఛానల్‌లో చూడవచ్చు. ఈ విషయాన్ని మా దృష్టికి తెచ్చినందుకు ధన్యవాదాలు.' },
  { id: 'resolved', label: 'Resolved',
    en: 'We are told this problem has now been resolved. If it comes back, please raise a new issue and mention this reference number.',
    te: 'ఈ సమస్య ఇప్పుడు పరిష్కారమైందని మాకు తెలిసింది. మళ్లీ సమస్య వస్తే, దయచేసి ఈ రిఫరెన్స్ నంబర్‌తో కొత్త సమస్యను పంపండి.' },
  { id: 'not_taken', label: 'Not taken up',
    en: 'Thank you for writing to us. After review, we are not able to take up this issue as a story at this time. You may also approach the concerned office or the grievance portal of the government.',
    te: 'మాకు రాసినందుకు ధన్యవాదాలు. పరిశీలన తర్వాత, ప్రస్తుతం ఈ సమస్యను కథనంగా తీసుకోలేకపోతున్నాం. మీరు సంబంధిత కార్యాలయాన్ని లేదా ప్రభుత్వ ఫిర్యాదుల పోర్టల్‌ను కూడా సంప్రదించవచ్చు.' },
];
