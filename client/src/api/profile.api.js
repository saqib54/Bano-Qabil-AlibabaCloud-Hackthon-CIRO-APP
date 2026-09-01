import { apiRequest, API_BASE_URL } from './client';

/** Resolve an upload path (e.g. /uploads/avatars/x.jpg) to a full URL. */
export function resolveUploadUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith('data:')) return path;
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const profileApi = {
  /** Get current user's profile */
  get: () => apiRequest({ method: 'GET', url: '/users/profile' }),

  /** Update current user's profile */
  update: (data) => apiRequest({ method: 'PATCH', url: '/users/profile', data }),

  /** Upload a profile picture (jpg/png/webp, ≤ 2 MB) */
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return apiRequest({
      method: 'POST',
      url: '/users/profile/avatar',
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /** Save account preferences (theme, language) — follows the account */
  updatePrefs: (prefs) => apiRequest({ method: 'PATCH', url: '/users/prefs', data: { prefs } }),

  /** Accept terms & conditions once per account */
  acceptTerms: () => apiRequest({ method: 'POST', url: '/users/terms/accept' })
};
