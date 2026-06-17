import React, { useState, useEffect } from 'react';
import { getNotifications, clearAll, markAllRead } from '../../services/notificationStore';

const typeColors = {
  PO_CREATED:       { bg: '#eff6ff', color: '#1d4ed8', icon: '📋' },
  PO_APPROVED:      { bg: '#f0fdf4', color: '#15803d', icon: '✅' },
  GRN_CREATED:      { bg: '#fff7ed', color: '#c2410c', icon: '📦' },
  GRN_COMPLETED:    { bg: '#f0fdf4', color: '#15803d', icon: '✔️' },
  ORDER_PICKED:     { bg: '#eff6ff', color: '#1d4ed8', icon: '🛒' },
  ORDER_PACKED:     { bg: '#faf5ff', color: '#7c3aed', icon: '📦' },
  ORDER_SHIPPED:    { bg: '#fff7ed', color: '#c2410c', icon: '🚚' },
  TRANSFER_REQUEST: { bg: '#eff6ff', color: '#0369a1', icon: '🔄' },
  TRANSFER_APPROVED:{ bg: '#f0fdf4', color: '#15803d', icon: '✅' },
  CYCLE_COUNT_DUE:  { bg: '#fefce8', color: '#a16207', icon: '🔍' },
  DISCREPANCY_FOUND:{ bg: '#fef2f2', color: '#dc2626', icon: '⚠️' },
  LOW_STOCK:        { bg: '#fef2f2', color: '#dc2626', icon: '⚠️' },
  OUT_OF_STOCK:     { bg: '#fef2f2', color: '#dc2626', icon: '🚨' },
};

const ALL_TYPES = [
  'ALL', 'PO_CREATED', 'PO_APPROVED', 'GRN_CREATED', 'GRN_COMPLETED',
  'ORDER_PICKED', 'ORDER_PACKED', 'ORDER_SHIPPED',
  'TRANSFER_REQUEST', 'TRANSFER_APPROVED',
  'CYCLE_COUNT_DUE', 'DISCREPANCY_FOUND', 'LOW_STOCK',
];

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function AuditLogs() {
  const [logs, setLogs]           = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [search, setSearch]       = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  const load = () => setLogs(getNotifications());

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('ims_notification_update', handler);
    return () => window.removeEventListener('ims_notification_update', handler);
  }, []);

  const filtered = logs.filter(n => {
    if (filterType !== 'ALL' && n.type !== filterType) return false;
    if (filterSource !== 'ALL' && n.source !== filterSource) return false;
    if (search && !n.title?.toLowerCase().includes(search.toLowerCase()) &&
        !n.message?.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && new Date(n.time) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(n.time) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all audit logs?')) {
      clearAll();
      load();
    }
  };

  const handleMarkAllRead = () => {
    markAllRead();
    load();
  };

  const unread = logs.filter(n => !n.read).length;

  return (
    <div style={{ padding: '28px 32px', background: '#f1f5f9', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
            🔍 Audit Logs
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {logs.length} total events · {unread} unread · Showing {filtered.length} results
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleMarkAllRead} style={{
            padding: '9px 16px', borderRadius: 8, border: '1.5px solid #cbd5e1',
            background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            ✓ Mark All Read
          </button>
          <button onClick={handleClear} style={{
            padding: '9px 16px', borderRadius: 8, border: '1.5px solid #fecaca',
            background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            🗑 Clear All
          </button>
          <button onClick={load} style={{
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'PO Events',    count: logs.filter(n => n.type?.startsWith('PO')).length,       color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'GRN Events',   count: logs.filter(n => n.type?.startsWith('GRN')).length,      color: '#c2410c', bg: '#fff7ed' },
          { label: 'Order Events', count: logs.filter(n => n.type?.startsWith('ORDER')).length,    color: '#7c3aed', bg: '#faf5ff' },
          { label: 'Alerts',       count: logs.filter(n => ['LOW_STOCK','DISCREPANCY_FOUND','OUT_OF_STOCK'].includes(n.type)).length, color: '#dc2626', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, border: `1px solid ${s.color}33`,
            borderRadius: 10, padding: '12px 20px',
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120,
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '16px 20px',
        border: '1px solid #e2e8f0', marginBottom: 20,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        {/* Search */}
        <div style={{ flex: '2 1 200px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Search</label>
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Type filter */}
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Event Type</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b',
              outline: 'none', cursor: 'pointer',
            }}
          >
            {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Source filter */}
        <div style={{ flex: '1 1 130px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Source</label>
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b',
              outline: 'none', cursor: 'pointer',
            }}
          >
            {['ALL', 'WAREHOUSE', 'ADMIN', 'SYSTEM'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Date from */}
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>From Date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Date to */}
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>To Date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Clear filters */}
        <button onClick={() => { setFilterType('ALL'); setFilterSource('ALL'); setSearch(''); setDateFrom(''); setDateTo(''); }}
          style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
          ✕ Clear
        </button>
      </div>

      {/* Logs table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Audit Trail ({filtered.length})</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No audit logs found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Warehouse actions will appear here automatically</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['', 'Event Type', 'Title', 'Message', 'Source', 'Time', 'Status'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const cfg = typeColors[log.type] || { bg: '#f8fafc', color: '#64748b', icon: '📌' };
                  return (
                    <tr key={log.id || i} style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: log.read ? '#fff' : '#fafbff',
                      transition: 'background 0.15s',
                    }}>
                      <td style={{ padding: '12px 14px', fontSize: 18 }}>{cfg.icon}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 9px', borderRadius: 20,
                          background: cfg.bg, color: cfg.color,
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.3px',
                          border: `1px solid ${cfg.color}33`,
                        }}>{log.type}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a', maxWidth: 200 }}>{log.title}</td>
                      <td style={{ padding: '12px 14px', color: '#475569', maxWidth: 300 }}>{log.message}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                          background: log.source === 'WAREHOUSE' ? '#eff6ff' : log.source === 'ADMIN' ? '#f0fdf4' : '#f8fafc',
                          color: log.source === 'WAREHOUSE' ? '#1d4ed8' : log.source === 'ADMIN' ? '#15803d' : '#64748b',
                          fontSize: 11, fontWeight: 600,
                        }}>{log.source}</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(log.time)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                          background: log.read ? '#f1f5f9' : '#eff6ff',
                          color: log.read ? '#94a3b8' : '#1d4ed8',
                          fontSize: 11, fontWeight: 600,
                        }}>{log.read ? 'Read' : 'Unread'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
