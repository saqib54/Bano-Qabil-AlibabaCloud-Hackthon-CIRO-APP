import { useCallback, useEffect, useState } from 'react';
import { CloudSun, Search, Loader2, Gauge, Sunrise, MapPin, AlertTriangle, ShieldAlert } from 'lucide-react';
import { weatherApi } from '../../api/weather.api';
import { getErrorMessage } from '../../api/client';
import Weather3DCard from '../../components/weather/Weather3DCard';
import Forecast from '../../components/weather/Forecast';
import WeatherAlerts from '../../components/weather/WeatherAlerts';
import WeatherMap from '../../components/weather/WeatherMap';

const QUICK_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Multan', 'Peshawar', 'Quetta'];

const INSIGHT_ICON = { Health: '🫀', Sports: '🏃', Travel: '🚗', Clothing: '🧥' };

/**
 * Command Center Weather Intelligence — same experience citizens get,
 * plus operational readiness guidance for dispatch decisions.
 */
export default function AdminWeather() {
  const [city, setCity] = useState('Lahore');
  const [query, setQuery] = useState('Lahore');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((target) => {
    setLoading(true);
    setError('');
    weatherApi
      .get(target)
      .then((res) => setData(res))
      .catch((err) => setError(getErrorMessage(err, 'Could not load weather intelligence.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(query);
  }, [query, load]);

  const submit = (e) => {
    e.preventDefault();
    const q = city.trim();
    if (q.length >= 2) setQuery(q);
  };

  return (
    <div className="-mx-4 -mt-5 md:-mx-8 md:-mt-8 min-h-screen bg-gradient-to-b from-navy via-[#122a52] to-[#0a1830] pb-24 md:pb-10">
      {/* Header + city search */}
      <div className="mx-auto max-w-4xl px-4 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-white">
              <CloudSun className="h-7 w-7 text-aqua" /> Weather Intelligence
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Command center briefing — severe alerts, forecast & live radar for operational planning.
            </p>
          </div>
          <form onSubmit={submit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search city…"
                className="w-44 rounded-xl border border-white/15 bg-white/10 py-2.5 pl-9 pr-3 text-sm font-semibold text-white placeholder-white/40 outline-none backdrop-blur-md transition focus:border-brand focus:bg-white/15"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-glow-brand transition hover:bg-brand-dark disabled:opacity-60"
            >
              Go
            </button>
          </form>
        </div>

        {/* Quick city chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_CITIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCity(c); setQuery(c); }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                query.toLowerCase().startsWith(c.toLowerCase())
                  ? 'border-brand bg-brand/30 text-white'
                  : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <MapPin className="mr-1 inline h-3 w-3" />{c}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-danger/30 bg-danger/15 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-16 flex flex-col items-center gap-3 text-white/60">
            <Loader2 className="h-8 w-8 animate-spin text-aqua" />
            <p className="text-xs font-black uppercase tracking-widest">Consulting the AI meteorologist…</p>
          </div>
        )}

        {!loading && data && (
          <>
            <WeatherAlerts alerts={data.alerts} />
            <Weather3DCard data={data} />

            {/* Conditions strip */}
            <div className="mx-auto mt-2 grid max-w-4xl grid-cols-2 gap-3 px-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
                <Gauge className="mx-auto h-5 w-5 text-orange-300" />
                <p className="mt-1.5 text-lg font-black text-white">{data.aqi?.aqi ?? '—'}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">AQI · {data.aqi?.status || 'n/a'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
                <Sunrise className="mx-auto h-5 w-5 text-yellow-300" />
                <p className="mt-1.5 text-lg font-black text-white">{data.astronomy?.sunrise || '—'}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sunrise · set {data.astronomy?.sunset || '—'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
                <p className="text-lg font-black text-white">{data.current?.humidity ?? '—'}%</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Humidity</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
                <p className="text-lg font-black text-white">{data.current?.windSpeed ?? '—'} km/h</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Wind · {data.current?.windDirection || ''}</p>
              </div>
            </div>

            {/* Operational readiness — admin-only guidance */}
            <div className="mx-auto mt-4 max-w-4xl px-4">
              <div className="rounded-2xl border border-warn/25 bg-warn/10 p-4 backdrop-blur-xl">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-300">
                  <ShieldAlert className="h-4 w-4" /> Operational Recommendations
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-white/80">
                  <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> Pre-position flood response equipment in low-lying areas during monsoon watch.</li>
                  <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> Ensure field responders carry hydration supplies on high-temperature days.</li>
                  <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> Consider indoor deployment rotations when AQI exceeds 150.</li>
                  <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> Review evacuation routes whenever a WARNING-level alert is active.</li>
                </ul>
              </div>
            </div>

            {/* Lifestyle insights */}
            {data.insights?.length > 0 && (
              <div className="mx-auto mt-8 max-w-4xl px-4">
                <h3 className="mb-4 flex items-center gap-2 pl-2 text-sm font-black uppercase tracking-widest text-white/80">
                  AI Field Insights
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {data.insights.map((ins, i) => (
                    <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition hover:bg-white/10">
                      <p className="text-sm font-black text-white">{INSIGHT_ICON[ins.category] || '✨'} {ins.category}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/60">{ins.advice}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Forecast data={data} />
            <WeatherMap lat={data.location?.lat} lon={data.location?.lon} />

            <p className="mx-auto mt-2 max-w-4xl px-4 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
              {data.source === 'ai' ? 'Generated by CIRO AI meteorologist (Qwen)' : 'Offline model — AI feed unavailable, showing seasonal estimate'} · Severe weather events can be broadcast via Emergency Alerts
            </p>
          </>
        )}
      </div>
    </div>
  );
}
