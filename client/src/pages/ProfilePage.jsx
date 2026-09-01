import { useCallback, useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, Shield, Building, Clock, Save, Loader2, CheckCircle2, Camera, ImageUp, Trash2 } from 'lucide-react';
import { profileApi, resolveUploadUrl } from '../api/profile.api';
import { useAuthStore } from '../store/auth.store';
import { getErrorMessage } from '../api/client';
import CameraCapture from '../components/common/CameraCapture';

const ROLE_LABEL = { PUBLIC: 'Citizen', STAFF: 'Responder', ADMIN: 'Administrator' };
const ROLE_COLOR = { PUBLIC: 'bg-brand text-white', STAFF: 'bg-safe text-white', ADMIN: 'bg-danger text-white' };
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullName: '', phone: '' });

  // Profile picture state
  const fileInputRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    profileApi.get()
      .then((data) => {
        setProfile(data);
        setForm({ fullName: data.full_name || '', phone: data.phone || '' });
      })
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load profile')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Apply the new profile locally + in the global auth store (sidebar avatar). */
  function applyProfile(updated) {
    setProfile(updated);
    if (user && updated?.id === user.id) {
      useAuthStore.setState((s) => ({ user: { ...s.user, ...updated } }));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await profileApi.update({ fullName: form.fullName, phone: form.phone });
      applyProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Profile photo must be an image (jpg, png or webp)');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Photo too large — maximum size is 2 MB');
      return;
    }
    setError('');
    setUploadingAvatar(true);
    try {
      const updated = await profileApi.uploadAvatar(file);
      applyProfile(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload the photo'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    setError('');
    setUploadingAvatar(true);
    try {
      const updated = await profileApi.update({ avatarUrl: '' });
      applyProfile(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to remove the photo'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) {
    return <div className="card p-8 text-center text-sm text-ink-soft">Loading profile…</div>;
  }

  const sp = profile?.staff_profile;
  const avatarSrc = resolveUploadUrl(profile?.avatar_url);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6 text-brand" /> My Profile
        </h1>
        <p className="mt-1 text-sm text-ink-soft">View and manage your account information</p>
      </div>

      {/* Profile header card */}
      <div className="card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={profile?.full_name}
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-brand/20"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <span className="text-2xl font-extrabold">{profile?.full_name?.charAt(0) || <User className="h-8 w-8" />}</span>
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-1 text-[10px] font-bold text-brand transition hover:bg-brand/20"
                title="Take a photo with the camera"
              >
                <Camera className="h-3 w-3" /> Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-1 text-[10px] font-bold text-brand transition hover:bg-brand/20"
                title="Upload from gallery"
              >
                <ImageUp className="h-3 w-3" /> Upload
              </button>
              {avatarSrc && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="flex items-center gap-1 rounded-lg bg-danger/10 px-2 py-1 text-[10px] font-bold text-danger transition hover:bg-danger/20"
                  title="Remove photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                uploadAvatar(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold">{profile?.full_name}</h2>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${ROLE_COLOR[profile?.role] || 'bg-line text-ink-soft'}`}>
                {ROLE_LABEL[profile?.role] || profile?.role}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{profile?.email}</span>
              {profile?.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{profile.phone}</span>}
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />{profile?.role}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Member since {profile?.created_at?.slice(0, 10)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff info (only for STAFF users) */}
      {sp && (
        <div className="card p-6">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
            <Building className="h-4 w-4 text-safe" /> Staff Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase text-ink-soft">Department</p>
              <p className="mt-0.5 font-medium">{sp.department_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-ink-soft">Designation</p>
              <p className="mt-0.5 font-medium">{sp.designation || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-ink-soft">Duty Status</p>
              <p className="mt-0.5">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  sp.duty_status === 'ON_DUTY' ? 'bg-safe/10 text-safe' :
                  sp.duty_status === 'DEPLOYED' ? 'bg-brand/10 text-brand' : 'bg-ink-soft/10 text-ink-soft'
                }`}>
                  {sp.duty_status?.replace('_', ' ')}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-ink-soft">Location Updated</p>
              <p className="mt-0.5 font-medium text-xs">{sp.location_updated_at?.slice(0, 16) || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit profile form */}
      <div className="card p-6">
        <h3 className="text-sm font-bold mb-4">Edit Profile</h3>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger mb-4">{error}</p>}
        {saved && (
          <p className="rounded-lg bg-safe/10 px-3 py-2 text-xs text-safe mb-4 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Profile updated successfully
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-surface text-ink-soft" value={profile?.email || ''} disabled />
            <p className="mt-1 text-[10px] text-ink-soft">Email changes are handled by an administrator</p>
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 3xx xxxxxxx" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Account info footer */}
      <div className="card p-4 text-xs text-ink-soft">
        <p><span className="font-semibold text-ink">Account ID:</span> {profile?.id}</p>
        <p className="mt-1"><span className="font-semibold text-ink">Last login:</span> {profile?.last_login_at || 'N/A'}</p>
      </div>

      {/* Live camera capture for profile picture */}
      {cameraOpen && (
        <CameraCapture
          onCapture={(file) => {
            setCameraOpen(false);
            uploadAvatar(file);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
