import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Clock } from 'lucide-react';
import StatusPill from '../../components/common/StatusPill';
import { adminApi } from '../../api/admin.api';
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

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

export default function ResolutionReview() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.resolutions()
      .then((data) => setIncidents(data || []))
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load resolutions')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resolution Review</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Review and approve or reject resolutions submitted by field responders.
        </p>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading resolutions…</div>
      ) : incidents.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <ClipboardCheck className="h-8 w-8 text-ink-soft/50" />
          <p className="mt-3 text-sm font-medium">No pending resolutions</p>
          <p className="mt-1 text-xs text-ink-soft">
            When responders submit resolutions, they'll appear here for review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => {
            const sev = inc.verified_severity || inc.ai_recommended_severity;
            return (
              <Link
                key={inc.id}
                to={`/admin/resolutions/${inc.id}`}
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
                      {sev && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_TONE[sev]}`}>
                          {sev}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold">
                      {CATEGORY_EMOJI[inc.category] || '📋'} {inc.title}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">{inc.location_name}</p>
                    {inc.resolution_notes && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
                        {inc.resolution_notes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="pill bg-warn-soft text-warn">
                      <Clock className="h-3 w-3" />
                      <span className="text-[10px]">Awaiting Review</span>
                    </span>
                    <p className="text-xs text-ink-soft">{formatWhen(inc.updated_at)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
