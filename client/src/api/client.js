import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

export const API_BASE_URL =
  window.__CIRO_API_URL__ || import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL
});

// Attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401 (single-flight)
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && !original._retried && !original.url.includes('/auth/')) {
      original._retried = true;
      try {
        refreshPromise = refreshPromise || useAuthStore.getState().refreshSession();
        await refreshPromise;
        refreshPromise = null;
        return api(original);
      } catch (_err) {
        refreshPromise = null;
        useAuthStore.getState().clearSession();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

/** Unwraps the consistent { success, message, data } envelope. */
export async function apiRequest(config) {
  const res = await api.request(config);
  return res.data?.data;
}

export function getErrorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}

export default api;
