import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Truck, CheckCircle, Clock, LogOut, RefreshCw,
  ChevronDown, ChevronUp, Package, MapPin, Hash, DollarSign, Bell
} from 'lucide-react';
import {
  notifyOrderShipped,
  notifyDeliveryAssigned,
  getNotifications, markRead, markAllRead,
} from '../../services/notificationStore';
import { useWarehouseSocket } from '../../services/useWarehouseSocket';

const API = 'http://localhost:9999/api';
const ORDERS_DIRECT   = 'http://localhost:9999'; // routed through API gateway
const SHIPPING_DIRECT = 'http://localhost:9999'; // routed through API gateway
const AUTH_DIRECT     = 'http://localhost:9999'; // routed through API gateway

// Real-world shipping rates (₹ per 500g slab, approximate 2024 rates)
const CARRIER_RATES = {
  BlueDart:    { base: 80,  perKg: 45,  label: '₹80 + ₹45/kg' },
  Delhivery:   { base: 55,  perKg: 35,  label: '₹55 + ₹35/kg' },
  FedEx:       { base: 120, perKg: 65,  label: '₹120 + ₹65/kg' },
  DTDC:        { base: 50,  perKg: 30,  label: '₹50 + ₹30/kg' },
  Ekart:       { base: 45,  perKg: 28,  label: '₹45 + ₹28/kg' },
  Shadowfax:   { base: 50,  perKg: 32,  label: '₹50 + ₹32/kg' },
  Xpressbees:  { base: 48,  perKg: 30,  label: '₹48 + ₹30/kg' },
  'India Post': { base: 30, perKg: 20,  label: '₹30 + ₹20/kg' },
  Other:       { base: 60,  perKg: 40,  label: '₹60 + ₹40/kg' },
};

const calcShippingCost = (carrier, weightKg) => {
  const rate = CARRIER_RATES[carrier] || CARRIER_RATES.Other;
  const kg = parseFloat(weightKg) || 0.5; // default 500g
  return Math.ceil(rate.base + rate.perKg * Math.max(kg, 0.5));
};

// AWB format config per carrier
const CARRIER_AWB = {
  BlueDart:   { minLen: 11, maxLen: 11, pattern: /^[A-Z]{1,3}\d{7,11}$/i,  placeholder: 'e.g. BD123456789',        hint: '11 chars (BD + 9 digits)' },
  Delhivery:  { minLen: 18, maxLen: 18, pattern: /^\d{18}$/,                placeholder: 'e.g. 123456789012345678',  hint: '18 digits' },
  FedEx:      { minLen: 12, maxLen: 12, pattern: /^\d{12}$/,                placeholder: 'e.g. 123456789012',        hint: '12 digits' },
  DTDC:       { minLen: 10, maxLen: 10, pattern: /^[A-Z]\d{9}$/i,           placeholder: 'e.g. D123456789',          hint: '10 chars (D + 9 digits)' },
  Ekart:      { minLen: 16, maxLen: 18, pattern: /^[A-Z0-9]{16,18}$/i,      placeholder: 'e.g. FMPP1234567890AB',    hint: '16–18 alphanumeric' },
  Shadowfax:  { minLen: 12, maxLen: 15, pattern: /^[A-Z0-9]{12,15}$/i,      placeholder: 'e.g. SFX123456789',        hint: '12–15 alphanumeric' },
  Xpressbees: { minLen: 12, maxLen: 16, pattern: /^[A-Z0-9]{12,16}$/i,      placeholder: 'e.g. XB12345678901234',    hint: '12–16 alphanumeric' },
  'India Post':{ minLen: 13, maxLen: 13, pattern: /^[A-Z]{2}\d{9}[A-Z]{2}$/i, placeholder: 'e.g. EE123456789IN',    hint: '13 chars (EE + 9 digits + IN)' },
  Other:      { minLen: 6,  maxLen: 25, pattern: /^[A-Z0-9\-]{6,25}$/i,    placeholder: 'Enter tracking number',    hint: '6–25 alphanumeric' },
};

