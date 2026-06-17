
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Truck, UserPlus, UserMinus, RefreshCw, CheckCircle, Clock,
  MapPin, Zap, AlertCircle, Activity, Eye, ChevronDown, ChevronUp,
  DollarSign, FileText, XCircle, Users, Package, TrendingUp, Star
} from 'lucide-react';
import { imsService } from '../../services/imsApi';
import { pushNotification } from '../../services/notificationStore';

const API = 'http://localhost:9999/api';

const getHeaders = () => {
  const token = sessionStorage.getItem('adminToken') || localStorage.getItem('authToken') || localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

const fmtDate = (v) => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtAmt  = (v) => v != null ? `₹${parseFloat(v).toFixed(2)}` : '—';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:   '#6366f1',
  primaryDk: '#4f46e5',
  green:     '#16a34a',
  amber:     '#d97706',
  red:       '#dc2626',
  blue:      '#0891b2',
  purple:    '#7c3aed',
  gray:      '#6b7280',
  border:    '#e5e7eb',
  bg:        '#f8fafc',
  card:      '#ffffff',
  text:      '#111827',
  textSub:   '#6b7280',
};

// ── Status configs ────────────────────────────────────────────────────────────
const LIVE_STATUS = {
  AVAILABLE:  { label: 'Available',  color: C.green,  bg: '#dcfce7', dot: '#22c55e' },
  BUSY:       { label: 'Busy',       color: C.amber,  bg: '#fef3c7', dot: '#f59e0b' },
  ON_BREAK:   { label: 'On Break',   color: C.blue,   bg: '#e0f2fe', dot: '#38bdf8' },
  OFFLINE:    { label: 'Offline',    color: C.gray,   bg: '#f3f4f6', dot: '#9ca3af' },
};

/**
 * If a delivery boy's status is AVAILABLE/BUSY but their status record
 * hasn't been updated in the last 30 minutes, treat them as OFFLINE.
 * This prevents stale "online" dots when the delivery boy is not actually logged in.
 */
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

const parseTimestamp = (v) => {
  if (!v) return null;
  // Java LocalDateTime serialized as array: [year, month, day, hour, min, sec, nano]
  if (Array.isArray(v)) {
    const [year, month, day, hour = 0, min = 0, sec = 0] = v;
    return new Date(year, month - 1, day, hour, min, sec);
  }
  return new Date(v);
};

const getEffectiveStatus = (sd) => {
  if (!sd) return 'OFFLINE';
  const status = sd.status || 'OFFLINE';
  if (status === 'OFFLINE' || status === 'ON_BREAK') return status;
  // For AVAILABLE / BUSY — check if the record is stale
  const ts = parseTimestamp(sd.updatedAt) || parseTimestamp(sd.lastOnlineAt);
  if (!ts || isNaN(ts.getTime())) return 'OFFLINE'; // no valid timestamp → assume offline
  const age = Date.now() - ts.getTime();
  if (age > STALE_THRESHOLD_MS) return 'OFFLINE';
  return status;
};

const APP_STATUS = {
  PENDING:      { label: 'Pending',      color: C.amber,  bg: '#fef3c7', icon: '⏳' },
  UNDER_REVIEW: { label: 'Under Review', color: C.blue,   bg: '#e0f2fe', icon: '🔍' },
  APPROVED:     { label: 'Approved',     color: C.green,  bg: '#dcfce7', icon: '✅' },
  REJECTED:     { label: 'Rejected',     color: C.red,    bg: '#fee2e2', icon: '❌' },
};

const DEL_STATUS = {
  ASSIGNED:         { label: 'Assigned',       color: C.primary, bg: '#eef2ff', icon: '📋' },
  OUT_FOR_DELIVERY: { label: 'Out for Del.',   color: C.blue,    bg: '#e0f2fe', icon: '🚚' },
  DELIVERED:        { label: 'Delivered',      color: C.green,   bg: '#dcfce7', icon: '✅' },
  FAILED:           { label: 'Failed',         color: C.red,     bg: '#fee2e2', icon: '❌' },
  CASH_REFUND_PENDING: { label: 'Cash Refund', color: C.amber,   bg: '#fef3c7', icon: '💵' },
  CASH_REFUND_DONE:    { label: 'Refund Done', color: C.green,   bg: '#dcfce7', icon: '✅' },
};

const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];

