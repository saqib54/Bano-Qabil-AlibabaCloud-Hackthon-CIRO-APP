import { useCallback, useEffect, useState } from 'react';
import { Shield, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, MapPin, Phone, Users } from 'lucide-react';
import { mapApi } from '../../api/map.api';
import { getErrorMessage } from '../../api/client';

const TYPES = ['SHELTER', 'HOSPITAL', 'FIRE_STATION', 'POLICE_STATION', 'EVACUATION_POINT', 'MEDICAL_CAMP'];
const TYPE_LABEL = {
  SHELTER: 'Shelter', HOSPITAL: 'Hospital', FIRE_STATION: 'Fire Station',
  POLICE_STATION: 'Police Station', EVACUATION_POINT: 'Evacuation Point', MEDICAL_CAMP: 'Medical Camp'
};
const EMPTY = { name: '', type: 'SHELTER', address: '', latitude: '', longitude: '', capacity: '', contact: '' };

export default function AdminShelters() {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | shelter object
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    mapApi.shelters()
      .then((data) => setShelters(data || []))
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load shelters')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY);
    setError('');
    setModal('create');
  }

  function openEdit(s) {
    setForm({
      name: s.name, type: s.type, address: s.address || '',
      latitude: String(s.latitude), longitude: String(s.longitude),
      capacity: s.capacity ? String(s.capacity) : '', contact: s.contact || ''
    });
    setError('');
    setModal(s);
  }

  function close() { setModal(null); }

  async function handleSave() {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!form.name || isNaN(lat) || isNaN(lng)) {
      setError('Name, latitude, and longitude are required');
      return;
    }
    const payload = {
      name: form.name, type: form.type, address: form.address || null,
      latitude: lat, longitude: lng,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      contact: form.contact || null
    };
    setSaving(true);
    setError('');
    try {
      if (modal === 'create') {
        await mapApi.createShelter(payload);
      } else {
        await mapApi.updateShelter(modal.id, payload);
      }
      close();
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save shelter'));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id) {
    try { await mapApi.toggleShelter(id); load(); }
    catch (err) { console.error(getErrorMessage(err, 'Toggle failed')); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this shelter permanently?')) return;
    try { await mapApi.deleteShelter(id); load(); }
    catch (err) { console.error(getErrorMessage(err, 'Delete failed')); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-safe" /> Shelters & Safe Places
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Manage emergency shelters and safe locations</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="h-4 w-4" /> Add Shelter
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading shelters…</div>
      ) : shelters.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield className="mx-auto h-10 w-10 text-safe/30" />
          <p className="mt-3 text-sm font-semibold">No shelters configured</p>
          <p className="mt-1 text-xs text-ink-soft">Add your first shelter or safe place</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface border-b border-line">
                  <th className="px-5 py-3 text-left font-semibold">Name</th>
                  <th className="px-5 py-3 text-left font-semibold">Type</th>
                  <th className="px-5 py-3 text-left font-semibold">Address</th>
                  <th className="px-5 py-3 text-center font-semibold">Capacity</th>
                  <th className="px-5 py-3 text-center font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shelters.map((s) => (
                  <tr key={s.id} className="border-t border-line hover:bg-surface/50">
                    <td className="px-5 py-3 font-medium">{s.name}</td>
                    <td className="px-5 py-3 text-ink-soft">{TYPE_LABEL[s.type] || s.type}</td>
                    <td className="px-5 py-3 text-ink-soft max-w-[200px] truncate">{s.address || '—'}</td>
                    <td className="px-5 py-3 text-center">{s.capacity || '—'}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        s.is_active ? 'bg-safe/10 text-safe' : 'bg-ink-soft/10 text-ink-soft'
                      }`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-ink-soft hover:bg-line" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleToggle(s.id)} className="rounded-lg p-1.5 text-ink-soft hover:bg-line" title="Toggle">
                          {s.is_active ? <ToggleRight className="h-3.5 w-3.5 text-safe" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="rounded-lg p-1.5 text-danger hover:bg-danger/10" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-bold">{modal === 'create' ? 'Add Shelter' : 'Edit Shelter'}</h2>
              <button onClick={close} className="rounded-lg p-1 hover:bg-line"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Name</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input className="input" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="label">Address</label>
                  <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <label className="label">Latitude</label>
                  <input className="input" type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                </div>
                <div>
                  <label className="label">Longitude</label>
                  <input className="input" type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="label">Contact</label>
                  <input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
              <button onClick={close} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