// Delivery boy live status colours
const DB_STATUS_CFG = {
  AVAILABLE: { label: 'Available', color: '#16A34A', bg: '#dcfce7', dot: '#22c55e' },
  BUSY:      { label: 'Busy',      color: '#D97706', bg: '#fef3c7', dot: '#f59e0b' },
  ON_BREAK:  { label: 'On Break',  color: '#0891b2', bg: '#e0f2fe', dot: '#38bdf8' },
  OFFLINE:   { label: 'Offline',   color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
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

const getHeaders = () => {
  const warehouseToken = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');
  const adminToken = sessionStorage.getItem('adminToken');
  const fallback = localStorage.getItem('authToken') || localStorage.getItem('token');
  const token = warehouseToken || adminToken || fallback;
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

const fmtDate = (v) =>
  v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const C = {
  dark:       '#F8FAFC',
  card:       '#FFFFFF',
  border:     '#E2E8F0',
  orange:     '#EA580C',
  orangeLight:'#C2410C',
  orangeDark: '#9A3412',
  orangeBg:   'rgba(234,88,12,0.08)',
  text:       '#1E293B',
  textMuted:  '#64748B',
  green:      '#16A34A',
  greenBg:    'rgba(22,163,74,0.10)',
  amber:      '#D97706',
  amberBg:    'rgba(217,119,6,0.10)',
  blue:       '#2563EB',
  blueBg:     'rgba(37,99,235,0.10)',
  red:        '#DC2626',
  redBg:      'rgba(220,38,38,0.10)',
};

const STATUS_CFG = {
  PACKED:    { color: C.amber,       bg: C.amberBg,   label: 'Ready to Ship' },
  SHIPPED:   { color: C.green,       bg: C.greenBg,   label: 'Shipped' },
  DELIVERED: { color: C.blue,        bg: C.blueBg,    label: 'Delivered' },
  CANCELLED: { color: C.red,         bg: C.redBg,     label: 'Cancelled' },
  PENDING:   { color: C.orangeLight, bg: C.orangeBg,  label: 'Pending' },
};

const Badge = ({ status }) => {
  const cfg = STATUS_CFG[status] || { color: C.textMuted, bg: 'rgba(255,255,255,0.06)', label: status };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.4px',
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
};

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
    padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 160px',
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: 12, background: bg || C.orangeBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={22} color={color || C.orange} />
    </div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

export default function ShippingDashboard() {
  // ✅ Set page title
  useEffect(() => {
    document.title = 'Shipping Dashboard - Inventory Hub';
    return () => { document.title = 'Inventory Hub'; };
  }, []);

  const [shipments, setShipments]   = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [expanded, setExpanded]     = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg]               = useState('');
  const [activeTab, setActiveTab]   = useState('ready');
  const [stats, setStats]           = useState({ readyToShip: 0, shipped: 0, delivered: 0 });
  const [shipForms, setShipForms]   = useState({});
  // 🟢 Online / Offline toggle
  const [isOnline, setIsOnline]           = useState(true);
  const [onlineLoading, setOnlineLoading] = useState(false);
  // 🏷️ Product name + image cache (fallback when backend doesn't return productName)
  const [productNames, setProductNames]   = useState({});
  const [productImages, setProductImages] = useState({});

  // 🔔 Notification bell
  const [notifications, setNotifications] = useState(() => getNotifications());
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const pollRef = useRef(null); // delivery boy status polling interval

  // 🔔 Only relevant notifications for Shipping
  // ORDER_PACKED_FOR_SHIPPING = packer clicked "Send to Shipping" → comes to shipping
  // ORDER_PACKED              = legacy compat (old packer flow)
  // NOTE: ORDER_SHIPPED removed — shipping staff should not get notification when they dispatch themselves
  const SHIPPING_NOTIF_TYPES = ['ORDER_PACKED_FOR_SHIPPING', 'ORDER_PACKED'];
  const shippingNotifications = notifications.filter(n =>
    SHIPPING_NOTIF_TYPES.includes(n.type)
  );
  const unreadCount = shippingNotifications.filter(n => !n.read).length;

  useEffect(() => {
    const refresh = () => setNotifications(getNotifications());
    window.addEventListener('ims_notification_update', refresh);
    return () => window.removeEventListener('ims_notification_update', refresh);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const userName = localStorage.getItem('firstName') || sessionStorage.getItem('warehouseFirstName') || 'Shipping';

  // 🟢 Login → ONLINE
  useEffect(() => {
    const token = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');
    if (!token) return;
    const staffId    = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');
    const firstName  = sessionStorage.getItem('warehouseFirstName') || '';
    const lastName   = sessionStorage.getItem('warehouseLastName')  || '';
    const staffName  = `${firstName} ${lastName}`.trim() || 'Shipping';
    const staffEmail = sessionStorage.getItem('warehouseEmail') || '';
    const role       = (sessionStorage.getItem('warehouseUserRole') || 'SHIPPING').toUpperCase();
    if (!staffId) return;
    fetch(`${SHIPPING_DIRECT}/api/warehouse/staff-status/online`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ staffId: Number(staffId), staffName, staffEmail, role }),
    }).catch(() => {});
  }, []);

  // 💓 Heartbeat — every 2 minutes
  useEffect(() => {
    const staffId = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');
    if (!staffId) return;
    const interval = setInterval(() => {
      fetch(`${SHIPPING_DIRECT}/api/warehouse/staff-status/heartbeat`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ staffId: Number(staffId) }),
      }).catch(() => {});
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 🔄 Toggle Online / Offline
  const toggleOnline = async () => {
    const staffId = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');
    if (!staffId) return;
    setOnlineLoading(true);
    try {
      const endpoint = isOnline ? 'offline' : 'online';
      const body = isOnline
        ? { staffId: Number(staffId) }
        : {
            staffId:    Number(staffId),
            staffName:  `${sessionStorage.getItem('warehouseFirstName') || ''} ${sessionStorage.getItem('warehouseLastName') || ''}`.trim() || 'Shipping',
            staffEmail: sessionStorage.getItem('warehouseEmail') || '',
            role:       (sessionStorage.getItem('warehouseUserRole') || 'SHIPPING').toUpperCase(),
          };
      const res = await fetch(`${SHIPPING_DIRECT}/api/warehouse/staff-status/${endpoint}`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(body),
      });
      if (res.ok) {
        setIsOnline(prev => !prev);
        setMsg(isOnline ? '⚫ You are now Offline' : '🟢 You are now Online!');
        setTimeout(() => setMsg(''), 3000);
      }
    } catch { /* ignore */ }
    finally { setOnlineLoading(false); }
  };

  // 🔌 WebSocket — real-time ORDER_PACKED notifications for Shipping
  const { sendToAdmin } = useWarehouseSocket({
    topics: ['/topic/warehouse/shipping', '/topic/warehouse/all'],
    onMessage: (event) => {
      // ORDER_PACKED_FOR_SHIPPING → instant refresh ready orders list (new packer flow)
      if (event.type === 'ORDER_PACKED_FOR_SHIPPING' || event.type === 'ORDER_PACKED') {
        loadReadyOrders();
        setMsg(`🔔 ${event.title || 'New order ready to ship!'}`);
        setTimeout(() => setMsg(''), 5000);
      }
      // ORDER_SHIPPED confirmation
      if (event.type === 'ORDER_SHIPPED') {
        loadShipments();
      }
    },
    enabled: true,
  });

  const loadReadyOrders = useCallback(async () => {
    try {
      const shippingStaffId = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');
      const shippingEmail   = sessionStorage.getItem('warehouseEmail') || '';
      const firstName       = (sessionStorage.getItem('warehouseFirstName') || '').trim();
      const lastName        = (sessionStorage.getItem('warehouseLastName')  || '').trim();
      const shippingName    = `${firstName} ${lastName}`.trim();

      // Fetch all COMPLETED pick lists + filter by id OR name OR email
      const assignedRes = await fetch(
        `${SHIPPING_DIRECT}/api/warehouse/pick-lists/status/COMPLETED`,
        { headers: getHeaders() }
      );
      if (assignedRes.ok) {
        const allCompleted = await assignedRes.json();
        const myPickLists = Array.isArray(allCompleted)
          ? allCompleted.filter(pl => {
              const idMatch        = shippingStaffId && String(pl.assignedShippingId) === String(shippingStaffId);
              const nameMatch      = shippingName && pl.assignedShippingName &&
                pl.assignedShippingName.trim().toLowerCase() === shippingName.toLowerCase();
              const firstNameMatch = firstName && pl.assignedShippingName &&
                pl.assignedShippingName.trim().toLowerCase().startsWith(firstName.toLowerCase());
              const emailMatch     = shippingEmail && pl.assignedShippingEmail &&
                pl.assignedShippingEmail.toLowerCase() === shippingEmail.toLowerCase();
              return idMatch || nameMatch || firstNameMatch || emailMatch;
            })
          : [];

        if (myPickLists.length > 0) {
          // Fetch PACKED orders — only orders that have PackDetail (actually packed)
          const res = await fetch(
            `${ORDERS_DIRECT}/api/auth/admin/orders/ordersByorderStatus?orderStatus=PACKED`,
            { headers: getHeaders() }
          );
          if (res.ok) {
            const allPacked = await res.json();
            const myOrderNumbers = new Set(myPickLists.map(pl => pl.orderNumber));
            const myOrders = Array.isArray(allPacked)
              ? allPacked.filter(o => myOrderNumbers.has(o.orderNumber))
              : [];
            setReadyOrders(myOrders);
            setStats(prev => ({ ...prev, readyToShip: myOrders.length }));
            return;
          }
        } else {
          // No assigned orders — show empty
          setReadyOrders([]);
          setStats(prev => ({ ...prev, readyToShip: 0 }));
          return;
        }
      }

      // Fallback: all PACKED orders (for unassigned shipping staff)
      const res = await fetch(
        `${ORDERS_DIRECT}/api/auth/admin/orders/ordersByorderStatus?orderStatus=PACKED`,
        { headers: getHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        const packed = Array.isArray(data) ? data : [];
        setReadyOrders(packed);
        setStats(prev => ({ ...prev, readyToShip: packed.length }));
      }
    } catch { /* ignore */ }
  }, []);

  const loadShipments = useCallback(async () => {
    try {
      // Direct to shipping-service
      const res = await fetch(`${SHIPPING_DIRECT}/api/shipping/shipments`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setShipments(arr);
        setStats(prev => ({
          ...prev,
          shipped:   arr.filter(s => s.status === 'SHIPPED').length,
          delivered: arr.filter(s => s.status === 'DELIVERED').length,
        }));
      }
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadReadyOrders(), loadShipments()]);
    setLoading(false);
  }, [loadReadyOrders, loadShipments]);

  // Fetch delivery boys list — enriched with live status (AVAILABLE / BUSY / OFFLINE)
  const loadDeliveryBoys = useCallback(async () => {
    try {
      // 1. Get list of delivery-boy emails
      const emailRes = await fetch(`${AUTH_DIRECT}/api/auth/admin/delivery-boys`, { headers: getHeaders() });
      // 2. Get live status records
      const statusRes = await fetch(`${AUTH_DIRECT}/api/auth/admin/delivery-boys/status`, { headers: getHeaders() });
      // 3. Get customer profiles
      const custRes = await fetch(`${AUTH_DIRECT}/api/auth/admin/customers`, { headers: getHeaders() });

      const dbEmails  = emailRes.ok  ? await emailRes.json()  : [];
      const statuses  = statusRes.ok ? await statusRes.json() : [];
      const customers = custRes.ok   ? await custRes.json()   : [];

      if (!Array.isArray(dbEmails) || dbEmails.length === 0) {
        setDeliveryBoys([]);
        return;
      }

      // Build enriched list: customer profile + live status
      const emailSet = new Set(dbEmails);
      const enriched = customers
        .filter(c => emailSet.has(c.email))
        .map(c => ({
          ...c,
          sd: statuses.find(s => s.deliveryBoyId === c.id || s.deliveryBoyEmail === c.email) || null,
        }));

      setDeliveryBoys(enriched);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    loadDeliveryBoys();
    // 🔄 Poll every 60s — reduced because WebSocket is active
    pollRef.current = setInterval(loadDeliveryBoys, 60000);
    return () => clearInterval(pollRef.current);
  }, [loadDeliveryBoys]);

  // 🔔 Auto-refresh + switch to ready tab when ORDER_PACKED notification arrives
  useEffect(() => {
    const handler = () => {
      const notifs = getNotifications();
      setNotifications(notifs);
      const hasNewPacked = notifs.some(n =>
        (n.type === 'ORDER_PACKED_FOR_SHIPPING' || n.type === 'ORDER_PACKED') && !n.read
      );
      if (hasNewPacked) {
        load();
        loadDeliveryBoys();
        setActiveTab('ready');
      }
    };
    window.addEventListener('ims_notification_update', handler);
    return () => window.removeEventListener('ims_notification_update', handler);
  }, [load, loadDeliveryBoys]);

  // 🏷️ Fetch product name + image for items that don't have them (backend fallback)
  useEffect(() => {
    const missingIds = [];
    readyOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const needsName  = item.productId && !item.productName  && !productNames[item.productId];
        const needsImage = item.productId && !item.productImage && !productImages[item.productId];
        if (needsName || needsImage) missingIds.push(item.productId);
      });
    });
    if (missingIds.length === 0) return;
    [...new Set(missingIds)].forEach(async (productId) => {
      try {
        const res = await fetch(`http://localhost:9999/api/products/getByProductId/${productId}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const name  = data.name || data.productName || null;
          const image = data.productUrl || data.imageUrl || null;
          if (name)  setProductNames(prev  => ({ ...prev,  [productId]: name  }));
          if (image) setProductImages(prev => ({ ...prev, [productId]: image }));
        }
      } catch { /* ignore */ }
    });
  }, [readyOrders]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateShipForm = (orderId, field, value) => {
    setShipForms(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }));
  };

  const createShipment = async (orderNumber) => {
    const form = shipForms[orderNumber] || {};
    if (!form.carrier) { setMsg('❌ Please enter carrier name'); return; }
    if (!form.trackingNumber) { setMsg('❌ Please enter AWB / tracking number'); return; }

    // Carrier-specific AWB validation
    const awbCfg = CARRIER_AWB[form.carrier] || CARRIER_AWB.Other;
    const awb = form.trackingNumber.trim();
    if (awb.length < awbCfg.minLen || awb.length > awbCfg.maxLen) {
      setMsg(`❌ ${form.carrier} AWB must be ${awbCfg.minLen === awbCfg.maxLen ? awbCfg.minLen : `${awbCfg.minLen}–${awbCfg.maxLen}`} characters. ${awbCfg.hint}`);
      return;
    }
    if (!awbCfg.pattern.test(awb)) {
      setMsg(`❌ Invalid AWB format for ${form.carrier}. Expected: ${awbCfg.hint}`);
      return;
    }
    setActionLoading(`ship-${orderNumber}`);
    setMsg('');
    try {
      // 1. Create shipment via shipping-service directly
      const shipRes = await fetch(`${SHIPPING_DIRECT}/api/shipping/ship/${orderNumber}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          carrier: form.carrier,
          trackingNumber: form.trackingNumber,
          awbNumber: form.trackingNumber,
          cost: parseFloat(form.cost || 0),
          notes: form.notes || '',
          deliveryBoyEmail: form.deliveryBoyEmail || null,
        }),
      });

      // 2. Update order status to SHIPPED — use direct orders route (no auth filter)
      const orderRes = await fetch(`${ORDERS_DIRECT}/api/auth/admin/orders/${orderNumber}/status?status=SHIPPED`, {
        method: 'PATCH',
        headers: getHeaders(),
      });

      // 3. Save AWB + courier to ordersdb.orders table (non-blocking)
      fetch(`${ORDERS_DIRECT}/api/auth/admin/orders/${orderNumber}/awb?awbNumber=${encodeURIComponent(form.trackingNumber)}&courierPartner=${encodeURIComponent(form.carrier)}`, {
        method: 'PATCH',
        headers: getHeaders(),
      }).catch(() => {});

      // 4. Save shipping info to pack_details table
      try {
        const packDetailRes = await fetch(`http://localhost:9999/api/warehouse/pack-details/order/${orderNumber}/shipping`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({
            carrier:       form.carrier,
            trackingNumber: form.trackingNumber,
            shippingCost:  parseFloat(form.cost || 0),
          }),
        });
        if (packDetailRes.ok) {
          console.log('✅ Shipping info saved to pack_details table');
        } else {
          console.warn('⚠️ pack_details shipping update failed:', packDetailRes.status, await packDetailRes.text().catch(() => ''));
        }
      } catch (e) {
        console.warn('⚠️ pack_details shipping update error:', e.message);
      }

      // 4. Create delivery assignment if delivery boy selected
      const selBoy = form.deliveryBoyEmail ? deliveryBoys.find(b => b.email === form.deliveryBoyEmail) : null;
      if (selBoy) {
        fetch(`${ORDERS_DIRECT}/api/warehouse/delivery/assign`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            orderNumber,
            deliveryBoyId: selBoy.id,
            deliveryBoyName: `${selBoy.firstName || ''} ${selBoy.lastName || ''}`.trim() || selBoy.email,
          }),
        }).catch(() => {});
        // 🔔 Notify delivery boy
        notifyDeliveryAssigned(orderNumber, `${selBoy.firstName || ''} ${selBoy.lastName || ''}`.trim(), form.carrier, form.trackingNumber);
      }

      if (shipRes.ok || orderRes.ok) {
        // 🔔 Notify admin/customer that order is shipped
        notifyOrderShipped(orderNumber, form.trackingNumber, form.carrier);
        setMsg(`✅ Order ${orderNumber.slice(0, 20)}… shipped! AWB: ${form.trackingNumber} via ${form.carrier}`);
        setShipForms(prev => { const n = { ...prev }; delete n[orderNumber]; return n; });
        // ✅ Optimistic removal — immediately remove from Ready to Ship list
        setReadyOrders(prev => prev.filter(o => o.orderNumber !== orderNumber));
        setStats(prev => ({ ...prev, readyToShip: Math.max(0, prev.readyToShip - 1) }));
        setExpanded(null);
        // Then reload in background to sync with server
        setTimeout(() => load(), 1500);
      } else {
        const errText = await orderRes.text().catch(() => '');
        setMsg(`❌ Ship failed: ${orderRes.status} — ${errText.slice(0, 100)}`);
      }
    } catch (e) {
      setMsg(`❌ Server error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const dispatchShipment = async (shipmentId) => {
    setActionLoading(`dispatch-${shipmentId}`);
    setMsg('');
    try {
      const res = await fetch(`${API}/shipments/${shipmentId}/dispatch`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (res.ok) {
        setMsg(`✅ Shipment #${shipmentId} dispatched`);
        load();
      } else {
        setMsg('❌ Dispatch failed');
      }
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  const handleLogout = () => {
    const staffId = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');
    if (staffId) {
      try {
        navigator.sendBeacon
          ? navigator.sendBeacon(
              `${SHIPPING_DIRECT}/api/warehouse/staff-status/offline`,
              new Blob([JSON.stringify({ staffId: Number(staffId) })], { type: 'application/json' })
            )
          : fetch(`${SHIPPING_DIRECT}/api/warehouse/staff-status/offline`, {
              method: 'POST', headers: getHeaders(),
              body: JSON.stringify({ staffId: Number(staffId) }),
              keepalive: true,
            }).catch(() => {});
      } catch { /* ignore */ }
    }
    ['token', 'authToken', 'userRole', 'customerId', 'firstName', 'lastName',
     'warehouseAuthToken', 'warehouseToken', 'warehouseFirstName', 'warehouseLastName',
     'warehouseCustomerId', 'warehouseUserId', 'warehouseUserRole'].forEach(k => {
      localStorage.removeItem(k); sessionStorage.removeItem(k);
    });
    window.location.href = '/warehouse/login';
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontSize: 13,
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `#F8FAFC`,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: C.text,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes pulseOrange {
          0%   { box-shadow: 0 0 0 0   rgba(234,88,12,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(234,88,12,0);   }
          100% { box-shadow: 0 0 0 0   rgba(234,88,12,0);   }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: C.card, borderBottom: `1px solid ${C.border}`,
        padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Truck size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Shipping Dashboard</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>Welcome, {userName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 🔔 Notification Bell */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setBellOpen(o => !o); setNotifications(getNotifications()); }}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 10,
                background: bellOpen ? C.orangeBg : 'transparent',
                border: `1px solid ${bellOpen ? C.orange + '44' : C.border}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Bell size={18} color={unreadCount > 0 ? C.orange : C.textMuted} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: C.red, color: '#fff',
                  borderRadius: '50%', width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, border: '2px solid #fff',
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {bellOpen && (
              <div style={{
                position: 'absolute', top: 48, right: 0, zIndex: 9999,
                width: 340, maxHeight: 420, overflowY: 'auto',
                background: '#fff', borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                border: `1px solid ${C.border}`,
              }}>
                <div style={{
                  padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>🔔 Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={() => { markAllRead(); setNotifications(getNotifications()); }}
                      style={{ fontSize: 11, color: C.orange, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                {shippingNotifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                    No notifications
                  </div>
                ) : (
                  shippingNotifications.slice(0, 20).map(n => (
                    <div key={n.id} onClick={() => { markRead(n.id); setNotifications(getNotifications()); }}
                      style={{
                        padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
                        background: n.read ? '#fff' : C.orangeBg,
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                        {new Date(n.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 🟢 Online / Offline Toggle */}
          <button
            onClick={toggleOnline}
            disabled={onlineLoading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: 8,
              cursor: onlineLoading ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
              border: `1.5px solid ${isOnline ? 'rgba(234,88,12,0.5)' : 'rgba(107,114,128,0.4)'}`,
              background: isOnline ? 'rgba(234,88,12,0.12)' : 'rgba(107,114,128,0.10)',
              color: isOnline ? '#ea580c' : '#6b7280',
              opacity: onlineLoading ? 0.6 : 1,
            }}
          >
            <span style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
              background: isOnline ? '#ea580c' : '#9ca3af',
              boxShadow: isOnline ? '0 0 0 3px rgba(234,88,12,0.25)' : 'none',
              animation: isOnline ? 'pulseOrange 2s ease-in-out infinite' : 'none',
            }} />
            {onlineLoading ? 'Updating…' : isOnline ? 'Online' : 'Offline'}
          </button>

          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', background: C.redBg,
            border: `1px solid ${C.red}44`, borderRadius: 8,
            color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '28px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <StatCard icon={Package}     label="Ready to Ship"  value={stats.readyToShip} color={C.amber}  bg={C.amberBg} />
          <StatCard icon={Truck}       label="Shipped Today"  value={stats.shipped}     color={C.orange} bg={C.orangeBg} />
          <StatCard icon={CheckCircle} label="Delivered"      value={stats.delivered}   color={C.green}  bg={C.greenBg} />
          {/* 🛵 Live delivery boy availability */}
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 160px',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 22 }}>🛵</span>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1 }}>
                {deliveryBoys.filter(b => getEffectiveStatus(b.sd) === 'AVAILABLE').length}
                <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>
                  /{deliveryBoys.length}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Delivery Boys Online</div>
              {/* Live dots for each boy */}
              {deliveryBoys.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {deliveryBoys.map((b, i) => {
                    const st = getEffectiveStatus(b.sd);
                    const cfg = DB_STATUS_CFG[st];
                    const name = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
                    return (
                      <span key={i} title={`${name} — ${cfg.label}`} style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: cfg.dot, flexShrink: 0,
                        boxShadow: st === 'AVAILABLE' ? `0 0 0 2px ${cfg.dot}44` : 'none',
                        animation: st === 'AVAILABLE' ? 'pulse 2s infinite' : 'none',
                      }} />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'ready',     label: `Ready to Ship (${stats.readyToShip})` },
            { key: 'shipments', label: `All Shipments (${shipments.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 18px', borderRadius: 20,
              border: `1px solid ${activeTab === tab.key ? C.orange : C.border}`,
              background: activeTab === tab.key ? C.orangeBg : 'transparent',
              color: activeTab === tab.key ? C.orangeLight : C.textMuted,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{tab.label}</button>
          ))}
          <button onClick={load} disabled={loading} style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', background: C.orangeBg,
            border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.orangeLight, fontSize: 13, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
          }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Message */}
        {msg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: msg.startsWith('✅') ? C.greenBg : C.redBg,
            color: msg.startsWith('✅') ? C.green : C.red,
            border: `1px solid ${msg.startsWith('✅') ? C.green : C.red}33`,
          }}>{msg}</div>
        )}

        {loading && <div style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>Loading…</div>}

        {/* ── Ready to Ship Tab ── */}
        {activeTab === 'ready' && !loading && (
          <>
            {readyOrders.length === 0 && (
              <div style={{
                color: C.textMuted, textAlign: 'center', padding: 60,
                background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
              }}>
                🎉 No orders ready to ship
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {readyOrders.map(order => (
                <div key={order.orderNumber} style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  <div
                    onClick={() => setExpanded(expanded === order.orderNumber ? null : order.orderNumber)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 18px', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, background: C.amberBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Package size={16} color={C.amber} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                          Order #{order.orderNumber?.slice(0, 20)}…
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                          Customer #{order.customerId} &nbsp;·&nbsp; ₹{order.totalAmount || '—'} &nbsp;·&nbsp; {fmtDate(order.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Badge status={order.orderStatus} />
                      {expanded === order.orderNumber
                        ? <ChevronUp size={16} color={C.textMuted} />
                        : <ChevronDown size={16} color={C.textMuted} />}
                    </div>
                  </div>

                  {expanded === order.orderNumber && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 18px' }}>

                      {/* Order items */}
                      {order.items && order.items.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Items
                          </div>
                          {order.items.map((item, i) => (
                            <div key={i} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '8px 10px', marginBottom: 4,
                              background: C.amberBg, borderRadius: 6, fontSize: 13,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {(item.productImage || productImages[item.productId]) && (
                                  <img
                                    src={item.productImage || productImages[item.productId]}
                                    alt=""
                                    style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: `1px solid ${C.border}` }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                  />
                                )}
                                <span style={{ fontWeight: 600 }}>
                                  {item.productName || productNames[item.productId] || `Product #${item.productId}`}
                                </span>
                              </div>
                              <span style={{ color: C.textMuted, fontSize: 12 }}>Qty: <strong style={{ color: C.text }}>{item.quantity || 1}</strong></span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Create shipment form */}
                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${C.border}`,
                        borderRadius: 10, padding: '14px 16px',
                      }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: C.textMuted,
                          marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>🚚 Ship Order</div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>

                          {/* Carrier dropdown */}
                          <div style={{ flex: '1 1 150px' }}>
                            <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>
                              <Truck size={12} style={{ marginRight: 4 }} />Courier / Carrier *
                            </label>
                            <select
                              value={shipForms[order.orderNumber]?.carrier || ''}
                              onChange={e => updateShipForm(order.orderNumber, 'carrier', e.target.value)}
                              style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}
                            >
                              <option value="">Select carrier</option>
                              <option value="BlueDart">BlueDart</option>
                              <option value="Delhivery">Delhivery</option>
                              <option value="FedEx">FedEx</option>
                              <option value="DTDC">DTDC</option>
                              <option value="Ekart">Ekart</option>
                              <option value="Shadowfax">Shadowfax</option>
                              <option value="Xpressbees">Xpressbees</option>
                              <option value="India Post">India Post</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* AWB / Tracking Number */}
                          <div style={{ flex: '1 1 200px' }}>
                            <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>
                              <Hash size={12} style={{ marginRight: 4 }} />AWB / Tracking Number *
                            </label>
                            {(() => {
                              const carrier = shipForms[order.orderNumber]?.carrier || '';
                              const cfg = CARRIER_AWB[carrier] || CARRIER_AWB.Other;
                              const val = shipForms[order.orderNumber]?.trackingNumber || '';
                              const isValid = !val || (val.length >= cfg.minLen && val.length <= cfg.maxLen && cfg.pattern.test(val));
                              return (
                                <>
                                  <input
                                    type="text"
                                    placeholder={cfg.placeholder}
                                    maxLength={cfg.maxLen}
                                    value={val}
                                    onChange={e => updateShipForm(order.orderNumber, 'trackingNumber', e.target.value.toUpperCase())}
                                    style={{
                                      ...inputStyle,
                                      borderColor: val && !isValid ? C.red : C.border,
                                      fontFamily: 'monospace',
                                      letterSpacing: '0.5px',
                                    }}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                                    <span style={{ fontSize: 10, color: val && !isValid ? C.red : C.textMuted }}>
                                      {carrier ? cfg.hint : 'Select carrier first'}
                                    </span>
                                    <span style={{ fontSize: 10, color: val.length === cfg.maxLen ? C.green : C.textMuted, fontFamily: 'monospace' }}>
                                      {val.length}/{cfg.maxLen}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* Delivery Boy dropdown — with live status */}
                          <div style={{ flex: '1 1 220px' }}>
                            <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>
                              🛵 Assign Delivery Boy
                            </label>
                            <select
                              value={shipForms[order.orderNumber]?.deliveryBoyEmail || ''}
                              onChange={e => updateShipForm(order.orderNumber, 'deliveryBoyEmail', e.target.value)}
                              style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}
                            >
                              <option value="">Select delivery boy</option>
                              {deliveryBoys.length === 0 && (
                                <option disabled>No delivery boys registered</option>
                              )}
                              {deliveryBoys.map((boy, i) => {
                                const status = getEffectiveStatus(boy.sd);
                                const cfg = DB_STATUS_CFG[status] || DB_STATUS_CFG.OFFLINE;
                                const zone = boy.sd?.assignedZone ? ` · ${boy.sd.assignedZone}` : '';
                                const name = `${boy.firstName || ''} ${boy.lastName || ''}`.trim() || boy.email;
                                const dot = status === 'AVAILABLE' ? '🟢' : status === 'BUSY' ? '🟡' : status === 'ON_BREAK' ? '🔵' : '⚫';
                                return (
                                  <option key={i} value={boy.email}>
                                    {dot} {name} — {cfg.label}{zone}
                                  </option>
                                );
                              })}
                            </select>
                            {/* Live status preview of selected boy */}
                            {shipForms[order.orderNumber]?.deliveryBoyEmail && (() => {
                              const sel = deliveryBoys.find(b => b.email === shipForms[order.orderNumber].deliveryBoyEmail);
                              if (!sel) return null;
                              const status = getEffectiveStatus(sel.sd);
                              const cfg = DB_STATUS_CFG[status] || DB_STATUS_CFG.OFFLINE;
                              return (
                                <div style={{
                                  marginTop: 6, padding: '5px 10px', borderRadius: 6,
                                  background: cfg.bg, border: `1px solid ${cfg.color}33`,
                                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                                }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                                  <span style={{ color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                                  {sel.sd?.assignedZone && <span style={{ color: C.textMuted }}>· {sel.sd.assignedZone}</span>}
                                  {sel.sd?.totalDeliveries != null && <span style={{ color: C.textMuted }}>· {sel.sd.totalDeliveries} deliveries</span>}
                                </div>
                              );
                            })()}
                          </div>


                        </div>

                        <button
                          onClick={() => createShipment(order.orderNumber)}
                          disabled={actionLoading === `ship-${order.orderNumber}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '10px 20px',
                            background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`,
                            border: 'none', borderRadius: 8,
                            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          <Truck size={16} />
                          {actionLoading === `ship-${order.orderNumber}` ? 'Shipping…' : '🚚 Ship Order'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── All Shipments Tab ── */}
        {activeTab === 'shipments' && !loading && (
          <>
            {shipments.length === 0 && (
              <div style={{
                color: C.textMuted, textAlign: 'center', padding: 60,
                background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
              }}>
                No shipments found
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shipments.map(s => (
                <div key={s.id} style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  <div
                    onClick={() => setExpanded(expanded === `s-${s.id}` ? null : `s-${s.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 18px', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, background: C.orangeBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Truck size={16} color={C.orange} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                          Shipment #{s.id} &nbsp;
                          <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>
                            {s.carrier}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                          Tracking: <strong style={{ color: C.text }}>{s.trackingNumber || '—'}</strong>
                          &nbsp;·&nbsp; SO #{s.orderNumber} &nbsp;·&nbsp; {fmtDate(s.shippedAt || s.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Badge status={s.status} />
                      {expanded === `s-${s.id}`
                        ? <ChevronUp size={16} color={C.textMuted} />
                        : <ChevronDown size={16} color={C.textMuted} />}
                    </div>
                  </div>

                  {expanded === `s-${s.id}` && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 14, fontSize: 13 }}>
                        <span style={{ color: C.textMuted }}>Cost: <strong style={{ color: C.text }}>₹{s.cost || 0}</strong></span>
                        <span style={{ color: C.textMuted }}>Shipped: <strong style={{ color: C.text }}>{fmtDate(s.shippedAt)}</strong></span>
                      </div>
                      {s.status === 'PENDING' && (
                        <button
                          onClick={() => dispatchShipment(s.id)}
                          disabled={actionLoading === `dispatch-${s.id}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '9px 18px',
                            background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDark})`,
                            border: 'none', borderRadius: 8,
                            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          <Truck size={14} />
                          {actionLoading === `dispatch-${s.id}` ? 'Dispatching…' : 'Dispatch'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
