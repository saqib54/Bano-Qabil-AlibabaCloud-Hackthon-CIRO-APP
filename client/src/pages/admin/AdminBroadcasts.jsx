import { useCallback, useEffect, useState } from 'react';
import {
  Megaphone, Plus, X, Loader2, Radio,
  ShieldAlert, AlertTriangle, Clock, Power
} from 'lucide-react';
import { broadcastApi } from '../../api/notifications.api';
import { getErrorMessage } from '../../api/client';

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical', color: 'bg-danger text-white' },
  { value: 'HIGH', label: 'High', color: 'bg-warn text-white' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-brand text-white' },
  { value: 'LOW', label: 'Low', color: 'bg-surface text-ink border border-line' }
];

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'PUBLIC', label: 'Citizens only' },
  { value: 'STAFF', label: 'Responders only' }
];

const SEVERITY_STYLE = {
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

export default function AdminBroadcasts() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    severity: 'HIGH',
    targetAudience: 'ALL',
    regions: ''
  });

  const load = useCallback(() => {
    setLoading(true);
    broadcastApi.list()
      .then((data) => setBroadcasts(data || []))
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load broadcasts')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    try {
      await broadcastApi.create({
        title: form.title.trim(),
        message: form.message.trim(),
        severity: form.severity,
        targetAudience: form.targetAudience,
        regions: form.regions.trim() || undefined
      });
      setShowCreate(false);
      setForm({ title: '', message: '', severity: 'HIGH', targetAudience: 'ALL', regions: '' });
      load();
    } catch (err) {
      console.error(getErrorMessage(err));
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    try {
      await broadcastApi.deactivate(id);
      load();
    } catch (err) {
      console.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Emergency Broadcasts</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Send alerts to citizens and responders in your area
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Broadcast
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading broadcasts…</div>
      ) : broadcasts.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-ink-soft/30" />
          <p className="mt-3 text-sm font-semibold text-ink-soft">No broadcasts yet</p>
          <p className="mt-1 text-xs text-ink-soft">
            Create your first emergency broadcast to alert citizens and responders.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {broadcasts.map((b) => {
            const style = SEVERITY_STYLE[b.severity] || SEVERITY_STYLE.LOW;
            return (
              <div key={b.id} className={`card overflow-hidden ${!b.is_active ? 'opacity-60' : ''}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style}`}>
                          {b.severity}
                        </span>
                        <span className="text-[10px] text-ink-soft uppercase tracking-wide">
                          {b.target_audience || 'ALL'}
                        </span>
                        {!b.is_active && (
                          <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-ink-soft">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <h2 className="mt-2 text-base font-bold">{b.title}</h2>
                      <p className="mt-1 text-sm text-ink-soft leading-relaxed whitespace-pre-line">
                        {b.message}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-ink-soft">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatWhen(b.created_at)}
                        </span>
                        {b.regions && <span>Region: {b.regions}</span>}
                        {b.recipient_count != null && <span>Sent to {b.recipient_count} users</span>}
                      </div>
                    </div>
                    {b.is_active && (
                      <button
                        onClick={() => handleDeactivate(b.id)}
                        className="shrink-0 btn-secondary flex items-center gap-1.5 text-xs"
                        title="Deactivate broadcast"
                      >
                        <Power className="h-3.5 w-3.5" />
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create broadcast modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-brand" />
                <h2 className="text-lg font-bold">New Emergency Broadcast</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 text-ink-soft hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Flood warning for Sialkot"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input mt-1 w-full"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Message *</label>
                <textarea
                  placeholder="Describe the emergency situation and recommended actions…"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="input mt-1 w-full min-h-[100px] resize-y"
                  maxLength={1000}
                />
                <p className="mt-0.5 text-[10px] text-ink-soft text-right">{form.message.length}/1000</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">Severity</label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {SEVERITY_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setForm({ ...form, severity: s.value })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          form.severity === s.value
                            ? s.color + ' ring-2 ring-offset-1 ring-brand/30'
                            : 'bg-surface text-ink-soft hover:bg-line/30'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold">Audience</label>
                  <select
                    value={form.targetAudience}
                    onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                    className="input mt-1 w-full"
                  >
                    {AUDIENCE_OPTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">Affected Regions <span className="text-ink-soft font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Sialkot, Daska, Pasrur"
                  value={form.regions}
                  onChange={(e) => setForm({ ...form, regions: e.target.value })}
                  className="input mt-1 w-full"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-[11px] text-ink-soft">
                This will send a notification to all selected recipients.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !form.title.trim() || !form.message.trim()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                  Send Broadcast
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