// ── Reusable atoms ────────────────────────────────────────────────────────────
const Badge = ({ cfg, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg?.color || C.gray, background: cfg?.bg || '#f3f4f6', whiteSpace: 'nowrap' }}>
    {cfg?.icon && <span>{cfg.icon}</span>}
    {label || cfg?.label}
  </span>
);

const LiveDot = ({ status }) => {
  const cfg = LIVE_STATUS[status] || LIVE_STATUS.OFFLINE;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0, boxShadow: status === 'AVAILABLE' ? `0 0 0 3px ${cfg.dot}33` : 'none', animation: status === 'AVAILABLE' ? 'pulse 2s infinite' : 'none' }} />
      {cfg.label}
    </span>
  );
};

const KPI = ({ label, value, color, icon, sub, onClick, active }) => (
  <div onClick={onClick} style={{ background: C.card, borderRadius: 14, padding: '18px 20px', border: `1.5px solid ${active ? color : C.border}`, boxShadow: active ? `0 4px 16px ${color}22` : '0 1px 4px rgba(0,0,0,0.05)', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.18s', display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ color, background: `${color}18`, borderRadius: 8, padding: 6, display: 'flex' }}>{icon}</span>
    </div>
    <span style={{ fontSize: 28, fontWeight: 800, color: active ? color : C.text, lineHeight: 1 }}>{value}</span>
    {sub && <span style={{ fontSize: 11, color: C.textSub }}>{sub}</span>}
  </div>
);

const Th = ({ children }) => (
  <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: `1.5px solid ${C.border}`, whiteSpace: 'nowrap' }}>{children}</th>
);
const Td = ({ children, mono }) => (
  <td style={{ padding: '12px 16px', borderBottom: `1px solid #f1f5f9`, fontSize: 13, color: C.text, fontFamily: mono ? 'monospace' : undefined }}>{children}</td>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function DeliveryBoyManagement() {
  const [activeTab, setActiveTab]   = useState('applications');
  const [customers, setCustomers]   = useState([]);
  const [dbEmails, setDbEmails]     = useState([]);
  const [statuses, setStatuses]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [cashRefunds, setCashRefunds] = useState([]);
  const [summary, setSummary]       = useState(null);
  const [applications, setApplications] = useState([]);
  const [appStats, setAppStats]     = useState(null);

  const [loading, setLoading]       = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [toast, setToast]           = useState(null);
  const [search, setSearch]         = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedBoy, setExpandedBoy] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [registerModal, setRegisterModal] = useState(null);
  const [registerZone, setRegisterZone]   = useState('Zone A');

  const pollRef = useRef(null);

  const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast(null), 3500); };

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    try {
      const [cr, dr] = await Promise.all([
        fetch(`${API}/auth/admin/customers`, { headers: getHeaders() }),
        fetch(`${API}/auth/admin/delivery-boys`, { headers: getHeaders() }),
      ]);
      if (cr.ok) setCustomers(await cr.json());
      if (dr.ok) setDbEmails(await dr.json());
    } catch (_) {}
  }, []);

  const fetchStatuses = useCallback(async () => {
    try {
      const [sr, smr, ar] = await Promise.all([
        fetch(`${API}/auth/admin/delivery-boys/status`, { headers: getHeaders() }),
        fetch(`${API}/auth/admin/delivery-boys/status/summary`, { headers: getHeaders() }),
        fetch(`${API}/auth/admin/delivery/assignments`, { headers: getHeaders() }),
      ]);
      if (sr.ok)  setStatuses(await sr.json());
      if (smr.ok) setSummary(await smr.json());
      if (ar.ok)  setAssignments(await ar.json());
    } catch (_) {}
  }, []);

  const fetchCash = useCallback(async () => {
    try { const t = await imsService.deliveryBoy.getAllCashRefundTasks(); setCashRefunds(Array.isArray(t) ? t : []); } catch (_) {}
  }, []);

  const fetchApps = useCallback(async () => {
    setAppLoading(true);
    try {
      const [ar, sr] = await Promise.all([
        fetch(`${API}/auth/admin/delivery/applications`, { headers: getHeaders() }),
        fetch(`${API}/auth/admin/delivery/applications/stats`, { headers: getHeaders() }),
      ]);
      if (ar.ok) setApplications(await ar.json());
      if (sr.ok) setAppStats(await sr.json());
    } catch (_) {}
    finally { setAppLoading(false); }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRoles(), fetchStatuses(), fetchCash(), fetchApps()]);
    setLoading(false);
  }, [fetchRoles, fetchStatuses, fetchCash, fetchApps]);

  useEffect(() => {
    loadAll();
    pollRef.current = setInterval(fetchStatuses, 15000);
    return () => clearInterval(pollRef.current);
  }, [loadAll, fetchStatuses]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const addRole = async (id) => {
    try {
      const r = await fetch(`${API}/auth/admin/delivery-boy/add?customerId=${id}`, { method: 'POST', headers: getHeaders() });
      if (r.ok) { showToast('success', 'Role assigned!'); fetchRoles(); } else showToast('error', 'Failed');
    } catch (e) { showToast('error', e.message); }
  };

  const removeRole = async (id) => {
    try {
      const r = await fetch(`${API}/auth/admin/delivery-boy/remove?customerId=${id}`, { method: 'DELETE', headers: getHeaders() });
      if (r.ok) { showToast('success', 'Role removed'); fetchRoles(); } else showToast('error', 'Failed');
    } catch (e) { showToast('error', e.message); }
  };

  const registerTracking = async (boy, zone) => {
    try {
      const r = await fetch(`${API}/auth/admin/delivery-boys/status/register`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ deliveryBoyId: boy.id, name: `${boy.firstName||''} ${boy.lastName||''}`.trim(), email: boy.email, phone: boy.phoneNumber||'', zone }),
      });
      if (r.ok) { showToast('success', 'Registered for tracking!'); setRegisterModal(null); fetchStatuses(); }
      else showToast('error', 'Registration failed');
    } catch (e) { showToast('error', e.message); }
  };

  const updateZone = async (statusId, zone) => {
    try {
      const r = await fetch(`${API}/auth/admin/delivery-boys/status/${statusId}/zone?zone=${encodeURIComponent(zone)}`, { method: 'PATCH', headers: getHeaders() });
      if (r.ok) { showToast('success', `Zone → ${zone}`); fetchStatuses(); }
    } catch (_) {}
  };

  const approveApp = async (app) => {
    setActionLoading(app.id + '_a');
    try {
      const r = await fetch(`${API}/auth/admin/delivery/applications/${app.id}/approve`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ remarks: 'Welcome to the team!' }),
      });
      if (r.ok) {
        showToast('success', `✅ ${app.firstName} approved! Email sent.`);
        pushNotification({ type: 'DELIVERY_APPROVED', title: '🚚 New Delivery Partner', message: `${app.firstName} ${app.lastName} approved.`, source: 'ADMIN' });
        setSelectedApp(null); fetchApps(); fetchRoles();
      } else { const d = await r.json(); showToast('error', d.error || 'Failed'); }
    } catch (e) { showToast('error', e.message); }
    finally { setActionLoading(null); }
  };

  const rejectApp = async (app) => {
    if (!rejectReason.trim()) { showToast('error', 'Select a reason'); return; }
    setActionLoading(app.id + '_r');
    try {
      const r = await fetch(`${API}/auth/admin/delivery/applications/${app.id}/reject`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ reason: rejectReason }),
      });
      if (r.ok) { showToast('success', 'Rejected. Email sent.'); setSelectedApp(null); setRejectReason(''); fetchApps(); }
      else showToast('error', 'Failed');
    } catch (e) { showToast('error', e.message); }
    finally { setActionLoading(null); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const isDB = (email) => dbEmails.includes(email);
  const dbCustomers = customers.filter(c => isDB(c.email));
  const enriched = dbCustomers.map(c => ({ ...c, sd: statuses.find(s => s.deliveryBoyId === c.id || s.deliveryBoyEmail === c.email) }));

  const filteredPool = enriched.filter(b => {
    const q = search.toLowerCase();
    const matchQ = `${b.firstName} ${b.lastName} ${b.email}`.toLowerCase().includes(q);
    const matchZ = zoneFilter === 'ALL' || b.sd?.assignedZone === zoneFilter;
    const matchS = statusFilter === 'ALL' || getEffectiveStatus(b.sd) === statusFilter;
    return matchQ && matchZ && matchS;
  });

  const pendingCash = cashRefunds.filter(t => t.deliveryStatus === 'CASH_REFUND_PENDING').length;
  const pendingApps = appStats?.pending || 0;
  const activeAssign = assignments.filter(a => a.deliveryStatus === 'ASSIGNED').length;

  const TABS = [
    { key: 'applications', label: 'Applications',  icon: FileText,   badge: pendingApps },
    { key: 'pool',         label: 'Delivery Pool', icon: Users,      badge: dbCustomers.length },
    { key: 'assignments',  label: 'Assignments',   icon: Package,    badge: activeAssign || null },
    { key: 'cashRefunds',  label: 'Cash Refunds',  icon: DollarSign, badge: pendingCash || null },
  ];

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'Inter','Segoe UI',sans-serif", background: C.bg, minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .db-row:hover { background: #f8faff !important; }
        .db-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; transform: translateY(-2px); }
        .kpi-card:hover { transform: translateY(-2px); }
        .tab-btn:hover { color: ${C.primary} !important; }
        .zone-pill:hover { border-color: ${C.primary} !important; color: ${C.primary} !important; }
        .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${C.primary},${C.primaryDk})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 18px ${C.primary}44` }}>
            <Truck size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>Delivery Management</h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: C.textSub, display: 'flex', alignItems: 'center', gap: 8 }}>
              Real-time pool · Applications · Assignments
              <span style={{ padding: '2px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>● LIVE</span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="action-btn" onClick={loadAll} disabled={loading}
            style={{ padding: '9px 16px', background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.text, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeUp 0.2s ease',
          background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color:      toast.type === 'success' ? '#166534'  : '#991b1b',
          border:     `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.text}
        </div>
      )}

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 28 }}>
        <KPI label="Total Partners"   value={dbCustomers.length}                                                                    color={C.primary} icon={<Truck size={16} />} />
        <KPI label="Available"        value={statuses.filter(s => getEffectiveStatus(s) === 'AVAILABLE').length}                     color={C.green}   icon={<CheckCircle size={16} />} sub="Ready for orders" />
        <KPI label="On Delivery"      value={statuses.filter(s => getEffectiveStatus(s) === 'BUSY').length}                          color={C.amber}   icon={<Activity size={16} />} />
        <KPI label="Offline"          value={statuses.filter(s => getEffectiveStatus(s) === 'OFFLINE').length}                       color={C.gray}    icon={<AlertCircle size={16} />} />
        <KPI label="Pending Apps"     value={pendingApps}                                                          color={C.purple}  icon={<FileText size={16} />} sub="Awaiting review" />
        <KPI label="Cash Refunds"     value={pendingCash}                                                          color={C.red}     icon={<DollarSign size={16} />} />
      </div>

      {/* ── Horizontal Pill Tabs — always one row, scrollable ── */}
      <div style={{
        display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
        gap: 8, marginBottom: 24,
        overflowX: 'auto', paddingBottom: 4,
        /* hide scrollbar but keep scroll */
        msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                flexShrink: 0,
                padding: '7px 18px', borderRadius: 20, cursor: 'pointer',
                border: `1.5px solid ${active ? C.primary : C.border}`,
                background: active ? '#eef2ff' : 'transparent',
                color: active ? C.primary : C.textSub,
                fontSize: 13, fontWeight: active ? 700 : 500,
                display: 'inline-flex', alignItems: 'center', gap: 7,
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>
              <Icon size={13} />
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                  background: active ? C.primary : '#e5e7eb',
                  color: active ? '#fff' : C.textSub,
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB: APPLICATIONS
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'applications' && (
        <div style={{ animation: 'fadeUp 0.2s ease' }}>
          {/* App Stats */}
          {appStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total',        value: appStats.total,       color: C.gray },
                { label: '⏳ Pending',   value: appStats.pending,     color: C.amber },
                { label: '🔍 Reviewing', value: appStats.underReview, color: C.blue },
                { label: '✅ Approved',  value: appStats.approved,    color: C.green },
                { label: '❌ Rejected',  value: appStats.rejected,    color: C.red },
              ].map(s => (
                <div key={s.label} style={{ background: C.card, borderRadius: 12, padding: '14px 16px', borderLeft: `4px solid ${s.color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Register link */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#eef2ff', borderRadius: 12, border: `1px solid #c7d2fe`, marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.primaryDk }}>📢 Partner Registration Link</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.primary }}>http://localhost:3000/delivery/register</p>
            </div>
            <button className="action-btn" onClick={() => { navigator.clipboard.writeText('http://localhost:3000/delivery/register'); showToast('success', 'Link copied!'); }}
              style={{ padding: '8px 16px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
              📋 Copy Link
            </button>
          </div>

          {/* Table */}
          {appLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: C.textSub }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
              Loading applications…
            </div>
          ) : applications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: C.card, borderRadius: 16, border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>No applications yet</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: C.textSub }}>Share the registration link above with delivery partners</p>
            </div>
          ) : (
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><Th>Applicant</Th><Th>Contact</Th><Th>Vehicle</Th><Th>Applied</Th><Th>Status</Th><Th>Actions</Th></tr>
                </thead>
                <tbody>
                  {applications.map((app, i) => (
                    <tr key={app.id} className="db-row" style={{ background: i % 2 === 0 ? C.card : '#fafbff', transition: 'background 0.12s' }}>
                      <Td>
                        <div style={{ fontWeight: 700, color: C.text }}>{app.firstName} {app.lastName}</div>
                        <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{app.city}{app.pincode ? ` · ${app.pincode}` : ''}</div>
                      </Td>
                      <Td>
                        <div style={{ fontSize: 12, color: C.text }}>{app.email}</div>
                        <div style={{ fontSize: 11, color: C.textSub }}>{app.phoneNumber}</div>
                      </Td>
                      <Td>
                        <div style={{ fontSize: 12, color: C.text }}>{app.vehicleType}</div>
                        <div style={{ fontSize: 11, color: C.textSub }}>{app.vehicleNumber}</div>
                      </Td>
                      <Td><span style={{ fontSize: 12, color: C.textSub }}>{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span></Td>
                      <Td><Badge cfg={APP_STATUS[app.status]} /></Td>
                      <Td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="action-btn" onClick={() => setSelectedApp(app)}
                            style={{ padding: '5px 10px', background: '#eef2ff', color: C.primary, border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, transition: 'all 0.15s' }}>
                            <Eye size={11} /> View
                          </button>
                          {(app.status === 'PENDING' || app.status === 'UNDER_REVIEW') && (
                            <>
                              <button className="action-btn" onClick={() => approveApp(app)} disabled={actionLoading === app.id + '_a'}
                                style={{ padding: '5px 10px', background: '#dcfce7', color: C.green, border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                                {actionLoading === app.id + '_a' ? '…' : '✅ Approve'}
                              </button>
                              <button className="action-btn" onClick={() => { setSelectedApp({ ...app, _reject: true }); setRejectReason(''); }}
                                style={{ padding: '5px 10px', background: '#fee2e2', color: C.red, border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                                ❌ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: DELIVERY POOL
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pool' && (
        <div style={{ animation: 'fadeUp 0.2s ease' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input type="text" placeholder="🔍 Search delivery partners…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '9px 14px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, outline: 'none', background: C.card }} />
            <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}
              style={{ padding: '9px 14px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, background: C.card }}>
              <option value="ALL">All Zones</option>
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '9px 14px', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, background: C.card }}>
              <option value="ALL">All Status</option>
              {Object.entries(LIVE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* Zone pills */}
          {summary?.byZone?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {summary.byZone.map(z => (
                <div key={z.zone} className="zone-pill" onClick={() => setZoneFilter(z.zone === zoneFilter ? 'ALL' : z.zone)}
                  style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    background: zoneFilter === z.zone ? C.primary : C.card,
                    color: zoneFilter === z.zone ? '#fff' : C.text,
                    border: `1.5px solid ${zoneFilter === z.zone ? C.primary : C.border}` }}>
                  📍 {z.zone} &nbsp;
                  <span style={{ color: zoneFilter === z.zone ? '#a5f3fc' : C.green }}>●{z.available}</span>
                  <span style={{ color: zoneFilter === z.zone ? '#fde68a' : C.amber }}> ●{z.busy}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cards grid */}
          {filteredPool.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: C.card, borderRadius: 16, border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚚</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>No delivery partners found</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: C.textSub }}>Use Role Management to assign delivery roles</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
              {filteredPool.map((boy, idx) => {
                const sd = boy.sd;
                const status = getEffectiveStatus(sd);
                const cfg = LIVE_STATUS[status];
                const isExp = expandedBoy === boy.id;
                const boyAssign = assignments.filter(a => a.deliveryBoyId === boy.id);
                const active = boyAssign.filter(a => ['ASSIGNED','OUT_FOR_DELIVERY'].includes(a.deliveryStatus));

                return (
                  <div key={boy.id} className="db-card"
                    style={{ background: C.card, borderRadius: 16, border: `1.5px solid ${isExp ? cfg.dot : C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', transition: 'all 0.2s', animation: `fadeUp 0.2s ease ${Math.min(idx*0.04,0.3)}s both` }}>

                    {/* Card header */}
                    <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 46, height: 46, borderRadius: '50%', background: `linear-gradient(135deg,${cfg.dot}cc,${cfg.dot})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: `0 2px 8px ${cfg.dot}44` }}>🚚</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{boy.firstName} {boy.lastName}</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{boy.email}</div>
                        <LiveDot status={status} />
                      </div>
                      <button onClick={() => setExpandedBoy(isExp ? null : boy.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, padding: 4 }}>
                        {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* Stats bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: `1px solid #f1f5f9`, borderBottom: isExp ? `1px solid #f1f5f9` : 'none' }}>
                      {[
                        { label: 'Zone',   value: sd?.assignedZone || '—' },
                        { label: 'Active', value: sd?.currentOrderCount ?? active.length },
                        { label: 'Done',   value: sd?.totalDeliveriesCompleted ?? '—' },
                        { label: 'Rating', value: sd?.rating ? `${parseFloat(sd.rating).toFixed(1)}★` : '—' },
                      ].map(s => (
                        <div key={s.label} style={{ padding: '10px 6px', textAlign: 'center', borderRight: `1px solid #f1f5f9` }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: C.textSub, marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Expanded */}
                    {isExp && (
                      <div style={{ padding: '14px 18px', background: '#fafbff' }}>
                        {sd ? (
                          <>
                            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Change Zone</p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                              {ZONES.map(z => (
                                <button key={z} onClick={() => updateZone(sd.id, z)}
                                  style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                    background: sd.assignedZone === z ? C.primary : '#f3f4f6',
                                    color: sd.assignedZone === z ? '#fff' : C.text,
                                    border: `1px solid ${sd.assignedZone === z ? C.primary : C.border}` }}>
                                  {z}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 8 }}>
                                <div style={{ fontSize: 11, color: C.textSub }}>Success Rate</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{sd.successRate ? `${parseFloat(sd.successRate).toFixed(1)}%` : '100%'}</div>
                              </div>
                              <div style={{ padding: '8px 12px', background: '#fffbeb', borderRadius: 8 }}>
                                <div style={{ fontSize: 11, color: C.textSub }}>Cash in Hand</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: C.amber }}>{fmtAmt(sd.cashInHand)}</div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 10, border: `1px solid #fde68a` }}>
                            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#92400e', fontWeight: 600 }}>⚠️ Not in tracking system</p>
                            <button className="action-btn" onClick={() => setRegisterModal(boy)}
                              style={{ padding: '6px 14px', background: C.amber, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                              Register for Tracking
                            </button>
                          </div>
                        )}
                        {active.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase' }}>Active Deliveries</p>
                            {active.map(a => (
                              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: C.card, borderRadius: 8, marginBottom: 5, border: `1px solid ${C.border}` }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.primary, fontWeight: 700 }}>#{a.orderNumber?.slice(-12)}</span>
                                <Badge cfg={DEL_STATUS[a.deliveryStatus]} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: ASSIGNMENTS
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'assignments' && (
        <div style={{ animation: 'fadeUp 0.2s ease' }}>
          {assignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: C.card, borderRadius: 16, border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>No assignments yet</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: C.textSub }}>Assign orders from the Orders page</p>
            </div>
          ) : (
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>Order #</Th><Th>Delivery Partner</Th><Th>Status</Th><Th>Assigned At</Th><Th>Picked Up</Th><Th>Delivered</Th><Th>COD</Th></tr></thead>
                <tbody>
                  {assignments.map((a, i) => (
                    <tr key={a.id} className="db-row" style={{ background: i % 2 === 0 ? C.card : '#fafbff', transition: 'background 0.12s' }}>
                      <Td mono><span style={{ color: C.primary, fontWeight: 700 }}>#{a.orderNumber?.slice(-14)}</span></Td>
                      <Td><span style={{ fontWeight: 600 }}>{a.deliveryBoyName || `#${a.deliveryBoyId}`}</span></Td>
                      <Td><Badge cfg={DEL_STATUS[a.deliveryStatus]} /></Td>
                      <Td><span style={{ fontSize: 12, color: C.textSub, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{fmtDate(a.assignedAt)}</span></Td>
                      <Td>{a.pickedUpAt ? <span style={{ fontSize: 12, color: C.blue, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{fmtDate(a.pickedUpAt)}</span> : <span style={{ color: C.textSub }}>—</span>}</Td>
                      <Td>{a.deliveredAt ? <span style={{ fontSize: 12, color: C.green, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} />{fmtDate(a.deliveredAt)}</span> : <span style={{ color: C.textSub }}>—</span>}</Td>
                      <Td>{a.cashCollected ? <span style={{ padding: '2px 8px', background: '#dcfce7', color: C.green, borderRadius: 10, fontSize: 11, fontWeight: 700 }}>✅ {fmtAmt(a.amountCollected)}</span> : <span style={{ color: C.textSub }}>—</span>}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: CASH REFUNDS
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'cashRefunds' && (
        <div style={{ animation: 'fadeUp 0.2s ease' }}>
          {cashRefunds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: C.card, borderRadius: 16, border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>No cash refund tasks</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: C.textSub }}>All refunds completed</p>
            </div>
          ) : (
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th>Order #</Th><Th>Delivery Partner</Th><Th>Refund Ref</Th><Th>Amount</Th><Th>Assigned</Th><Th>Handed At</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {cashRefunds.map((t, i) => {
                    const isPending = t.deliveryStatus === 'CASH_REFUND_PENDING';
                    return (
                      <tr key={t.id} className="db-row" style={{ background: isPending ? '#fffbeb' : i % 2 === 0 ? C.card : '#fafbff', transition: 'background 0.12s' }}>
                        <Td mono><span style={{ color: C.primary, fontWeight: 700 }}>#{t.orderNumber?.slice(-14)}</span></Td>
                        <Td>
                          <span style={{ fontWeight: 600 }}>{t.deliveryBoyName || `#${t.deliveryBoyId}`}</span>
                          {t.deliveryBoyId === 0 && <span style={{ marginLeft: 6, padding: '2px 7px', background: '#fee2e2', color: C.red, borderRadius: 10, fontSize: 10, fontWeight: 700 }}>Unassigned</span>}
                        </Td>
                        <Td mono><span style={{ fontSize: 11, color: C.textSub }}>{t.refundReference || '—'}</span></Td>
                        <Td><span style={{ fontWeight: 700, color: C.green, fontSize: 14 }}>{fmtAmt(t.cashRefundAmount)}</span></Td>
                        <Td><span style={{ fontSize: 12, color: C.textSub, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{fmtDate(t.assignedAt)}</span></Td>
                        <Td>{t.cashRefundHandedAt ? <span style={{ fontSize: 12, color: C.green, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} />{fmtDate(t.cashRefundHandedAt)}</span> : <span style={{ color: C.textSub }}>—</span>}</Td>
                        <Td><Badge cfg={isPending ? { label: 'Pending', color: '#92400e', bg: '#fef3c7', icon: '⏳' } : { label: 'Done', color: '#166534', bg: '#dcfce7', icon: '✅' }} /></Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          APPLICATION DETAIL / REJECT MODAL
      ════════════════════════════════════════════════════════════════ */}
      {selectedApp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.card, borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', animation: 'fadeUp 0.2s ease' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>
                  {selectedApp._reject ? '❌ Reject Application' : '📋 Application Details'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: C.textSub }}>{selectedApp.firstName} {selectedApp.lastName}</p>
              </div>
              <button onClick={() => { setSelectedApp(null); setRejectReason(''); }}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: C.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {selectedApp._reject ? (
                /* Reject form */
                <div>
                  <p style={{ margin: '0 0 14px', fontSize: 13, color: C.text }}>
                    Rejecting <strong>{selectedApp.firstName}</strong>'s application. An email will be sent with your reason.
                  </p>
                  <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: C.text }}>Select Reason *</p>
                  {['Documents not clear or invalid', 'Incomplete information provided', 'Vehicle not eligible', 'Area not serviceable', 'Duplicate application', 'Other'].map(r => (
                    <label key={r} onClick={() => setRejectReason(r)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `2px solid ${rejectReason === r ? C.red : C.border}`, borderRadius: 10, cursor: 'pointer', background: rejectReason === r ? '#fef2f2' : C.card, marginBottom: 8, transition: 'all 0.15s' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${rejectReason === r ? C.red : C.border}`, background: rejectReason === r ? C.red : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {rejectReason === r && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: rejectReason === r ? 700 : 400, color: rejectReason === r ? C.red : C.text }}>{r}</span>
                    </label>
                  ))}
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={() => { setSelectedApp(null); setRejectReason(''); }}
                      style={{ flex: 1, padding: '11px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: C.text }}>Cancel</button>
                    <button onClick={() => rejectApp(selectedApp)} disabled={!rejectReason || actionLoading === selectedApp.id + '_r'}
                      style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: !rejectReason ? 'not-allowed' : 'pointer', background: !rejectReason ? '#e5e7eb' : `linear-gradient(135deg,${C.red},#ef4444)`, color: !rejectReason ? '#9ca3af' : '#fff', transition: 'all 0.15s' }}>
                      {actionLoading === selectedApp.id + '_r' ? 'Rejecting…' : '❌ Confirm Reject & Send Email'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Detail view */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { title: '👤 Personal Info', rows: [['Name', `${selectedApp.firstName} ${selectedApp.lastName}`], ['Email', selectedApp.email], ['Phone', selectedApp.phoneNumber], ['City', `${selectedApp.city || '—'}${selectedApp.pincode ? ' · ' + selectedApp.pincode : ''}`]] },
                    { title: '🚗 Vehicle Info',  rows: [['Type', selectedApp.vehicleType], ['Number', selectedApp.vehicleNumber], ['Model', selectedApp.vehicleModel]] },
                    { title: '📋 Documents',     rows: [['Aadhar', selectedApp.aadharNumber], ['License', selectedApp.drivingLicense], ['PAN', selectedApp.panNumber || '—']] },
                  ].map(sec => (
                    <div key={sec.title} style={{ background: '#f8fafc', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      <div style={{ padding: '9px 14px', background: '#f1f5f9', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, color: C.text }}>{sec.title}</div>
                      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {sec.rows.map(([label, value]) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: C.textSub }}>{label}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{value || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 12, color: C.textSub }}>Status</span>
                    <Badge cfg={APP_STATUS[selectedApp.status]} />
                  </div>

                  {(selectedApp.status === 'PENDING' || selectedApp.status === 'UNDER_REVIEW') && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button className="action-btn" onClick={() => setSelectedApp({ ...selectedApp, _reject: true })}
                        style={{ flex: 1, padding: '11px', background: '#fee2e2', color: C.red, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                        ❌ Reject
                      </button>
                      <button className="action-btn" onClick={() => approveApp(selectedApp)} disabled={actionLoading === selectedApp.id + '_a'}
                        style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: `linear-gradient(135deg,${C.green},#22c55e)`, color: '#fff', boxShadow: `0 4px 12px ${C.green}44`, transition: 'all 0.15s' }}>
                        {actionLoading === selectedApp.id + '_a' ? 'Approving…' : '✅ Approve & Send Email'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          REGISTER TRACKING MODAL
      ════════════════════════════════════════════════════════════════ */}
      {registerModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.card, borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', animation: 'fadeUp 0.2s ease' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Register for Tracking</h3>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: C.textSub }}>{registerModal.firstName} {registerModal.lastName}</p>
              </div>
              <button onClick={() => setRegisterModal(null)}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: C.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: C.text }}>Assign a delivery zone to enable real-time tracking and auto-assignment.</p>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: C.text }}>Select Zone</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {ZONES.map(z => (
                  <button key={z} onClick={() => setRegisterZone(z)}
                    style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      background: registerZone === z ? C.primary : '#f3f4f6',
                      color: registerZone === z ? '#fff' : C.text,
                      border: `1.5px solid ${registerZone === z ? C.primary : C.border}` }}>
                    📍 {z}
                  </button>
                ))}
              </div>
              <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#166534', border: '1px solid #bbf7d0', marginBottom: 16 }}>
                ✅ Will be registered in <strong>{registerZone}</strong> as OFFLINE
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setRegisterModal(null)}
                  style={{ flex: 1, padding: '11px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: C.text }}>Cancel</button>
                <button className="action-btn" onClick={() => registerTracking(registerModal, registerZone)}
                  style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: `linear-gradient(135deg,${C.primary},${C.primaryDk})`, color: '#fff', boxShadow: `0 4px 12px ${C.primary}44`, transition: 'all 0.15s' }}>
                  🚀 Register
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
