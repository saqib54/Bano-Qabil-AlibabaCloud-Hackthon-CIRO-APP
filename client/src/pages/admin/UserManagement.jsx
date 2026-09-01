import { useCallback, useEffect, useState } from 'react';
import { Search, Loader2, X, UserPlus, CheckCircle2, Users, UserCheck, UserX } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { getErrorMessage } from '../../api/client';
import { resolveUploadUrl } from '../../api/profile.api';

const EMPTY_CREATE = { fullName: '', email: '', phone: '', password: '', role: 'PUBLIC' };
const ROLE_FILTERS = [
  { value: '', label: 'All accounts' },
  { value: 'PUBLIC', label: 'Citizens' },
  { value: 'STAFF', label: 'Responders' }
];

const PROVIDER_LABEL = { password: 'Email & password', google: 'Google', otp: 'Email code' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.users({})
      .then((data) => setUsers(data || []))
      .catch((err) => console.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const citizens = users.filter((u) => u.role === 'PUBLIC').length;
  const active = users.filter((u) => u.is_active).length;

  // ── Edit ──
  const openEdit = (u) => {
    setEditModal(u);
    setEditError('');
    setEditForm({
      fullName: u.full_name || '',
      email: u.email || '',
      phone: u.phone || '',
      password: '',
      isActive: Boolean(u.is_active)
    });
  };

  const handleSave = async () => {
    if (!editModal) return;
    setEditError('');
    if (!/\S+@\S+\.\S+/.test(editForm.email)) { setEditError('Enter a valid email'); return; }
    if (editForm.password && editForm.password.length < 6) {
      setEditError('New password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateUser(editModal.id, {
        fullName: editForm.fullName || undefined,
        email: editForm.email,
        phone: editForm.phone,
        password: editForm.password || undefined,
        isActive: editForm.isActive
      });
      load();
      setEditModal(null);
    } catch (err) {
      setEditError(getErrorMessage(err, 'Could not save the changes.'));
    } finally { setSaving(false); }
  };

  // ── Create ──
  const openCreate = () => {
    setCreateForm(EMPTY_CREATE);
    setCreateError('');
    setCreated(null);
    setCreateOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (createForm.fullName.trim().length < 3) { setCreateError('Name must be at least 3 characters'); return; }
    if (!/\S+@\S+\.\S+/.test(createForm.email)) { setCreateError('Enter a valid email'); return; }
    if (createForm.password.length < 6) { setCreateError('Password must be at least 6 characters'); return; }
    setCreating(true);
    try {
      const result = await adminApi.createUser({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        role: createForm.role
      });
      setCreated(result);
      setCreateForm(EMPTY_CREATE);
      load();
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Could not create the account.'));
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {users.length} accounts · {citizens} citizens · {active} active
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs sm:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <button onClick={openCreate} className="btn-primary shrink-0">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Account</span>
          </button>
        </div>
      </div>

      {/* Role filter chips */}
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setRoleFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              roleFilter === f.value
                ? 'bg-brand text-white'
                : 'border border-line bg-white text-ink-soft hover:bg-surface dark:bg-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading accounts…</div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface">
                <tr>
                  <th className="px-4 py-3 font-semibold">Account</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Sign-in Method</th>
                  <th className="px-4 py-3 font-semibold text-center">Reports</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold">Last Login</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-line/50 transition hover:bg-surface">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {resolveUploadUrl(u.avatar_url) ? (
                          <img src={resolveUploadUrl(u.avatar_url)} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                            {u.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{u.full_name}</p>
                          <p className="text-xs text-ink-soft">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.role === 'PUBLIC' ? 'bg-brand/10 text-brand' : 'bg-safe/10 text-safe'
                      }`}>
                        {u.role === 'PUBLIC' ? 'Citizen' : 'Responder'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-soft">{PROVIDER_LABEL[u.provider] || u.provider}</td>
                    <td className="px-4 py-3 text-center font-semibold">{u.reports_count || 0}</td>
                    <td className="px-4 py-3 text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-safe/10 px-2 py-0.5 text-[10px] font-bold text-safe">
                          <UserCheck className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">
                          <UserX className="h-3 w-3" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-soft">{u.last_login_at?.slice(0, 16) || 'Never'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(u)} className="btn-secondary text-xs py-1 px-3">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 lg:hidden">
            {filtered.map((u) => (
              <div key={u.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{u.full_name}</p>
                    <p className="text-xs text-ink-soft">{u.email}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    u.is_active ? 'bg-safe/10 text-safe' : 'bg-danger/10 text-danger'
                  }`}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-soft">
                  <span>{u.role === 'PUBLIC' ? 'Citizen' : 'Responder'}</span>
                  <span>·</span>
                  <span>{u.reports_count || 0} reports</span>
                  <span>·</span>
                  <span>{PROVIDER_LABEL[u.provider] || u.provider}</span>
                </div>
                <button onClick={() => openEdit(u)} className="btn-secondary mt-3 text-xs py-1 px-3 w-full">Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create account modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Add Account</h2>
                  <p className="text-xs text-ink-soft">Create a citizen or responder account</p>
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
                  <p className="mt-1 text-sm text-ink-soft">{created.email}</p>
                  <p className="mt-3 text-xs text-ink-soft">They can now sign in with the password you set.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setCreated(null); setCreateForm(EMPTY_CREATE); }} className="btn-secondary flex-1">Add another</button>
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
                      placeholder="e.g. Ayesha Malik"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="citizen@example.com"
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
                <div>
                  <label className="label">Account type</label>
                  <select
                    className="input"
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  >
                    <option value="PUBLIC">Citizen</option>
                    <option value="STAFF">Responder (no department)</option>
                  </select>
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
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input mt-1 w-full"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input mt-1 w-full"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input mt-1 w-full"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="label">New Password (leave blank to keep current)</label>
                <input
                  className="input mt-1 w-full"
                  type="text"
                  placeholder="Reset password — min 6 characters"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
              </div>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-brand" />
                  Account active
                </span>
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="h-4 w-4 accent-blue-600"
                />
              </label>
              <p className="text-[10px] text-ink-soft">
                Terms accepted: {editModal.terms_accepted_at?.slice(0, 16) || 'not yet'} · Joined {editModal.created_at?.slice(0, 10)}
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
