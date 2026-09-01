import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { API_BASE_URL } from '../api/client';

/**
 * Derives the WebSocket endpoint from the REST base URL:
 * http://localhost:5000/api/v1 → ws://localhost:5000/ws
 */
function socketUrl() {
  return API_BASE_URL
    .replace(/^http/, 'ws')          // http(s) → ws(s)
    .replace(/\/api\/v1\/?$/, '')    // strip API prefix
    .concat('/ws');
}

/**
 * Live event subscription over the authenticated WebSocket channel.
 *
 * Usage:
 *   useRealtime({
 *     'alert.new': (event) => ...,
 *     'incident.pipeline': (event) => ...
 *   });
 *
 * - Authenticates with the current access token (query param, per server design)
 * - Re-authenticates and reconnects automatically when the server closes the
 *   socket with 4401 (expired token) or the connection drops
 * - Handlers may change between renders without tearing down the socket
 */
export function useRealtime(handlers) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!accessToken) return undefined;

    let socket = null;
    let closedByUs = false;
    let retryDelay = 1500;
    let retryTimer = null;

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const connect = () => {
      socket = new WebSocket(`${socketUrl()}?token=${encodeURIComponent(accessToken)}`);

      socket.onmessage = (raw) => {
        try {
          const event = JSON.parse(raw.data);
          const handler = handlersRef.current?.[event.type];
          if (handler) handler(event);
        } catch {
          // Malformed frame — ignore
        }
      };

      socket.onclose = (ev) => {
        if (closedByUs) return;

        // 4401 = expired access token — refresh the session, then reconnect
        if (ev.code === 4401) {
          useAuthStore
            .getState()
            .refreshSession()
            .catch(() => useAuthStore.getState().clearSession());
          retryDelay = 1500;
        }

        clearRetry();
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000); // backoff, cap 30s
          connect();
        }, retryDelay);
      };

      socket.onopen = () => {
        retryDelay = 1500; // reset backoff after a healthy connection
      };
    };

    connect();

    return () => {
      closedByUs = true;
      clearRetry();
      if (socket) socket.close();
    };
  }, [accessToken]);

  return null;
}

export default useRealtime;
