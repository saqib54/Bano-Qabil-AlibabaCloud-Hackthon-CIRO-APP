import { useCallback, useEffect, useState } from 'react';
import { Users, Search, Power, Loader2, X, UserPlus, CheckCircle2 } from 'lucide-react';
import StatusPill from '../../components/common/StatusPill';
import { adminApi } from '../../api/admin.api';
import { getErrorMessage } from '../../api/client';

const DUTY_OPTIONS = ['ON_DUTY', 'OFF_DUTY', 'DEPLOYED'];

const EMPTY_CREATE = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  departmentId: '',
  designation: ''
};

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminApi.staff(), adminApi.departments()])
      .then(([staffData, deptData]) => {
        setStaff(staffData || []);
        setDepartments(deptData || []);
      })
      .catch((err) => console.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = staff.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.department_name?.toLowerCase().includes(q) ||
      s.designation?.toLowerCase().includes(q)
    );
  });

  const onDuty = staff.filter((s) => s.duty_status === 'ON_DUTY').length;
  const offDuty = staff.filter((s) => s.duty_status === 'OFF_DUTY').length;

  const openEdit = (s) => {
    setEditModal(s);
    setEditError('');
    setEditForm({
      fullName: s.full_name || '',
      email: s.email || '',
      password: '',
      designation: s.designation || '',
      departmentId: s.department_id || '',
      dutyStatus: s.duty_status || 'OFF_DUTY'
    });
  };

  const handleSave = async () => {
    if (!editModal) return;
    setEditError('');
    if (editForm.password && editForm.password.length < 6) {
      setEditError('New password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateStaff(editModal.id, {
        fullName: editForm.fullName || undefined,
        email: editForm.email || undefined,
        password: editForm.password || undefined,
        designation: editForm.designation || undefined,
        departmentId: editForm.departmentId || null,
        dutyStatus: editForm.dutyStatus
      });
      load();
      setEditModal(null);
    } catch (err) {
      setEditError(getErrorMessage(err, 'Could not save the changes.'));
    } finally { setSaving(false); }
  };

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE);
    setCreateError('');
    setCreated(null);
    setCreateOpen(true);
  };

  const validateCreate = () => {
    const errs = {};
    if (createForm.fullName.trim().length < 3) errs.fullName = 'Name must be at least 3 characters';
    if (!/\S+@\S+\.\S+/.test(createForm.email)) errs.email = 'Enter a valid email';
    if (createForm.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!createForm.departmentId) errs.departmentId = 'Select a department';
    if (createForm.designation.trim().length < 2) errs.designation = 'Designation is required';
    return errs;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreated(null);
    const errs = validateCreate();
    if (Object.keys(errs).length > 0) {
      setCreateError(Object.values(errs)[0]);
      return;
    }
    setCreating(true);
    try {
      const result = await adminApi.createStaff({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        departmentId: createForm.departmentId,
        designation: createForm.designation.trim()
      });
      setCreated(result);
      setCreateForm(EMPTY_CREATE);
      load();
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Could not create the staff account.'));
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="mt-1 text-sm text-ink-soft">{staff.length} responders · {onDuty} on duty · {offDuty} off duty</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs sm:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Search staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <button onClick={openCreate} className="btn-primary shrink-0">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Staff</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading staff…</div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Designation</th>
                  <th className="px-4 py-3 font-semibold">Duty Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Active</th>
                  <th className="px-4 py-3 font-semibold text-center">Resolved</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-line/50 transition hover:bg-surface">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{s.full_name}</p>
                      <p className="text-xs text-ink-soft">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{s.department_name || '—'}</td>
                    <td className="px-4 py-3">{s.designation || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusPill value={s.duty_status} label={s.duty_status?.replace('_', ' ')} />
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{s.active_incidents || 0}</td>
                    <td className="px-4 py-3 text-center text-ink-soft">{s.resolved_count || 0}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(s)} className="btn-secondary text-xs py-1 px-3">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 lg:hidden">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{s.full_name}</p>
                    <p className="text-xs text-ink-soft">{s.email}</p>
                  </div>
                  <StatusPill value={s.duty_status} label={s.duty_status?.replace('_', ' ')} />
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-soft">
                  <span>{s.department_name || 'No dept'}</span>
                  <span>·</span>
                  <span>{s.designation || '—'}</span>
                  <span>·</span>
                  <span>{s.active_incidents || 0} active</span>
                </div>
                <button onClick={() => openEdit(s)} className="btn-secondary mt-3 text-xs py-1 px-3 w-full">Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create staff modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Add Staff Account</h2>
                  <p className="text-xs text-ink-soft">Create a responder account — never shown to the public</p>
                </div>
              </div>
              <button onClick={() => setCreateOpen(false)} className="rounded-lg p-1 text-ink-soft hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>

            {created ? (
              <div className="mt-6 space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-safe-soft text-safe">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-bold">{created.fullName} added</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {created.designation} · {created.department}
                  </p>
                  <div className="mt-3 rounded-xl border border-line bg-surface p-3 text-left">
                    <p className="text-xs font-medium text-ink-soft">Account credentials</p>
                    <p className="mt-1 text-sm"><span className="text-ink-soft">Email:</span> {created.email}</p>
                    <p className="text-sm"><span className="text-ink-soft">Password:</span> (as set by you)</p>
                  </div>
                  <p className="text-xs text-ink-soft">
                    The responder can now sign in via the Official Access portal.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setCreated(null); }} className="btn-secondary flex-1">Add another</button>
                  <button onClick={() => setCreateOpen(false)} className="btn-primary flex-1">Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="mt-5 space-y-4">
                {createError && (
                  <div className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
                    {createError}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Full name</label>
                    <input
                      className="input"
                      placeholder="e.g. Ahmed Khan"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="responder@ciro.gov.pk"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Phone (optional)</label>
                    <input
                      className="input"
                      type="tel"
                      placeholder="+92 3XX XXXXXXX"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Min 6 characters"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Department</label>
                    <select
                      className="input"
                      value={createForm.departmentId}
                      onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
                    >
                      <option value="">— Select department —</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Designation</label>
                    <input
                      className="input"
                      placeholder="e.g. Rescue Officer"
                      value={createForm.designation}
                      onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Create Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Edit: {editModal.full_name}</h2>
              <button onClick={() => setEditModal(null)} className="rounded-lg p-1 text-ink-soft hover:bg-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {editError && (
                <div className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
                  {editError}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="input mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="input mt-1 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold">New Password (leave blank to keep current)</label>
                <input
                  type="text"
                  placeholder="Reset password — min 6 characters"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="input mt-1 w-full"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Designation</label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className="input mt-1 w-full"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Department</label>
                <select
                  value={editForm.departmentId}
                  onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                  className="input mt-1 w-full"
                >
                  <option value="">— None —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold">Duty Status</label>
                <select
                  value={editForm.dutyStatus}
                  onChange={(e) => setEditForm({ ...editForm, dutyStatus: e.target.value })}
                  className="input mt-1 w-full"
                >
                  {DUTY_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
