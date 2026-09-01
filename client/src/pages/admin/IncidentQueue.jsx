import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { getErrorMessage } from '../../api/client';
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  STATUS_META,
  statusLabel,
  statusTone
} from '../../constants/incidents';

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const SEVERITY_TONE = {
  CRITICAL: 'bg-danger-soft text-danger border-danger/30',
  HIGH: 'bg-warn-soft text-warn border-warn/30',
  MEDIUM: 'bg-brand-soft text-brand border-brand/30',
  LOW: 'bg-surface text-ink-soft border-line'
};

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'REPORTED', label: 'Reported' },
  { value: 'AI_ANALYZED', label: 'AI Analyzed' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'EN_ROUTE', label: 'En Route' },
  { value: 'ON_SCENE', label: 'On Scene' },
  { value: 'RESOLVED', label: 'Resolved' }
];

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

export default function IncidentQueue() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (severityFilter) params.severity = severityFilter;

    adminApi
      .incidents(params)
      .then(setIncidents)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load incidents')))
      .finally(() => setLoading(false));
  }, [statusFilter, categoryFilter, severityFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return incidents;
    const q = search.toLowerCase();
    return incidents.filter(
      (i) =>
        i.title?.toLowerCase().includes(q) ||
        i.incident_number?.toLowerCase().includes(q) ||
        i.location_name?.toLowerCase().includes(q)
    );
  }, [incidents, search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Incident Queue</h1>
        <p className="text-sm text-ink-soft">
          All emergency reports — filter, triage, and verify incidents.
        </p>
      </div>

      {/* Filter bar */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            className="input pl-9"
            placeholder="Search by title, ID, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="input w-auto min-w-[140px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            className="input w-auto min-w-[140px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
          <select
            className="input w-auto min-w-[130px]"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      {/* Results count */}
      <p className="text-xs font-medium text-ink-soft">
        {loading ? 'Loading…' : `${filtered.length} incident${filtered.length !== 1 ? 's' : ''}`}
      </p>

      {/* Table */}
      {loading ? (
        <div className="card flex items-center justify-center py-16 text-sm text-ink-soft">
          Loading incidents…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Filter className="h-6 w-6 text-ink-soft/60" />
          <p className="text-sm font-medium">No incidents match your filters</p>
          <p className="text-xs text-ink-soft">Try clearing some filters or broadening your search.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Incident</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Reported</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc) => {
                  const sev = inc.verified_severity || inc.ai_recommended_severity;
                  return (
                    <tr
                      key={inc.id}
                      className="cursor-pointer border-b border-line/60 transition hover:bg-surface/60"
                      onClick={() => navigate(`/admin/incidents/${inc.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{inc.title}</p>
                        <p className="text-xs text-ink-soft">{inc.incident_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-base">{CATEGORY_EMOJI[inc.category] || '📋'}</span>{' '}
                        <span className="text-xs">{CATEGORY_LABEL[inc.category] || inc.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`pill ${statusTone(inc.status)}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {statusLabel(inc.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sev ? (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${SEVERITY_TONE[sev] || ''}`}>
                            {sev}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-soft">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">{inc.location_name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-ink-soft">{formatWhen(inc.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-line md:hidden">
            {filtered.map((inc) => {
              const sev = inc.verified_severity || inc.ai_recommended_severity;
              return (
                <div
                  key={inc.id}
                  className="cursor-pointer p-4 transition hover:bg-surface/60"
                  onClick={() => navigate(`/admin/incidents/${inc.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{inc.title}</p>
                      <p className="text-xs text-ink-soft">{inc.incident_number}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {sev && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_TONE[sev] || ''}`}>
                          {sev}
                        </span>
                      )}
                      <ChevronDown className="h-4 w-4 -rotate-90 text-ink-soft" />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm">{CATEGORY_EMOJI[inc.category]}</span>
                    <span className={`pill ${statusTone(inc.status)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusLabel(inc.status)}
                    </span>
                    <span className="text-xs text-ink-soft">{formatWhen(inc.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
