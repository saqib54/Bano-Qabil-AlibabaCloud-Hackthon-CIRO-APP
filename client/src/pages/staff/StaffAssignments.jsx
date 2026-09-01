import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import StatusPill from '../../components/common/StatusPill';
import { staffApi } from '../../api/staff.api';
import { getErrorMessage } from '../../api/client';
import {
  CATEGORY_EMOJI,
  statusLabel,
  statusTone
} from '../../constants/incidents';

const SEVERITY_TONE = {
  CRITICAL: 'bg-danger-soft text-danger border-danger/30',
  HIGH: 'bg-warn-soft text-warn border-warn/30',
  MEDIUM: 'bg-brand-soft text-brand border-brand/30',
  LOW: 'bg-surface text-ink-soft border-line'
};

const FILTER_TABS = [
  { value: '', label: 'All' },
  { value: 'ASSIGNED', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' }
];

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

export default function StaffAssignments() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    staffApi.assignments()
      .then((data) => setIncidents(data || []))
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load assignments')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Client-side filtering
  const filtered = incidents.filter((inc) => {
    // Status group filter
    if (filter === 'ASSIGNED' && inc.status !== 'ASSIGNED') return false;
    if (filter === 'ACTIVE' && !['ACCEPTED', 'EN_ROUTE', 'ON_SCENE'].includes(inc.status)) return false;
    if (filter === 'COMPLETED' && !['RESOLUTION_SUBMITTED', 'RESOLVED', 'REOPENED'].includes(inc.status)) return false;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      return (
        inc.title?.toLowerCase().includes(q) ||
        inc.incident_number?.toLowerCase().includes(q) ||
        inc.location_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assigned Incidents</h1>
        <p className="mt-1 text-sm text-ink-soft">Incidents assigned to your department or directly to you.</p>
      </div>

      {/* Search + filter tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Search by title, ID, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === tab.value
                  ? 'bg-brand text-white'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading assignments…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium">No incidents found</p>
          <p className="mt-1 text-xs text-ink-soft">
            {search ? 'Try a different search term.' : 'No incidents match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((inc) => {
            const sev = inc.verified_severity || inc.ai_recommended_severity;
            return (
              <Link
                key={inc.id}
                to={`/staff/incidents/${inc.id}`}
                className="card group flex flex-col gap-3 p-5 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-ink-soft">{inc.incident_number}</p>
                  <span className={`pill shrink-0 ${statusTone(inc.status)}`}>
                    <span className="h-1 w-1 rounded-full bg-current" />
                    <span className="text-[10px]">{statusLabel(inc.status)}</span>
                  </span>
                </div>

                <p className="text-sm font-semibold leading-snug">
                  {CATEGORY_EMOJI[inc.category] || '📋'} {inc.title}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {sev && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_TONE[sev] || ''}`}>
                      {sev}
                    </span>
                  )}
                  <span className="text-xs text-ink-soft">{inc.location_name}</span>
                </div>

                <p className="text-xs text-ink-soft">Reported {formatWhen(inc.created_at)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
