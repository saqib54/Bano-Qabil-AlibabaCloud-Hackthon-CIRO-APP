import { apiRequest } from './client';

export const adminApi = {
  /** Aggregated command center KPIs */
  kpis: () => apiRequest({ method: 'GET', url: '/admin/kpis' }),

  /** Full incident list with optional filters */
  incidents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.category) qs.set('category', params.category);
    if (params.severity) qs.set('severity', params.severity);
    if (params.limit) qs.set('limit', params.limit);
    const query = qs.toString();
    return apiRequest({ method: 'GET', url: `/admin/incidents${query ? `?${query}` : ''}` });
  },

  /** Full incident detail with AI analysis */
  incidentDetail: (id) =>
    apiRequest({ method: 'GET', url: `/admin/incidents/${id}` }),

  /** Verify incident and set severity */
  verify: (id, severity, notes) =>
    apiRequest({
      method: 'PATCH',
      url: `/admin/incidents/${id}/verify`,
      data: { severity, notes }
    }),

  /** Assign department to incident */
  assign: (id, departmentId, staffId, notes) =>
    apiRequest({
      method: 'PATCH',
      url: `/admin/incidents/${id}/assign`,
      data: { departmentId, staffId, notes }
    }),

  /** Re-trigger AI analysis */
  reanalyze: (id) =>
    apiRequest({ method: 'POST', url: `/admin/incidents/${id}/reanalyze` }),

  /** List all departments */
  departments: () =>
    apiRequest({ method: 'GET', url: '/admin/departments' }),

  /** List all staff */
  staff: () =>
    apiRequest({ method: 'GET', url: '/admin/staff' }),

  /** Create a staff account (admin only) */
  createStaff: (data) =>
    apiRequest({ method: 'POST', url: '/admin/staff', data }),

  /** Update a staff member's profile */
  updateStaff: (id, data) =>
    apiRequest({ method: 'PATCH', url: `/admin/staff/${id}`, data }),

  // ── Citizen / account management ──

  /** List accounts (filter by role / search) */
  users: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.role) qs.set('role', params.role);
    if (params.search) qs.set('search', params.search);
    const query = qs.toString();
    return apiRequest({ method: 'GET', url: `/admin/users${query ? `?${query}` : ''}` });
  },

  /** Create a citizen (or staff) account */
  createUser: (data) =>
    apiRequest({ method: 'POST', url: '/admin/users', data }),

  /** Edit an account — name, email, phone, password reset, enable/disable */
  updateUser: (id, data) =>
    apiRequest({ method: 'PATCH', url: `/admin/users/${id}`, data }),

  // ── Resolution Review (Sprint 6) ──

  /** List incidents with RESOLUTION_SUBMITTED status */
  resolutions: () =>
    apiRequest({ method: 'GET', url: '/admin/resolutions' }),

  /** Resolution detail with media and situation logs */
  resolutionDetail: (id) =>
    apiRequest({ method: 'GET', url: `/admin/resolutions/${id}` }),

  /** Approve resolution (RESOLUTION_SUBMITTED → RESOLVED) */
  approveResolution: (id, notes) =>
    apiRequest({
      method: 'PATCH',
      url: `/admin/resolutions/${id}/approve`,
      data: { notes }
    }),

  /** Reject resolution (RESOLUTION_SUBMITTED → ON_SCENE) */
  rejectResolution: (id, notes) =>
    apiRequest({
      method: 'PATCH',
      url: `/admin/resolutions/${id}/reject`,
      data: { notes }
    }),

  /** Reopen incident (RESOLVED → REOPENED) */
  reopenIncident: (id, notes) =>
    apiRequest({
      method: 'PATCH',
      url: `/admin/resolutions/${id}/reopen`,
      data: { notes }
    }),

  // ── Sprint 10 ──

  /** Operational analytics */
  analytics: () =>
    apiRequest({ method: 'GET', url: '/admin/analytics' }),

  /** Resource overview */
  resources: () =>
    apiRequest({ method: 'GET', url: '/admin/resources' }),

  /** Weather intelligence */
  weather: () =>
    apiRequest({ method: 'GET', url: '/admin/weather' }),

  /** Audit logs */
  auditLogs: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', params.limit);
    if (params.offset) qs.set('offset', params.offset);
    if (params.entity) qs.set('entity', params.entity);
    if (params.action) qs.set('action', params.action);
    const query = qs.toString();
    return apiRequest({ method: 'GET', url: `/admin/audit${query ? `?${query}` : ''}` });
  },

  /** List system settings */
  settings: () =>
    apiRequest({ method: 'GET', url: '/admin/settings' }),

  /** Update system settings */
  updateSettings: (settings) =>
    apiRequest({ method: 'PATCH', url: '/admin/settings', data: { settings } })
};
