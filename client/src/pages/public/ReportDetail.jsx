import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MapPin, Users, Phone, Brain, Tag, Zap, Bot, ShieldCheck, AlertTriangle,
  Copy, Gauge, CheckCircle2, Flag, Info, Siren, Radio, Truck
} from 'lucide-react';
import { incidentsApi, mediaUrl } from '../../api/incidents.api';
import { verificationApi } from '../../api/verification.api';
import { useRealtime } from '../../hooks/useRealtime';
import { getErrorMessage } from '../../api/client';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  STATUS_HINT,
  statusLabel,
  statusTone
} from '../../constants/incidents';

const CANCELLABLE = ['REPORTED', 'VERIFIED'];

/** Ordered workflow steps for the citizen-facing progress tracker (§26). */
const WORKFLOW_STEPS = [
  { status: 'REPORTED', label: 'Report Submitted' },
  { status: 'AI_ANALYZED', label: 'AI Analysis Complete', fallback: 'UNDER_REVIEW' },
  { status: 'VERIFIED', label: 'Verified by Command Center', fallback: 'UNDER_REVIEW' },
  { status: 'ASSIGNED', label: 'Responder Assigned' },
  { status: 'EN_ROUTE', label: 'Responder En Route', fallback: 'ACCEPTED' },
  { status: 'ON_SCENE', label: 'Responder On Scene' },
  { status: 'RESOLUTION_SUBMITTED', label: 'Resolution Submitted' },
  { status: 'RESOLVED', label: 'Resolved' }
];

const SEVERITY_TONE = {
  CRITICAL: 'bg-danger-soft text-danger border-danger/30',
  HIGH: 'bg-warn-soft text-warn border-warn/30',
  MEDIUM: 'bg-brand-soft text-brand border-brand/30',
  LOW: 'bg-surface text-ink-soft border-line'
};

/** Rapid Intelligence Grid verdict presentation (§69). */
const VERDICT_META = {
  AUTO_VERIFIED: { label: 'AI-VERIFIED', Icon: ShieldCheck, tone: 'bg-safe-soft text-safe border-safe/40' },
  NEEDS_REVIEW: { label: 'NEEDS REVIEW', Icon: AlertTriangle, tone: 'bg-warn-soft text-warn border-warn/40' },
  SUSPECTED_DUPLICATE: { label: 'POSSIBLE DUPLICATE', Icon: Copy, tone: 'bg-danger-soft text-danger border-danger/40' },
  LOW_CONFIDENCE: { label: 'LOW CONFIDENCE', Icon: Gauge, tone: 'bg-surface text-ink-soft border-line' }
};

/** Per-agent stage status presentation. */
const STAGE_STATUS = {
  PASS: { Icon: CheckCircle2, tone: 'bg-safe text-white' },
  FLAG: { Icon: Flag, tone: 'bg-warn text-white' },
  INFO: { Icon: Info, tone: 'bg-brand text-white' }
};

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Determine the index of the current step in the workflow.
 * Handles fallbacks: e.g. if status is UNDER_REVIEW, it counts as step 1
 * (between REPORTED and VERIFIED).
 */
function getCurrentStepIndex(currentStatus, history) {
  // Build a set of all statuses that have been reached
  const reached = new Set();
  if (history) {
    history.forEach((h) => reached.add(h.new_status));
  }
  reached.add(currentStatus);

  // Terminal states
  if (currentStatus === 'REJECTED') return -1;
  if (currentStatus === 'DUPLICATE') return -1;
  if (currentStatus === 'CANCELLED') return -1;
  if (currentStatus === 'REOPENED') return WORKFLOW_STEPS.length - 1; // Show as last active

  let lastIdx = -1;
  for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
    const step = WORKFLOW_STEPS[i];
    if (reached.has(step.status) || (step.fallback && reached.has(step.fallback))) {
      lastIdx = i;
    }
  }
  return lastIdx;
}

