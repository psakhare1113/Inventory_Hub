/**
 * useActivityTracker.js
 * React hook that bridges the analytics tracker singleton with React lifecycle.
 * Used in CustomerApp to track login/logout and periodic activity heartbeats.
 */
import { useEffect, useRef } from 'react';
import { analyticsService } from '../services/analyticsService';
import tracker from '../services/analyticsTracker';

export const useActivityTracker = () => {
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);

  // Decode userId from JWT stored in localStorage
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.sub || payload.id || null;
    } catch {
      return null;
    }
  };

  // Heartbeat — tells the server the user is still active
  const updateActivity = () => {
    const userId = getCurrentUserId();
    if (userId) {
      analyticsService.updateActivity(userId);
      lastActivityRef.current = Date.now();
    }
  };

  // Called right after a successful login
  const trackLogin = (sessionToken) => {
    const userId = getCurrentUserId();
    if (userId) {
      analyticsService.trackLogin(userId, sessionToken || `web-${Date.now()}`);
      tracker.trackLogin(userId, 'email');
    }
  };

  // Called on explicit logout
  const trackLogout = () => {
    const userId = getCurrentUserId();
    if (userId) {
      analyticsService.trackLogout(userId);
      tracker.trackLogout();
    }
  };

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;

    // Throttled activity handler — fires at most once per 30s
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > 30000) {
        updateActivity();
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, handleActivity, true));

    // Guaranteed heartbeat every 5 minutes regardless of activity
    intervalRef.current = setInterval(updateActivity, 5 * 60 * 1000);

    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity, true));
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Track logout on tab/window close
  useEffect(() => {
    const handleUnload = () => trackLogout();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return { trackLogin, trackLogout, updateActivity };
};
