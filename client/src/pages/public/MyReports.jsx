import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users } from 'lucide-react';
import { incidentsApi } from '../../api/incidents.api';
import { getErrorMessage } from '../../api/client';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  statusLabel,
  statusTone
} from '../../constants/incidents';

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

const SEVERITY_TONE = {
  CRITICAL: 'bg-danger-soft text-danger border-danger/30',
  HIGH: 'bg-warn-soft text-warn border-warn/30',
  MEDIUM: 'bg-brand-soft text-brand border-brand/30',
  LOW: 'bg-surface text-ink-soft border-line'
};

function severityLabel(incident) {
  return incident.verified_severity || incident.ai_recommended_severity || null;
}

export default function MyReports() {
  const [incidents, setIncidents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    incidentsApi
      .mine()
      .then(setIncidents)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load your reports')));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">My Reports</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Track every emergency you reported and follow its live status.
          </p>
        </div>
        <Link to="/public/report" className="btn-danger shrink-0">
          + New Report
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      {!incidents && !error && (
        <div className="card flex items-center justify-center py-16 text-sm text-ink-soft">
          Loading your reports…
        </div>
      )}

      {incidents?.length === 0 && (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-4xl">📭</span>
          <p className="font-semibold text-ink">No reports yet</p>
          <p className="text-sm text-ink-soft">
            If you ever witness an emergency, report it here — every report helps the city respond faster.
          </p>
          <Link to="/public/report" className="btn-danger mt-2">Report an Emergency</Link>
        </div>
      )}

      {incidents?.length > 0 && (
        <div className="space-y-3">
          {incidents.map((inc) => {
            const sev = severityLabel(inc);
            return (
              <Link
                key={inc.id}
                to={`/public/incidents/${inc.id}`}
                className="card block transition hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 text-2xl shrink-0">
                      {CATEGORY_EMOJI[inc.category] || '📋'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{inc.title}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {inc.incident_number} · {CATEGORY_LABEL[inc.category] || inc.category}
                      </p>
                    </div>
                  </div>
                  <span className={`pill shrink-0 ${statusTone(inc.status)}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {statusLabel(inc.status)}
                  </span>
                </div>

                {/* Metadata row */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-soft">
                  {inc.location_name && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {inc.location_name}
                    </span>
                  )}
                  {inc.people_affected && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      ~{inc.people_affected} affected
                    </span>
                  )}
                  {sev && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_TONE[sev] || SEVERITY_TONE.LOW}`}>
                      {sev}
                    </span>
                  )}
                  {inc.department_name && (
                    <span className="text-ink-soft">
                      Responding: <span className="font-medium text-ink">{inc.department_name}</span>
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-soft">
                  <span>Reported {formatWhen(inc.created_at)}</span>
                  <span className="font-medium text-brand">View timeline →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
