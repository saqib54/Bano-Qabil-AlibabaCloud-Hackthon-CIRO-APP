import { useCallback, useEffect, useState } from 'react';
import { ScrollText, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { getErrorMessage } from '../../api/client';

const ACTION_COLOR = {
  INCIDENT_VERIFY: 'bg-brand/10 text-brand',
  INCIDENT_ASSIGN: 'bg-purple-600/10 text-purple-700',
  STATUS_CHANGE: 'bg-warn/10 text-warn',
  INCIDENT_REPORT: 'bg-safe/10 text-safe',
  BROADCAST_CREATE: 'bg-danger/10 text-danger',
  RESOLUTION_SUBMIT: 'bg-teal-600/10 text-teal-700',
  RESOLUTION_APPROVE: 'bg-safe/10 text-safe',
  STAFF_UPDATE: 'bg-brand/10 text-brand',
  DEPARTMENT_CREATE: 'bg-brand/10 text-brand',
  SHELTER_CREATE: 'bg-safe/10 text-safe',
  SETTINGS_UPDATE: 'bg-warn/10 text-warn',
  INCIDENT_REANALYZE: 'bg-purple-600/10 text-purple-700',
  PROFILE_UPDATE: 'bg-brand/10 text-brand'
};

const ENTITIES = ['', 'incident', 'staff_profile', 'emergency_broadcast', 'department', 'shelter', 'system_settings', 'user'];
const PAGE_SIZE = 20;

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (entityFilter) params.entity = entityFilter;
    if (actionFilter) params.action = actionFilter;
    adminApi.auditLogs(params)
      .then((res) => {
        setLogs(res?.rows || []);
        setTotal(res?.total || 0);
      })
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load audit logs')))
      .finally(() => setLoading(false));
  }, [page, entityFilter, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-brand" /> Audit Logs
        </h1>
        <p className="mt-1 text-sm text-ink-soft">System activity trail for compliance and security review</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-ink-soft" />
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
        >
          <option value="">All Entities</option>
          {ENTITIES.filter(Boolean).map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
        </select>
        <input
          placeholder="Filter by action…"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft/50 focus:border-brand focus:outline-none w-44"
        />
        <span className="ml-auto text-xs text-ink-soft">{total} total entries</span>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading audit logs…</div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center">
          <ScrollText className="mx-auto h-10 w-10 text-ink-soft/20" />
          <p className="mt-3 text-sm font-semibold">No audit logs found</p>
          <p className="mt-1 text-xs text-ink-soft">Try adjusting the filters</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface border-b border-line">
                  <th className="px-5 py-2.5 text-left font-semibold">Time</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Action</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Entity</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Actor</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-line hover:bg-surface/50">
                    <td className="px-5 py-2.5 text-ink-soft whitespace-nowrap">{formatWhen(log.created_at)}</td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${ACTION_COLOR[log.action] || 'bg-line text-ink-soft'}`}>
                        {log.action?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">{log.entity || '—'}</td>
                    <td className="px-5 py-2.5">
                      <span className="font-medium">{log.actor_name || 'System'}</span>
                      {log.actor_email && <span className="text-ink-soft ml-1">({log.actor_email})</span>}
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft max-w-[200px] truncate">
                      {log.previous_value && <span>{log.previous_value} → </span>}
                      {log.new_value && <span className="font-medium text-ink">{log.new_value}</span>}
                      {!log.previous_value && !log.new_value && log.meta && (
                        <span className="text-[10px]">{log.meta}</span>
                      )}
                      {!log.previous_value && !log.new_value && !log.meta && '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-secondary text-xs px-2 py-1 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-ink-soft">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn-secondary text-xs px-2 py-1 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
