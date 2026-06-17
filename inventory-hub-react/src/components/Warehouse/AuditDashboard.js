import React, { useState, useEffect } from 'react';
import { Search, ScrollText, BarChart2, LogOut, RefreshCw } from 'lucide-react';
import AuditLogs from '../../Admin/components/AuditLogs';
import { getNotifications } from '../../services/notificationStore';
import { useWarehouseSocket } from '../../services/useWarehouseSocket';
import { pushNotification } from '../../services/notificationStore';

const C = {
  indigo:     '#4f46e5',
  indigoDark: '#3730a3',
  indigoBg:   'rgba(79,70,229,0.08)',
  indigoLight:'#6366f1',
  card:       '#FFFFFF',
  border:     '#E2E8F0',
  text:       '#1E293B',
  textMuted:  '#64748B',
  bg:         '#F8FAFC',
};

const TABS = [
  { key: 'overview',   label: 'Overview',   icon: Search },
  { key: 'auditlogs',  label: 'Audit Logs', icon: ScrollText },
];

export default function AuditDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const userName = sessionStorage.getItem('warehouseUserName') || 'Audit Staff';
  const userRole = sessionStorage.getItem('warehouseUserRole') || 'AUDITOR';

  useEffect(() => {
    document.title = 'Audit Dashboard - Inventory Hub';
    return () => { document.title = 'Inventory Hub'; };
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');
    if (!token) window.location.href = '/audit/login';
  }, []);

  // WebSocket for real-time audit log updates
  const { connected: wsConnected } = useWarehouseSocket({
    topics: ['/topic/warehouse/all', '/topic/admin/notifications'],
    onMessage: (event) => {
      pushNotification({
        type:    event.type    || 'SYSTEM_ALERT',
        title:   event.title   || 'Audit Event',
        message: event.message || '',
        source:  event.source  || 'SYSTEM',
        data:    event.data,
      });
    },
    enabled: true,
  });

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = '/audit/login';
  };

  const [logs, setLogs] = useState(() => getNotifications());

  // Re-load logs whenever a new notification arrives (same tab or cross-tab via BroadcastChannel)
  useEffect(() => {
    const handler = () => setLogs(getNotifications());
    window.addEventListener('ims_notification_update', handler);
    return () => window.removeEventListener('ims_notification_update', handler);
  }, []);
  const unread = logs.filter(n => !n.read).length;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <style>{`
        .aud-tab:hover { background: ${C.indigoBg} !important; color: ${C.indigo} !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: C.card, borderBottom: `2px solid ${C.border}`,
        padding: '0 28px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', height: 70,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.indigo}, ${C.indigoDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79,70,229,0.4)',
          }}>
            <Search size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Audit Portal</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>PixelBloom IMS</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* WS status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: wsConnected ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${wsConnected ? '#16a34a' : '#dc2626'}44`,
            fontSize: 11, fontWeight: 600,
            color: wsConnected ? '#16a34a' : '#dc2626',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: wsConnected ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
            {wsConnected ? 'Live' : 'Offline'}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{userName}</div>
            <div style={{ fontSize: 11, color: C.indigoLight }}>{userRole}</div>
          </div>

          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, color: '#ef4444',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)' }}>
        {/* ── Sidebar ── */}
        <div style={{
          width: 220, background: C.card,
          borderRight: `1px solid ${C.border}`,
          padding: '20px 12px', flexShrink: 0,
        }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                className="aud-tab"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px', marginBottom: 4,
                  borderRadius: 10, border: 'none',
                  background: active ? C.indigoBg : 'transparent',
                  color: active ? C.indigo : C.textMuted,
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                  borderLeft: active ? `3px solid ${C.indigo}` : '3px solid transparent',
                  position: 'relative',
                }}
              >
                <Icon size={16} />
                {tab.label}
                {tab.key === 'auditlogs' && unread > 0 && (
                  <span style={{
                    position: 'absolute', right: 10,
                    background: C.indigo, color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 10,
                    minWidth: 18, textAlign: 'center',
                  }}>{unread}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Main Content ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'overview' && <AuditOverview userName={userName} userRole={userRole} logs={logs} unread={unread} onGoToLogs={() => setActiveTab('auditlogs')} />}
          {activeTab === 'auditlogs' && <AuditLogs />}
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function AuditOverview({ userName, userRole, logs, unread, onGoToLogs }) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('ims_notification_update', handler);
    return () => window.removeEventListener('ims_notification_update', handler);
  }, []);

  const poEvents    = logs.filter(n => n.type?.startsWith('PO')).length;
  const orderEvents = logs.filter(n => n.type?.startsWith('ORDER')).length;
  const alerts      = logs.filter(n => ['LOW_STOCK','DISCREPANCY_FOUND','OUT_OF_STOCK'].includes(n.type)).length;
  const recent      = [...logs].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

  return (
    <div style={{ padding: '28px 32px' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: C.text }}>
        Welcome back, {userName.split(' ')[0]} 👋
      </h1>
      <p style={{ margin: '0 0 28px', color: C.textMuted, fontSize: 14 }}>
        {userRole === 'AUDITOR' ? 'Audit Staff — View audit logs & inventory records' : 'Viewer — Read-only access'}
      </p>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        {[
          { label: 'Total Events',  value: logs.length,  color: C.indigo,   bg: '#eef2ff' },
          { label: 'Unread',        value: unread,        color: '#dc2626',  bg: '#fef2f2' },
          { label: 'PO Events',     value: poEvents,      color: '#0891b2',  bg: '#ecfeff' },
          { label: 'Order Events',  value: orderEvents,   color: '#7c3aed',  bg: '#faf5ff' },
          { label: 'Alerts',        value: alerts,        color: '#dc2626',  bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, border: `1px solid ${s.color}33`,
            borderRadius: 12, padding: '14px 22px', minWidth: 110,
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick action */}
      <div
        onClick={onGoToLogs}
        style={{
          background: C.card, border: `1.5px solid ${C.indigo}33`,
          borderRadius: 14, padding: '20px 24px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28,
          transition: 'box-shadow 0.15s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: C.indigoBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ScrollText size={22} color={C.indigo} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>View Audit Logs</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
            {logs.length} total events · {unread} unread
          </div>
        </div>
        <div style={{ marginLeft: 'auto', color: C.indigo, fontWeight: 700, fontSize: 13 }}>Open →</div>
      </div>

      {/* Recent events */}
      {recent.length > 0 && (
        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: '#f8fafc' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Recent Events</span>
          </div>
          {recent.map((log, i) => (
            <div key={log.id || i} style={{
              padding: '12px 20px', borderBottom: i < recent.length - 1 ? `1px solid #f1f5f9` : 'none',
              display: 'flex', alignItems: 'center', gap: 12,
              background: log.read ? '#fff' : '#fafbff',
            }}>
              <span style={{ fontSize: 18 }}>
                {log.type?.startsWith('PO') ? '📋' : log.type?.startsWith('ORDER') ? '📦' : log.type?.startsWith('GRN') ? '📥' : '📌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.title}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{log.message}</div>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>
                {log.time ? new Date(log.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
              {!log.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.indigo, flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
