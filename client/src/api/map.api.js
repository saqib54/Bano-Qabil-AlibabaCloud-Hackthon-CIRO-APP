import { apiRequest } from './client';

export const mapApi = {
  /** All incidents for map display */
  incidents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.all) qs.set('all', 'true');
    const query = qs.toString();
    return apiRequest({ method: 'GET', url: `/map/incidents${query ? `?${query}` : ''}` });
  },

  /** Active responders with locations */
  responders: () =>
    apiRequest({ method: 'GET', url: '/map/responders' }),

  /** All shelters / safe places */
  shelters: () =>
    apiRequest({ method: 'GET', url: '/shelters' }),

  /** Shelter detail */
  shelterDetail: (id) =>
    apiRequest({ method: 'GET', url: `/shelters/${id}` }),

  /** Create shelter (admin) */
  createShelter: (data) =>
    apiRequest({ method: 'POST', url: '/shelters', data }),

  /** Update shelter (admin) */
  updateShelter: (id, data) =>
    apiRequest({ method: 'PATCH', url: `/shelters/${id}`, data }),

  /** Toggle shelter active status (admin) */
  toggleShelter: (id) =>
    apiRequest({ method: 'PATCH', url: `/shelters/${id}/toggle` }),

  /** Delete shelter (admin) */
  deleteShelter: (id) =>
    apiRequest({ method: 'DELETE', url: `/shelters/${id}` })
};

export const assistantApi = {
  /** Send a chat message to the AI assistant */
  chat: (message, history = []) =>
    apiRequest({ method: 'POST', url: '/assistant/chat', data: { message, history } })
};

export const dispatchApi = {
  /** Get dispatch recommendations */
  recommendations: () =>
    apiRequest({ method: 'GET', url: '/admin/dispatch/recommendations' }),

  /** Auto-assign a batch of incidents */
  autoAssign: (incidentIds) =>
    apiRequest({ method: 'POST', url: '/admin/dispatch/auto-assign', data: { incidentIds } })
};
