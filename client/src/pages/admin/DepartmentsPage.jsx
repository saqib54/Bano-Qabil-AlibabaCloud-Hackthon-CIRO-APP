import { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Power, Loader2, X, Users, AlertTriangle } from 'lucide-react';
import StatusPill from '../../components/common/StatusPill';
import { adminApi } from '../../api/admin.api';
import { getErrorMessage } from '../../api/client';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', contact: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.departments()
      .then((data) => setDepartments(data || []))
      .catch((err) => console.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/api/v1/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      setShowCreate(false);
      setForm({ name: '', code: '', description: '', contact: '' });
      load();
    } catch (err) {
      console.error(getErrorMessage(err));
    } finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/v1/admin/departments/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      load();
    } catch (err) {
      console.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="mt-1 text-sm text-ink-soft">{departments.length} departments registered</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Department
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => (
            <div key={d.id} className={`card p-5 transition hover:shadow-md ${!d.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-xs text-ink-soft">{d.code}</p>
                  </div>
                </div>
                <StatusPill value={d.is_active ? 'ON_DUTY' : 'OFF_DUTY'} label={d.is_active ? 'Active' : 'Inactive'} />
              </div>

              {d.description && (
                <p className="mt-3 text-sm text-ink-soft">{d.description}</p>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-surface p-2">
                  <p className="text-lg font-bold">{d.staff_count || 0}</p>
                  <p className="text-[10px] text-ink-soft">Staff</p>
                </div>
                <div className="rounded-lg bg-surface p-2">
                  <p className="text-lg font-bold text-safe">{d.on_duty_count || 0}</p>
                  <p className="text-[10px] text-ink-soft">On Duty</p>
                </div>
                <div className="rounded-lg bg-surface p-2">
                  <p className="text-lg font-bold text-warn">{d.active_incidents || 0}</p>
                  <p className="text-[10px] text-ink-soft">Active</p>
                </div>
              </div>

              {d.contact && (
                <p className="mt-3 text-xs text-ink-soft">Contact: {d.contact}</p>
              )}

              <button
                onClick={() => handleToggle(d.id)}
                className="btn-secondary mt-3 w-full flex items-center justify-center gap-2 text-xs"
              >
                <Power className="h-3.5 w-3.5" />
                {d.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">New Department</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 text-ink-soft hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input type="text" placeholder="Department Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-full" />
              <input type="text" placeholder="Code (e.g. FIRE_DEPT) *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input w-full" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input w-full min-h-[60px] resize-y" />
              <input type="text" placeholder="Contact Number" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="input w-full" />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.name.trim() || !form.code.trim()} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
