import { apiRequest } from './client';

export const staffApi = {
  /** Staff KPIs — assigned, en-route, on-scene, completed today */
  kpis: () => apiRequest({ method: 'GET', url: '/staff/kpi' }),

  /** List of incidents assigned to this staff member */
  assignments: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    const query = qs.toString();
    return apiRequest({ method: 'GET', url: `/staff/assignments${query ? `?${query}` : ''}` });
  },

  /** Full detail of a single assignment */
  detail: (id) =>
    apiRequest({ method: 'GET', url: `/staff/assignments/${id}` }),

  /** Accept an assignment (ASSIGNED → ACCEPTED) */
  accept: (id) =>
    apiRequest({ method: 'PATCH', url: `/staff/assignments/${id}/accept` }),

  /** Update status (ACCEPTED → EN_ROUTE, EN_ROUTE → ON_SCENE) */
  updateStatus: (id, status, notes) =>
    apiRequest({
      method: 'PATCH',
      url: `/staff/assignments/${id}/status`,
      data: { status, notes }
    }),

  /** Add a situation log entry with optional image */
  addSituationLog: (id, note, image) => {
    const formData = new FormData();
    formData.append('note', note);
    if (image) formData.append('image', image);
    return apiRequest({
      method: 'POST',
      url: `/staff/assignments/${id}/situation-log`,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /** Submit resolution with notes and optional proof image */
  submitResolution: (id, data, image) => {
    const formData = new FormData();
    formData.append('resolutionNotes', data.resolutionNotes);
    if (data.resourcesUsed) formData.append('resourcesUsed', data.resourcesUsed);
    if (data.followUpRequired !== undefined) formData.append('followUpRequired', data.followUpRequired);
    if (image) formData.append('image', image);
    return apiRequest({
      method: 'POST',
      url: `/staff/assignments/${id}/resolve`,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /** Toggle duty status ON_DUTY / OFF_DUTY */
  toggleDuty: (dutyStatus) =>
    apiRequest({
      method: 'PATCH',
      url: '/staff/duty-status',
      data: { dutyStatus }
    }),

  /** Completed incidents for this staff member */
  history: () => apiRequest({ method: 'GET', url: '/staff/history' })
};
