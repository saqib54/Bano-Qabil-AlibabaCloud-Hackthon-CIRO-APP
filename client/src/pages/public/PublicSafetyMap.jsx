import { useCallback, useEffect, useState } from 'react';
import { MapPin, Shield, Bot, Radio } from 'lucide-react';
import CiroMap from '../../components/common/CiroMap';
import PakistanParticleMap from '../../components/common/PakistanParticleMap';
import { mapApi } from '../../api/map.api';
import { getErrorMessage } from '../../api/client';

export default function PublicSafetyMap() {
  const [incidents, setIncidents] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([mapApi.incidents(), mapApi.shelters()])
      .then(([inc, sh]) => {
        setIncidents(inc || []);
        setShelters((sh || []).filter((s) => s.is_active));
      })
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load map data')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const criticalCount = incidents.filter((i) => (i.verified_severity || i.ai_recommended_severity) === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-brand" /> Safety Map
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Live incidents and safe places near you
        </p>
      </div>

      {/* National coverage banner — prototype design (§70) */}
      <div className="relative overflow-hidden rounded-2xl bg-navy text-white shadow-card">
        <div className="pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full bg-brand/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-48 w-48 rounded-full bg-aqua/15 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between sm:px-8">
          <div className="max-w-md text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-aqua">
              Pakistan Emergency Network
            </p>
            <h2 className="mt-1.5 text-xl font-extrabold leading-tight">
              Every city,{' '}
              <span className="bg-gradient-to-r from-aqua to-brand-glow bg-clip-text text-transparent">
                one safety grid
              </span>
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-white/60">
              {criticalCount > 0
                ? `${criticalCount} critical zone${criticalCount > 1 ? 's' : ''} active — stay clear of marked impact areas.`
                : 'All monitored zones are currently stable. AI agents watch every district 24/7.'}
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-semibold text-white/50 sm:justify-start">
              <span className="flex items-center gap-1.5">
                <Bot className="h-3 w-3 text-aqua" /> AI-verified reports
              </span>
              <span className="flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-aqua" /> Area alerts
              </span>
            </div>
          </div>
          <PakistanParticleMap
            showCities
            showLabels
            emergency={criticalCount > 0}
            className="h-40 w-auto opacity-95 sm:h-48"
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading map data…</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div style={{ height: 520 }}>
            <CiroMap incidents={incidents} shelters={shelters} />
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-danger">{incidents.filter((i) => (i.verified_severity || i.ai_recommended_severity) === 'CRITICAL').length}</p>
          <p className="text-xs text-ink-soft mt-1">Critical</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-warn">{incidents.filter((i) => (i.verified_severity || i.ai_recommended_severity) === 'HIGH').length}</p>
          <p className="text-xs text-ink-soft mt-1">High Severity</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand">{incidents.length}</p>
          <p className="text-xs text-ink-soft mt-1">Total Incidents</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-safe flex items-center justify-center gap-1">
            <Shield className="h-5 w-5" />{shelters.length}
          </p>
          <p className="text-xs text-ink-soft mt-1">Safe Places</p>
        </div>
      </div>
    </div>
  );
}
