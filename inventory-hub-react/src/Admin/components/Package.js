import React, { useState, useEffect, useCallback } from 'react';
import { Package as PackageIcon, RefreshCw, Clock, Search } from 'lucide-react';
import '../css/Tabs.css';

const API = 'http://localhost:9999/api';

const getAuthHeaders = () => {
  const isAdminSession = sessionStorage.getItem('isAdminSession') === 'true';
  const token = isAdminSession
    ? sessionStorage.getItem('adminToken')
    : localStorage.getItem('authToken') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const fmtDate = (val) => {
  if (!val) return '—';
  const dt = Array.isArray(val)
    ? new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0, val[5] || 0)
    : new Date(typeof val === 'string' && !val.endsWith('Z') && !val.includes('+') ? val + 'Z' : val);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const fmtAmt = (val) => val != null ? `₹${parseFloat(val).toFixed(2)}` : '—';

const STATUS_COLOR = {
  PROCESSING:  { color: '#2563eb', bg: '#dbeafe', label: 'Processing' },
  PACKED:      { color: '#d97706', bg: '#fef3c7', label: 'Packed' },
  SHIPPED:     { color: '#7c3aed', bg: '#ede9fe', label: 'Shipped' },
  CONFIRMED:   { color: '#0d9488', bg: '#ccfbf1', label: 'Confirmed' },
  DELIVERED:   { color: '#16a34a', bg: '#dcfce7', label: 'Delivered' },
  CANCELLED:   { color: '#dc2626', bg: '#fee2e2', label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const m = STATUS_COLOR[status?.toUpperCase()] || { color: '#6b7280', bg: '#f3f4f6', label: status };
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      color: m.color, background: m.bg, whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
}

// ── Guidance Modal ────────────────────────────────────────────────────────────
function GuidanceModal({ orderNumber, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#d97706,#fbbf24)',
          padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>📦</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Order Packed Successfully!</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
              Order # {orderNumber?.slice(0, 20)}…
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
            ✅ Order is now <strong style={{ color: '#d97706' }}>PACKED</strong>. What to do next:
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#9ca3af' }}>
            Step 3 of 6 complete. Your next action is below.
          </p>
          {[
            { num: 1, done: true,  title: 'Order Confirmed',                  desc: 'Customer placed the order.' },
            { num: 2, done: true,  title: 'Marked Processing',                desc: 'Order was marked as Processing.' },
            { num: 3, done: true,  title: 'Packed (done)',                    desc: 'Order is packed and ready to ship.' },
            { num: 4, done: false, title: '🚚 Next → Go to Shipping → Ship', desc: 'Click "Shipping" in the left sidebar → find this order → click 🚚 Ship → enter AWB / Tracking Number and Courier Partner name.' },
          ].map(step => (
            <div key={step.num} style={{
              display: 'flex', gap: 12, marginBottom: 10,
              padding: '10px 14px', borderRadius: 10,
              background: step.done ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${step.done ? '#bbf7d0' : '#fde68a'}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step.done ? '#16a34a' : '#d97706', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, flexShrink: 0,
              }}>{step.done ? '✓' : step.num}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: step.done ? '#166534' : '#92400e' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 12, color: step.done ? '#15803d' : '#b45309', marginTop: 2 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8, padding: '10px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', border: '1px solid #fde68a' }}>
            💡 <strong>Tip:</strong> SHIPPED → OUT_FOR_DELIVERY status is updated automatically by the Shipping service. You only need to click "Assign Delivery" in Orders.
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 32px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 14, color: '#fff',
            background: 'linear-gradient(135deg,#d97706,#fbbf24)',
            boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
          }}>
            Got it ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Package() {
  const [orders, setOrders] = useState([]);
  const [packages, setPackages] = useState([]);   // packages table data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);           // small corner toast
  const [toastModal, setToastModal] = useState(null); // full detail modal (shown on toast click)
  const [packing, setPacking] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('PROCESSING');
  const [guidanceOrder, setGuidanceOrder] = useState(null);

  const showToast = (type, title, detail) => {
    setToast({ type, title, detail });
    setTimeout(() => setToast(null), 6000);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, packagesRes] = await Promise.all([
        fetch(`${API}/auth/admin/orders/all`, { headers: getAuthHeaders() }),
        fetch(`${API}/shipping/packages`, { headers: getAuthHeaders() }),
      ]);

      if (ordersRes.status === 401 || ordersRes.status === 403) {
        setError('Unauthorized — please log in as Admin.');
        return;
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to load orders');
      }

      if (packagesRes.ok) {
        const pkgData = await packagesRes.json();
        setPackages(Array.isArray(pkgData) ? pkgData : []);
      }
      // packages endpoint failure is non-critical — orders still show
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handlePack = async (orderNumber, customerId) => {
    setPacking(orderNumber);
    try {
      // 1. Mark PACKED in shipping service
      const shipRes = await fetch(`${API}/auth/admin/shipping/pack/${orderNumber}${customerId ? `?customerId=${customerId}` : ''}`, {
        method: 'POST', headers: getAuthHeaders(),
      });

      // 2. Also update order status in orders service
      const orderRes = await fetch(`${API}/auth/admin/orders/${orderNumber}/status?status=PACKED`, {
        method: 'PATCH', headers: getAuthHeaders(),
      });

      if (shipRes.ok || orderRes.ok) {
        // Optimistic update — immediately reflect in UI
        setOrders(prev => prev.map(o =>
          o.orderNumber === orderNumber ? { ...o, orderStatus: 'PACKED' } : o
        ));
        showToast('success', '📦 Order Packed!', `Order ${orderNumber.slice(0, 20)}… has been marked as PACKED. Next → Go to Shipping and click 🚚 Ship.`);
        setGuidanceOrder(orderNumber);
        // Re-fetch from DB to confirm real saved state
        fetchOrders();
      } else {
        const shipText = await shipRes.text().catch(() => '');
        const orderText = await orderRes.text().catch(() => '');
        showToast('error', 'Pack Failed', `Shipping: ${shipRes.status}, Orders: ${orderRes.status}`);
        console.error('Pack failed:', shipText, orderText);
      }
    } catch (err) {
      showToast('error', 'Error', err.message);
    } finally {
      setPacking(null);
    }
  };

  const s = search.toLowerCase();
  // Build a quick lookup map: orderNumber → package record
  const pkgMap = Object.fromEntries(packages.map(p => [p.orderNumber, p]));

  const filtered = orders
    .filter(o => statusFilter === 'ALL' || o.orderStatus?.toUpperCase() === statusFilter)
    .filter(o =>
      o.orderNumber?.toLowerCase().includes(s) ||
      String(o.customerId)?.includes(s) ||
      o.orderStatus?.toLowerCase().includes(s)
    );

  // Stats
  const processingCount = orders.filter(o => o.orderStatus?.toUpperCase() === 'PROCESSING').length;
  const packedCount     = orders.filter(o => o.orderStatus?.toUpperCase() === 'PACKED').length;

  return (
    <div style={{ padding: 24 }}>
      {/* Guidance Modal */}
      {guidanceOrder && (
        <GuidanceModal orderNumber={guidanceOrder} onClose={() => setGuidanceOrder(null)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#fef3c7', borderRadius: 10, padding: 8 }}>
            <PackageIcon size={22} color="#d97706" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Packages</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Pack orders before shipping</p>
          </div>
        </div>
        <button onClick={fetchOrders} style={{
          padding: '7px 14px', background: '#d97706', border: 'none',
          borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff',
          boxShadow: '0 2px 8px rgba(217,119,6,0.3)',
          width: 'fit-content', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Corner Toast (bottom-right, small) ── */}
      {toast && (
        <div
          onClick={() => { setToastModal(toast); setToast(null); }}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
            minWidth: 260, maxWidth: 320,
            background: toast.type === 'success' ? '#16a34a' : '#dc2626',
            color: '#fff', borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer',
            animation: 'slideUp 0.3s ease',
          }}
          title="Click to view details"
        >
          <span style={{ fontSize: 20, flexShrink: 0 }}>
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{toast.title}</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {toast.detail}
            </div>
          </div>
          <span style={{ fontSize: 10, opacity: 0.7, flexShrink: 0 }}>tap for details</span>
        </div>
      )}

      {/* ── Detail Modal (shown when toast is clicked) ── */}
      {toastModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
          onClick={() => setToastModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
              animation: 'fadeInScale 0.2s ease',
            }}
          >
            {/* Header */}
            <div style={{
              background: toastModal.type === 'success'
                ? 'linear-gradient(135deg,#16a34a,#22c55e)'
                : 'linear-gradient(135deg,#dc2626,#ef4444)',
              padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 32 }}>{toastModal.type === 'success' ? '📦' : '❌'}</span>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{toastModal.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>Package Update</div>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 22px' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{toastModal.detail}</p>
              {toastModal.type === 'success' && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 13, color: '#166534' }}>
                  💡 <strong>Next step:</strong> Go to <strong>Shipping</strong> in the sidebar → find this order → click <strong>🚚 Ship</strong>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{ padding: '0 22px 18px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setToastModal(null)}
                style={{
                  padding: '9px 28px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, color: '#fff',
                  background: toastModal.type === 'success' ? '#16a34a' : '#dc2626',
                }}
              >Got it ✓</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
      `}</style>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Needs Packing',  value: processingCount, color: '#2563eb', icon: <Clock size={15} />,        filter: 'PROCESSING' },
          { label: 'Packed',         value: packedCount,     color: '#d97706', icon: <PackageIcon size={15} />,  filter: 'PACKED' },
        ].map(stat => (
          <div
            key={stat.label}
            onClick={() => setStatusFilter(stat.filter)}
            style={{
              background: '#fff', borderRadius: 10, padding: '14px 16px',
              borderLeft: `4px solid ${stat.color}`,
              boxShadow: statusFilter === stat.filter ? `0 0 0 2px ${stat.color}` : '0 1px 3px rgba(0,0,0,0.07)',
              cursor: 'pointer', transition: 'box-shadow 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{stat.label}</p>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>{stat.value}</p>
              </div>
              <span style={{ color: stat.color }}>{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}
        >
          <option value="ALL">All Orders</option>
          <option value="PROCESSING">Needs Packing (PROCESSING)</option>
          <option value="PACKED">Packed</option>
          <option value="SHIPPED">Shipped</option>
        </select>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by order number or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Order #', 'Customer', 'Items', 'Amount', 'Status', 'Packing Slip', 'Date', 'Action'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                    color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    <PackageIcon size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                    <div>
                      {statusFilter === 'PROCESSING'
                        ? 'No orders need packing right now'
                        : 'No orders found'}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(order => {
                  const isPacking = packing === order.orderNumber;
                  const canPack = order.orderStatus?.toUpperCase() === 'PROCESSING';
                  const pkg = pkgMap[order.orderNumber];
                  return (
                    <tr key={order.orderNumber} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                        {order.orderNumber?.slice(0, 18)}…
                      </td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>
                        Customer #{order.customerId}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>
                        {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>
                        {fmtAmt(order.totalAmount)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <StatusBadge status={order.orderStatus} />
                      </td>
                      <td style={{ padding: '10px 14px', color: '#374151', fontSize: 12 }}>
                        {pkg ? (
                          <div>
                            {pkg.packingSlipNumber
                              ? <span style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{pkg.packingSlipNumber}</span>
                              : <span style={{ color: '#9ca3af' }}>—</span>}
                            {pkg.weightKg && (
                              <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
                                {pkg.weightKg} kg
                                {pkg.lengthCm && ` · ${pkg.lengthCm}×${pkg.widthCm}×${pkg.heightCm} cm`}
                              </div>
                            )}
                          </div>
                        ) : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>
                        {fmtDate(order.createdAt)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {canPack ? (
                          <button
                            onClick={() => handlePack(order.orderNumber, order.customerId)}
                            disabled={isPacking}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 14px', background: isPacking ? '#fde68a' : '#d97706',
                              color: '#fff', border: 'none', borderRadius: 7,
                              fontSize: 12, fontWeight: 700, cursor: isPacking ? 'not-allowed' : 'pointer',
                              opacity: isPacking ? 0.7 : 1, transition: 'background 0.15s',
                            }}
                          >
                            <PackageIcon size={13} />
                            {isPacking ? 'Packing…' : '📦 Pack'}
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#6b7280' }}>
                            {order.orderStatus?.toUpperCase() === 'PACKED' ? '✅ Packed' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flow guide at bottom */}
      <div style={{
        marginTop: 20, padding: '14px 18px', background: '#f0fdf4',
        borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 13,
      }}>
        <div style={{ fontWeight: 700, color: '#166534', marginBottom: 8 }}>📋 Order Fulfillment Flow</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', color: '#374151' }}>
          {[
            { label: 'CONFIRMED', color: '#0d9488' },
            { label: '→' },
            { label: 'PROCESSING', color: '#2563eb' },
            { label: '→ 📦 Pack (here)' },
            { label: 'PACKED', color: '#d97706' },
            { label: '→ Shipping sidebar → 🚚 Ship' },
            { label: 'SHIPPED', color: '#7c3aed' },
            { label: '→ Orders → Assign Delivery' },
            { label: 'OUT_FOR_DELIVERY', color: '#0891b2' },
            { label: '→' },
            { label: 'DELIVERED', color: '#16a34a' },
          ].map((item, i) => (
            item.color
              ? <span key={i} style={{ padding: '2px 8px', borderRadius: 8, background: item.color + '20', color: item.color, fontWeight: 700, fontSize: 11 }}>{item.label}</span>
              : <span key={i} style={{ color: '#9ca3af', fontSize: 12 }}>{item.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
