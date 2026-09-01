import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Brain, CheckCircle2, Shield, AlertTriangle, Tag,
  Zap, MapPin, Users, Phone, Clock, RefreshCw, Building2, UserCheck
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { getErrorMessage } from '../../api/client';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  STATUS_META,
  statusLabel,
  statusTone
} from '../../constants/incidents';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const SEVERITY_TONE = {
  CRITICAL: 'bg-danger-soft text-danger border-danger/30',
  HIGH: 'bg-warn-soft text-warn border-warn/30',
  MEDIUM: 'bg-brand-soft text-brand border-brand/30',
  LOW: 'bg-surface text-ink-soft border-line'
};

function confidenceLabel(val) {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') {
    if (val >= 0.8) return 'HIGH';
    if (val >= 0.5) return 'MEDIUM';
    return 'LOW';
  }
  return '—';
}

function confidenceColor(val) {
  const label = confidenceLabel(val);
  if (label === 'HIGH') return 'text-safe';
  if (label === 'MEDIUM') return 'text-warn';
  return 'text-danger';
}

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function safeJson(val, fallback) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function AdminIncidentDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Verify controls
  const [verifySeverity, setVerifySeverity] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Assign controls
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [assignDept, setAssignDept] = useState('');
  const [assignStaff, setAssignStaff] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Reanalyze
  const [reanalyzing, setReanalyzing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .incidentDetail(id)
      .then((data) => {
        setIncident(data);
        // Pre-fill verify severity from AI or existing
        const sev = data.verified_severity || data.ai_recommended_severity || '';
        setVerifySeverity(sev);
        if (data.assigned_department_id) setAssignDept(data.assigned_department_id);
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load incident')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminApi.departments().then(setDepartments).catch(() => {});
    adminApi.staff().then(setStaffList).catch(() => {});
  }, []);

  // Filter staff by selected department
  const deptStaff = assignDept
    ? staffList.filter((s) => s.department_id === assignDept)
    : staffList;

  async function handleVerify() {
    if (!verifySeverity) return;
    setVerifying(true);
    try {
      await adminApi.verify(id, verifySeverity, verifyNotes || undefined);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Verification failed'));
    } finally {
      setVerifying(false);
    }
  }

  async function handleAssign() {
    if (!assignDept) return;
    setAssigning(true);
    try {
      await adminApi.assign(id, assignDept, assignStaff || null, assignNotes || undefined);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Assignment failed'));
    } finally {
      setAssigning(false);
    }
  }

  async function handleReanalyze() {
    setReanalyzing(true);
    try {
      await adminApi.reanalyze(id);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Re-analysis failed'));
    } finally {
      setReanalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16 text-sm text-ink-soft">
        Loading incident intelligence…
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="space-y-4">
        <Link to="/admin/incidents" className="btn-secondary w-fit">← Back to Queue</Link>
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm font-medium text-danger">
          {error}
        </div>
      </div>
    );
  }

  const ai = incident?.ai_analysis;
  const sev = incident.verified_severity || incident.ai_recommended_severity || null;
  const history = [...(incident.history || [])].reverse();
  const riskTags = safeJson(ai?.risk_tags, []);
  const recActions = safeJson(ai?.recommended_actions, []);
  const canVerify = ['REPORTED', 'AI_ANALYZED', 'UNDER_REVIEW', 'VERIFIED', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE'].includes(incident.status);
  const canAssign = ['VERIFIED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE'].includes(incident.status);

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link to="/admin/incidents" className="btn-secondary w-fit">
        <ArrowLeft className="h-4 w-4" /> Incident Queue
      </Link>

      {error && incident && (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      {/* Header banner */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{CATEGORY_EMOJI[incident.category] || '📋'}</span>
            <div>
              <h1 className="text-lg font-bold text-ink">{incident.title}</h1>
              <p className="text-xs text-ink-soft">
                {incident.incident_number} · {CATEGORY_LABEL[incident.category] || incident.category} · Reported by {incident.reporter_name || 'Citizen'}
              </p>
              <p className="mt-1 text-xs text-ink-soft flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> {formatWhen(incident.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sev && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${SEVERITY_TONE[sev] || ''}`}>
                {sev}
              </span>
            )}
            <span className={`pill ${statusTone(incident.status)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel(incident.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Main content (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI Risk Assessment Panel (§21) */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-brand-soft/40 px-5 py-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-brand" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-brand">AI Risk Assessment</h2>
              </div>
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-white px-2.5 py-1 text-xs font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${reanalyzing ? 'animate-spin' : ''}`} />
                {reanalyzing ? 'Analyzing…' : 'Re-analyze'}
              </button>
            </div>

            {ai && ai.status === 'COMPLETED' ? (
              <div className="space-y-4 p-5">
                {/* AI Summary */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1">Summary</p>
                  <p className="text-sm leading-relaxed text-ink">{ai.ai_summary}</p>
                </div>

                {/* AI Metrics Row */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-surface px-3 py-2">
                    <p className="text-xs text-ink-soft">Recommended Severity</p>
                    <p className="mt-0.5 text-sm font-bold">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] uppercase ${SEVERITY_TONE[ai.recommended_severity] || ''}`}>
                        {ai.recommended_severity}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface px-3 py-2">
                    <p className="text-xs text-ink-soft">Confidence</p>
                    <p className={`mt-0.5 text-sm font-bold ${confidenceColor(ai.confidence)}`}>
                      {confidenceLabel(ai.confidence)}
                      {typeof ai.confidence === 'number' && (
                        <span className="ml-1 text-xs font-normal text-ink-soft">({Math.round(ai.confidence * 100)}%)</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface px-3 py-2">
                    <p className="text-xs text-ink-soft">Department</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">
                      {ai.recommended_department || '—'}
                    </p>
                  </div>
                </div>

                {/* Risk Tags */}
                {riskTags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2 flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Risk Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {riskTags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Actions */}
                {recActions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Recommended Actions
                    </p>
                    <ol className="space-y-1.5">
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

                {/* AI Reasoning */}
                {ai.reasoning_summary && (
                  <div className="rounded-xl border border-line bg-surface px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1">AI Reasoning</p>
                    <p className="text-xs leading-relaxed text-ink-soft">{ai.reasoning_summary}</p>
                  </div>
                )}

                <p className="text-[10px] text-ink-soft/60">
                  Model: {ai.model_name || 'qwen-plus'} · Analyzed {formatWhen(ai.created_at)}
                </p>
              </div>
            ) : ai && ai.status === 'FAILED' ? (
              <div className="p-5">
                <div className="flex items-start gap-3 rounded-xl bg-danger-soft p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-danger" />
                  <div>
                    <p className="text-sm font-semibold text-danger">AI Analysis Failed</p>
                    <p className="mt-1 text-xs text-ink-soft">{ai.error_message || 'Unknown error. Click Re-analyze to retry.'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                <Brain className="h-6 w-6 text-ink-soft/40" />
                <p className="text-sm font-medium text-ink-soft">No AI analysis available</p>
                <p className="text-xs text-ink-soft">Click Re-analyze to trigger AI assessment.</p>
              </div>
            )}
          </section>

          {/* Incident Description */}
          <section className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Incident Description</h2>
            <p className="text-sm leading-relaxed text-ink">{incident.description}</p>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-surface px-3 py-2">
                <p className="text-xs text-ink-soft">Location</p>
                <p className="font-medium text-ink flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-ink-soft" />
                  {incident.location_name || `${incident.latitude}, ${incident.longitude}`}
                </p>
              </div>
              <div className="rounded-xl bg-surface px-3 py-2">
                <p className="text-xs text-ink-soft">People affected</p>
                <p className="font-medium text-ink flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-ink-soft" />
                  {incident.people_affected ? `~${incident.people_affected}` : 'Not specified'}
                </p>
              </div>
              {incident.contact_phone && (
                <div className="rounded-xl bg-surface px-3 py-2">
                  <p className="text-xs text-ink-soft">Contact number</p>
                  <p className="font-medium text-ink flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-ink-soft" />
                    {incident.contact_phone}
                  </p>
                </div>
              )}
              {incident.department_name && (
                <div className="rounded-xl bg-surface px-3 py-2">
                  <p className="text-xs text-ink-soft">Assigned department</p>
                  <p className="font-medium text-ink flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-ink-soft" />
                    {incident.department_name}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Timeline */}
          <section className="card space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Incident Timeline</h2>
            {history.length > 0 ? (
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
            ) : (
              <p className="text-sm text-ink-soft">No history available.</p>
            )}
          </section>
        </div>

        {/* Right sidebar (1 col) — Admin Actions */}
        <div className="space-y-6">
          {/* Verify / Severity Override */}
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wide">Verify & Severity</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Severity level</label>
                <select
                  className="input"
                  value={verifySeverity}
                  onChange={(e) => setVerifySeverity(e.target.value)}
                >
                  <option value="">Select severity…</option>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Admin notes</label>
                <textarea
                  className="input min-h-[60px] resize-y"
                  placeholder="Optional verification notes…"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  maxLength={500}
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={!verifySeverity || verifying || !canVerify}
                className="btn-primary w-full"
              >
                <CheckCircle2 className="h-4 w-4" />
                {verifying ? 'Verifying…' : 'Verify Incident'}
              </button>
              {!canVerify && (
                <p className="text-xs text-ink-soft">This incident status doesn't allow re-verification.</p>
              )}
            </div>
          </section>

          {/* Department Assignment */}
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wide">Assign Responder</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Department</label>
                <select
                  className="input"
                  value={assignDept}
                  onChange={(e) => { setAssignDept(e.target.value); setAssignStaff(''); }}
                >
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Staff member (optional)</label>
                <select
                  className="input"
                  value={assignStaff}
                  onChange={(e) => setAssignStaff(e.target.value)}
                  disabled={!assignDept}
                >
                  <option value="">Any available responder</option>
                  {deptStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} — {s.designation || 'Responder'} ({s.duty_status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Assignment notes</label>
                <textarea
                  className="input min-h-[60px] resize-y"
                  placeholder="Deployment instructions…"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  maxLength={500}
                />
              </div>
              <button
                onClick={handleAssign}
                disabled={!assignDept || assigning || !canAssign}
                className="btn-primary w-full"
              >
                <Building2 className="h-4 w-4" />
                {assigning ? 'Assigning…' : 'Assign Department'}
              </button>
              {!canAssign && (
                <p className="text-xs text-ink-soft">Verify the incident first before assigning.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
