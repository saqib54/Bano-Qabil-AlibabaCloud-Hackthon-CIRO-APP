import { apiRequest } from './client';

export const weatherApi = {
  /** Full weather intelligence for a city (current, 15-day, AQI, alerts, radar coords). */
  get: (city) =>
    apiRequest({ method: 'GET', url: `/weather?city=${encodeURIComponent(city)}` })
};
