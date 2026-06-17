import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ShoppingCart, Package, Truck, CheckCircle, Clock, User, DollarSign, RotateCcw, RefreshCw, Inbox, ChevronDown, ChevronUp } from 'lucide-react';
import '../css/Orders.css';
import '../css/Tabs.css';
import { getNotifications } from '../../services/notificationStore';
import { useWarehouseSocket } from '../../services/useWarehouseSocket';

const API = 'http://localhost:9999/api';

const getToken = () =>
  sessionStorage.getItem('adminToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

const getAuthHeaders = () => {
  const token = getToken();
  if (!token) console.warn('⚠️ Orders: No auth token found');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

// Check if JWT token is expired
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch { return true; }
};

const fmt = (val) => val ?? '—';
const parseDate = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) {
    const [y, m, d, h = 0, min = 0, s = 0] = val;
    return new Date(y, m - 1, d, h, min, s);
  }
  // Append 'Z' only if there's no timezone info, to avoid UTC/local ambiguity
  const str = typeof val === 'string' && !val.endsWith('Z') && !val.includes('+') ? val + 'Z' : val;
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
};
const fmtDate = (val) => {
  const dt = parseDate(val);
  if (!dt) return '—';
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtAmt = (val) => val != null ? `₹${parseFloat(val).toFixed(2)}` : '—';

const STATUS_FLOW = ['CONFIRMED', 'PROCESSING', 'PICKED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

// Step display config — label + icon for each status in the timeline
const STEP_CFG = {
  CONFIRMED:        { label: 'Confirmed',    icon: '✅', role: 'Admin' },
  PROCESSING:       { label: 'Picker',       icon: '🏃', role: 'Picker' },
  PICKED:           { label: 'Picked',       icon: '🛒', role: 'Picker' },
  PACKED:           { label: 'Packer',       icon: '📦', role: 'Packer' },
  SHIPPED:          { label: 'Shipped',      icon: '🚚', role: 'Shipping' },
  OUT_FOR_DELIVERY: { label: 'Out for Del.', icon: '🛵', role: 'Delivery' },
  DELIVERED:        { label: 'Delivered',    icon: '🎉', role: 'Done' },
};

// ── Complete Warehouse-Integrated Flow ──────────────────────────────────────
// CONFIRMED     → Order auto-assigned to warehouse; Manager gets instant notification
// PROCESSING    → PICKER picks items from warehouse bin → Packages tab: Mark PACKED
// PACKED        → PACKER packs box → Shipping tab: Mark SHIPPED (enter AWB)
// SHIPPED       → Admin assigns Delivery Boy → OUT_FOR_DELIVERY
// OUT_FOR_DELIVERY → Delivery Boy marks DELIVERED
// Admin ला CONFIRMED वर "Mark Processing" button नाही — warehouse manager directly handle करतो
const NEXT_STATUS = {}; // Admin no longer manually triggers PROCESSING

// Role responsible for each status transition
const STATUS_ROLE = {
  CONFIRMED:        '👨‍💼 Admin',
  PROCESSING:       '🏃 Picker (Warehouse)',
  PICKED:           '🛒 Picked (Warehouse)',
  PACKED:           '📦 Packer (Warehouse)',
  SHIPPED:          '🚚 Shipping (Warehouse)',
  OUT_FOR_DELIVERY: '🛵 Delivery Boy',
  DELIVERED:        '✅ Delivered',
};

const STATUS_META = {
  CONFIRMED:        { label: 'Confirmed',        color: '#0d9488', bg: '#ccfbf1', btn: null,                btnBg: '' },
  PROCESSING:       { label: 'Processing',        color: '#2563eb', bg: '#dbeafe', btn: null,                btnBg: '' },
  PICKED:           { label: 'Picked',            color: '#7c3aed', bg: '#ede9fe', btn: null,                btnBg: '' },
  PACKED:           { label: 'Packed',            color: '#d97706', bg: '#fef3c7', btn: null,                btnBg: '' },
  SHIPPED:          { label: 'Shipped',           color: '#7c3aed', bg: '#ede9fe', btn: 'Assign Delivery',   btnBg: '#0891b2' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  color: '#0891b2', bg: '#e0f2fe', btn: null,                btnBg: '' },
  DELIVERED:        { label: 'Delivered',         color: '#16a34a', bg: '#dcfce7', btn: null,                btnBg: '' },
  CANCELLED:        { label: 'Cancelled',         color: '#dc2626', bg: '#fee2e2', btn: null,                btnBg: '' },
  FAILED:           { label: 'Failed',            color: '#b91c1c', bg: '#fecaca', btn: null,                btnBg: '' },
  PENDING:          { label: 'Pending',           color: '#d97706', bg: '#fef3c7', btn: null,                btnBg: '' },
};

function Badge({ status }) {
  const m = STATUS_META[status?.toUpperCase()] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
}

function StatusTimeline({ status }) {
  const upper = status?.toUpperCase();
  const idx = STATUS_FLOW.indexOf(upper);
  const effectiveIdx = upper === 'DELIVERED' ? STATUS_FLOW.length : idx;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 6 }}>
      {STATUS_FLOW.map((step, i) => {
        const done   = i < effectiveIdx;
        const active = i === idx && upper !== 'DELIVERED';
        const cfg    = STEP_CFG[step] || { label: step, icon: i + 1 };
        return (
          <React.Fragment key={step}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 12 : 10, fontWeight: 700,
                background: done ? '#22c55e' : active ? '#2563eb' : '#e5e7eb',
                color: (done || active) ? '#fff' : '#9ca3af',
                outline: active ? '3px solid #93c5fd' : 'none',
                boxShadow: active ? '0 0 0 3px #dbeafe' : 'none',
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : cfg.icon}
              </div>
              <span style={{
                fontSize: 9, marginTop: 3, textAlign: 'center', lineHeight: 1.2,
                color: active ? '#2563eb' : done ? '#16a34a' : '#9ca3af',
                fontWeight: (active || done) ? 700 : 400,
                maxWidth: 44,
              }}>
                {cfg.label}
              </span>
              {active && (
                <span style={{ fontSize: 8, color: '#2563eb', fontWeight: 600, marginTop: 1 }}>
                  ← now
                </span>
              )}
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 20, minWidth: 8,
                background: done ? '#22c55e' : '#e5e7eb',
                transition: 'background 0.3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TableWrapper({ children, loading, empty, colSpan }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        {children[0]}
        <tbody>
          {loading ? (
            <tr><td colSpan={colSpan} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</td></tr>
          ) : empty ? (
            <tr><td colSpan={colSpan} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No data found</td></tr>
          ) : children[1]}
        </tbody>
      </table>
    </div>
  );
}

const TH = ({ children }) => (
  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
    {children}
  </th>
);
const TD = ({ children, mono }) => (
  <td style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontFamily: mono ? 'monospace' : undefined, fontSize: mono ? 12 : 13 }}>
    {children}
  </td>
);

