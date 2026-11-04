import { describe, expect, it } from 'vitest';
import { splitQuote, storyDate, withDateline } from '@/components/news/public-site';
import { parseOpenMeteo, weatherKind } from './weather.functions';

describe('story page helpers', () => {
  it('lifts the first quotation out of the story, with its speaker', () => {
    const r = splitQuote('<p>A</p><blockquote><p>Growth is strong.</p><p>— RBI Governor</p></blockquote><p>B</p>');
    expect(r.quote).toEqual({ text: 'Growth is strong.', by: 'RBI Governor' });
    expect(r.body).toBe('<p>A</p><p>B</p>');
    expect(splitQuote('<p>No quote</p>')).toEqual({ body: '<p>No quote</p>', quote: null });
  });
  it('adds a bold dateline to the first paragraph, escaping it', () => {
    expect(withDateline('<p>Text</p><p>More</p>', 'New Delhi')).toBe('<p><strong>New Delhi:</strong> Text</p><p>More</p>');
    expect(withDateline('<p>Text</p>', '<b>x</b>')).toContain('&lt;b&gt;x&lt;/b&gt;:');
    expect(withDateline('<p>Text</p>', '')).toBe('<p>Text</p>');
  });
  it('shows the date with the weekday in India time', () => {
    expect(storyDate('2025-10-27T04:00:00Z', 'en')).toBe('27 Oct 2025, Monday');
    expect(storyDate('2025-10-26T20:00:00Z', 'te')).toBe('27 అక్టో 2025, సోమవారం'); // 01:30 IST next day
  });
});
describe('weather chip', () => {
  it('reads Open-Meteo and groups weather codes', () => {
    expect(parseOpenMeteo({ current: { temperature_2m: 27.6, weather_code: 61 } })).toEqual({ temp: 28, kind: 'rain' });
    expect(parseOpenMeteo({})).toBeNull();
    expect([0, 2, 3, 45, 63, 81, 95, 73].map(weatherKind)).toEqual(['clear', 'partly', 'cloudy', 'fog', 'rain', 'rain', 'storm', 'snow']);
  });
});
