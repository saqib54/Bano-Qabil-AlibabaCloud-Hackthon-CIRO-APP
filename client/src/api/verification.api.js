import { apiRequest } from './client';

/** Rapid Intelligence Grid — AI verification pipeline APIs. */
export const verificationApi = {
  /**
   * Full pipeline trace for one incident (verdict, confidence, per-agent stages).
   * Citizens may only fetch traces of their own reports.
   */
  incidentVerification: (id) =>
    apiRequest({ method: 'GET', url: `/incidents/${id}/verification` }),

  /** Live pipeline feed + aggregate stats (admin only). */
  feed: (limit = 20) =>
    apiRequest({ method: 'GET', url: `/admin/verification-feed?limit=${limit}` }),

  /** Smart report extraction from free text — English, Roman Urdu or Urdu. */
  extract: (text) =>
    apiRequest({ method: 'POST', url: '/ai/extract', data: { text } }),

  /** Emergency forecasting hotspots from historical reports (admin only). */
  forecast: (days = 90) =>
    apiRequest({ method: 'GET', url: `/admin/forecast?days=${days}` }),

  /** Approve & dispatch — human approval gate before final dispatch (admin only). */
  approveDispatch: (id) =>
    apiRequest({ method: 'POST', url: `/admin/incidents/${id}/approve-dispatch` })
};
