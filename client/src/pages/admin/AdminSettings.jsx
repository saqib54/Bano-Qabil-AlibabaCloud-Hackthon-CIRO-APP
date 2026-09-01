import { useCallback, useEffect, useState } from 'react';
import { Settings, Save, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { getErrorMessage } from '../../api/client';

const SETTING_LABELS = {
  city_name: 'City Name',
  region: 'Region',
  default_radius_km: 'Default Radius (km)',
  auto_assign_threshold: 'Auto-Assign Threshold',
  ai_analysis_enabled: 'AI Analysis Enabled',
  notification_broadcast_enabled: 'Broadcast Notifications',
  map_default_lat: 'Map Default Latitude',
  map_default_lng: 'Map Default Longitude',
  map_default_zoom: 'Map Default Zoom',
  max_file_upload_mb: 'Max Upload Size (MB)',
  incident_retention_days: 'Incident Retention (days)',
  session_timeout_minutes: 'Session Timeout (min)'
};

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    adminApi.settings()
      .then((data) => {
        setSettings(data || []);
        const obj = {};
        (data || []).forEach((s) => { obj[s.key] = s.value; });
        setForm(obj);
      })
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load settings')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await adminApi.updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-brand" /> System Settings
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Configure platform-wide settings and defaults</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
      {saved && (
        <p className="rounded-lg bg-safe/10 px-3 py-2 text-xs text-safe flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Settings saved successfully
        </p>
      )}

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading settings…</div>
      ) : (
        <div className="card p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {settings.map((s) => (
              <div key={s.key}>
                <label className="label flex items-center justify-between">
                  <span>{SETTING_LABELS[s.key] || s.key.replace('_', ' ')}</span>
                  <span className="text-[9px] font-mono text-ink-soft/60">{s.key}</span>
                </label>
                <input
                  className="input"
                  value={form[s.key] || ''}
                  onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
                />
                {s.updated_at && (
                  <p className="mt-0.5 text-[9px] text-ink-soft">Updated: {s.updated_at}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
