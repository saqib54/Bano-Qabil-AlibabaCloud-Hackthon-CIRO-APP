import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, CheckCircle2 } from 'lucide-react';
import { staffApi } from '../../api/staff.api';
import { getErrorMessage } from '../../api/client';
import {
  CATEGORY_EMOJI, CATEGORY_LABEL,
  statusLabel, statusTone
} from '../../constants/incidents';

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function StaffHistory() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    staffApi.history()
      .then((data) => setIncidents(data || []))
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load history')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Completed Incidents</h1>
        <p className="mt-1 text-sm text-ink-soft">Incidents you have resolved. Click for read-only details.</p>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading history…</div>
      ) : incidents.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <HistoryIcon className="h-8 w-8 text-ink-soft/50" />
          <p className="mt-3 text-sm font-medium">No completed incidents yet</p>
          <p className="mt-1 text-xs text-ink-soft">Resolved incidents will appear here for your records.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <Link
              key={inc.id}
              to={`/staff/incidents/${inc.id}`}
              className="card block p-5 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-ink-soft">{inc.incident_number}</p>
                    <span className={`pill ${statusTone(inc.status)}`}>
                      <span className="h-1 w-1 rounded-full bg-current" />
                      <span className="text-[10px]">{statusLabel(inc.status)}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">
                    {CATEGORY_EMOJI[inc.category] || '📋'} {inc.title}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {CATEGORY_LABEL[inc.category] || inc.category} · {inc.location_name}
                  </p>
                  {inc.resolution_notes && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                      {inc.resolution_notes}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <CheckCircle2 className="h-5 w-5 text-safe" />
                  <p className="mt-1 text-xs text-ink-soft">
                    {inc.resolved_at ? formatWhen(inc.resolved_at) : formatWhen(inc.updated_at)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