export default function ReportDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState(null);

  // Automatic citizen updates — "Report received", "Team dispatched", ETA (§71)
  useRealtime({
    'incident.update': (event) => {
      if (event.incidentId !== id) return;
      setLiveUpdate(event);
      load(); // refresh status/team from the server after the push
    }
  });

  const load = useCallback(() => {
    incidentsApi
      .detail(id)
      .then(setIncident)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load this report')));
  }, [id]);

  useEffect(() => {
    load();

    // Rapid Intelligence Grid — poll until the pipeline trace lands (usually < 2s)
    let cancelled = false;
    let timer = null;
    const pollVerification = (attempt) => {
      verificationApi
        .incidentVerification(id)
        .then((data) => {
          if (cancelled) return;
          setVerification(data);
          if (!data && attempt < 6) {
            timer = setTimeout(() => pollVerification(attempt + 1), 1500);
          }
        })
        .catch(() => {});
    };
    pollVerification(0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, load]);

  async function onCancel() {
    if (!window.confirm('Cancel this emergency report? Only do this if the situation is no longer real.')) return;
    setCancelling(true);
    try {
      await incidentsApi.cancel(id, 'Cancelled by reporter');
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not cancel this report'));
    } finally {
      setCancelling(false);
    }
  }

  if (error && !incident) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/public/incidents" className="btn-secondary w-fit">← Back to My Reports</Link>
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm font-medium text-danger">
          {error}
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card flex items-center justify-center py-16 text-sm text-ink-soft">
          Loading report…
        </div>
      </div>
    );
  }

  const reportMedia = (incident.media || []).filter((m) => m.kind === 'REPORT');
  const history = [...(incident.history || [])].reverse();
  const sev = incident.verified_severity || incident.ai_recommended_severity || null;
  const ai = incident.ai_analysis;
  const riskTags = ai?.risk_tags ? (Array.isArray(ai.risk_tags) ? ai.risk_tags : (() => { try { return JSON.parse(ai.risk_tags); } catch { return []; } })()) : [];
  const recActions = ai?.recommended_actions ? (Array.isArray(ai.recommended_actions) ? ai.recommended_actions : (() => { try { return JSON.parse(ai.recommended_actions); } catch { return []; } })()) : [];
  const currentStepIdx = getCurrentStepIndex(incident.status, incident.history);
  const isTerminal = ['REJECTED', 'DUPLICATE', 'CANCELLED'].includes(incident.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link to="/public/incidents" className="btn-secondary">← My Reports</Link>
        {CANCELLABLE.includes(incident.status) && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="rounded-xl border border-danger/40 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger-soft disabled:opacity-60"
          >
            {cancelling ? 'Cancelling…' : 'Cancel Report'}
          </button>
        )}
      </div>

      {error && incident && (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      {/* Current status banner */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{CATEGORY_EMOJI[incident.category] || '📋'}</span>
            <div>
              <h1 className="text-lg font-bold text-ink">{incident.title}</h1>
              <p className="text-xs text-ink-soft">
                {incident.incident_number} · {CATEGORY_LABEL[incident.category] || incident.category} · Reported {formatWhen(incident.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sev && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${SEVERITY_TONE[sev] || SEVERITY_TONE.LOW}`}>
                {sev}
              </span>
            )}
            <span className={`pill ${statusTone(incident.status)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel(incident.status)}
            </span>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-ink-soft">
          {STATUS_HINT[incident.status] || 'Status update received.'}
        </p>
      </div>

      {/* Live dispatch update — pushed over WebSocket the moment AI/dispatch acts */}
      {(liveUpdate || incident.ai_suggested_team) && (
        <section className={`rounded-2xl border p-4 shadow-card ${
          incident.status === 'VERIFIED' || liveUpdate?.message?.startsWith('Dispatch approved')
            ? 'border-safe/40 bg-safe-soft'
            : 'border-brand/30 bg-brand-soft/40'
        }`}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <Truck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-brand">Live Response Update</p>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-safe" />
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-ink">
                {liveUpdate?.message || `Suggested response team: ${incident.ai_suggested_team}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                {(liveUpdate?.suggestedTeam || incident.ai_suggested_team) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-ink">
                    <Siren className="h-3 w-3 text-brand" />
                    {liveUpdate?.suggestedTeam || incident.ai_suggested_team}
                  </span>
                )}
                {(liveUpdate?.etaMinutes || incident.ai_eta_minutes) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-ink">
                    <Radio className="h-3 w-3 text-safe" />
                    ETA ~{liveUpdate?.etaMinutes || incident.ai_eta_minutes} min
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Workflow Progress Tracker (§26) */}
      {!isTerminal && currentStepIdx >= 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft mb-4">
            Progress
          </h2>
          <div className="flex items-center gap-1">
            {WORKFLOW_STEPS.map((step, i) => {
              const isDone = i < currentStepIdx;
              const isCurrent = i === currentStepIdx;
              return (
                <div key={step.status} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isDone ? 'bg-safe text-white' :
                    isCurrent ? 'bg-brand text-white ring-4 ring-brand/20' :
                    'bg-surface text-ink-soft border border-line'
                  }`}>
                    {isDone ? '✓' : isCurrent ? '●' : '○'}
                  </div>
                  <span className={`text-[9px] text-center leading-tight ${
                    isDone ? 'text-safe font-semibold' :
                    isCurrent ? 'text-brand font-semibold' :
                    'text-ink-soft'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* AI Analysis (visible to citizen once available) */}
      {ai && ai.status === 'COMPLETED' && (
        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-brand-soft/30 px-5 py-3">
            <Brain className="h-4 w-4 text-brand" />
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand">AI Analysis</h2>
          </div>
          <div className="space-y-3 p-5">
            <p className="text-sm leading-relaxed text-ink">{ai.ai_summary}</p>

            <div className="grid gap-2 sm:grid-cols-2">
              {ai.confidence && (
                <div className="rounded-xl bg-surface px-3 py-2 text-sm">
                  <p className="text-xs text-ink-soft">AI Confidence</p>
                  <p className={`font-bold ${
                    (typeof ai.confidence === 'number' ? ai.confidence >= 0.8 : ai.confidence === 'HIGH') ? 'text-safe' :
                    (typeof ai.confidence === 'number' ? ai.confidence >= 0.5 : ai.confidence === 'MEDIUM') ? 'text-warn' : 'text-danger'
                  }`}>
                    {typeof ai.confidence === 'number'
                      ? `${ai.confidence >= 0.8 ? 'HIGH' : ai.confidence >= 0.5 ? 'MEDIUM' : 'LOW'} (${Math.round(ai.confidence * 100)}%)`
                      : ai.confidence}
                  </p>
                </div>
              )}
              {ai.recommended_department && (
                <div className="rounded-xl bg-surface px-3 py-2 text-sm">
                  <p className="text-xs text-ink-soft">Recommended Department</p>
                  <p className="font-semibold text-ink">{ai.recommended_department}</p>
                </div>
              )}
            </div>

            {riskTags.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1.5 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Risk Factors
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {riskTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recActions.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1.5 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Safety Recommendations
                </p>
                <ol className="space-y-1">
                  {recActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">
                        {i + 1}
                      </span>
                      {action}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Rapid Intelligence Grid — AI verification pipeline trace (§69) */}
      {verification && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-brand-soft/30 px-5 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-brand" />
              <h2 className="text-xs font-bold uppercase tracking-wide text-brand">AI Verification Pipeline</h2>
            </div>
            <span className="text-[10px] font-medium text-ink-soft">
              {verification.model} · verified in{' '}
              <span className="font-bold text-ink">{(verification.duration_ms / 1000).toFixed(1)}s</span>
            </span>
          </div>

          <div className="space-y-4 p-5">
            {/* Verdict + confidence meter */}
            <div className="flex flex-wrap items-center gap-3">
              {(() => {
                const meta = VERDICT_META[verification.verdict] || VERDICT_META.LOW_CONFIDENCE;
                return (
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${meta.tone}`}>
                    <meta.Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </span>
                );
              })()}
              <div className="flex min-w-[150px] flex-1 items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      verification.confidence >= 70 ? 'bg-safe' :
                      verification.confidence >= 45 ? 'bg-warn' : 'bg-danger'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, verification.confidence))}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-ink">{verification.confidence}% confidence</span>
              </div>
            </div>

            {/* Auto-alert confirmation */}
            {verification.auto_alerted && (
              <div className="flex items-start gap-2 rounded-xl border border-safe/30 bg-safe-soft px-3 py-2.5">
                <Siren className="mt-0.5 h-4 w-4 shrink-0 text-safe" />
                <p className="text-xs font-semibold text-safe">
                  The public was alerted automatically within seconds of this report.
                </p>
              </div>
            )}

            {/* Agent execution trace */}
            <ol className="space-y-2">
              {(verification.stages || []).map((stage, i) => {
                const status = STAGE_STATUS[stage.status] || STAGE_STATUS.INFO;
                return (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2.5">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${status.tone}`}>
                      <status.Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold text-ink">{stage.agent}</p>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">{stage.role}</span>
                        {typeof stage.durationMs === 'number' && (
                          <span className="ml-auto text-[10px] font-medium text-ink-soft">{stage.durationMs}ms</span>
                        )}
                      </div>
                      {stage.findings?.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {stage.findings.map((finding, j) => (
                            <li key={j} className="text-xs leading-relaxed text-ink-soft">• {finding}</li>
                          ))}
                        </ul>
                      )}
                      {stage.corroboratingCount > 0 && (
                        <p className="mt-1 text-[11px] font-semibold text-warn">
                          {stage.corroboratingCount} nearby report{stage.corroboratingCount > 1 ? 's' : ''} corroborate this incident
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* Report details */}
      <section className="card space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Report details</h2>
        <p className="text-sm leading-relaxed text-ink">{incident.description}</p>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-surface px-3 py-2">
            <p className="text-xs text-ink-soft">Location</p>
            <p className="font-medium text-ink flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-ink-soft" />
              {incident.location_name || `${incident.latitude}, ${incident.longitude}`}
            </p>
            <p className="text-xs text-ink-soft">{incident.latitude}, {incident.longitude}</p>
          </div>
          <div className="rounded-xl bg-surface px-3 py-2">
            <p className="text-xs text-ink-soft">People affected</p>
            <p className="font-medium text-ink flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-ink-soft" />
              {incident.people_affected ? `~${incident.people_affected}` : 'Not specified'}
            </p>
            {incident.department_name && (
              <p className="mt-1 text-xs text-ink-soft">Responding: <span className="font-medium text-ink">{incident.department_name}</span></p>
            )}
          </div>
        </div>
        {incident.contact_phone && (
          <div className="rounded-xl bg-surface px-3 py-2 text-sm">
            <p className="text-xs text-ink-soft">Contact number</p>
            <p className="font-medium text-ink flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-ink-soft" />
              {incident.contact_phone}
            </p>
          </div>
        )}
      </section>

      {/* Evidence */}
      {reportMedia.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Photo evidence</h2>
          <div className="flex flex-wrap gap-3">
            {reportMedia.map((m) => (
              <a key={m.id} href={mediaUrl(m.file_url)} target="_blank" rel="noreferrer">
                <img
                  src={mediaUrl(m.file_url)}
                  alt="Report evidence"
                  className="h-32 w-44 rounded-xl border border-line object-cover transition hover:opacity-90"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Incident timeline</h2>
        <ol className="relative space-y-5 border-l-2 border-line pl-5">
          {history.map((h) => (
            <li key={h.id} className="relative">
              <span
                className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${
                  h.new_status === incident.status ? 'bg-brand' : 'bg-line'
                }`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className={`pill ${statusTone(h.new_status)}`}>
                  {statusLabel(h.new_status)}
                </span>
                <span className="text-xs text-ink-soft">{formatWhen(h.created_at)}</span>
              </div>
              {h.notes && <p className="mt-1 text-sm text-ink">{h.notes}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
