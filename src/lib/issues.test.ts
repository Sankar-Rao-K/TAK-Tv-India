import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, csvCell, filterIssues, formatHours, issueStats, issuesCsv, istDate, REPLY_TEMPLATES, type IssueListItem } from './issues';

const base: IssueListItem = { id: '1', ref_no: 'TAK-202610-AAAAAA', title: 'Broken culvert', status: 'new', priority: 'normal', assignee: null, district: 'Visakhapatnam', mandal: 'Pendurthi', category_id: 'irrigation-water', created_at: '2026-10-01T04:00:00Z', updated_at: '2026-10-01T04:00:00Z', first_response_at: null, planner_id: null };
const items: IssueListItem[] = [
  base,
  { ...base, id: '2', ref_no: 'TAK-202610-BBBBBB', title: 'No teacher', status: 'researching', category_id: 'education', district: 'Anakapalli', assignee: 'u1', created_at: '2026-10-10T20:00:00Z', first_response_at: '2026-10-11T02:00:00Z' },
  { ...base, id: '3', ref_no: 'TAK-202610-CCCCCC', title: 'Spam', status: 'spam', category_id: null, district: '', created_at: '2026-10-20T10:00:00Z', first_response_at: '2026-10-20T10:30:00Z' },
];

describe('citizen desk filters', () => {
  it('open view hides closed statuses', () => { expect(filterIssues(items, EMPTY_FILTERS).map((x) => x.id)).toEqual(['1', '2']); });
  it('filters by topic, district, assignee and IST dates', () => {
    const all = { ...EMPTY_FILTERS, status: 'all' };
    expect(filterIssues(items, { ...all, category: 'education' }).map((x) => x.id)).toEqual(['2']);
    expect(filterIssues(items, { ...all, category: '__none' }).map((x) => x.id)).toEqual(['3']);
    expect(filterIssues(items, { ...all, district: 'visakhapatnam' }).map((x) => x.id)).toEqual(['1']);
    expect(filterIssues(items, { ...all, assignee: '__none' }).map((x) => x.id)).toEqual(['1', '3']);
    // 2026-10-10T20:00Z is 11 Oct in India
    expect(istDate('2026-10-10T20:00:00Z')).toBe('2026-10-11');
    expect(filterIssues(items, { ...all, from: '2026-10-11', to: '2026-10-11' }).map((x) => x.id)).toEqual(['2']);
  });
});

describe('citizen desk analytics', () => {
  it('counts and response times', () => {
    const s = issueStats(items);
    expect(s.total).toBe(3);
    expect(s.medianResponseHours).toBeCloseTo(3.25);
    expect(s.awaitingFirstResponse).toBe(1);
    expect(formatHours(0.5)).toBe('30 min');
    expect(formatHours(null)).toBe('—');
    expect(formatHours(72)).toBe('3.0 days');
  });
});

describe('CSV export', () => {
  it('quotes and defuses formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@SUM')).toBe("'@SUM");
  });
  it('never includes contact columns', () => {
    const csv = issuesCsv(items, { category: (id) => id || '', member: (id) => id || '' });
    expect(csv.startsWith('﻿Reference,Title')).toBe(true);
    expect(csv.toLowerCase()).not.toMatch(/phone|email/);
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(4);
  });
  it('reply templates exist in both languages', () => {
    for (const t of REPLY_TEMPLATES) { expect(t.en.length).toBeGreaterThan(20); expect(/[ఀ-౿]/.test(t.te)).toBe(true); }
  });
});
