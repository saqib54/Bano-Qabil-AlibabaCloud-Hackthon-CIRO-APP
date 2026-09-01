import { useCallback, useEffect, useState } from 'react';
import { Shield, MapPin, Phone, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { mapApi } from '../../api/map.api';
import { getErrorMessage } from '../../api/client';

const TYPE_LABEL = {
  SHELTER: 'Shelter',
  HOSPITAL: 'Hospital',
  FIRE_STATION: 'Fire Station',
  POLICE_STATION: 'Police Station',
  EVACUATION_POINT: 'Evacuation Point',
  MEDICAL_CAMP: 'Medical Camp'
};

const TYPE_COLOR = {
  SHELTER: 'bg-safe text-white',
  HOSPITAL: 'bg-danger text-white',
  FIRE_STATION: 'bg-warn text-white',
  POLICE_STATION: 'bg-brand text-white',
  EVACUATION_POINT: 'bg-purple-600 text-white',
  MEDICAL_CAMP: 'bg-teal-600 text-white'
};

export default function SafePlaces() {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    mapApi.shelters()
      .then((data) => setShelters((data || []).filter((s) => s.is_active)))
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load safe places')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const types = ['ALL', ...new Set(shelters.map((s) => s.type))];
  const filtered = filter === 'ALL' ? shelters : shelters.filter((s) => s.type === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-safe" /> Safe Places
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Shelters, hospitals, and emergency locations near you
        </p>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === t
                ? 'bg-brand text-white'
                : 'bg-surface text-ink-soft hover:bg-line'
            }`}
          >
            {t === 'ALL' ? 'All' : TYPE_LABEL[t] || t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading safe places…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield className="mx-auto h-10 w-10 text-safe/30" />
          <p className="mt-3 text-sm font-semibold">No safe places found</p>
          <p className="mt-1 text-xs text-ink-soft">Try selecting a different category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${TYPE_COLOR[s.type] || 'bg-line text-ink-soft'}`}>
                  {s.type === 'HOSPITAL' ? 'H' : s.type === 'FIRE_STATION' ? 'F' : s.type === 'POLICE_STATION' ? 'P' : 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold truncate">{s.name}</h3>
                  <p className="text-xs text-ink-soft">{TYPE_LABEL[s.type] || s.type}</p>
                </div>
                {expanded === s.id ? (
                  <ChevronUp className="h-4 w-4 text-ink-soft shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-ink-soft shrink-0" />
                )}
              </button>

              {expanded === s.id && (
                <div className="border-t border-line px-4 py-3 space-y-2 bg-surface/50">
                  {s.address && (
                    <div className="flex items-start gap-2 text-xs text-ink-soft">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{s.address}</span>
                    </div>
                  )}
                  {s.contact && (
                    <div className="flex items-center gap-2 text-xs text-ink-soft">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{s.contact}</span>
                    </div>
                  )}
                  {s.capacity && (
                    <div className="flex items-center gap-2 text-xs text-ink-soft">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>Capacity: {s.capacity} people</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-ink-soft">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-ink-soft">
        {filtered.length} safe place{filtered.length !== 1 ? 's' : ''} available
      </p>
    </div>
  );
}
