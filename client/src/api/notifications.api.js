import { apiRequest } from './client';

export const notificationApi = {
  /** Current user's notifications */
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', params.limit);
    const query = qs.toString();
    return apiRequest({ method: 'GET', url: `/notifications${query ? `?${query}` : ''}` });
  },

  /** Mark one notification as read */
  markRead: (id) =>
    apiRequest({ method: 'PATCH', url: `/notifications/${id}/read` }),

  /** Mark all notifications as read */
  markAllRead: () =>
    apiRequest({ method: 'PATCH', url: '/notifications/mark-all-read' }),

  /** Active emergency alerts (broadcasts visible to all) */
  alerts: () =>
    apiRequest({ method: 'GET', url: '/notifications/alerts' })
};

export const broadcastApi = {
  /** All broadcasts (admin) */
  list: () =>
    apiRequest({ method: 'GET', url: '/admin/broadcasts' }),

  /** Create a new broadcast */
  create: (data) =>
    apiRequest({ method: 'POST', url: '/admin/broadcasts', data }),

  /** Deactivate a broadcast */
  deactivate: (id) =>
    apiRequest({ method: 'PATCH', url: `/admin/broadcasts/${id}/deactivate` })
};
