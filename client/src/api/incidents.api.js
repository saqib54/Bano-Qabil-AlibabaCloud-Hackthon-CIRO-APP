import api, { apiRequest, API_BASE_URL } from './client';

/** Absolute origin of the API server — used to resolve /uploads URLs. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export const incidentsApi = {
  /**
   * Submit an emergency report.
   * @param {object} fields plain form fields
   * @param {File|null} image optional photo
   */
  create: (fields, image) => {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, value);
      }
    });
    if (image) form.append('image', image);

    return apiRequest({
      method: 'POST',
      url: '/incidents',
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  mine: () => apiRequest({ method: 'GET', url: '/incidents/mine' }),

  detail: (id) => apiRequest({ method: 'GET', url: `/incidents/${id}` }),

  cancel: (id, notes) =>
    apiRequest({
      method: 'PATCH',
      url: `/incidents/${id}/status`,
      data: { status: 'CANCELLED', notes }
    })
};

/** Resolve a stored media URL (relative /uploads/... ) to an absolute URL. */
export function mediaUrl(fileUrl) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('http')) return fileUrl;
  return `${API_ORIGIN}${fileUrl}`;
}

export default api;
