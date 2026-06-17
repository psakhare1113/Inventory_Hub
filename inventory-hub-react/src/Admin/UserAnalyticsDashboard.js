/**
 * UserAnalyticsDashboard.js
 * Real customer tracking — Online/Offline status, login history, activity.
 * Data sources (all existing auth-server endpoints):
 *   GET /api/auth/admin/customers              — customer list
 *   GET /api/auth/admin/login-stats?days=N     — { SUCCESS, FAILED, BLOCKED }
 *   GET /api/auth/admin/login-history/{id}     — LoginAudit[] per customer
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Activity, Search, Clock, TrendingUp, RefreshCw,
  LogIn, ChevronDown, ChevronUp, Shield, Smartphone, Globe,
} from 'lucide-react';

// ─── API helpers ───────────────────────────────────────────────────────────
const BASE = 'http://localhost:9999/api';

const getToken = () =>
  sessionStorage.getItem('adminToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

const hdrs = () => {
  const t = getToken();
  return { 'Content-Type': 'application/json', ...(t && { Authorization: `Bearer ${t}` }) };
};

async function apiFetch(url) {
  try {
    const r = await fetch(url, { headers: hdrs() });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt   = (n) => Number(n || 0).toLocaleString('en-IN');
const today = () => new Date().toISOString().split('T')[0];

const fmtTime = (iso) => iso
  ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  : '—';

const fmtDateTime = (iso) => iso
  ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : 'Never';

const timeAgo = (iso) => {
  if (!iso) return 'Never';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// Online = either flagged via active session OR last successful login within 10 minutes
const ONLINE_MS = 10 * 60 * 1000;
const isOnline  = (lastLoginIso, activeSession = false) => {
  if (activeSession) return true;
  if (!lastLoginIso) return false;
  return Date.now() - new Date(lastLoginIso).getTime() < ONLINE_MS;
};

// ─── Activity Panel — reads localStorage events for this user ─────────────
function ActivityPanel({ customerId }) {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    // Import tracker statically to read localStorage
    try {
      const key = `_ua_${customerId}`;
      const raw = JSON.parse(localStorage.getItem(key) || '[]');
      setActivity(raw.reverse()); // newest first
    } catch { setActivity([]); }
  }, [customerId]);

  if (activity.length === 0) return (
    <p className="text-xs text-gray-400 italic mt-2">
      No activity recorded yet. Activity is tracked when the user browses the website.
    </p>
  );

  // Group by event type
  const searches    = activity.filter(e => e.e === 'search');
  const pageViews   = activity.filter(e => e.e === 'page_view');
  const productViews = activity.filter(e => e.e === 'product_view');
  const cartAdds    = activity.filter(e => e.e === 'add_to_cart');
  const cartRemoves = activity.filter(e => e.e === 'remove_from_cart');
  const wishlistAdds = activity.filter(e => e.e === 'wishlist_add');
  const orders      = activity.filter(e => e.e === 'order_placed');
  const checkouts   = activity.filter(e => e.e === 'checkout_start');

  const fmtT = (iso) => iso
    ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  return (
    <div className="mt-3 space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: `🔍 ${searches.length} Searches`,       show: searches.length > 0,     color: 'bg-blue-50 text-blue-700' },
          { label: `📄 ${pageViews.length} Pages`,         show: pageViews.length > 0,    color: 'bg-gray-100 text-gray-700' },
          { label: `👁️ ${productViews.length} Products`,   show: productViews.length > 0, color: 'bg-purple-50 text-purple-700' },
          { label: `🛒 ${cartAdds.length} Cart Adds`,      show: cartAdds.length > 0,     color: 'bg-yellow-50 text-yellow-700' },
          { label: `❤️ ${wishlistAdds.length} Wishlist`,   show: wishlistAdds.length > 0, color: 'bg-pink-50 text-pink-700' },
          { label: `📦 ${orders.length} Orders`,           show: orders.length > 0,       color: 'bg-green-50 text-green-700' },
        ].filter(c => c.show).map(c => (
          <span key={c.label} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.color}`}>{c.label}</span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Searches */}
        {searches.length > 0 && (
          <div className="bg-white rounded-lg border border-blue-100 p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2">🔍 Search History</p>
            <div className="flex flex-wrap gap-1.5">
              {searches.slice(0, 15).map((s, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full border border-blue-100">
                  {s.q}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Product Views */}
        {productViews.length > 0 && (
          <div className="bg-white rounded-lg border border-purple-100 p-3">
            <p className="text-xs font-semibold text-purple-700 mb-2">👁️ Products Viewed</p>
            <div className="space-y-1">
              {productViews.slice(0, 8).map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 truncate max-w-[160px]">{p.pn || `Product ${p.pid}`}</span>
                  <span className="text-gray-400 flex-shrink-0 ml-2">{fmtT(p.t)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cart Activity */}
        {cartAdds.length > 0 && (
          <div className="bg-white rounded-lg border border-yellow-100 p-3">
            <p className="text-xs font-semibold text-yellow-700 mb-2">🛒 Cart Activity</p>
            <div className="space-y-1">
              {cartAdds.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 truncate max-w-[140px]">{c.pn || `Product ${c.pid}`}</span>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {c.qty && <span className="text-yellow-600 font-medium">×{c.qty}</span>}
                    {c.price && <span className="text-gray-500">₹{Number(c.price).toLocaleString('en-IN')}</span>}
                  </div>
                </div>
              ))}
              {cartRemoves.length > 0 && (
                <p className="text-xs text-red-400 mt-1">{cartRemoves.length} item(s) removed from cart</p>
              )}
            </div>
          </div>
        )}

        {/* Pages Visited */}
        {pageViews.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">📄 Pages Visited</p>
            <div className="space-y-1">
              {[...new Set(pageViews.map(p => p.p))].slice(0, 8).map((url, i) => (
                <div key={i} className="text-xs text-gray-600 truncate font-mono bg-gray-50 px-2 py-0.5 rounded">
                  {url}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders */}
        {orders.length > 0 && (
          <div className="bg-white rounded-lg border border-green-100 p-3">
            <p className="text-xs font-semibold text-green-700 mb-2">📦 Orders Placed</p>
            <div className="space-y-1">
              {orders.slice(0, 5).map((o, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">Order #{o.oid}</span>
                  <span className="text-green-600 font-medium">₹{Number(o.amt || 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wishlist */}
        {wishlistAdds.length > 0 && (
          <div className="bg-white rounded-lg border border-pink-100 p-3">
            <p className="text-xs font-semibold text-pink-700 mb-2">❤️ Wishlist Adds</p>
            <div className="space-y-1">
              {wishlistAdds.slice(0, 6).map((w, i) => (
                <div key={i} className="text-xs text-gray-700">{w.pn || `Product ${w.pid}`}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function StatusBadge({ online }) {
  return online ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
      Online
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      Offline
    </span>
  );
}

// ─── Login attempt badge ───────────────────────────────────────────────────
function LoginBadge({ status }) {
  if (status === 'SUCCESS') return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ SUCCESS</span>;
  if (status === 'BLOCKED') return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">🚫 BLOCKED</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">❌ FAILED</span>;
}

// ─── Customer Row (expandable) ─────────────────────────────────────────────
function CustomerRow({ customer }) {
  const [expanded, setExpanded]     = useState(false);
  const [history, setHistory]       = useState(null);
  const [loadingHist, setLoadingHist] = useState(false);

  // Derive last login from LoginAudit (loaded lazily on expand)
  // For the table row we use customer.lastLoginTime if available, else show "—"
  const lastLoginIso = customer._lastLoginIso || null;
  const online       = isOnline(lastLoginIso, customer._isOnline === true);

  const todayHistory = (history || []).filter(h => h.loginTime?.startsWith(today()));
  const todaySuccess = todayHistory.filter(h => h.status === 'SUCCESS');
  const todayFailed  = todayHistory.filter(h => h.status === 'FAILED' || h.status === 'BLOCKED');

  const handleExpand = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (history !== null) return; // already loaded
    setLoadingHist(true);
    const data = await apiFetch(`${BASE}/auth/admin/login-history/${customer.id}`);
    setHistory(Array.isArray(data) ? data : []);
    setLoadingHist(false);
  };

  const initials = `${(customer.firstName || 'U')[0]}${(customer.lastName || '')[0] || ''}`.toUpperCase();
  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || `User ${customer.id}`;

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
        {/* Avatar + Name */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: online ? '#10b981' : '#9ca3af' }}>
                {initials}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{fullName}</p>
              <p className="text-xs text-gray-400">{customer.email}</p>
            </div>
          </div>
        </td>

        {/* Online/Offline */}
        <td className="py-3 px-4"><StatusBadge online={online} /></td>

        {/* Today logins */}
        <td className="py-3 px-4 text-center">
          {history !== null ? (
            <div>
              <span className={`text-sm font-bold ${todaySuccess.length > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                {todaySuccess.length}
              </span>
              {todayFailed.length > 0 && (
                <span className="text-xs text-red-400 ml-1">({todayFailed.length} failed)</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-300">click ▼</span>
          )}
        </td>

        {/* Last login */}
        <td className="py-3 px-4">
          <p className="text-sm text-gray-700">{fmtDateTime(lastLoginIso)}</p>
          <p className="text-xs text-gray-400">{timeAgo(lastLoginIso)}</p>
        </td>

        {/* Status */}
        <td className="py-3 px-4">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            customer.status === 'BLOCKED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
          }`}>
            {customer.status === 'BLOCKED' ? 'Blocked' : 'Active'}
          </span>
        </td>

        {/* Joined */}
        <td className="py-3 px-4 text-xs text-gray-500">{fmtDateTime(customer.createdAt)}</td>

        {/* Expand */}
        <td className="py-3 px-4 text-center">
          <button onClick={handleExpand}
            className="text-gray-400 hover:text-indigo-600 transition-colors p-1 rounded">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </td>
      </tr>

      {/* Expanded: today's login history */}
      {expanded && (
        <tr className="bg-indigo-50/30">
          <td colSpan={7} className="px-6 py-4">
            {loadingHist ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Loading login history...
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-indigo-700 mb-3 uppercase tracking-wide">
                </p>

                {todayHistory.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {todayHistory.map((h, i) => (
                      <div key={i} className={`flex flex-wrap items-center gap-3 rounded-lg px-4 py-2.5 border text-sm ${
                        h.status === 'SUCCESS' ? 'bg-white border-green-100' :
                        h.status === 'BLOCKED' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-100'
                      }`}>
                        <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                        <LoginBadge status={h.status} />
                        <span className="font-semibold text-gray-700 flex items-center gap-1">
                          <LogIn size={13} className="text-gray-400" />
                          {fmtTime(h.loginTime)}
                        </span>
                        {h.loginMethod && (
                          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {h.loginMethod.replace(/_/g, ' ')}
                          </span>
                        )}
                        {h.deviceInfo && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Smartphone size={11} /> {h.deviceInfo}
                          </span>
                        )}
                        {h.browserInfo && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Globe size={11} /> {h.browserInfo}
                          </span>
                        )}
                        {h.failureReason && (
                          <span className="text-xs text-red-500 italic">{h.failureReason}</span>
                        )}
                        {h.ipAddress && (
                          <span className="text-xs text-gray-400 ml-auto font-mono">{h.ipAddress}</span>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-4 pt-1 text-xs">
                      <span className="text-green-600 font-semibold">✅ {todaySuccess.length} successful</span>
                      {todayFailed.length > 0 && <span className="text-red-500 font-semibold">❌ {todayFailed.length} failed/blocked</span>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic mb-4">No login attempts today.</p>
                )}

                {/* Full history summary */}
                {history && history.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs font-semibold text-indigo-600 cursor-pointer hover:text-indigo-800">
                      📋 Full history ({history.length} records)
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            {['#','Status','Date & Time','Method','Device','Browser','IP','Reason'].map(h => (
                              <th key={h} className="text-left py-2 px-2 font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {history.slice(0, 30).map((h, i) => (
                            <tr key={i} className="border-b border-gray-50 hover:bg-white">
                              <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                              <td className="py-1.5 px-2"><LoginBadge status={h.status} /></td>
                              <td className="py-1.5 px-2 whitespace-nowrap">{fmtDateTime(h.loginTime)}</td>
                              <td className="py-1.5 px-2 text-indigo-600">{h.loginMethod || '—'}</td>
                              <td className="py-1.5 px-2">{h.deviceInfo || '—'}</td>
                              <td className="py-1.5 px-2">{h.browserInfo || '—'}</td>
                              <td className="py-1.5 px-2 font-mono text-gray-400">{h.ipAddress || '—'}</td>
                              <td className="py-1.5 px-2 text-red-500">{h.failureReason || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {history.length > 30 && (
                        <p className="text-xs text-center text-gray-400 py-2">Showing 30 of {history.length} records</p>
                      )}
                    </div>
                  </details>
                )}

                {/* ── Website Activity (searches, pages, cart, products) ── */}
                <div className="mt-4 pt-4 border-t border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide">
                    🌐 Website Activity
                  </p>
                  <ActivityPanel customerId={customer.id} />
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
const UserAnalyticsDashboard = () => {
  const [customers, setCustomers]     = useState([]);
  const [loginStats, setLoginStats]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all'); // all | online | offline
  const [days, setDays]               = useState(30);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Load customers + their last login time (from login history)
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);

    const [custs, stats, activeSessions] = await Promise.all([
      apiFetch(`${BASE}/auth/admin/customers`),
      apiFetch(`${BASE}/auth/admin/login-stats?days=${days}`),
      apiFetch(`${BASE}/auth/admin/active-sessions`),
    ]);

    if (!custs) { setError(true); setLoading(false); return; }

    // Build a Set of user IDs that have an active session right now
    const activeUserIds = new Set(
      Array.isArray(activeSessions)
        ? activeSessions.map(s => String(s.userId || s.id || s.customerId)).filter(Boolean)
        : []
    );
    // ── Filter: only regular customers (USER role) ──────────────────────────
    const WAREHOUSE_ROLES = ['WAREHOUSE_MANAGER','RECEIVING','AUDITOR','PICKER','PACKER','SHIPPING','VIEWER',
      'RECEIVING_CLERK','PICK_STAFF','PACK_STAFF','SHIPPING_STAFF','AUDIT_STAFF','VIEW_STAFF'];
    const customerOnly = custs.filter(c => {
      if (c.isAdmin === true) return false;
      if (c.isDeliveryBoy === true) return false;
      if (c.isWarehouseStaff === true) return false;
      const role = (c.role || c.userRole || '').toUpperCase();
      if (WAREHOUSE_ROLES.includes(role)) return false;
      if (role === 'ADMIN' || role === 'DELIVERY_BOY') return false;
      return true; // USER role only
    });

    // For each customer, fetch their most recent login from login-history
    const enriched = await enrichWithLastLogin(customerOnly, activeUserIds);

    setCustomers(enriched);
    setLoginStats(stats);
    setLastRefresh(new Date());
    setLoading(false);
  }, [days]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
  }, [loadData]);

  // Enrich customers with their last successful login time
  async function enrichWithLastLogin(custs, activeUserIds = new Set()) {
    // Fetch login history for all customers in parallel (batched to avoid flooding)
    const BATCH = 10;
    const result = [...custs];

    for (let i = 0; i < result.length; i += BATCH) {
      const batch = result.slice(i, i + BATCH);
      const histories = await Promise.all(
        batch.map(c => apiFetch(`${BASE}/auth/admin/login-history/${c.id}`))
      );
      histories.forEach((hist, j) => {
        const customer = result[i + j];
        // Mark as online if they have an active session
        customer._isOnline = activeUserIds.has(String(customer.id));

        if (!Array.isArray(hist) || hist.length === 0) return;
        // Find most recent SUCCESS login
        const successes = hist
          .filter(h => h.status === 'SUCCESS')
          .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));
        if (successes.length > 0) {
          customer._lastLoginIso = successes[0].loginTime;
        }
      });
    }
    return result;
  }

  // Derived counts
  const onlineCount  = customers.filter(c => isOnline(c._lastLoginIso, c._isOnline === true)).length;
  const offlineCount = customers.length - onlineCount;

  // Filter + search
  const filtered = customers.filter(c => {
    const online = isOnline(c._lastLoginIso, c._isOnline === true);
    if (filter === 'online'  && !online) return false;
    if (filter === 'offline' &&  online) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      return name.includes(q) || (c.email || '').toLowerCase().includes(q) || String(c.id).includes(q);
    }
    return true;
  });

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            User Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Only customer accounts · Online/Offline · Login history · Website activity
            {lastRefresh && <span className="ml-3 text-gray-400">· Refreshed {timeAgo(lastRefresh.toISOString())}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users,     label: 'Total Customers', value: fmt(customers.length), color: '#6366f1' },
          { icon: Activity,  label: '🟢 Online Now',   value: fmt(onlineCount),      color: '#10b981' },
          { icon: Clock,     label: '🔴 Offline',      value: fmt(offlineCount),     color: '#9ca3af' },
          { icon: Shield,    label: 'Logins (Success)', value: fmt(loginStats?.SUCCESS || 0), color: '#10b981' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Login Stats */}
      {loginStats && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="text-sm font-semibold text-gray-800 mb-3">
            Login Statistics — Last {days} days
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '✅ Successful', value: loginStats.SUCCESS || 0, color: '#10b981' },
              { label: '❌ Failed',     value: loginStats.FAILED  || 0, color: '#f97316' },
              { label: '🚫 Blocked',   value: loginStats.BLOCKED || 0, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold" style={{ color: s.color }}>{fmt(s.value)}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or ID..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'all',     label: `All (${customers.length})` },
            { id: 'online',  label: `🟢 Online (${onlineCount})` },
            { id: 'offline', label: `🔴 Offline (${offlineCount})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                filter === f.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && customers.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading customers & login history...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-gray-400">
            <Activity size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">Could not load customer data</p>
            <p className="text-sm mt-1">Make sure auth-server is running on port 2000</p>
            <button onClick={loadData} className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Today Logins</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Login</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">History</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map(c => <CustomerRow key={c.id} customer={c} />)
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400">
                      <Users size={36} className="mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No customers found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && !loading && (
          <div className="px-4 py-3 border-t border-gray-50 bg-gray-50 text-xs text-gray-400 flex items-center justify-between">
            <span>Showing {filtered.length} of {customers.length} customers</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Auto-refreshes every 30 seconds
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAnalyticsDashboard;
