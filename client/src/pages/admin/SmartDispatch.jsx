import { useCallback, useEffect, useState } from 'react';
import { Zap, CheckSquare, Loader2, AlertTriangle, Users, Building, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { dispatchApi } from '../../api/map.api';
import { getErrorMessage } from '../../api/client';

const SEVERITY_COLOR = {
  CRITICAL: 'text-danger bg-danger-soft border-danger',
  HIGH: 'text-warn bg-warn-soft border-warn',
  MEDIUM: 'text-brand bg-brand-soft border-brand',
  LOW: 'text-ink-soft bg-surface border-line'
};

export default function SmartDispatch() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setAssignResult(null);
    dispatchApi.recommendations()
      .then((res) => {
        setData(res);
        setSelected(new Set());
      })
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load recommendations')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(ids) {
    setSelected((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }

  async function handleAutoAssign() {
    if (selected.size === 0) return;
    setAssigning(true);
    setAssignResult(null);
    try {
      const res = await dispatchApi.autoAssign([...selected]);
      setAssignResult(res);
      load();
    } catch (err) {
      setAssignResult({ error: getErrorMessage(err, 'Auto-assign failed') });
    } finally {
      setAssigning(false);
    }
  }

  const incidents = data?.incidents || [];
  const allIds = incidents.map((i) => i.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-warn" /> Smart Dispatch
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            AI-powered dispatch recommendations for unassigned incidents
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button
              onClick={handleAutoAssign}
              disabled={assigning}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
              Assign Selected ({selected.size})
            </button>
          )}
          <button onClick={load} className="btn-secondary text-sm">Refresh</button>
        </div>
      </div>

      {/* Assign result banner */}
      {assignResult && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          assignResult.error ? 'bg-danger/10 text-danger' : 'bg-safe/10 text-safe'
        }`}>
          {assignResult.error || `${assignResult.assigned || 0} incident(s) auto-assigned successfully`}
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">
          <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" />
          Analyzing incidents and computing recommendations…
        </div>
      ) : incidents.length === 0 ? (
        <div className="card p-12 text-center">
          <Zap className="mx-auto h-10 w-10 text-safe/30" />
          <p className="mt-3 text-sm font-semibold text-safe">All clear!</p>
          <p className="mt-1 text-xs text-ink-soft">No unassigned incidents require dispatch</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select-all */}
          <div className="flex items-center gap-3 px-1">
            <label className="flex items-center gap-2 text-xs font-medium text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => toggleAll(allIds)}
                className="rounded border-line text-brand focus:ring-brand"
              />
              Select all ({incidents.length})
            </label>
          </div>

          {incidents.map((inc) => {
            const sev = inc.verified_severity || inc.ai_recommended_severity || 'MEDIUM';
            const sevStyle = SEVERITY_COLOR[sev] || SEVERITY_COLOR.MEDIUM;
            const isExpanded = expanded === inc.id;

            return (
              <div key={inc.id} className={`card overflow-hidden border-l-4 ${sevStyle.split(' ')[2]}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(inc.id)}
                      onChange={() => toggleSelect(inc.id)}
                      className="mt-1 rounded border-line text-brand focus:ring-brand"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${sevStyle}`}>
                          {sev}
                        </span>
                        <span className="text-xs font-mono text-ink-soft">{inc.incident_number}</span>
                        <span className="text-[10px] text-ink-soft">{inc.category}</span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-bold">{inc.title}</h3>
                      <p className="mt-0.5 text-xs text-ink-soft truncate">{inc.location_name || 'Location unspecified'}</p>

                      {/* Recommendation row */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-ink-soft">
                          <Building className="h-3.5 w-3.5" />
                          <span>Suggested: <span className="font-bold text-ink">{inc.suggested_department || 'N/A'}</span></span>
                        </div>
                        {inc.available_staff && (
                          <div className="flex items-center gap-1.5 text-ink-soft">
                            <Users className="h-3.5 w-3.5" />
                            <span>{inc.available_staff.length} available</span>
                          </div>
                        )}
                        {inc.workload && (
                          <div className="flex items-center gap-1.5 text-ink-soft">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{inc.workload.active} active in dept</span>
                          </div>
                        )}
                        <button
                          onClick={() => setExpanded(isExpanded ? null : inc.id)}
                          className="text-brand hover:underline flex items-center gap-0.5 ml-auto"
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          Details
                        </button>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-3 rounded-lg bg-surface p-3 space-y-2 text-xs">
                          <p className="text-ink-soft"><span className="font-semibold text-ink">Status:</span> {inc.status?.replace('_', ' ')}</p>
                          <p className="text-ink-soft"><span className="font-semibold text-ink">Category:</span> {inc.category}</p>
                          {inc.available_staff && inc.available_staff.length > 0 && (
                            <div>
                              <p className="font-semibold text-ink mb-1">Available Staff:</p>
                              {inc.available_staff.map((s) => (
                                <span key={s.id} className="inline-flex mr-2 mb-1 rounded-full bg-brand/10 text-brand px-2 py-0.5 text-[10px] font-medium">
                                  {s.full_name} ({s.designation})
                                </span>
                              ))}
                            </div>
                          )}
                          {inc.available_staff && inc.available_staff.length === 0 && (
                            <p className="text-danger flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> No staff currently available in suggested department
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
