import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Navigation, MapPin, Send,
  Clock, AlertTriangle, Loader2, Camera, FileText, X
} from 'lucide-react';
import StatusPill from '../../components/common/StatusPill';
import { staffApi } from '../../api/staff.api';
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

export default function StaffIncidentOps() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Situation log form
  const [logNote, setLogNote] = useState('');
  const [logImage, setLogImage] = useState(null);

  // Resolution modal
  const [showResolution, setShowResolution] = useState(false);
  const [resNotes, setResNotes] = useState('');
  const [resResources, setResResources] = useState('');
  const [resFollowUp, setResFollowUp] = useState(false);
  const [resImage, setResImage] = useState(null);
  const fileRef = useRef(null);
  const resFileRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    staffApi.detail(id)
      .then((data) => setIncident(data))
      .catch((err) => setError(getErrorMessage(err, 'Failed to load incident')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => {
    staffApi.detail(id)
      .then((data) => setIncident(data))
      .catch(() => {});
  };

  // ── Actions ──
  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await staffApi.accept(id);
      refresh();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const handleStatusUpdate = async (status) => {
    setActionLoading(true);
    try {
      await staffApi.updateStatus(id, status);
      refresh();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const handleAddLog = async () => {
    if (!logNote.trim()) return;
    setActionLoading(true);
    try {
      await staffApi.addSituationLog(id, logNote.trim(), logImage);
      setLogNote('');
      setLogImage(null);
      if (fileRef.current) fileRef.current.value = '';
      refresh();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const handleSubmitResolution = async () => {
    if (resNotes.trim().length < 10) {
      setError('Resolution notes must be at least 10 characters.');
      return;
    }
    setActionLoading(true);
    try {
      await staffApi.submitResolution(id, {
        resolutionNotes: resNotes.trim(),
        resourcesUsed: resResources.trim() || undefined,
        followUpRequired: resFollowUp
      }, resImage);
      setShowResolution(false);
      refresh();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return <div className="card p-8 text-center text-sm text-ink-soft">Loading incident…</div>;
  }
  if (error && !incident) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium text-danger">{error}</p>
        <button onClick={() => navigate('/staff/incidents')} className="btn-secondary mt-4">Back to Assignments</button>
      </div>
    );
  }

  const inc = incident;
  const sev = inc.verified_severity || inc.ai_recommended_severity;
  const status = inc.status;

  // Merge history + situation logs for timeline
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
        <button onClick={() => navigate('/staff/incidents')} className="mt-1 rounded-lg p-1.5 text-ink-soft transition hover:bg-surface">
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
        {status === 'ASSIGNED' && (
          <button onClick={handleAccept} disabled={actionLoading} className="btn-primary flex items-center gap-2">
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Accept Task
          </button>
        )}
        {status === 'ACCEPTED' && (
          <button onClick={() => handleStatusUpdate('EN_ROUTE')} disabled={actionLoading} className="btn-primary flex items-center gap-2">
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            Mark En Route
          </button>
        )}
        {status === 'EN_ROUTE' && (
          <button onClick={() => handleStatusUpdate('ON_SCENE')} disabled={actionLoading} className="btn-primary flex items-center gap-2">
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Mark On Scene
          </button>
        )}
        {status === 'ON_SCENE' && (
          <button onClick={() => setShowResolution(true)} disabled={actionLoading} className="btn-primary flex items-center gap-2">
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Resolution
          </button>
        )}
        {['RESOLUTION_SUBMITTED', 'RESOLVED'].includes(status) && (
          <div className="flex items-center gap-2 text-sm text-safe">
            <CheckCircle className="h-4 w-4" />
            Resolution submitted — awaiting admin review
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — Details + AI */}
        <div className="space-y-6 lg:col-span-1">
          {/* Incident info */}
          <div className="card p-5">
            <p className="text-sm font-semibold">Incident Details</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Category</dt>
                <dd>{CATEGORY_LABEL[inc.category] || inc.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Location</dt>
                <dd className="text-right">{inc.location_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Reported</dt>
                <dd>{formatWhen(inc.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">People affected</dt>
                <dd>{inc.people_affected ?? '—'}</dd>
              </div>
              {inc.contact_phone && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Contact</dt>
                  <dd>{inc.contact_phone}</dd>
                </div>
              )}
            </dl>
            {inc.description && (
              <div className="mt-4 rounded-xl border border-line bg-surface p-3">
                <p className="text-xs font-semibold text-ink-soft">Description</p>
                <p className="mt-1 text-sm leading-relaxed">{inc.description}</p>
              </div>
            )}
          </div>

          {/* AI Summary */}
          {inc.ai_analysis && (
            <div className="card p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-brand" />
                <p className="text-sm font-semibold">AI Analysis</p>
              </div>
              {inc.ai_analysis.summary && (
                <p className="mt-2 text-sm leading-relaxed">{inc.ai_analysis.summary}</p>
              )}
              {inc.ai_analysis.suggested_severity && (
                <p className="mt-2 text-xs text-ink-soft">
                  Suggested severity: <span className="font-semibold">{inc.ai_analysis.suggested_severity}</span>
                </p>
              )}
            </div>
          )}

          {/* Resolution info if submitted */}
          {inc.resolution_notes && (
            <div className="card p-5">
              <p className="text-sm font-semibold">Resolution Notes</p>
              <p className="mt-2 text-sm leading-relaxed">{inc.resolution_notes}</p>
              {inc.resources_used && (
                <p className="mt-2 text-xs text-ink-soft">Resources: {inc.resources_used}</p>
              )}
              {inc.follow_up_required === 1 && (
                <p className="mt-1 text-xs font-semibold text-warn">Follow-up required</p>
              )}
            </div>
          )}
        </div>

        {/* Right column — Timeline + Situation Log */}
        <div className="space-y-6 lg:col-span-2">
          {/* Situation log form (only for ON_SCENE) */}
          {status === 'ON_SCENE' && (
            <div className="card p-5">
              <p className="text-sm font-semibold">Add Situation Log</p>
              <div className="mt-3 flex flex-col gap-3">
                <textarea
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  placeholder="Describe the current situation…"
                  className="input min-h-[80px] resize-y"
                  maxLength={500}
                />
                <div className="flex items-center gap-3">
                  <label className="btn-secondary flex cursor-pointer items-center gap-2">
                    <Camera className="h-4 w-4" />
                    {logImage ? logImage.name : 'Attach Image'}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setLogImage(e.target.files?.[0] || null)}
                    />
                  </label>
                  <button
                    onClick={handleAddLog}
                    disabled={actionLoading || !logNote.trim()}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Add Log
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card p-5">
            <p className="text-sm font-semibold">Situation Timeline</p>
            <div className="mt-4 space-y-0">
              {timeline.length === 0 ? (
                <p className="text-sm text-ink-soft">No timeline entries yet.</p>
              ) : (
                timeline.map((entry, i) => (
                  <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Vertical line */}
                    {i < timeline.length - 1 && (
                      <div className="absolute left-[11px] top-6 h-full w-px bg-line" />
                    )}
                    {/* Dot */}
                    <div className={`relative mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center ${
                      entry._type === 'sitlog' ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand'
                    }`}>
                      {entry._type === 'sitlog' ? (
                        <FileText className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                    </div>
                    {/* Content */}
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
      </div>

      {/* ── Resolution Modal ── */}
      {showResolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Submit Resolution</h2>
              <button onClick={() => setShowResolution(false)} className="rounded-lg p-1 text-ink-soft hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-semibold">Resolution Notes *</label>
                <textarea
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="Describe what was done and the outcome (min 10 characters)…"
                  className="input mt-1 min-h-[100px] resize-y"
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-ink-soft">{resNotes.length}/2000</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Resources Used</label>
                <input
                  type="text"
                  value={resResources}
                  onChange={(e) => setResResources(e.target.value)}
                  placeholder="e.g. 2 fire trucks, 6 personnel, first aid kits"
                  className="input mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="followUp"
                  checked={resFollowUp}
                  onChange={(e) => setResFollowUp(e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-brand"
                />
                <label htmlFor="followUp" className="text-sm">Follow-up required</label>
              </div>
              <div>
                <label className="btn-secondary flex w-fit cursor-pointer items-center gap-2">
                  <Camera className="h-4 w-4" />
                  {resImage ? resImage.name : 'Attach Proof Image'}
                  <input
                    ref={resFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setResImage(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowResolution(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleSubmitResolution}
                disabled={actionLoading || resNotes.trim().length < 10}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
