/**
 * analyticsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Real API calls only — zero mock data.
 *
 * Real endpoints (existing auth-server at port 2000 via gateway 9999):
 *   GET /api/auth/admin/customers                  — all customers
 *   GET /api/auth/admin/login-stats?days=N         — { SUCCESS: N, FAILED: N, BLOCKED: N }
 *   GET /api/auth/admin/login-history/{customerId} — LoginAudit[] per user
 *   GET /api/auth/active-sessions                  — active sessions
 *   GET /api/auth/admin/login-history/{id}         — per-user full history
 *
 * Future analytics microservice endpoints (return null until deployed):
 *   GET /api/analytics/admin/realtime
 *   GET /api/analytics/admin/overview
 *   etc.
 */

const BASE = 'http://localhost:9999/api';

// ─── Token helpers ─────────────────────────────────────────────────────────
const getAdminToken = () =>
  sessionStorage.getItem('adminToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

const getCustomerToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

const adminHeaders = () => {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const customerHeaders = () => {
  const token = getCustomerToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// ─── Safe fetch — returns null on error, never throws ─────────────────────
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Analytics Service ─────────────────────────────────────────────────────
export const analyticsService = {

  // ── Real: All customers from auth-server ──────────────────────────────────
  getAllCustomers: async () => {
    // Returns null on network/auth failure, [] if no customers exist
    const result = await safeFetch(`${BASE}/auth/admin/customers`, { headers: adminHeaders() });
    return result; // null = failed, [] = empty, [...] = data
  },

  // ── Real: Login stats { SUCCESS: N, FAILED: N, BLOCKED: N } ──────────────
  getLoginStats: async (days = 30) => {
    return await safeFetch(`${BASE}/auth/admin/login-stats?days=${days}`, { headers: adminHeaders() });
  },

  // ── Real: Per-user login history (LoginAudit[]) ───────────────────────────
  getUserLoginHistory: async (customerId) => {
    return await safeFetch(`${BASE}/auth/admin/login-history/${customerId}`, { headers: adminHeaders() }) || [];
  },

  // ── Real: Active sessions ─────────────────────────────────────────────────
  getActiveSessions: async () => {
    return await safeFetch(`${BASE}/auth/active-sessions`, { headers: adminHeaders() }) || [];
  },

  // ── Real: Online users panel (existing analytics endpoint) ───────────────
  // Returns null if the analytics microservice is not deployed
  getOnlineUsers: async (days = 30) => {
    return await safeFetch(`${BASE}/admin/analytics/users?days=${days}`, { headers: adminHeaders() });
  },

  // ── Future analytics microservice endpoints ───────────────────────────────
  // All return null until the analytics microservice is deployed.
  // Components must handle null gracefully (show "No data" state).

  getRealtimeStats: async () => {
    return await safeFetch(`${BASE}/analytics/admin/realtime`, { headers: adminHeaders() });
  },

  getAdminOverview: async (days = 30) => {
    return await safeFetch(`${BASE}/analytics/admin/overview?days=${days}`, { headers: adminHeaders() });
  },

  getTopProducts: async () => {
    return await safeFetch(`${BASE}/analytics/admin/top-products`, { headers: adminHeaders() });
  },

  getFunnelData: async () => {
    return await safeFetch(`${BASE}/analytics/admin/funnel`, { headers: adminHeaders() });
  },

  getDeviceData: async () => {
    return await safeFetch(`${BASE}/analytics/admin/devices`, { headers: adminHeaders() });
  },

  getTrafficSources: async () => {
    return await safeFetch(`${BASE}/analytics/admin/traffic-sources`, { headers: adminHeaders() });
  },

  getHourlyActivity: async () => {
    return await safeFetch(`${BASE}/analytics/admin/hourly-activity`, { headers: adminHeaders() });
  },

  getGeoData: async () => {
    return await safeFetch(`${BASE}/analytics/admin/geo`, { headers: adminHeaders() });
  },

  getFraudAlerts: async () => {
    return await safeFetch(`${BASE}/analytics/admin/fraud-alerts`, { headers: adminHeaders() });
  },

  getUserCounters: async (userId) => {
    return await safeFetch(`${BASE}/analytics/user/${userId}/counters`, { headers: customerHeaders() });
  },

  getUserSessions: async (userId) => {
    return await safeFetch(`${BASE}/analytics/user/${userId}/sessions`, { headers: customerHeaders() });
  },

  getUserBehavior: async (userId) => {
    return await safeFetch(`${BASE}/analytics/user/${userId}/behavior`, { headers: customerHeaders() });
  },

  getUserRecommendations: async (userId) => {
    return await safeFetch(`${BASE}/analytics/user/${userId}/recommendations`, { headers: customerHeaders() });
  },

  // ── Legacy heartbeat endpoints ────────────────────────────────────────────
  trackLogin: async (userId, sessionToken) => {
    try {
      await fetch(`${BASE}/admin/analytics/users/${userId}/track-login?sessionToken=${sessionToken}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
    } catch { /* silent */ }
  },

  trackLogout: async (userId) => {
    try {
      await fetch(`${BASE}/admin/analytics/users/${userId}/track-logout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
    } catch { /* silent */ }
  },

  updateActivity: async (userId) => {
    try {
      await fetch(`${BASE}/admin/analytics/users/${userId}/update-activity`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
    } catch { /* silent */ }
  },
};

export default analyticsService;
