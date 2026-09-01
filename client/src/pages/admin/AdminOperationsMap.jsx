import { useCallback, useEffect, useState } from 'react';
import { Map as MapIcon, Users, AlertTriangle, Radio } from 'lucide-react';
import CiroMap from '../../components/common/CiroMap';
import { mapApi } from '../../api/map.api';
import { getErrorMessage } from '../../api/client';

export default function AdminOperationsMap() {
  const [incidents, setIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      mapApi.incidents({ all: showAll }),
      mapApi.responders(),
      mapApi.shelters()
    ])
      .then(([inc, resp, sh]) => {
        setIncidents(inc || []);
        setResponders(resp || []);
        setShelters((sh || []).filter((s) => s.is_active));
      })
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load ops data')))
      .finally(() => setLoading(false));
  }, [showAll]);

  useEffect(() => { load(); }, [load]);

  const criticalCount = incidents.filter((i) => (i.verified_severity || i.ai_recommended_severity) === 'CRITICAL').length;
  const onDutyCount = responders.filter((r) => r.duty_status === 'ON_DUTY').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapIcon className="h-6 w-6 text-brand" /> Live Operations Map
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Real-time view of incidents, responders, and safe locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-ink-soft cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded border-line text-brand focus:ring-brand"
            />
            Show all (incl. resolved)
          </label>
          <button
            onClick={load}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-3 text-center">
          <p className="text-xl font-bold text-danger">{criticalCount}</p>
          <p className="text-[10px] text-ink-soft mt-0.5">Critical</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xl font-bold text-brand">{incidents.length}</p>
          <p className="text-[10px] text-ink-soft mt-0.5">Active Incidents</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xl font-bold text-purple-600">{onDutyCount}</p>
          <p className="text-[10px] text-ink-soft mt-0.5">On-Duty</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xl font-bold text-safe">{shelters.length}</p>
          <p className="text-[10px] text-ink-soft mt-0.5">Safe Places</p>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading operations data…</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div style={{ height: 560 }}>
            <CiroMap
              incidents={incidents}
              shelters={shelters}
              responders={responders}
            />
          </div>
        </div>
      )}

      {/* Responder list */}
      {responders.length > 0 && (
        <div className="card">
          <h2 className="px-5 pt-4 pb-3 text-sm font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" /> Active Responders ({responders.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-line bg-surface">
                  <th className="px-5 py-2.5 text-left font-semibold">Name</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Department</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Designation</th>
                </tr>
              </thead>
              <tbody>
                {responders.map((r) => (
                  <tr key={r.user_id} className="border-t border-line hover:bg-surface/50">
                    <td className="px-5 py-2.5 font-medium">{r.full_name}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{r.department_name}</td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.duty_status === 'ON_DUTY' ? 'bg-safe/10 text-safe' : 'bg-warn/10 text-warn'
                      }`}>
                        {r.duty_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">{r.designation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
