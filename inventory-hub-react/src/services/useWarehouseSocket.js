/**
 * useWarehouseSocket.js
 *
 * WebSocket + STOMP custom hook with graceful degradation.
 *
 * - Exponential backoff: 5s → 10s → 20s → 40s → 60s (capped)
 * - Max 5 retries — stops hammering the console when backend is offline
 * - Silent failure: no console.error spam when server is simply not running
 * - Exposes `connected` and `wsAvailable` so UI can show an offline badge
 *
 * Usage:
 *   const { sendToAdmin, sendToManager, sendToStaff, connected, wsAvailable } =
 *     useWarehouseSocket({
 *       topics: ['/topic/admin/notifications'],
 *       onMessage: (event) => console.log(event),
 *     });
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8088/ws';

// How long to wait before each retry attempt (ms)
const RETRY_DELAYS = [5000, 10000, 20000, 40000, 60000];
const MAX_RETRIES  = RETRY_DELAYS.length; // stop after 5 attempts

export function useWarehouseSocket({ topics = [], onMessage, enabled = true }) {
  const clientRef    = useRef(null);
  const retryCount   = useRef(0);
  const retryTimer   = useRef(null);

  const [connected,   setConnected]   = useState(false);
  const [wsAvailable, setWsAvailable] = useState(true); // false = gave up retrying

  // ── Core connect logic ────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!enabled || topics.length === 0) return;

    // Clean up any existing client first
    if (clientRef.current) {
      try { clientRef.current.deactivate(); } catch { /* ignore */ }
      clientRef.current = null;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),

      // Disable built-in reconnect — we handle it manually with backoff
      reconnectDelay: 0,

      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      // Suppress the default STOMP debug output entirely
      debug: () => {},

      onConnect: () => {
        retryCount.current = 0;
        setConnected(true);
        setWsAvailable(true);
        console.log('✅ WebSocket connected to', WS_URL);

        topics.forEach(topic => {
          client.subscribe(topic, (msg) => {
            try {
              const event = JSON.parse(msg.body);
              onMessage && onMessage(event);
            } catch (e) {
              console.warn('WS parse error:', e);
            }
          });
        });
      },

      onDisconnect: () => {
        setConnected(false);
        // Normal disconnect (e.g. logout) — don't retry
      },

      onStompError: () => {
        // STOMP-level error — treat same as connection failure
        setConnected(false);
        scheduleRetry();
      },

      onWebSocketError: () => {
        // Network-level error (ERR_CONNECTION_REFUSED etc.) — silent retry
        setConnected(false);
        scheduleRetry();
      },

      onWebSocketClose: () => {
        setConnected(false);
        scheduleRetry();
      },
    });

    client.activate();
    clientRef.current = client;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, topics.join(',')]);

  // ── Exponential backoff retry ─────────────────────────────────────────────
  const scheduleRetry = useCallback(() => {
    if (retryCount.current >= MAX_RETRIES) {
      // Gave up — log once, mark unavailable, stop retrying
      if (retryCount.current === MAX_RETRIES) {
        console.warn(
          `⚠️ WebSocket unavailable at ${WS_URL}. ` +
          `Real-time updates disabled — start the warehouse-service to enable them.`
        );
        retryCount.current += 1; // prevent duplicate warnings
      }
      setWsAvailable(false);
      return;
    }

    const delay = RETRY_DELAYS[retryCount.current] ?? 60000;
    retryCount.current += 1;

    clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    retryCount.current = 0;
    setWsAvailable(true);
    connect();

    return () => {
      clearTimeout(retryTimer.current);
      if (clientRef.current) {
        try { clientRef.current.deactivate(); } catch { /* ignore */ }
        clientRef.current = null;
      }
      setConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, topics.join(',')]);

  // ── Send helpers ──────────────────────────────────────────────────────────

  /** Admin → specific Warehouse Manager */
  const sendToManager = useCallback((managerId, type, title, message, data = {}) => {
    if (!clientRef.current?.connected) return false;
    clientRef.current.publish({
      destination: '/app/admin/message',
      body: JSON.stringify({ managerId, type, title, message, data }),
    });
    return true;
  }, []);

  /** Admin → all Managers broadcast */
  const sendToAllManagers = useCallback((type, title, message, data = {}) => {
    if (!clientRef.current?.connected) return false;
    clientRef.current.publish({
      destination: '/app/admin/message',
      body: JSON.stringify({ type, title, message, data }),
    });
    return true;
  }, []);

  /** Warehouse Manager/Staff → Admin */
  const sendToAdmin = useCallback((type, title, message, data = {}) => {
    if (!clientRef.current?.connected) return false;
    clientRef.current.publish({
      destination: '/app/warehouse/message',
      body: JSON.stringify({ type, title, message, data }),
    });
    return true;
  }, []);

  /** Staff (Picker/Packer/Shipping) → Manager */
  const sendToStaff = useCallback((managerId, staffRole, staffName, type, title, message, data = {}) => {
    if (!clientRef.current?.connected) return false;
    clientRef.current.publish({
      destination: '/app/staff/message',
      body: JSON.stringify({ managerId, staffRole, staffName, type, title, message, data }),
    });
    return true;
  }, []);

  /** Connection test ping */
  const ping = useCallback(() => {
    if (!clientRef.current?.connected) return false;
    clientRef.current.publish({
      destination: '/app/ping',
      body: JSON.stringify({ from: 'frontend', time: new Date().toISOString() }),
    });
    return true;
  }, []);

  return {
    connected,
    wsAvailable,
    sendToAdmin,
    sendToManager,
    sendToAllManagers,
    sendToStaff,
    ping,
  };
}
