import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Download, FileText, Film, KanbanSquare, Lightbulb, Lock, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { queriesOptions, getQuery, updateQuery, addQueryNote, QUERY_STATUSES, PRIORITIES } from '@/lib/queries.functions';
import { convertQueryToIdea, STAGE_LABELS } from '@/lib/hub.functions';
import { newsDate } from '@/lib/news';
import { EMPTY_FILTERS, REPLY_TEMPLATES, filterIssues, formatHours, issueStats, issuesCsv, responseHours, type IssueFilters } from '@/lib/issues';
import type { Category } from '@/lib/news.functions';
import { categoryName } from '../news/public-site';

const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
type Member = { id: string; name?: string | null; email?: string | null };
type Props = { team: Member[]; categories: Category[]; onOpenPlanner?: (id: string) => void };

function Stat({ title, rows }: { title: string; rows: [string, string | number][] }) {
  return <div className="admin-panel !p-4"><p className="text-[11px] font-bold uppercase text-muted-foreground mb-2">{title}</p>
    {rows.length ? <ul className="space-y-1 text-xs">{rows.map(([k, v]) => <li key={k} className="flex justify-between gap-3"><span className="truncate">{k}</span><strong>{v}</strong></li>)}</ul> : <p className="text-xs text-muted-foreground">—</p>}</div>;
}

export function QueriesDesk({ team, categories, onOpenPlanner }: Props) {
  const { data } = useSuspenseQuery(queriesOptions);
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState<IssueFilters>(EMPTY_FILTERS);
  const set = (p: Partial<IssueFilters>) => setF((x) => ({ ...x, ...p }));
  const who = (id: string | null) => team.find((m) => m.id === id)?.name || (id ? 'Team member' : 'Unassigned');
  const cat = (id: string | null) => (id ? categoryName(categories.find((c) => c.id === id), 'en') || id : 'No topic');
  const items = useMemo(() => filterIssues(data.items, f), [data.items, f]);
  const stats = useMemo(() => issueStats(items), [items]);
  const districts = useMemo(() => [...new Set(data.items.map((x) => x.district.trim()).filter(Boolean))].sort(), [data.items]);
  if (open) return <QueryCase id={open} team={team} categories={categories} back={() => setOpen(null)} {...(onOpenPlanner ? { onOpenPlanner } : {})} />;
  const counts = { new: data.items.filter((x) => x.status === 'new').length, urgent: data.items.filter((x) => x.priority === 'urgent' && !['resolved', 'rejected', 'duplicate', 'spam', 'published'].includes(x.status)).length };
  const filtered = JSON.stringify(f) !== JSON.stringify(EMPTY_FILTERS);
  function exportCsv() {
    const blob = new Blob([issuesCsv(items, { category: (id) => (id ? cat(id) : ''), member: (id) => (id ? who(id) : '') })], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `citizen-issues-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">Citizen Issues</h1><p className="mt-1 text-sm text-muted-foreground">{counts.new} new · {counts.urgent} urgent open</p></div>
      <Button variant="outline" disabled={!items.length} onClick={exportCsv}><Download />Export CSV ({items.length})</Button></div>
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat title={`Status (${stats.total})`} rows={stats.byStatus.map(([k, v]) => [label(k), v])} />
      <Stat title="Top topics" rows={stats.byCategory.map(([k, v]) => [k ? cat(k) : 'No topic', v])} />
      <Stat title="Top districts" rows={stats.byDistrict.map(([k, v]) => [k || 'Not given', v])} />
      <Stat title="Time to first response" rows={[['Median', formatHours(stats.medianResponseHours)], ['Average', formatHours(stats.averageResponseHours)], ['Answered', stats.responded], ['Still waiting', stats.awaitingFirstResponse]]} />
    </div>
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <select className="field max-w-[180px]" aria-label="Status" value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="open">Open issues</option><option value="all">All issues</option>{QUERY_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
      <select className="field max-w-[200px]" aria-label="Topic" value={f.category} onChange={(e) => set({ category: e.target.value })}><option value="">All topics</option><option value="__none">No topic</option>{categories.map((c) => <option key={c.id} value={c.id}>{categoryName(c, 'en')}</option>)}</select>
      <select className="field max-w-[180px]" aria-label="District" value={f.district} onChange={(e) => set({ district: e.target.value })}><option value="">All districts</option>{districts.map((d) => <option key={d} value={d}>{d}</option>)}</select>
      <select className="field max-w-[180px]" aria-label="Assigned to" value={f.assignee} onChange={(e) => set({ assignee: e.target.value })}><option value="">Anyone</option><option value="__none">Unassigned</option>{team.map((m) => <option key={m.id} value={m.id}>{m.name || m.email || 'Team member'}</option>)}</select>
      <label className="grid gap-1 text-[11px] text-muted-foreground">From<input type="date" className="field !py-2" value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
      <label className="grid gap-1 text-[11px] text-muted-foreground">To<input type="date" className="field !py-2" value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
      <input className="field max-w-xs" placeholder="Search title, reference, place" value={f.q} onChange={(e) => set({ q: e.target.value })} aria-label="Search issues" />
      {filtered && <Button variant="ghost" size="sm" onClick={() => setF(EMPTY_FILTERS)}><X />Clear filters</Button>}
    </div>
    {items.length ? <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full text-left text-xs"><thead className="border-b border-border bg-background text-muted-foreground"><tr><th className="p-4">Issue</th><th className="p-4">Topic</th><th className="p-4">Place</th><th className="p-4">Status</th><th className="p-4">Priority</th><th className="p-4">Assigned</th><th className="p-4">Received</th><th className="p-4">First response</th></tr></thead><tbody>
      {items.map((x) => <tr key={x.id} className="cursor-pointer border-b border-border hover:bg-muted/50" onClick={() => setOpen(x.id)}>
        <td className="p-4"><p className="font-mono text-[10px] text-muted-foreground">{x.ref_no}{x.planner_id && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 font-sans text-primary">idea</span>}</p><p className="font-semibold">{x.title}</p></td>
        <td className="p-4">{x.category_id ? cat(x.category_id) : '—'}</td>
        <td className="p-4">{[x.mandal, x.district].filter(Boolean).join(', ') || '—'}</td>
        <td className="p-4"><span className={`rounded-full px-2 py-1 ${x.status === 'new' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{label(x.status)}</span></td>
        <td className={`p-4 ${x.priority === 'urgent' || x.priority === 'high' ? 'font-bold text-destructive' : ''}`}>{label(x.priority)}</td>
        <td className="p-4">{who(x.assignee)}</td>
        <td className="p-4 whitespace-nowrap">{newsDate(x.created_at)}</td>
        <td className="p-4 whitespace-nowrap">{formatHours(responseHours(x))}</td>
      </tr>)}
    </tbody></table></div> : <div className="news-empty"><FileText size={34} /><p>No citizen issues here.</p></div>}
  </>;
}

