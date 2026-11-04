import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';

// Header weather chip. Real current temperature from Open-Meteo (free, no key), read on the server and cached for
// 30 minutes. If it can't be reached, the chip is simply hidden — no made-up numbers.
export const WEATHER_CITY = { lat: 17.6868, lon: 83.2185, names: { en: 'Visakhapatnam', hi: 'विशाखापत्तनम', te: 'విశాఖపట్నం' } } as const;

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'storm' | 'snow';
/** WMO weather code (used by Open-Meteo) → simple icon group. */
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return 'cloudy';
}
export function parseOpenMeteo(json: unknown): { temp: number; kind: WeatherKind } | null {
  const cur = (json as { current?: { temperature_2m?: unknown; weather_code?: unknown } } | null)?.current;
  const t = Number(cur?.temperature_2m); const c = Number(cur?.weather_code);
  if (!cur || !Number.isFinite(t) || !Number.isFinite(c)) return null;
  return { temp: Math.round(t), kind: weatherKind(c) };
}

let cache: { at: number; value: { temp: number; kind: WeatherKind } | null } | null = null;
export const getWeather = createServerFn({ method: 'GET' }).handler(async () => {
  if (cache && Date.now() - cache.at < 30 * 60_000) return cache.value;
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_CITY.lat}&longitude=${WEATHER_CITY.lon}&current=temperature_2m,weather_code&timezone=Asia%2FKolkata`, { signal: ctl.signal });
    const value = res.ok ? parseOpenMeteo(await res.json()) : null;
    cache = { at: Date.now(), value }; return value;
  } catch { cache = { at: Date.now() - 25 * 60_000, value: null }; return null; } finally { clearTimeout(timer); }
});
export const weatherOptions = queryOptions({ queryKey: ['weather'], queryFn: () => getWeather(), staleTime: 30 * 60_000, retry: false });