const TABS = [
  { key: 'orders',         label: 'Orders',         icon: <ShoppingCart size={14} /> },
  { key: 'order_items',    label: 'Order Items',     icon: <Package size={14} /> },
  { key: 'status_history', label: 'Status History',  icon: <Clock size={14} /> },
  { key: 'pricing',        label: 'Pricing',         icon: <DollarSign size={14} /> },
  { key: 'customers',      label: 'Customers',       icon: <User size={14} /> },
  { key: 'returns',        label: 'Returns',         icon: <RotateCcw size={14} /> },
  { key: 'refunds',        label: 'Refunds',         icon: <RefreshCw size={14} /> },
  { key: 'outbox',         label: 'Outbox',          icon: <Inbox size={14} /> },
];

export default function Orders() {
  const [activeTab, setActiveTab] = useState('orders');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Data per tab
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [outbox, setOutbox] = useState([]);

  // Lookup maps for category/subcategory names
  const [categoryMap, setCategoryMap] = useState({});
  const [subcategoryMap, setSubcategoryMap] = useState({});

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [guidanceBanner, setGuidanceBanner] = useState(null); // { step, orderNumber }
  const [assignDeliveryModal, setAssignDeliveryModal] = useState(null); // { orderNumber }
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [assigningDelivery, setAssigningDelivery] = useState(false);
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState(null);
  const [unassigningDelivery, setUnassigningDelivery] = useState(null); // orderNumber being unassigned
  const [returnPickupTasks, setReturnPickupTasks] = useState([]);

  const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async (tab) => {
    setLoading(true); setError(null);

    // Pre-check: token present and not expired
    const token = getToken();
    if (!token) {
      setError('No auth token found. Please log in as Admin.');
      setLoading(false);
      return;
    }
    if (isTokenExpired(token)) {
      setError('Your session has expired. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const headers = getAuthHeaders();

      const safeFetch = async (url) => {
        const res = await fetch(url, { headers });
        if (res.status === 401) throw new Error('Unauthorized (401) — token may be invalid or expired. Please re-login.');
        if (res.status === 403) throw new Error('Forbidden (403) — Admin role required. Make sure you are logged in as Admin.');
        return res.ok ? res.json() : [];
      };

      if (tab === 'orders') {
        const data = await safeFetch(`${API}/auth/admin/orders/all`);
        // Sort newest first — handles both array [y,m,d,h,min,s] and ISO string formats
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
          const ta = parseDate(a.createdAt)?.getTime() ?? 0;
          const tb = parseDate(b.createdAt)?.getTime() ?? 0;
          return tb - ta;
        });
        setAllOrders(sorted); setOrders(sorted);
      } else if (tab === 'order_items') {
        // Fetch orders, products, categories, and subcategories in parallel
        const [ordersData, productsData, categoriesData, subcategoriesData] = await Promise.all([
          safeFetch(`${API}/auth/admin/orders/all`),
          safeFetch(`${API}/auth/admin/products`).catch(() => []),
          safeFetch(`${API}/auth/admin/categories`).catch(() => []),
          safeFetch(`${API}/auth/admin/subcategories`).catch(() => []),
        ]);

        // Build category/subcategory id -> name maps
        const catMap = {};
        (Array.isArray(categoriesData) ? categoriesData : []).forEach(c => {
          catMap[c.categoryId ?? c.id] = c.categoryName ?? c.name ?? String(c.categoryId ?? c.id);
        });
        const subMap = {};
        (Array.isArray(subcategoriesData) ? subcategoriesData : []).forEach(sc => {
          subMap[sc.subcategoryId ?? sc.id] = sc.subcategoryName ?? sc.name ?? String(sc.subcategoryId ?? sc.id);
        });

        // Build product id -> { categoryName, subcategoryName } map
        const productInfoMap = {};
        (Array.isArray(productsData) ? productsData : []).forEach(p => {
          const pid = p.productId ?? p.id;
          const catId = p.categoryId;
          const subId = p.subcategoryId;
          productInfoMap[pid] = {
            categoryName:    catId ? (catMap[catId] ?? p.categoryName ?? String(catId))    : null,
            subcategoryName: subId ? (subMap[subId] ?? p.subcategoryName ?? String(subId)) : null,
          };
        });

        setCategoryMap(catMap);
        setSubcategoryMap(subMap);
        setOrderItems(
          (Array.isArray(ordersData) ? ordersData : []).flatMap(o =>
            (o.items || []).map(item => {
              const info = productInfoMap[item.productId] || {};
              return {
                ...item,
                orderNumber: o.orderNumber,
                customerId: o.customerId,
                categoryName: info.categoryName ?? null,
                subcategoryName: info.subcategoryName ?? null,
              };
            })
          )
        );
      } else if (tab === 'status_history') {
        const data = await safeFetch(`${API}/auth/admin/orders/statusHistory`);
        setStatusHistory(data);
      } else if (tab === 'pricing') {
        const data = await safeFetch(`${API}/auth/admin/orders/pricing`);
        setPricing(data);
      } else if (tab === 'customers') {
        const data = await safeFetch(`${API}/auth/admin/orders/customerDetails`);
        setCustomers(data);
      } else if (tab === 'returns') {
        const [returnsData, customersData, ordersData, pickupTasksData] = await Promise.all([
          safeFetch(`${API}/auth/admin/orders/returns`),
          safeFetch(`${API}/auth/admin/customers`).catch(() => []),
          safeFetch(`${API}/auth/admin/orders/all`).catch(() => []),
          safeFetch(`${API}/auth/admin/delivery/return-pickup-tasks`).catch(() => []),
        ]);
        const returnsList = Array.isArray(returnsData) ? returnsData : [];
        const customersList = Array.isArray(customersData) ? customersData : [];
        const ordersList = Array.isArray(ordersData) ? ordersData : [];
        const pickupList = Array.isArray(pickupTasksData) ? pickupTasksData : [];

        setReturns(returnsList);
        setReturnPickupTasks(pickupList);
        if (customersList.length > 0) setCustomers(customersList);
        if (ordersList.length > 0) setAllOrders(ordersList);
      } else if (tab === 'refunds') {
        const [refundsData, customersData, ordersData] = await Promise.all([
          safeFetch(`${API}/auth/admin/orders/refunds`),
          safeFetch(`${API}/auth/admin/customers`).catch(() => []),
          safeFetch(`${API}/auth/admin/orders/all`).catch(() => [])
        ]);
        setRefunds(Array.isArray(refundsData) ? refundsData : []);
        if (Array.isArray(customersData) && customersData.length > 0) setCustomers(customersData);
        if (Array.isArray(ordersData) && ordersData.length > 0) setAllOrders(ordersData);
      } else if (tab === 'outbox') {
        const data = await safeFetch(`${API}/orders/failedEvents`);
        setOutbox(data);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(activeTab); }, [activeTab, load]);

  useEffect(() => {
    const filtered = statusFilter === 'ALL'
      ? allOrders
      : allOrders.filter(o => o.orderStatus?.toUpperCase() === statusFilter);
    setOrders(filtered);
  }, [statusFilter, allOrders]);

  // 🔄 Auto-refresh orders every 30s when on orders tab
  useEffect(() => {
    if (activeTab !== 'orders') return;
    const interval = setInterval(() => load('orders'), 30000);
    return () => clearInterval(interval);
  }, [activeTab, load]);

  // 🔌 WebSocket — warehouse events वर instant order refresh
  // ⚠️ NOTE: इथे pushNotification() काढला — Orders.js + WarehouseDashboard.js दोन्ही
  // /topic/admin/notifications + /topic/warehouse/all ऐकतात.
  // दोन्ही ठिकाणी push केल्यावर Admin bell वर double ORDER_PICKED/PACKED येत होती.
  // WarehouseDashboard.js मध्ये एकदाच push होतो — Orders.js फक्त UI refresh करतो.
  useWarehouseSocket({
    topics: ['/topic/admin/notifications'],
    onMessage: (event) => {
      const refreshTypes = ['ORDER_PICKED', 'ORDER_PACKED', 'ORDER_SHIPPED', 'ORDER_PROCESSING', 'PICK_LIST_ASSIGNED'];
      if (refreshTypes.includes(event.type)) {
        // फक्त Orders tab refresh — notification push नाही (WarehouseDashboard push करतो)
        if (activeTab === 'orders') {
          load('orders');
        }
      }
    },
    enabled: activeTab === 'orders',
  });

  // 🔔 localStorage fallback — same-tab notifications (WebSocket नसेल तर)
  useEffect(() => {
    const handler = () => {
      const notifs = getNotifications();
      const hasWarehouseUpdate = notifs.some(n =>
        ['ORDER_PACKED', 'ORDER_PICKED', 'ORDER_SHIPPED', 'ORDER_PROCESSING'].includes(n.type) && !n.read
      );
      if (hasWarehouseUpdate && activeTab === 'orders') {
        load('orders');
      }
    };
    window.addEventListener('ims_notification_update', handler);
    return () => window.removeEventListener('ims_notification_update', handler);
  }, [activeTab, load]);

  // 🚚 Delivery boy events — OUT_FOR_DELIVERY / DELIVERED instant refresh
  useEffect(() => {
    const handler = (e) => {
      if (activeTab === 'orders') {
        load('orders');
      }
    };
    window.addEventListener('ims_delivery_update', handler);
    return () => window.removeEventListener('ims_delivery_update', handler);
  }, [activeTab, load]);

  const updateOrderStatus = async (orderNumber, newStatus) => {
    setUpdatingOrder(orderNumber);

    // ── Show guidance modal immediately on button click (don't wait for API) ──
    if (newStatus === 'PACKED') {
      setGuidanceBanner({ step: 'PACKED', orderNumber });
    } else {
      setGuidanceBanner(null);
    }

    try {
      const res = await fetch(`${API}/auth/admin/orders/${orderNumber}/status?status=${newStatus}`, {
        method: 'PATCH', headers: getAuthHeaders()
      });
      if (res.ok) {
        const upd = o => o.orderNumber === orderNumber ? { ...o, orderStatus: newStatus } : o;
        setAllOrders(p => p.map(upd)); setOrders(p => p.map(upd));
        showToast('success', `Order updated → ${newStatus}`);
      } else {
        setGuidanceBanner(null);
        showToast('error', 'Update failed');
      }
    } catch (err) {
      setGuidanceBanner(null);
      showToast('error', err.message);
    }
    finally { setUpdatingOrder(null); }
  };

  const resendOutbox = async () => {
    try {
      await fetch(`${API}/orders/resendFailedEvents`, { method: 'POST', headers: getAuthHeaders() });
      showToast('success', 'Resend initiated'); load('outbox');
    } catch (err) { showToast('error', err.message); }
  };

  const openAssignDelivery = async (orderNumber) => {
    setAssignDeliveryModal({ orderNumber });
    setSelectedDeliveryBoy(null);
    // Fetch delivery boys list + their live statuses in parallel
    try {
      const [dbRes, custRes, statusRes] = await Promise.all([
        fetch(`${API}/auth/admin/delivery-boys`, { headers: getAuthHeaders() }),
        fetch(`${API}/auth/admin/customers`, { headers: getAuthHeaders() }),
        fetch(`${API}/auth/admin/delivery-boys/status`, { headers: getAuthHeaders() }),
      ]);

      const STALE_MS = 30 * 60 * 1000; // 30 min — same threshold as DeliveryBoyManagement
      const getEffectiveStatus = (sd) => {
        if (!sd) return 'OFFLINE';
        const s = sd.status || 'OFFLINE';
        if (s === 'OFFLINE' || s === 'ON_BREAK') return s;
        const ts = sd.updatedAt ? new Date(sd.updatedAt) : null;
        if (!ts || isNaN(ts.getTime()) || Date.now() - ts.getTime() > STALE_MS) return 'OFFLINE';
        return s;
      };

      const statuses = statusRes.ok ? await statusRes.json() : [];

      if (dbRes.ok) {
        const emails = await dbRes.json(); // array of emails
        if (custRes.ok) {
          const customers = await custRes.json();
          const boys = customers
            .filter(c => emails.includes(c.email))
            .map(c => {
              const sd = statuses.find(s => s.deliveryBoyId === c.id || s.deliveryBoyEmail === c.email);
              return { ...c, _liveStatus: getEffectiveStatus(sd) };
            })
            // Sort: AVAILABLE first, then BUSY, then rest
            .sort((a, b) => {
              const order = { AVAILABLE: 0, BUSY: 1, ON_BREAK: 2, OFFLINE: 3 };
              return (order[a._liveStatus] ?? 4) - (order[b._liveStatus] ?? 4);
            });
          setDeliveryBoys(boys);
        } else {
          setDeliveryBoys(emails.map(email => ({ email, firstName: email, lastName: '', _liveStatus: 'OFFLINE' })));
        }
      }
    } catch (err) {
      setDeliveryBoys([]);
    }
  };

  const handleAssignDelivery = async (orderNumber, selectedBoy) => {
    setAssigningDelivery(true);
    try {
      // Use the proper assign endpoint that creates a DeliveryAssignment record
      // so the delivery boy can see the order in their dashboard
      const assignRes = await fetch(`${API}/auth/admin/delivery/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderNumber,
          deliveryBoyId: selectedBoy?.id || selectedBoy?.customerId || null,
          deliveryBoyName: selectedBoy ? `${selectedBoy.firstName || ''} ${selectedBoy.lastName || ''}`.trim() : '',
        }),
      });

      if (assignRes.ok) {
        const upd = o => o.orderNumber === orderNumber ? { ...o, orderStatus: 'SHIPPED' } : o;
        setAllOrders(p => p.map(upd)); setOrders(p => p.map(upd));
        showToast('success', `Order assigned to delivery boy → visible in delivery dashboard`);
        setAssignDeliveryModal(null);
        // Notify Delivery Dashboard (PackageTracking) to refresh
        window.dispatchEvent(new CustomEvent('deliveryAssigned', { detail: { orderNumber } }));
      } else {
        showToast('error', 'Failed to assign delivery');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setAssigningDelivery(false);
    }
  };

  const handleUnassignDelivery = async (orderNumber) => {
    setUnassigningDelivery(orderNumber);
    try {
      // Revert back to SHIPPED so it can be re-assigned
      const res = await fetch(
        `${API}/auth/admin/orders/${orderNumber}/status?status=SHIPPED`,
        { method: 'PATCH', headers: getAuthHeaders() }
      );
      if (res.ok) {
        const upd = o => o.orderNumber === orderNumber ? { ...o, orderStatus: 'SHIPPED' } : o;
        setAllOrders(p => p.map(upd));
        setOrders(p => p.map(upd));
        showToast('success', `Delivery assignment removed — order reverted to SHIPPED`);
        // Tell Delivery Dashboard to refresh
        window.dispatchEvent(new CustomEvent('deliveryAssigned', { detail: { orderNumber } }));
      } else {
        showToast('error', 'Failed to remove delivery assignment');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setUnassigningDelivery(null);
    }
  };

  const s = search.toLowerCase();

  // Stats — use toUpperCase() to handle any casing from backend
  const countByStatus = (st) => allOrders.filter(o => o.orderStatus?.toUpperCase() === st).length;
  const stats = [
    { label: 'Total',           value: allOrders.length,                    color: '#6b7280', icon: <ShoppingCart size={15} /> },
    { label: 'Confirmed',       value: countByStatus('CONFIRMED'),           color: '#0d9488', icon: <Clock size={15} /> },
    { label: 'Processing',      value: countByStatus('PROCESSING'),          color: '#2563eb', icon: <Package size={15} /> },
    { label: 'Picked',          value: countByStatus('PICKED'),              color: '#7c3aed', icon: <Package size={15} /> },
    { label: 'Packed',          value: countByStatus('PACKED'),              color: '#d97706', icon: <Package size={15} /> },
    { label: 'Shipped',         value: countByStatus('SHIPPED'),             color: '#7c3aed', icon: <Truck size={15} /> },
    { label: 'Out for Delivery',value: countByStatus('OUT_FOR_DELIVERY'),    color: '#0891b2', icon: <Truck size={15} /> },
    { label: 'Delivered',       value: countByStatus('DELIVERED'),           color: '#16a34a', icon: <CheckCircle size={15} /> },
    { label: 'Cancelled',       value: countByStatus('CANCELLED'),           color: '#dc2626', icon: <RotateCcw size={15} /> },
  ];

  return (
    <div className="admin" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Orders Management</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeTab === 'orders' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
            >
              <option value="ALL">All Status</option>
              {['CONFIRMED','PROCESSING','PICKED','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','FAILED','PENDING'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <button onClick={() => load(activeTab)} style={{ padding: '7px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ marginBottom: 12, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.text}
        </div>
      )}

      {/* ── Assign Delivery Boy Modal ── */}
      {assignDeliveryModal && (
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
              background: 'linear-gradient(135deg,#0891b2,#38bdf8)',
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
              }}>👤</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Assign Delivery Boy</div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
                  Order # {assignDeliveryModal.orderNumber?.slice(0, 20)}…
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#374151' }}>
                Select a delivery boy — they will see this order in their dashboard when they come online.
              </p>

              {/* Delivery Boys — clickable selection */}
              {deliveryBoys.length > 0 ? (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Select Delivery Boy:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                    {deliveryBoys.map(boy => {
                      const isSelected = selectedDeliveryBoy?.email === boy.email;
                      const liveStatus = boy._liveStatus || 'OFFLINE';
                      const statusCfg = {
                        AVAILABLE: { label: 'Available', dot: '#22c55e', bg: '#dcfce7', color: '#16a34a' },
                        BUSY:      { label: 'Busy',      dot: '#f59e0b', bg: '#fef3c7', color: '#d97706' },
                        ON_BREAK:  { label: 'On Break',  dot: '#38bdf8', bg: '#e0f2fe', color: '#0891b2' },
                        OFFLINE:   { label: 'Offline',   dot: '#9ca3af', bg: '#f3f4f6', color: '#6b7280' },
                      }[liveStatus] || { label: liveStatus, dot: '#9ca3af', bg: '#f3f4f6', color: '#6b7280' };
                      return (
                        <div
                          key={boy.id || boy.email}
                          onClick={() => setSelectedDeliveryBoy(boy)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                            background: isSelected ? '#e0f2fe' : '#f8fafc',
                            border: `2px solid ${isSelected ? '#0891b2' : '#e2e8f0'}`,
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: isSelected ? '#0891b2' : '#cbd5e1',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 16, flexShrink: 0,
                            }}>🚚</div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#0c4a6e' : '#1e293b' }}>
                                {boy.firstName} {boy.lastName}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{boy.email}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Live status badge */}
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                              background: statusCfg.bg, color: statusCfg.color,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.dot, flexShrink: 0 }} />
                              {statusCfg.label}
                            </span>
                            {isSelected && (
                              <span style={{ fontSize: 18, color: '#0891b2' }}>✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', marginBottom: 14, border: '1px solid #fde68a' }}>
                  ⚠️ No delivery boys found. Go to <strong>Delivery Boys</strong> in the sidebar to add one first.
                </div>
              )}

              {selectedDeliveryBoy && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 4,
                  background: selectedDeliveryBoy._liveStatus === 'AVAILABLE' ? '#f0fdf4' : '#fefce8',
                  color:      selectedDeliveryBoy._liveStatus === 'AVAILABLE' ? '#166534'  : '#854d0e',
                  border:     `1px solid ${selectedDeliveryBoy._liveStatus === 'AVAILABLE' ? '#bbf7d0' : '#fde68a'}`,
                }}>
                  {selectedDeliveryBoy._liveStatus === 'AVAILABLE' ? '✅' : '⚠️'}{' '}
                  Selected: <strong>{selectedDeliveryBoy.firstName} {selectedDeliveryBoy.lastName}</strong>
                  {selectedDeliveryBoy._liveStatus !== 'AVAILABLE'
                    ? ` — सध्या ${selectedDeliveryBoy._liveStatus === 'OFFLINE' ? 'Offline' : selectedDeliveryBoy._liveStatus} आहे. Assignment save होईल — online आल्यावर त्यांच्या dashboard वर दिसेल.`
                    : ' — order will appear in their dashboard as "To Pick Up".'}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => { setAssignDeliveryModal(null); setSelectedDeliveryBoy(null); }}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignDelivery(assignDeliveryModal.orderNumber, selectedDeliveryBoy)}
                disabled={assigningDelivery || (!selectedDeliveryBoy && deliveryBoys.length > 0)}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  cursor: (assigningDelivery || (!selectedDeliveryBoy && deliveryBoys.length > 0)) ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: 14, color: '#fff',
                  background: (assigningDelivery || (!selectedDeliveryBoy && deliveryBoys.length > 0))
                    ? '#94a3b8'
                    : 'linear-gradient(135deg,#0891b2,#38bdf8)',
                  boxShadow: '0 4px 12px rgba(8,145,178,0.3)',
                  opacity: (assigningDelivery || (!selectedDeliveryBoy && deliveryBoys.length > 0)) ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {assigningDelivery ? 'Assigning…' : '🚀 Assign & Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Next-step Guidance Modal (screen center) ── */}
      {guidanceBanner && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
            animation: 'fadeInScale 0.2s ease',
          }}>
            {/* Header */}
            <div style={{
              background: guidanceBanner.step === 'PACKED'
                ? 'linear-gradient(135deg,#7c3aed,#a78bfa)'
                : 'linear-gradient(135deg,#2563eb,#60a5fa)',
              padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                📦
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                  Order Packed Successfully!
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>
                  Order # {guidanceBanner.orderNumber.slice(0, 20)}…
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '12px 20px' }}>
              <>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#6b7280' }}>
                  ✅ Order is now <strong style={{ color: '#7c3aed' }}>PACKED</strong>. What to do next:
                </p>
                <p style={{ margin: '0 0 8px', fontSize: 11, color: '#9ca3af' }}>
                  Step 4 of 6 complete. Your next action is below.
                </p>
                {[
                  { num: 1, done: true,  role: '👨‍💼 Admin',            title: 'Order Confirmed',             desc: 'Customer placed the order. Warehouse auto-assigned. Manager notified instantly.' },
                  { num: 2, done: true,  role: '🏭 Warehouse Manager',  title: 'Picker Assigned (done)',      desc: 'Warehouse Manager assigned a picker to this order.' },
                  { num: 3, done: true,  role: '🏃 Picker',             title: 'Items Picked (done)',         desc: 'Picker collected items from warehouse bin.' },
                  { num: 4, done: true,  role: '📦 Packer',             title: 'Packed (done)',               desc: 'Order is packed and ready to ship.' },
                  { num: 5, done: false, role: '🚚 Shipping',           title: '→ Next: Go to Shipping → Ship', desc: 'Click "Shipping" in the left sidebar → find this order → click 🚚 Ship → enter AWB / Tracking Number and Courier Partner.' },
                  { num: 6, done: false, role: '🛵 Delivery Boy',       title: 'Assign Delivery Boy',         desc: 'After shipping, assign a delivery boy from Orders tab.' },
                ].map(step => (
                  <div key={step.num} style={{
                    display: 'flex', gap: 10, marginBottom: 5,
                    padding: '7px 12px', borderRadius: 8,
                    background: step.done ? '#f0fdf4' : '#f5f3ff',
                    border: `1px solid ${step.done ? '#bbf7d0' : '#ede9fe'}`,
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: step.done ? '#16a34a' : '#7c3aed',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 10,
                    }}>{step.done ? '✓' : step.num}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 10, color: step.done ? '#15803d' : '#7c3aed', background: step.done ? '#dcfce7' : '#ede9fe', padding: '1px 5px', borderRadius: 6, fontWeight: 600 }}>{step.role}</span>
                        <span style={{ fontWeight: 600, fontSize: 12, color: step.done ? '#166534' : '#4c1d95' }}>{step.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: step.done ? '#15803d' : '#6b7280', marginTop: 1 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </>
            </div>

            {/* Footer */}
            <div style={{ padding: '0 20px 14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setGuidanceBanner(null)}
                style={{
                  padding: '10px 32px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 14, color: '#fff',
                  background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                  boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
                  transition: 'opacity 0.15s',
                }}
              >
                Got it ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats — only on orders tab, hide cards with 0 count (except Total) */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          {stats.filter(s => s.label === 'Total' || s.value > 0).map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', borderLeft: `4px solid ${s.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', minWidth: 130, flex: '1 1 130px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>{s.value}</p>
                </div>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-container" style={{ overflowX: 'auto' }}>
        <nav className="tab-nav" style={{ flexWrap: 'nowrap', gap: 0, minWidth: 'max-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setSearch(''); }}
              className={`tab-button ${activeTab === t.key ? 'active' : ''}`}
              style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
              <div className="tab-icon-text">{t.icon}{t.label}</div>
            </button>
          ))}
        </nav>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', margin: '16px 0' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          placeholder={`Search ${TABS.find(t => t.key === activeTab)?.label}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 12, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>❌ {error}</span>
          {(error.includes('401') || error.includes('expired') || error.includes('token') || error.includes('log in')) && (
            <button
              onClick={() => { window.location.href = '/admin/login'; }}
              style={{ padding: '5px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Re-Login
            </button>
          )}
        </div>
      )}

      <div className="tab-content">

        {/* ── ORDERS ── */}
        {activeTab === 'orders' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading...</div>
            ) : (
              <div>
                {orders.filter(o =>
                  o.orderNumber?.toLowerCase().includes(s) ||
                  o.customerId?.toString().includes(s) ||
                  o.orderStatus?.toLowerCase().includes(s)
                ).map(order => {
                  const meta = STATUS_META[order.orderStatus?.toUpperCase()] || {};
                  const nextStatus = NEXT_STATUS[order.orderStatus?.toUpperCase()];
                  const isExp = expandedOrder === order.orderNumber;
                  return (
                    <div key={order.orderNumber} style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>

                      {/* ── Order Info Table ── */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>

                        {/* Left: Info Table */}
                        <div style={{ flex: 1, minWidth: 280 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <tbody>
                              {/* Order ID */}
                              <tr>
                                <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap', width: 130 }}>🆔 Order ID</td>
                                <td style={{ padding: '4px 0', fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', fontSize: 11 }}>
                                  {order.orderNumber}
                                </td>
                              </tr>
                              {/* Customer */}
                              <tr>
                                <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600 }}>👤 Customer</td>
                                <td style={{ padding: '4px 0', color: '#111827' }}>
                                  #{order.customerId}
                                </td>
                              </tr>
                              {/* Products */}
                              <tr>
                                <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600, verticalAlign: 'top' }}>🛍️ Products</td>
                                <td style={{ padding: '4px 0', color: '#111827' }}>
                                  {order.items?.length > 0
                                    ? order.items.map((item, i) => (
                                        <span key={i} style={{ display: 'inline-block', marginRight: 6, marginBottom: 2, background: '#f3f4f6', borderRadius: 6, padding: '1px 7px', fontSize: 11 }}>
                                          #{item.productId} ×{item.quantity}
                                        </span>
                                      ))
                                    : <span style={{ color: '#9ca3af' }}>—</span>
                                  }
                                </td>
                              </tr>
                              {/* Payment Status */}
                              <tr>
                                <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600 }}>💳 Payment</td>
                                <td style={{ padding: '4px 0' }}>
                                  <span style={{
                                    padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                                    color: order.paymentStatus === 'SUCCESS' ? '#166534' : order.paymentStatus === 'PENDING' ? '#92400e' : '#6b7280',
                                    background: order.paymentStatus === 'SUCCESS' ? '#dcfce7' : order.paymentStatus === 'PENDING' ? '#fef3c7' : '#f3f4f6',
                                  }}>
                                    {order.paymentStatus || '—'}
                                  </span>
                                  {order.paymentMode && (
                                    <span style={{ marginLeft: 6, fontSize: 11, color: '#6b7280' }}>({order.paymentMode})</span>
                                  )}
                                </td>
                              </tr>
                              {/* Order Status */}
                              <tr>
                                <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600 }}>📋 Status</td>
                                <td style={{ padding: '4px 0' }}>
                                  <Badge status={order.orderStatus} />
                                  {STATUS_ROLE[order.orderStatus?.toUpperCase()] && (
                                    <span style={{ marginLeft: 6, fontSize: 10, color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                      {STATUS_ROLE[order.orderStatus?.toUpperCase()]}
                                    </span>
                                  )}
                                </td>
                              </tr>
                              {/* Assigned Warehouse */}
                              <tr>
                                <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600 }}>🏭 Warehouse</td>
                                <td style={{ padding: '4px 0' }}>
                                  {order.warehouseName
                                    ? <span style={{ color: '#0369a1', fontWeight: 600 }}>{order.warehouseName}</span>
                                    : <span style={{ color: '#9ca3af' }}>Not assigned</span>
                                  }
                                </td>
                              </tr>
                              {/* Delivery Address / Pincode */}
                              <tr>
                                <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600 }}>📍 Delivery</td>
                                <td style={{ padding: '4px 0', color: '#111827' }}>
                                  {order.deliveryPincode
                                    ? <span>Pincode: <strong>{order.deliveryPincode}</strong></span>
                                    : <span style={{ color: '#9ca3af' }}>—</span>
                                  }
                                </td>
                              </tr>
                              {/* Delivery Type */}
                              <tr>
                                <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600 }}>🚚 Delivery Type</td>
                                <td style={{ padding: '4px 0' }}>
                                  {order.deliverySpeed
                                    ? <span style={{
                                        padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                                        color: order.deliverySpeed === 'EXPRESS' ? '#7c3aed' : order.deliverySpeed === 'SAME_DAY' ? '#dc2626' : '#0369a1',
                                        background: order.deliverySpeed === 'EXPRESS' ? '#ede9fe' : order.deliverySpeed === 'SAME_DAY' ? '#fee2e2' : '#e0f2fe',
                                      }}>
                                        {order.deliverySpeed}
                                      </span>
                                    : <span style={{ color: '#9ca3af' }}>STANDARD</span>
                                  }
                                </td>
                              </tr>
                              {/* Time */}
                              <tr>
                                <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600 }}>🕐 Time</td>
                                <td style={{ padding: '4px 0', color: '#374151' }}>{fmtDate(order.createdAt)}</td>
                              </tr>
                              {/* Amount */}
                              <tr>
                                <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600 }}>💰 Amount</td>
                                <td style={{ padding: '4px 0', fontWeight: 700, fontSize: 14, color: '#111827' }}>{fmtAmt(order.totalAmount)}</td>
                              </tr>
                              {/* Packing Slip / AWB — show only if present */}
                              {order.packingSlipNumber && (
                                <tr>
                                  <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600 }}>📦 Packing Slip</td>
                                  <td style={{ padding: '4px 0', fontFamily: 'monospace', color: '#065f46', fontSize: 11 }}>{order.packingSlipNumber}</td>
                                </tr>
                              )}
                              {order.awbNumber && (
                                <tr>
                                  <td style={{ padding: '4px 10px 4px 0', color: '#6b7280', fontWeight: 600 }}>🚚 AWB</td>
                                  <td style={{ padding: '4px 0', fontFamily: 'monospace', color: '#7c3aed', fontSize: 11 }}>
                                    {order.awbNumber}
                                    {order.courierPartner && <span style={{ marginLeft: 6, color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: 6 }}>{order.courierPartner}</span>}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Right: Timeline + Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                          {/* Status Timeline */}
                          {STATUS_FLOW.includes(order.orderStatus?.toUpperCase()) && (
                            <div style={{ maxWidth: 340 }}>
                              <StatusTimeline status={order.orderStatus?.toUpperCase()} />
                            </div>
                          )}
                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {nextStatus && meta.btn && (
                              <button
                                onClick={() => updateOrderStatus(order.orderNumber, nextStatus)}
                                disabled={updatingOrder === order.orderNumber}
                                style={{ padding: '6px 14px', background: meta.btnBg, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: updatingOrder === order.orderNumber ? 0.6 : 1 }}
                              >
                                {meta.btn}
                              </button>
                            )}
                            {order.orderStatus?.toUpperCase() === 'SHIPPED' && (
                              <button
                                onClick={() => openAssignDelivery(order.orderNumber)}
                                style={{ padding: '6px 14px', background: '#0891b2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                              >
                                👤 Assign Delivery
                              </button>
                            )}
                            {order.orderStatus?.toUpperCase() === 'OUT_FOR_DELIVERY' && (
                              <button
                                onClick={() => handleUnassignDelivery(order.orderNumber)}
                                disabled={unassigningDelivery === order.orderNumber}
                                style={{
                                  padding: '6px 14px',
                                  background: unassigningDelivery === order.orderNumber ? '#fca5a5' : '#fee2e2',
                                  color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6,
                                  fontSize: 12, fontWeight: 600,
                                  cursor: unassigningDelivery === order.orderNumber ? 'not-allowed' : 'pointer',
                                  opacity: unassigningDelivery === order.orderNumber ? 0.7 : 1,
                                }}
                              >
                                {unassigningDelivery === order.orderNumber ? '⏳ Removing…' : '✖ Remove Assignment'}
                              </button>
                            )}
                            {order.items?.length > 0 && (
                              <button
                                onClick={() => setExpandedOrder(isExp ? null : order.orderNumber)}
                                style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                {isExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                {order.items.length} item{order.items.length > 1 ? 's' : ''}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── Expanded Items Table ── */}
                      {isExp && order.items?.length > 0 && (
                        <div style={{ marginTop: 12, background: '#eff6ff', borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            🛍️ Order Items
                          </div>
                          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ color: '#6b7280', textTransform: 'uppercase', fontSize: 10 }}>
                                {['Product ID', 'Barcode', 'Qty', 'Unit Price', 'Total', 'Status'].map(h => (
                                  <th key={h} style={{ textAlign: 'left', padding: '4px 10px', borderBottom: '1px solid #bfdbfe' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, i) => (
                                <tr key={i} style={{ borderTop: '1px solid #bfdbfe' }}>
                                  <td style={{ padding: '6px 10px', color: '#1d4ed8', fontWeight: 600 }}>{item.productId}</td>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{item.barcode || '—'}</td>
                                  <td style={{ padding: '6px 10px' }}>{item.quantity}</td>
                                  <td style={{ padding: '6px 10px' }}>{fmtAmt(item.unitPrice)}</td>
                                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{fmtAmt(item.totalPrice)}</td>
                                  <td style={{ padding: '6px 10px' }}><Badge status={item.orderStatus} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ORDER ITEMS ── */}
        {activeTab === 'order_items' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <TableWrapper loading={loading} empty={!orderItems.length} colSpan={11}>
              <thead>
                <tr>{['ID','Order #','Customer','Product ID','Category','Subcategory','Barcode','Qty','Unit Price','Total','Status'].map(h => <TH key={h}>{h}</TH>)}</tr>
              </thead>
              {orderItems.filter(i =>
                i.orderNumber?.toLowerCase().includes(s) ||
                i.barcode?.toLowerCase().includes(s) ||
                i.productId?.toString().includes(s)
              ).map(item => (
                <tr key={item.id} style={{ background: '#fff' }}>
                  <TD>{item.id}</TD>
                  <TD mono>{item.orderNumber?.slice(0, 16)}...</TD>
                  <TD>{item.customerId}</TD>
                  <TD>{item.productId}</TD>
                  <TD>{item.categoryName ?? '—'}</TD>
                  <TD>{item.subcategoryName ?? '—'}</TD>
                  <TD mono>{item.barcode}</TD>
                  <TD>{item.quantity}</TD>
                  <TD>{fmtAmt(item.unitPrice)}</TD>
                  <TD>{fmtAmt(item.totalPrice)}</TD>
                  <TD><Badge status={item.orderStatus} /></TD>
                </tr>
              ))}
            </TableWrapper>
          </div>
        )}

        {/* ── STATUS HISTORY ── */}
        {activeTab === 'status_history' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <TableWrapper loading={loading} empty={!statusHistory.length} colSpan={8}>
              <thead>
                <tr>{['ID','Order #','Previous Status','New Status','Changed By','Remarks','Changed At','Created At'].map(h => <TH key={h}>{h}</TH>)}</tr>
              </thead>
              {statusHistory.filter(h =>
                h.orderNumber?.toLowerCase().includes(s) ||
                h.status?.toLowerCase().includes(s) ||
                h.previousStatus?.toLowerCase().includes(s)
              ).map(h => (
                <tr key={h.id}>
                  <TD>{h.id}</TD>
                  <TD mono>{h.orderNumber?.slice(0, 16)}...</TD>
                  <TD><Badge status={h.previousStatus} /></TD>
                  <TD><Badge status={h.status} /></TD>
                  <TD>{fmt(h.changedBy)}</TD>
                  <TD>{fmt(h.remarks)}</TD>
                  <TD>{fmtDate(h.changedAt)}</TD>
                  <TD>{fmtDate(h.createdAt)}</TD>
                </tr>
              ))}
            </TableWrapper>
          </div>
        )}

        {/* ── PRICING ── */}
        {activeTab === 'pricing' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <TableWrapper loading={loading} empty={!pricing.length} colSpan={5}>
              <thead>
                <tr>{['ID','Product ID','Unit Price','Currency','Effective Date'].map(h => <TH key={h}>{h}</TH>)}</tr>
              </thead>
              {pricing.filter(p =>
                p.productId?.toString().includes(s) ||
                p.currency?.toLowerCase().includes(s)
              ).map(p => (
                <tr key={p.id}>
                  <TD>{p.id}</TD>
                  <TD>{p.productId}</TD>
                  <TD>{fmtAmt(p.unitPrice)}</TD>
                  <TD>{fmt(p.currency)}</TD>
                  <TD>{fmtDate(p.effectiveDate)}</TD>
                </tr>
              ))}
            </TableWrapper>
          </div>
        )}

        {/* ── CUSTOMERS ── */}
        {activeTab === 'customers' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <TableWrapper loading={loading} empty={!customers.length} colSpan={10}>
              <thead>
                <tr>{['ID','Name','Email','Phone','City','State','Pincode','Country','Status','Created'].map(h => <TH key={h}>{h}</TH>)}</tr>
              </thead>
              {customers.filter(c =>
                c.firstName?.toLowerCase().includes(s) ||
                c.lastName?.toLowerCase().includes(s) ||
                c.email?.toLowerCase().includes(s) ||
                c.customerId?.toString().includes(s)
              ).map(c => (
                <tr key={c.customerId}>
                  <TD>{c.customerId}</TD>
                  <TD>{c.title} {c.firstName} {c.lastName}</TD>
                  <TD>{fmt(c.email)}</TD>
                  <TD>{fmt(c.phone)}</TD>
                  <TD>{fmt(c.city)}</TD>
                  <TD>{fmt(c.state)}</TD>
                  <TD>{fmt(c.pincode)}</TD>
                  <TD>{fmt(c.country)}</TD>
                  <TD>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      color: c.status === 'ACTIVE' ? '#166534' : '#6b7280',
                      background: c.status === 'ACTIVE' ? '#dcfce7' : '#f3f4f6' }}>
                      {c.status || 'ACTIVE'}
                    </span>
                  </TD>
                  <TD>{fmtDate(c.createdAt)}</TD>
                </tr>
              ))}
            </TableWrapper>
          </div>
        )}

        {/* ── RETURNS ── */}
        {activeTab === 'returns' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <TableWrapper loading={loading} empty={!returns.length} colSpan={11}>
              <thead>
                <tr>{['ID','Return Ref','Order #','Customer','Barcode','Status','Reason','Inspection ID','Assigned To','Started At','Actions'].map(h => <TH key={h}>{h}</TH>)}</tr>
              </thead>
              {returns.filter(r =>
                r.returnReference?.toLowerCase().includes(s) ||
                r.orderNumber?.toLowerCase().includes(s) ||
                r.barcode?.toLowerCase().includes(s)
              ).map(r => {
                const st = r.returnStatus;
                const stColor = st === 'RETURN_APPROVED' ? '#166534' : st === 'RETURN_REJECTED' ? '#991b1b' : st === 'RETURN_INITIATED' ? '#92400e' : '#7c3aed';
                const stBg    = st === 'RETURN_APPROVED' ? '#dcfce7' : st === 'RETURN_REJECTED' ? '#fee2e2' : st === 'RETURN_INITIATED' ? '#fef3c7' : '#ede9fe';
                const canAct  = st === 'RETURN_INITIATED' || st === 'RETURN_REQUESTED';
                // Resolve customer
                const orderForReturn = allOrders.find(o => o.orderNumber === r.orderNumber);
                const resolvedCustomerId = Number(r.customerId ?? orderForReturn?.customerId);
                const cust = customers.find(c =>
                  Number(c.id) === resolvedCustomerId ||
                  Number(c.customerId) === resolvedCustomerId
                );
                const custName = cust
                  ? `${cust.firstName ?? ''} ${cust.lastName ?? ''}`.trim() || `#${resolvedCustomerId}`
                  : resolvedCustomerId ? `#${resolvedCustomerId}` : '—';
                // Find the return pickup task for this return
                const pickupTask = returnPickupTasks.find(t => t.returnReference === r.returnReference);
                const assignedTo = pickupTask
                  ? (pickupTask.deliveryBoyId === 0 || pickupTask.deliveryBoyId === '0'
                      ? <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 11 }}>⚠️ Unassigned</span>
                      : <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 11 }}>🚚 {pickupTask.deliveryBoyName || `#${pickupTask.deliveryBoyId}`}</span>)
                  : <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>;
                return (
                  <tr key={r.id}>
                    <TD>{r.id}</TD>
                    <TD mono>{r.returnReference}</TD>
                    <TD mono>{r.orderNumber?.slice(0, 16)}...</TD>
                    <TD>{custName}</TD>
                    <TD mono>{r.barcode}</TD>
                    <TD>
                      <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: stColor, background: stBg, whiteSpace: 'nowrap' }}>
                        {st}
                      </span>
                    </TD>
                    <TD>{fmt(r.returnReason)}</TD>
                    <TD mono>{fmt(r.inspectionId)}</TD>
                    <TD>{assignedTo}</TD>
                    <TD>{fmtDate(r.returnedStartedAt)}</TD>
                    <TD>
                      {canAct ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Approve return ${r.returnReference}?`)) return;
                              try {
                                const res = await fetch(
                                  `${API}/auth/admin/orders/returns/${encodeURIComponent(r.returnReference)}/action?action=APPROVE`,
                                  { method: 'PATCH', headers: getAuthHeaders() }
                                );
                                if (res.ok) {
                                  showToast('success', 'Return approved ✅');
                                  load('returns');
                                } else {
                                  const err = await res.json().catch(() => ({}));
                                  showToast('error', err.error || 'Approve failed');
                                }
                              } catch (e) { showToast('error', e.message); }
                            }}
                            style={{ padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >✅ Approve</button>
                          <button
                            onClick={async () => {
                              const reason = window.prompt('Rejection reason (optional):') ?? '';
                              try {
                                const res = await fetch(
                                  `${API}/auth/admin/orders/returns/${encodeURIComponent(r.returnReference)}/action?action=REJECT&reason=${encodeURIComponent(reason)}`,
                                  { method: 'PATCH', headers: getAuthHeaders() }
                                );
                                if (res.ok) {
                                  showToast('success', 'Return rejected ❌');
                                  load('returns');
                                } else {
                                  const err = await res.json().catch(() => ({}));
                                  showToast('error', err.error || 'Reject failed');
                                }
                              } catch (e) { showToast('error', e.message); }
                            }}
                            style={{ padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >❌ Reject</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
                      )}
                    </TD>
                  </tr>
                );
              })}
            </TableWrapper>
          </div>
        )}

        {/* ── REFUNDS ── */}
        {activeTab === 'refunds' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <TableWrapper loading={loading} empty={!refunds.length} colSpan={9}>
              <thead>
                <tr>{['ID','Refund Ref','Order #','Customer','Amount','Currency','Status','Reason','Created'].map(h => <TH key={h}>{h}</TH>)}</tr>
              </thead>
              {refunds.filter(r =>
                r.refundReference?.toLowerCase().includes(s) ||
                r.orderNumber?.toLowerCase().includes(s) ||
                r.customerId?.toString().includes(s)
              ).map(r => {
                // Resolve customer: use refund's customerId if present,
                // else fall back to matching order's customerId
                const orderForRefund = allOrders.find(o => o.orderNumber === r.orderNumber);
                const resolvedCustId = Number(r.customerId ?? orderForRefund?.customerId);
                const cust = customers.find(c =>
                  Number(c.id) === resolvedCustId ||
                  Number(c.customerId) === resolvedCustId
                );
                const custName = cust
                  ? `${cust.firstName ?? ''} ${cust.lastName ?? ''}`.trim() || `#${resolvedCustId}`
                  : resolvedCustId ? `#${resolvedCustId}` : '—';
                return (
                <tr key={r.id}>
                  <TD>{r.id}</TD>
                  <TD mono>{r.refundReference}</TD>
                  <TD mono>{r.orderNumber?.slice(0, 16)}...</TD>
                  <TD>{custName}</TD>
                  <TD>{fmtAmt(r.totalRefundAmount)}</TD>
                  <TD>{fmt(r.currency)}</TD>
                  <TD>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#e0f2fe' }}>
                      {r.refundStatus}
                    </span>
                  </TD>
                  <TD>{fmt(r.refundReason)}</TD>
                  <TD>{fmtDate(r.createdAt)}</TD>
                </tr>
                );
              })}
            </TableWrapper>
          </div>
        )}

        {/* ── OUTBOX ── */}
        {activeTab === 'outbox' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={resendOutbox} style={{ padding: '7px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🔁 Resend Failed Events
              </button>
            </div>
            <TableWrapper loading={loading} empty={!outbox.length} colSpan={8}>
              <thead>
                <tr>{['ID','Aggregate Type','Aggregate ID','Event','Event Type','Status','Retry Count','Created At'].map(h => <TH key={h}>{h}</TH>)}</tr>
              </thead>
              {outbox.filter(o =>
                o.aggregateId?.toLowerCase().includes(s) ||
                o.event?.toLowerCase().includes(s) ||
                o.status?.toLowerCase().includes(s)
              ).map(o => (
                <tr key={o.id}>
                  <TD>{o.id}</TD>
                  <TD>{fmt(o.aggregateType)}</TD>
                  <TD mono>{fmt(o.aggregateId)}</TD>
                  <TD>{fmt(o.event)}</TD>
                  <TD>{fmt(o.eventType)}</TD>
                  <TD>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      color: o.status === 'PROCESSED' ? '#166534' : o.status === 'FAILED' ? '#991b1b' : '#92400e',
                      background: o.status === 'PROCESSED' ? '#dcfce7' : o.status === 'FAILED' ? '#fee2e2' : '#fef3c7' }}>
                      {o.status}
                    </span>
                  </TD>
                  <TD>{o.retryCount ?? 0}</TD>
                  <TD>{fmtDate(o.createdAt)}</TD>
                </tr>
              ))}
            </TableWrapper>
          </div>
        )}

      </div>
    </div>
  );
}
