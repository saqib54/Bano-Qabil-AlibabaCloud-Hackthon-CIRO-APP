import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth.api';

/**
 * Global auth state — the only place session data genuinely needs to
 * be global. Server data elsewhere lives in TanStack Query.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken
        }),

      login: async (email, password) => {
        const session = await authApi.login({ email, password });
        get().setSession(session);
        return session.user;
      },

      loginWithGoogle: async (payload) => {
        const session = await authApi.google(payload);
        get().setSession(session);
        return session.user;
      },

      requestOtp: (email) => authApi.otpRequest(email),

      loginWithOtp: async (email, code) => {
        const session = await authApi.otpVerify(email, code);
        get().setSession(session);
        return session.user;
      },

      register: async (payload) => {
        const session = await authApi.register(payload);
        get().setSession(session);
        return session.user;
      },

      refreshSession: async () => {
        const current = get().refreshToken;
        if (!current) throw new Error('No refresh token');
        const session = await authApi.refresh(current);
        get().setSession(session);
        return session;
      },

      fetchMe: async () => {
        const user = await authApi.me();
        set({ user });
        return user;
      },

      logout: async () => {
        const token = get().refreshToken;
        try {
          if (token) await authApi.logout(token);
        } catch (_err) {
          /* server may be unreachable — session is cleared locally anyway */
        }
        get().clearSession();
      },

      clearSession: () => set({ user: null, accessToken: null, refreshToken: null })
    }),
    {
      name: 'ciro-auth'
    }
  )
);