function QueryCase({ id, team, categories, back, onOpenPlanner }: { id: string; team: Member[]; categories: Category[]; back: () => void; onOpenPlanner?: (id: string) => void }) {
  const fetchCase = useServerFn(getQuery); const save = useServerFn(updateQuery); const note = useServerFn(addQueryNote); const convert = useServerFn(convertQueryToIdea);
  const qc = useQueryClient();
  const { data, refetch, isLoading } = useQuery({ queryKey: ['citizen-query', id], queryFn: () => fetchCase({ data: { id } }) });
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const [follow, setFollow] = useState<string | null>(null); const [dupe, setDupe] = useState('');
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading issue…</p>;
  const { query: c, access, planner } = data;
  const name = (uid: string | null) => team.find((m) => m.id === uid)?.name || 'Team member';
  async function refreshAll() { await refetch(); await qc.invalidateQueries({ queryKey: ['citizen-queries'] }); await qc.invalidateQueries({ queryKey: ['citizen-new-count'] }); }
  async function run(p: { id: string } & Record<string, unknown>, msg = 'Saved') {
    setBusy(true);
    try { await save({ data: p as never }); await refreshAll(); toast.success(msg); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }
  async function toIdea() {
    setBusy(true);
    try { const r = await convert({ data: { id } }); await refreshAll(); await qc.invalidateQueries({ queryKey: ['hub'] }); toast.success(r.existing ? 'This issue already has a planner card.' : 'Content idea created in the Content Planner.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  }
  const followText = follow ?? c.followup_summary;
  const topic = c.category_id ? categoryName(categories.find((x) => x.id === c.category_id), 'en') || c.category_id : '';
  const hasPoint = typeof c.lat === 'number' && typeof c.lng === 'number';
  return <>
    <Button variant="ghost" className="mb-4 -ml-3" onClick={back}><ArrowLeft />All issues</Button>
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <section className="admin-panel">
          <p className="font-mono text-xs text-muted-foreground">{c.ref_no} · {newsDate(c.created_at)}</p>
          <h1 className="mt-1 text-2xl font-bold">{c.title}</h1>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{c.body}</p>
          <dl className="mt-5 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            {([['District', c.district], ['Mandal / village', c.mandal], ['Location', c.location_text], ['Since', c.started_at], ['People affected', c.people_affected], ['Topic', topic], ['Name may be public', c.consent_public ? 'Yes' : 'No']] as const).map(([k, v]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v || '—'}</dd></div>)}
            {hasPoint && <div><dt className="text-muted-foreground">Map point (shared by the citizen)</dt><dd className="font-medium"><a className="inline-flex items-center gap-1 text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=17/${c.lat}/${c.lng}`}><MapPin size={12} />{c.lat!.toFixed(5)}, {c.lng!.toFixed(5)}</a></dd></div>}
          </dl>
        </section>
        <section className="admin-panel">
          <h2 className="mb-3 font-bold">Contact & evidence</h2>
          {!access.moderate ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock size={14} />Only moderators, the Editor-in-Chief and admins can see contact details and evidence.</p> : <>
            {data.contact ? <p className="text-sm">{data.contact.name || '—'} · {data.contact.phone ? <a className="underline" href={`tel:${data.contact.phone}`}>{data.contact.phone}</a> : '—'} · {data.contact.email ? <a className="underline" href={`mailto:${data.contact.email}`}>{data.contact.email}</a> : '—'}</p> : <p className="text-sm text-muted-foreground">Submitted anonymously.</p>}
            {data.files.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{data.files.map((f) => <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded border border-border">
              {f.kind === 'photo' && !/hei[cf]/.test(f.content_type) ? <img src={f.url} alt="Evidence" className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-muted text-xs">{f.kind === 'video' ? <Film /> : <FileText />}{f.kind} · {f.content_type.split('/').pop()} · {(f.size / 1048576).toFixed(1)} MB</div>}
            </a>)}</div> : <p className="mt-2 text-xs text-muted-foreground">No files attached.</p>}
            <p className="mt-3 text-[11px] text-muted-foreground">File links expire after 15 minutes. Reload the case to get fresh links.</p>
          </>}
        </section>
        <section className="admin-panel">
          <h2 className="mb-3 font-bold">Internal notes <span className="text-xs font-normal text-muted-foreground">(never shown to the citizen)</span></h2>
          <div className="space-y-3">{data.notes.map((n) => <div key={n.id} className="rounded bg-muted p-3 text-sm"><p className="mb-1 text-[11px] text-muted-foreground">{name(n.author)} · {newsDate(n.created_at)}</p><p className="whitespace-pre-line">{n.body}</p></div>)}</div>
          <textarea className="field mt-3" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note for the team" />
          <Button className="mt-2" disabled={busy || !text.trim()} onClick={async () => { setBusy(true); try { await note({ data: { id, body: text } }); setText(''); await refreshAll(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); } }}>Add note</Button>
        </section>
      </div>
      <aside className="space-y-6">
        <section className="admin-panel space-y-4">
          <h2 className="font-bold">Workflow</h2>
          {!access.manage && <p className="text-xs text-muted-foreground">You can add notes. Status and assignment are changed by moderators, editors and admins.</p>}
          <label className="grid gap-1 text-xs">Status<select className="field" disabled={!access.manage || busy} value={c.status} onChange={(e) => run({ id, status: e.target.value as typeof QUERY_STATUSES[number] }, 'Status updated')}>{QUERY_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
          <label className="grid gap-1 text-xs">Priority<select className="field" disabled={!access.manage || busy} value={c.priority} onChange={(e) => run({ id, priority: e.target.value as typeof PRIORITIES[number] })}>{PRIORITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
          <label className="grid gap-1 text-xs">Assigned to<select className="field" disabled={!access.manage || busy} value={c.assignee || ''} onChange={(e) => run({ id, assignee: e.target.value || null }, 'Assignment saved')}><option value="">Unassigned</option>{team.map((m) => <option key={m.id} value={m.id}>{m.name || m.email || 'Team member'}</option>)}</select></label>
          {access.manage && <div className="grid gap-1 text-xs">Mark as duplicate of<div className="flex gap-2"><input className="field font-mono uppercase" placeholder="TAK-…" value={dupe} onChange={(e) => setDupe(e.target.value)} /><Button variant="outline" disabled={!dupe || busy} onClick={() => run({ id, merged_into_ref: dupe }, 'Marked as duplicate')}>Merge</Button></div></div>}
          {access.manage && <Button variant="outline" className="w-full" disabled={busy} onClick={() => run({ id, is_blocked: !c.is_blocked, ...(c.is_blocked ? {} : { status: 'spam' as const }) }, c.is_blocked ? 'Unblocked' : 'Marked as spam')}>{c.is_blocked ? 'Unblock' : 'Mark as spam & block'}</Button>}
        </section>
        <section className="admin-panel space-y-3">
          <h2 className="flex items-center gap-2 font-bold"><KanbanSquare size={16} />Content planner</h2>
          {planner ? <div className="rounded-lg border border-border p-3 text-sm">
            <p className="font-semibold">{planner.title_te || planner.title_en || '(untitled card)'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Stage: {STAGE_LABELS[planner.stage as keyof typeof STAGE_LABELS] || planner.stage}{planner.planned_date ? ` · planned ${planner.planned_date}` : ''}{planner.owner ? ` · ${name(planner.owner)}` : ''}{planner.video_id ? ' · video linked' : ''}{planner.post_id ? ' · post linked' : ''}</p>
            {onOpenPlanner && <Button size="sm" variant="outline" className="mt-3" onClick={() => onOpenPlanner(planner.id)}>Open planner card</Button>}
          </div> : <>
            <p className="text-xs text-muted-foreground">Turn this issue into a story idea. A card is added to the Content Planner and the issue moves to “Content planned”. Contact details are not copied.</p>
            {access.manage ? <Button className="w-full" disabled={busy} onClick={toIdea}><Lightbulb />Convert to content idea</Button> : <p className="text-xs text-muted-foreground">Moderators, editors and admins can do this.</p>}
          </>}
        </section>
        <section className="admin-panel space-y-3">
          <h2 className="font-bold">Update for the citizen</h2>
          <p className="text-xs text-muted-foreground">Shown on the Track My Issue page only when "Visible" is ticked.</p>
          {access.manage && <select className="field" aria-label="Insert a reply template" value="" onChange={(e) => { const [tid, lang] = e.target.value.split(':'); const t = REPLY_TEMPLATES.find((x) => x.id === tid); if (t) setFollow(lang === 'te' ? t.te : lang === 'both' ? `${t.te}\n\n${t.en}` : t.en); }}>
            <option value="">Insert a reply template…</option>
            {REPLY_TEMPLATES.map((t) => <optgroup key={t.id} label={t.label}><option value={`${t.id}:te`}>{t.label} — Telugu</option><option value={`${t.id}:en`}>{t.label} — English</option><option value={`${t.id}:both`}>{t.label} — Telugu + English</option></optgroup>)}
          </select>}
          <textarea className="field" rows={5} disabled={!access.manage} value={followText} onChange={(e) => setFollow(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!access.manage || busy} checked={c.published_followup} onChange={(e) => run({ id, followup_summary: followText, published_followup: e.target.checked }, e.target.checked ? 'Update is now visible' : 'Update hidden')} />Visible to the citizen</label>
          {access.manage && <Button disabled={busy} onClick={() => run({ id, followup_summary: followText }, 'Update saved')}>Save update</Button>}
        </section>
        <section className="admin-panel">
          <h2 className="mb-3 font-bold">History</h2>
          <ol className="space-y-2 border-l-2 border-border pl-4 text-xs">{data.events.map((e) => <li key={e.id}><strong>{e.event === 'status' ? `Status → ${label(String(e.detail['status']))}` : e.event === 'status_changed' ? `Status → ${label(String(e.detail['to'] || ''))}${e.detail['via'] ? ` (${label(String(e.detail['via']))})` : ''}` : e.event === 'assigned' ? `Assigned to ${e.detail['assignee'] ? name(String(e.detail['assignee'])) : 'nobody'}` : e.event === 'priority' ? `Priority → ${label(String(e.detail['priority']))}` : e.event === 'files_added' ? `Evidence received (${e.detail['files'] || 0} file(s))` : label(e.event)}</strong><span className="block text-muted-foreground">{e.actor ? name(e.actor) : 'Citizen / system'} · {newsDate(e.created_at)}</span></li>)}</ol>
        </section>
      </aside>
    </div>
  </>;
}
