/**
 * RealTimeAnalyticsDashboard.js
 * Complete Real-Time User Analytics & Activity Tracking Dashboard for Admin.
 * Covers: live counters, funnel, devices, traffic, geo, fraud alerts, top products, hourly heatmap.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, FunnelChart, Funnel, LabelList,
} from 'recharts';
import {
  Users, Activity, ShoppingCart, TrendingUp, AlertTriangle,
  Eye, Search, CreditCard, Package, RefreshCw, Wifi, WifiOff,
  Monitor, Smartphone, Tablet, Globe, Clock, Zap, Shield,
  ArrowUp, ArrowDown, BarChart2, MapPin, Target,
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';

// ─── Color palette ─────────────────────────────────────────────────────────
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const SEVERITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#10b981' };

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtRupee = (n) => `₹${fmt(n)}`;
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;
const timeAgo = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = '#6366f1', trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
          trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
        }`}>
          {trendUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {trend}
        </div>
      )}
    </div>
  );
}

// ─── Live Pulse Dot ────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
    </span>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, badge, color = '#6366f1' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {badge && (
        <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{badge}</span>
      )}
    </div>
  );
}

// ─── Conversion Funnel ─────────────────────────────────────────────────────
function ConversionFunnel({ data }) {
  if (!data || data.length === 0) return null;
  const max = data[0]?.count || 1;
  return (
    <div className="space-y-2">
      {data.map((stage, i) => {
        const width = Math.round((stage.count / max) * 100);
        const dropOff = i > 0 ? (((data[i - 1].count - stage.count) / data[i - 1].count) * 100).toFixed(1) : null;
        return (
          <div key={stage.stage}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-gray-700">{stage.stage}</span>
              <div className="flex items-center gap-3">
                {dropOff && (
                  <span className="text-red-400">-{dropOff}%</span>
                )}
                <span className="font-semibold text-gray-900">{fmt(stage.count)}</span>
                <span className="text-gray-400 w-10 text-right">{fmtPct(stage.percentage)}</span>
              </div>
            </div>
            <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center pl-2 transition-all duration-700"
                style={{ width: `${width}%`, background: COLORS[i % COLORS.length] }}
              >
                {width > 15 && <span className="text-white text-xs font-medium">{stage.stage}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Fraud Alert Card ──────────────────────────────────────────────────────
function FraudAlertCard({ alert }) {
  const color = SEVERITY_COLORS[alert.severity] || '#6b7280';
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}>
        <Shield size={14} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>
            {alert.severity}
          </span>
          <span className="text-xs text-gray-500">{alert.type?.replace(/_/g, ' ')}</span>
        </div>
        <p className="text-xs text-gray-700 leading-snug">{alert.message}</p>
        <p className="text-xs text-gray-400 mt-1">{timeAgo(alert.timestamp)}</p>
      </div>
    </div>
  );
}

// ─── Hourly Heatmap ────────────────────────────────────────────────────────
function HourlyHeatmap({ data }) {
  if (!data || data.length === 0) return null;
  const maxUsers = Math.max(...data.map(d => d.users), 1);
  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {data.map((d) => {
          const intensity = d.users / maxUsers;
          const bg = intensity > 0.8 ? '#6366f1' : intensity > 0.6 ? '#818cf8'
            : intensity > 0.4 ? '#a5b4fc' : intensity > 0.2 ? '#c7d2fe' : '#e0e7ff';
          return (
            <div key={d.hour} className="relative group">
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium cursor-default transition-transform hover:scale-110"
                style={{ background: bg, color: intensity > 0.5 ? '#fff' : '#4338ca' }}
              >
                {d.hour}
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10
                bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
                {d.label}: {fmt(d.users)} users, {fmt(d.orders)} orders
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <span>Low</span>
        {['#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1'].map((c, i) => (
          <div key={i} className="w-5 h-3 rounded" style={{ background: c }} />
        ))}
        <span>High</span>
      </div>
    </div>
  );
}

// ─── Top Products Table ────────────────────────────────────────────────────
function TopProductsTable({ products }) {
  if (!products || products.length === 0) return <p className="text-sm text-gray-400 text-center py-4">No data</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">#</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Product</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Views</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Cart Adds</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Orders</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Conv%</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => {
            const conv = p.views > 0 ? ((p.orders / p.views) * 100).toFixed(1) : '0.0';
            return (
              <tr key={p.id || i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2.5 px-3 text-gray-400 font-medium">{i + 1}</td>
                <td className="py-2.5 px-3">
                  <p className="font-medium text-gray-800 truncate max-w-[160px]">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.category}</p>
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-gray-700">{fmt(p.views)}</td>
                <td className="py-2.5 px-3 text-right text-blue-600 font-medium">{fmt(p.cartAdds)}</td>
                <td className="py-2.5 px-3 text-right text-green-600 font-medium">{fmt(p.orders)}</td>
                <td className="py-2.5 px-3 text-right">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    Number(conv) >= 5 ? 'bg-green-100 text-green-700' :
                    Number(conv) >= 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
                  }`}>{conv}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────────
export default function RealTimeAnalyticsDashboard() {
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isLive, setIsLive] = useState(true);

  const [realtime, setRealtime] = useState(null);
  const [overview, setOverview] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [devices, setDevices] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [geo, setGeo] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(null);

  const liveTimerRef = useRef(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rt, ov, tp, fn, dv, tr, hr, gd, fa, ou] = await Promise.all([
        analyticsService.getRealtimeStats(),
        analyticsService.getAdminOverview(period),
        analyticsService.getTopProducts(),
        analyticsService.getFunnelData(),
        analyticsService.getDeviceData(),
        analyticsService.getTrafficSources(),
        analyticsService.getHourlyActivity(),
        analyticsService.getGeoData(),
        analyticsService.getFraudAlerts(),
        analyticsService.getOnlineUsers(period),
      ]);
      setRealtime(rt);
      setOverview(ov);
      setTopProducts(tp || []);
      setFunnel(fn || []);
      setDevices(dv);
      setTraffic(tr || []);
      setHourly(hr || []);
      setGeo(gd || []);
      setFraudAlerts(fa || []);
      setOnlineUsers(ou);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [period]);

  // Initial load + period change
  useEffect(() => { loadAll(); }, [loadAll]);

  // Live auto-refresh every 15s for realtime stats only
  useEffect(() => {
    if (!isLive) { clearInterval(liveTimerRef.current); return; }
    liveTimerRef.current = setInterval(async () => {
      const rt = await analyticsService.getRealtimeStats();
      setRealtime(rt);
      setLastRefresh(new Date());
    }, 15000);
    return () => clearInterval(liveTimerRef.current);
  }, [isLive]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'funnel', label: 'Funnel', icon: Target },
    { id: 'products', label: 'Top Products', icon: Package },
    { id: 'devices', label: 'Devices & Traffic', icon: Monitor },
    { id: 'geo', label: 'Geography', icon: MapPin },
    { id: 'activity', label: 'Activity', icon: Clock },
    { id: 'fraud', label: 'Fraud Alerts', icon: Shield },
    { id: 'users', label: 'Live Users', icon: Users },
  ];

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Real-Time Analytics</h1>
            <LiveDot />
          </div>
          <p className="text-sm text-gray-500">
            Live user activity, behavior tracking & fraud detection
            {lastRefresh && <span className="ml-2 text-gray-400">· Updated {timeAgo(lastRefresh.toISOString())}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={period}
            onChange={e => setPeriod(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={() => setIsLive(l => !l)}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border font-medium transition-colors ${
              isLive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            {isLive ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={loadAll}
            disabled={loading}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Live KPI Strip ── */}
      {realtime && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: 'Active Users', value: fmt(realtime.activeUsers), color: '#10b981', icon: Users },
            { label: 'Online Now', value: fmt(realtime.onlineUsers), color: '#6366f1', icon: Wifi },
            { label: 'Events/min', value: fmt(realtime.eventsPerMinute), color: '#8b5cf6', icon: Zap },
            { label: 'Logins Today', value: fmt(realtime.todayLogins), color: '#06b6d4', icon: Activity },
            { label: 'Orders Today', value: fmt(realtime.todayOrders), color: '#f59e0b', icon: ShoppingCart },
            { label: 'Revenue Today', value: fmtRupee(realtime.todayRevenue), color: '#10b981', icon: TrendingUp },
            { label: 'Conversion', value: `${realtime.conversionRate}%`, color: '#6366f1', icon: Target },
            { label: 'Cart Abandon', value: `${realtime.cartAbandonmentRate}%`, color: '#ef4444', icon: AlertTriangle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
              <div className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={14} style={{ color }} />
              </div>
              <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {loading && !realtime ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading analytics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ══ OVERVIEW TAB ══ */}
          {tab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Users" value={fmt(overview.totalUsers)} sub={`+${fmt(overview.newUsers)} new`} color="#6366f1" trend="12%" trendUp />
                <StatCard icon={Activity} label="Total Sessions" value={fmt(overview.totalSessions)} sub={`Avg ${overview.avgSessionDuration}m/session`} color="#10b981" trend="8%" trendUp />
                <StatCard icon={ShoppingCart} label="Total Orders" value={fmt(overview.totalOrders)} sub={`${overview.conversionRate}% conversion`} color="#f59e0b" trend="5%" trendUp />
                <StatCard icon={TrendingUp} label="Total Revenue" value={fmtRupee(overview.totalRevenue)} sub={`Bounce: ${overview.bounceRate}%`} color="#8b5cf6" trend="15%" trendUp />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-500 font-medium mb-1">New vs Returning</p>
                  <div className="flex items-end gap-3 mt-2">
                    <div className="flex-1">
                      <div className="h-2 bg-indigo-500 rounded-full mb-1" style={{ width: `${Math.round((overview.newUsers / (overview.newUsers + overview.returningUsers)) * 100)}%` }} />
                      <p className="text-xs text-gray-500">New: <span className="font-semibold text-gray-800">{fmt(overview.newUsers)}</span></p>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-green-500 rounded-full mb-1" style={{ width: `${Math.round((overview.returningUsers / (overview.newUsers + overview.returningUsers)) * 100)}%` }} />
                      <p className="text-xs text-gray-500">Returning: <span className="font-semibold text-gray-800">{fmt(overview.returningUsers)}</span></p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-500 font-medium mb-1">Cart Abandonment</p>
                  <p className="text-3xl font-bold text-red-500">{overview.cartAbandonmentRate}%</p>
                  <p className="text-xs text-gray-400 mt-1">of carts never reach checkout</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-500 font-medium mb-1">Total Events Tracked</p>
                  <p className="text-3xl font-bold text-indigo-600">{fmt(overview.totalEvents)}</p>
                  <p className="text-xs text-gray-400 mt-1">across {period} days</p>
                </div>
              </div>
            </div>
          )}

          {/* ══ FUNNEL TAB ══ */}
          {tab === 'funnel' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <SectionHeader icon={Target} title="Conversion Funnel" color="#6366f1" />
                <ConversionFunnel data={funnel} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <SectionHeader icon={BarChart2} title="Funnel Drop-off Analysis" color="#ef4444" />
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={funnel} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ══ TOP PRODUCTS TAB ══ */}
          {tab === 'products' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <SectionHeader icon={Package} title="Top Products by Engagement" badge={`${topProducts.length} products`} color="#f59e0b" />
              <TopProductsTable products={topProducts} />
            </div>
          )}

          {/* ══ DEVICES & TRAFFIC TAB ══ */}
          {tab === 'devices' && devices && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <SectionHeader icon={Monitor} title="Device Types" color="#6366f1" />
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={devices.deviceTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}%`}>
                      {devices.deviceTypes.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {devices.deviceTypes.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <SectionHeader icon={Globe} title="Traffic Sources" color="#10b981" />
                <div className="space-y-3 mt-2">
                  {traffic.map((t, i) => (
                    <div key={t.source}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{t.source}</span>
                        <span className="text-gray-500">{fmt(t.users)} users · {t.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${t.percentage}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <SectionHeader icon={Globe} title="Browsers" color="#8b5cf6" />
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={devices.browsers}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {devices.browsers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <SectionHeader icon={Smartphone} title="Operating Systems" color="#06b6d4" />
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={devices.os}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {devices.os.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ══ GEO TAB ══ */}
          {tab === 'geo' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <SectionHeader icon={MapPin} title="Region-wise User Distribution" badge={`${geo.length} regions`} color="#10b981" />
              <div className="space-y-3 mt-2">
                {geo.map((g, i) => (
                  <div key={g.region} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-28 truncate">{g.region}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center pl-2 transition-all duration-700"
                        style={{ width: `${g.percentage}%`, background: COLORS[i % COLORS.length] }}
                      >
                        {g.percentage > 10 && <span className="text-white text-xs font-medium">{g.percentage}%</span>}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 w-16 text-right">{fmt(g.users)}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{g.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ ACTIVITY TAB ══ */}
          {tab === 'activity' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <SectionHeader icon={Clock} title="Peak Activity Hours (24h)" color="#6366f1"
                  badge="Hover for details" />
                <HourlyHeatmap data={hourly} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <SectionHeader icon={BarChart2} title="Hourly Users & Orders" color="#10b981" />
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={hourly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="users" name="Users" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="orders" name="Orders" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ══ FRAUD ALERTS TAB ══ */}
          {tab === 'fraud' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Fraud Detection Active</p>
                  <p className="text-xs text-red-500">Monitoring: brute force, bot traffic, suspicious orders, multi-location logins, payment failures</p>
                </div>
                <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                  {fraudAlerts.length} alerts
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fraudAlerts.length > 0 ? fraudAlerts.map(alert => (
                  <FraudAlertCard key={alert.id} alert={alert} />
                )) : (
                  <div className="col-span-2 text-center py-12 text-gray-400">
                    <Shield size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No fraud alerts detected</p>
                    <p className="text-sm mt-1">System is monitoring all user activity</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ LIVE USERS TAB ══ */}
          {tab === 'users' && onlineUsers && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Currently Online" value={fmt(onlineUsers.currentlyOnlineUsers)} color="#10b981" />
                <StatCard icon={Activity} label="Active Users" value={fmt(onlineUsers.totalActiveUsers)} sub={`Last ${period} days`} color="#6366f1" />
                <StatCard icon={Clock} label="Sessions Today" value={fmt(onlineUsers.totalSessionsToday)} color="#f59e0b" />
                <StatCard icon={TrendingUp} label="Avg Session" value={`${Math.round(onlineUsers.averageSessionDuration || 0)}m`} color="#8b5cf6" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <SectionHeader icon={Users} title="Currently Online" badge={`${onlineUsers.currentlyOnlineUsers} live`} color="#10b981" />
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(onlineUsers.currentlyOnline || []).length > 0 ? (onlineUsers.currentlyOnline || []).map(u => (
                      <div key={u.userId} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(u.userName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.userName}</p>
                          <p className="text-xs text-gray-400">{u.ipAddress}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-green-600">{u.minutesOnline}m online</p>
                          <p className="text-xs text-gray-400">{u.lastActivity ? timeAgo(u.lastActivity) : ''}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-gray-400 text-center py-8">No users currently online</p>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <SectionHeader icon={TrendingUp} title="Most Active Users" color="#6366f1" />
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(onlineUsers.mostActiveUsers || []).map((u, i) => (
                      <div key={u.userId} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-500' : 'bg-indigo-500'
                        }`}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] : (u.userName || 'U').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.userName}</p>
                          <p className="text-xs text-gray-400">{u.lastLogin ? `Last: ${timeAgo(u.lastLogin)}` : ''}</p>
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 flex-shrink-0">{u.sessionCount} sessions</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
