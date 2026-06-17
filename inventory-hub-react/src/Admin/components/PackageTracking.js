import React, { useState, useEffect, useCallback } from 'react';
import '../css/Package.css';
import {
  FaFilePdf, FaFileExcel, FaFilter, FaSync, FaSearch,
  FaBoxOpen, FaTruck, FaCheckCircle, FaTimesCircle, FaClock
} from 'react-icons/fa';
import { imsService } from '../../services/imsApi';

// ─── Package Tracking constants ───────────────────────────────────────────────
const STATUS_OPTIONS = ['All', 'Pending', 'Processing', 'In Transit', 'Delivered', 'Cancelled'];

const STATUS_COLORS = {
  'Pending':    { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  'Processing': { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  'In Transit': { bg: '#e0e7ff', text: '#3730a3', dot: '#6366f1' },
  'Delivered':  { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  'Cancelled':  { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  'Other':      { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' },
};

// ─── Delivery Dashboard constants ─────────────────────────────────────────────
const API = 'http://localhost:9999/api';

const getAuthHeaders = () => {
  const token =
    sessionStorage.getItem('adminToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const parseDate = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) {
    const [y, m, d, h = 0, min = 0, s = 0] = val;
    return new Date(y, m - 1, d, h, min, s);
  }
  const str =
    typeof val === 'string' && !val.endsWith('Z') && !val.includes('+')
      ? val + 'Z'
      : val;
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
};

const fmtDate = (val) => {
  const dt = parseDate(val);
  if (!dt) return '—';
  return dt.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const isToday = (val) => {
  const dt = parseDate(val);
  if (!dt) return false;
  const now = new Date();
  return (
    dt.getDate() === now.getDate() &&
    dt.getMonth() === now.getMonth() &&
    dt.getFullYear() === now.getFullYear()
  );
};

// ─── Shared sub-components ────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS['Other'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: colors.bg, color: colors.text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.dot }} />
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '16px 20px',
      border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ background: color + '18', borderRadius: 10, padding: 10 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{value}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Delivery Dashboard lane card ─────────────────────────────────────────────
function DeliveryLane({ emoji, title, subtitle, color, orders, emptyMsg }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: `1.5px solid ${color}33`,
      overflow: 'hidden', flex: 1, minWidth: 260,
    }}>
      {/* Lane header */}
      <div style={{
        background: `${color}12`, borderBottom: `1.5px solid ${color}33`,
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 22 }}>{emoji}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{subtitle}</div>
        </div>
        <span style={{
          marginLeft: 'auto', background: color, color: '#fff',
          borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700,
        }}>
          {orders.length}
        </span>
      </div>

      {/* Order cards */}
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#9ca3af', fontSize: 13 }}>
            {emptyMsg}
          </div>
        ) : orders.map((o) => (
          <div key={o.orderNumber} style={{
            background: '#f9fafb', borderRadius: 10, padding: '12px 14px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: color, fontFamily: 'monospace' }}>
                #{o.orderNumber?.slice(-14)}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: o.paymentMethod === 'COD' ? '#fef3c7' : '#d1fae5',
                color: o.paymentMethod === 'COD' ? '#92400e' : '#065f46',
              }}>
                {o.paymentMethod || 'ONLINE'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              👤 {o.customerName || `Customer #${o.customerId}`}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              📍 {o.shippingAddress
                ? `${o.shippingAddress.city || ''}, ${o.shippingAddress.state || ''}`.replace(/^,\s*|,\s*$/, '') || '—'
                : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                ₹{parseFloat(o.totalAmount || 0).toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {fmtDate(o.updatedAt || o.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function PackageTracking() {
  const [activeTab, setActiveTab] = useState('packages');

  // ── Package Tracking state ──
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [stats, setStats] = useState({});

  // ── Delivery Dashboard state ──
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryLastSync, setDeliveryLastSync] = useState(null);

  // ── Load packages ──
  const loadPackages = useCallback(async () => {
    setLoading(true);
    const data = await imsService.reports.getPackages();
    if (data) {
      setPackages(data.allPackages || []);
      setStats({
        total: data.totalPackages || 0,
        inTransit: data.inTransit || 0,
        delivered: data.delivered || 0,
        pending: data.pending || 0,
      });
      setLastSync(new Date());
    }
    setLoading(false);
  }, []);

  // ── Load delivery orders ──
  const loadDeliveryOrders = useCallback(async () => {
    setDeliveryLoading(true);
    try {
      // Fetch all orders + all delivery assignments in parallel
      const [ordersRes, assignmentsRes] = await Promise.all([
        fetch(`${API}/auth/admin/orders/all`, { headers: getAuthHeaders() }),
        fetch(`${API}/auth/admin/delivery/assignments`, { headers: getAuthHeaders() }),
      ]);

      if (ordersRes.ok) {
        const all = await ordersRes.json();
        const assignments = assignmentsRes.ok ? await assignmentsRes.json() : [];

        // Build a map: orderNumber → latest assignment
        const assignmentMap = {};
        (Array.isArray(assignments) ? assignments : []).forEach(a => {
          const existing = assignmentMap[a.orderNumber];
          if (!existing || new Date(a.assignedAt) > new Date(existing.assignedAt)) {
            assignmentMap[a.orderNumber] = a;
          }
        });

        // Include SHIPPED (assigned but not yet picked up), OUT_FOR_DELIVERY, PICKED_UP, DELIVERED
        const relevant = (Array.isArray(all) ? all : [])
          .filter(o => ['SHIPPED', 'OUT_FOR_DELIVERY', 'PICKED_UP', 'DELIVERED'].includes(o.orderStatus?.toUpperCase()))
          .map(o => ({
            ...o,
            _assignment: assignmentMap[o.orderNumber] || null,
          }));

        setDeliveryOrders(relevant);
        setDeliveryLastSync(new Date());
      }
    } catch (e) {
      console.error('Error loading delivery orders:', e);
    }
    setDeliveryLoading(false);
  }, []);

  // ── Initial load ──
  useEffect(() => {
    loadPackages();
    loadDeliveryOrders();
    const interval = setInterval(loadPackages, 30000);
    return () => clearInterval(interval);
  }, [loadPackages, loadDeliveryOrders]);

  // ── Listen for deliveryAssigned event from Orders.js ──
  useEffect(() => {
    const handler = () => {
      // Switch to delivery tab and refresh
      setActiveTab('delivery');
      loadDeliveryOrders();
    };
    window.addEventListener('deliveryAssigned', handler);
    return () => window.removeEventListener('deliveryAssigned', handler);
  }, [loadDeliveryOrders]);

  // ── Filter packages ──
  useEffect(() => {
    let result = packages;
    if (statusFilter !== 'All') {
      result = result.filter(p => p.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.orderNumber || '').toLowerCase().includes(q) ||
        (p.trackingNumber || '').toLowerCase().includes(q) ||
        (p.courierPartner || '').toLowerCase().includes(q)
      );
    }
    setFilteredPackages(result);
  }, [packages, statusFilter, searchQuery]);

  const handleExport = () => {
    const csvContent = filteredPackages.map(p =>
      `${p.orderNumber},${p.trackingNumber},${p.status},${p.courierPartner},${p.totalAmount},${p.createdAt}`
    ).join('\n');
    const blob = new Blob(
      [`Order#,Tracking#,Status,Courier,Amount,Date\n${csvContent}`],
      { type: 'text/csv' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'packages.csv';
    a.click();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  // ── Delivery lane buckets ──
  // SHIPPED = assigned to delivery boy (waiting for pickup — even if boy was offline when assigned)
  const toPickUp   = deliveryOrders.filter(o => o.orderStatus?.toUpperCase() === 'SHIPPED');
  const enRoute    = deliveryOrders.filter(o => ['OUT_FOR_DELIVERY', 'PICKED_UP'].includes(o.orderStatus?.toUpperCase()));
  const deliveredToday = deliveryOrders.filter(
    o => o.orderStatus?.toUpperCase() === 'DELIVERED' && isToday(o.updatedAt || o.createdAt)
  );

  return (
    <div className="package-page">
      {/* ── Tab switcher ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {[
          { key: 'packages', label: '📦 Package Tracking' },
          { key: 'delivery', label: '🚚 Delivery Dashboard' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === 'delivery') loadDeliveryOrders();
            }}
            style={{
              padding: '10px 22px', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, background: 'transparent',
              color: activeTab === tab.key ? '#6366f1' : '#6b7280',
              borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 — Package Tracking
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'packages' && (
        <>
          {/* Header */}
          <div className="package-header">
            <div>
              <h2>Package Tracking</h2>
              {lastSync && (
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  Last synced: {lastSync.toLocaleTimeString()} · Auto-refresh every 30s
                </p>
              )}
            </div>
            <button
              className="add-package-btn"
              onClick={loadPackages}
              disabled={loading}
              style={{ background: '#6366f1' }}
            >
              <FaSync className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard icon={FaBoxOpen}     label="Total Packages" value={stats.total || 0}     color="#6366f1" />
            <StatCard icon={FaTruck}       label="In Transit"     value={stats.inTransit || 0}  color="#3b82f6" />
            <StatCard icon={FaCheckCircle} label="Delivered"      value={stats.delivered || 0}  color="#10b981" />
            <StatCard icon={FaClock}       label="Pending"        value={stats.pending || 0}    color="#f59e0b" />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }} />
              <input
                type="text"
                placeholder="Search order, tracking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '8px 10px 8px 32px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, width: 220 }}
              />
            </div>
            <div className="package-filter" style={{ margin: 0 }}>
              <div className="filter-label"><FaFilter /> Status:</div>
              <select className="status-dropdown" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Table Card */}
          <div className="package-card">
            <div className="package-card-header">
              <h3>Package List ({filteredPackages.length})</h3>
              <div className="package-export-buttons">
                <button className="package-pdf-btn" onClick={handleExport}><FaFilePdf /> PDF</button>
                <button className="package-excel-btn" onClick={handleExport}><FaFileExcel /> Excel</button>
              </div>
            </div>

            <table className="package-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Tracking #</th>
                  <th>Status</th>
                  <th>Courier Partner</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPackages.map((pkg, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: '#6366f1' }}>#{pkg.orderNumber}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{pkg.trackingNumber}</td>
                    <td><StatusBadge status={pkg.status} /></td>
                    <td>{pkg.courierPartner || '—'}</td>
                    <td style={{ fontWeight: 600 }}>₹{(pkg.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: pkg.paymentStatus === 'PAID' ? '#d1fae5' : '#fef3c7',
                        color: pkg.paymentStatus === 'PAID' ? '#065f46' : '#92400e',
                      }}>
                        {pkg.paymentStatus || '—'}
                      </span>
                    </td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{formatDate(pkg.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPackages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                {loading ? 'Loading packages...' : 'No packages found'}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — Delivery Dashboard
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'delivery' && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
                🚚 Delivery Dashboard
              </h2>
              {deliveryLastSync && (
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  Last synced: {deliveryLastSync.toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={loadDeliveryOrders}
              disabled={deliveryLoading}
              style={{
                padding: '8px 16px', background: '#6366f1', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: deliveryLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, opacity: deliveryLoading ? 0.7 : 1,
              }}
            >
              <FaSync className={deliveryLoading ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {/* Summary stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{
              background: '#fff', borderRadius: 12, padding: '16px 20px',
              border: '1.5px solid #f59e0b33', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ background: '#fef3c7', borderRadius: 10, padding: 10, fontSize: 20 }}>📦</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{toPickUp.length}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>To Pick Up</div>
              </div>
            </div>
            <div style={{
              background: '#fff', borderRadius: 12, padding: '16px 20px',
              border: '1.5px solid #0891b233', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ background: '#e0f2fe', borderRadius: 10, padding: 10, fontSize: 20 }}>🛵</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{enRoute.length}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Out for Delivery</div>
              </div>
            </div>
            <div style={{
              background: '#fff', borderRadius: 12, padding: '16px 20px',
              border: '1.5px solid #10b98133', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ background: '#d1fae5', borderRadius: 10, padding: 10, fontSize: 20 }}>✅</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{deliveredToday.length}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Delivered Today</div>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {deliveryLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>
              Loading delivery orders…
            </div>
          ) : (
            /* Three-lane Kanban */
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <DeliveryLane
                emoji="📦"
                title="To Pick Up"
                subtitle="Assigned — awaiting pickup"
                color="#f59e0b"
                orders={toPickUp}
                emptyMsg="No orders assigned for pickup"
              />
              <DeliveryLane
                emoji="🛵"
                title="Out for Delivery"
                subtitle="En route now"
                color="#0891b2"
                orders={enRoute}
                emptyMsg="No orders en route"
              />
              <DeliveryLane
                emoji="✅"
                title="Delivered Today"
                subtitle="Completed"
                color="#10b981"
                orders={deliveredToday}
                emptyMsg="No deliveries completed today"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
