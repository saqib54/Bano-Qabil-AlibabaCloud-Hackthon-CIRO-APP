import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, RotateCcw,
  Clock, FileText, Loader2, X, AlertTriangle
} from 'lucide-react';
import StatusPill from '../../components/common/StatusPill';
import { adminApi } from '../../api/admin.api';
import { getErrorMessage } from '../../api/client';
import {
  CATEGORY_EMOJI, CATEGORY_LABEL,
  statusLabel, statusTone
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
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const API_BASE = (window.__CIRO_API_URL__ || import.meta.env.VITE_API_URL)?.replace('/api/v1', '') || 'http://localhost:5000';

export default function ResolutionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Reject / reopen notes
  const [showReject, setShowReject] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showReopen, setShowReopen] = useState(false);
  const [reopenNotes, setReopenNotes] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminApi.resolutionDetail(id)
      .then((data) => setIncident(data))
      .catch((err) => setError(getErrorMessage(err, 'Failed to load resolution')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => {
    adminApi.resolutionDetail(id)
      .then((data) => setIncident(data))
      .catch(() => {});
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await adminApi.approveResolution(id);
      refresh();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await adminApi.rejectResolution(id, rejectNotes.trim() || undefined);
      setShowReject(false);
      setRejectNotes('');
      refresh();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const handleReopen = async () => {
    setActionLoading(true);
    try {
      await adminApi.reopenIncident(id, reopenNotes.trim() || undefined);
      setShowReopen(false);
      setReopenNotes('');
      refresh();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return <div className="card p-8 text-center text-sm text-ink-soft">Loading resolution…</div>;
  }
  if (error && !incident) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium text-danger">{error}</p>
        <button onClick={() => navigate('/admin/resolutions')} className="btn-secondary mt-4">Back</button>
      </div>
    );
  }

  const inc = incident;
  const sev = inc.verified_severity || inc.ai_recommended_severity;
  const status = inc.status;

  // Media
  const media = inc.media || [];
  const reportImages = media.filter((m) => m.kind === 'REPORT');
  const proofImages = media.filter((m) => m.kind === 'RESOLUTION');

  // Timeline
  const history = inc.status_history || [];
  const sitLogs = inc.situation_logs || [];
  const timeline = [
    ...history.map((h) => ({ ...h, _type: 'history' })),
    ...sitLogs.map((l) => ({ ...l, _type: 'sitlog' }))
  ].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/admin/resolutions')} className="mt-1 rounded-lg p-1.5 text-ink-soft transition hover:bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-ink-soft">{inc.incident_number}</p>
            <span className={`pill ${statusTone(status)}`}>
              <span className="h-1 w-1 rounded-full bg-current" />
              <span className="text-[10px]">{statusLabel(status)}</span>
            </span>
            {sev && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_TONE[sev]}`}>
                {sev}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-xl font-bold">
            {CATEGORY_EMOJI[inc.category] || '📋'} {inc.title}
          </h1>
          <p className="mt-0.5 text-xs text-ink-soft">{inc.location_name} · Reported {formatWhen(inc.created_at)}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="card flex flex-wrap gap-3 p-5">
        {status === 'RESOLUTION_SUBMITTED' && (
          <>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-xl bg-safe px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-safe/90 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve Resolution
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-danger/90 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
          </>
        )}
        {status === 'RESOLVED' && (
          <button
            onClick={() => setShowReopen(true)}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-xl bg-warn px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-warn/90 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reopen Incident
          </button>
        )}
        {status === 'ON_SCENE' && (
          <div className="flex items-center gap-2 text-sm text-warn">
            <AlertTriangle className="h-4 w-4" />
            Resolution rejected — returned to responder for rework
          </div>
        )}
        {status === 'REOPENED' && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <RotateCcw className="h-4 w-4" />
            Incident reopened — assign a new team to resolve
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left — Evidence comparison */}
        <div className="space-y-6">
          {/* Before/After comparison */}
          <div className="card p-5">
            <p className="text-sm font-semibold">Evidence Comparison</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-ink-soft">Citizen Report</p>
                {reportImages.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-line">
                    <img
                      src={`${API_BASE}${reportImages[0].file_url}`}
                      alt="Report evidence"
                      className="h-48 w-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface text-center">
                    <FileText className="h-6 w-6 text-ink-soft/50" />
                    <p className="mt-2 text-xs text-ink-soft">No report image</p>
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-ink-soft">Resolution Proof</p>
                {proofImages.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-line">
                    <img
                      src={`${API_BASE}${proofImages[0].file_url}`}
                      alt="Resolution proof"
                      className="h-48 w-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface text-center">
                    <FileText className="h-6 w-6 text-ink-soft/50" />
                    <p className="mt-2 text-xs text-ink-soft">No proof image</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resolution details */}
          <div className="card p-5">
            <p className="text-sm font-semibold">Resolution Details</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-ink-soft">Resolution Notes</dt>
                <dd className="mt-1 leading-relaxed">{inc.resolution_notes || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Resources Used</dt>
                <dd>{inc.resources_used || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Follow-up Required</dt>
                <dd className={inc.follow_up_required ? 'font-semibold text-warn' : ''}>
                  {inc.follow_up_required ? 'Yes' : 'No'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Resolved By</dt>
                <dd>{inc.resolver_name || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Category</dt>
                <dd>{CATEGORY_LABEL[inc.category] || inc.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">People Affected</dt>
                <dd>{inc.people_affected ?? '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Description */}
          {inc.description && (
            <div className="card p-5">
              <p className="text-sm font-semibold">Original Report</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{inc.description}</p>
            </div>
          )}
        </div>

        {/* Right — Timeline */}
        <div className="card p-5">
          <p className="text-sm font-semibold">Situation Timeline</p>
          <div className="mt-4 space-y-0">
            {timeline.length === 0 ? (
              <p className="text-sm text-ink-soft">No timeline entries.</p>
            ) : (
              timeline.map((entry, i) => (
                <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < timeline.length - 1 && (
                    <div className="absolute left-[11px] top-6 h-full w-px bg-line" />
                  )}
                  <div className={`relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    entry._type === 'sitlog' ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand'
                  }`}>
                    {entry._type === 'sitlog' ? (
                      <FileText className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {entry._type === 'sitlog'
                        ? entry.note
                        : entry.notes || (entry.new_status ? statusLabel(entry.new_status) : 'Status change')
                      }
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {formatWhen(entry.created_at)}
                      {entry._type === 'history' && entry.new_status && (
                        <span className={`ml-2 pill ${statusTone(entry.new_status)}`}>
                          <span className="h-1 w-1 rounded-full bg-current" />
                          <span className="text-[10px]">{statusLabel(entry.new_status)}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Reject Modal ── */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-danger">Reject Resolution</h2>
              <button onClick={() => setShowReject(false)} className="rounded-lg p-1 text-ink-soft hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              The incident will be returned to ON_SCENE status for the responder to rework.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              className="input mt-4 min-h-[80px] resize-y"
              maxLength={500}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowReject(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-danger/90 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reject Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reopen Modal ── */}
      {showReopen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-warn">Reopen Incident</h2>
              <button onClick={() => setShowReopen(false)} className="rounded-lg p-1 text-ink-soft hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              The incident will be reopened and require reassignment.
            </p>
            <textarea
              value={reopenNotes}
              onChange={(e) => setReopenNotes(e.target.value)}
              placeholder="Reason for reopening (optional)…"
              className="input mt-4 min-h-[80px] resize-y"
              maxLength={500}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowReopen(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleReopen}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-xl bg-warn px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-warn/90 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Reopen Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
