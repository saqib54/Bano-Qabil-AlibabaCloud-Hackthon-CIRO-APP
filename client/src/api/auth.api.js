import { apiRequest } from './client';

export const authApi = {
  register: (payload) =>
    apiRequest({ method: 'POST', url: '/auth/register', data: payload }),

  login: (payload) =>
    apiRequest({ method: 'POST', url: '/auth/login', data: payload }),

  google: (payload) =>
    apiRequest({ method: 'POST', url: '/auth/google', data: payload }),

  otpRequest: (email) =>
    apiRequest({ method: 'POST', url: '/auth/otp/request', data: { email } }),

  otpVerify: (email, code) =>
    apiRequest({ method: 'POST', url: '/auth/otp/verify', data: { email, code } }),

  refresh: (refreshToken) =>
    apiRequest({ method: 'POST', url: '/auth/refresh', data: { refreshToken } }),

  logout: (refreshToken) =>
    apiRequest({ method: 'POST', url: '/auth/logout', data: { refreshToken } }),

  me: () => apiRequest({ method: 'GET', url: '/auth/me' })
};
