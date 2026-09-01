import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/auth.store';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_START_KEY = 'ciro-session-start';

/**
 * Security hook — monitors user activity and auto-logs out on:
 * 1. Inactivity for 15 minutes (no mouse/keyboard/touch)
 * 2. Session exceeding 8 hours
 * 3. Tab hidden for more than 30 minutes
 */
export function useSecurityMonitor() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const timerRef = useRef(null);
  const hiddenSinceRef = useRef(null);

  const handleLogout = useCallback(async () => {
    try { await logout(); } catch { /* ignore */ }
    window.location.href = '/login';
  }, [logout]);

  useEffect(() => {
    if (!user) return;

    // Track session start time
    const sessionStart = localStorage.getItem(SESSION_START_KEY);
    if (!sessionStart) {
      localStorage.setItem(SESSION_START_KEY, Date.now().toString());
    }

    // Reset inactivity timer
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
    }

    // Activity events
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    const onActivity = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    resetTimer();

    // Session max age check
    const ageCheck = setInterval(() => {
      const start = parseInt(localStorage.getItem(SESSION_START_KEY) || '0', 10);
      if (start && Date.now() - start > SESSION_MAX_AGE) {
        localStorage.removeItem(SESSION_START_KEY);
        handleLogout();
      }
    }, 60 * 1000);

    // Tab visibility — auto-lock if hidden too long
    function onVisibilityChange() {
      if (document.hidden) {
        hiddenSinceRef.current = Date.now();
      } else if (hiddenSinceRef.current) {
        const hiddenDuration = Date.now() - hiddenSinceRef.current;
        hiddenSinceRef.current = null;
        // If tab was hidden for more than 30 minutes, force re-auth
        if (hiddenDuration > 30 * 60 * 1000) {
          handleLogout();
        }
        resetTimer();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(ageCheck);
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, handleLogout]);

  // Clear session start on logout
  useEffect(() => {
    if (!user) {
      localStorage.removeItem(SESSION_START_KEY);
    }
  }, [user]);
}
