import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, CheckCircle, LogOut,
  ChevronDown, ChevronUp, Weight, Ruler, Tag, Bell, RefreshCw, Truck, Package
} from 'lucide-react';
import {
  notifyPackedSentToShipping,
  getNotifications, markRead, markAllRead,
} from '../../services/notificationStore';
import { useWarehouseSocket } from '../../services/useWarehouseSocket';

const ORDERS_DIRECT   = 'http://localhost:9999';
const SHIPPING_DIRECT = 'http://localhost:9999';
const PRODUCTS_API    = 'http://localhost:9999/api/products';
const WAREHOUSE_API   = 'http://localhost:9999/api/warehouse';

const getHeaders = () => {
  const token = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken')
    || sessionStorage.getItem('adminToken') || localStorage.getItem('authToken') || localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

const fmtDate = (v) =>
  v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const C = {
  card: '#FFFFFF', border: '#E2E8F0',
  purple: '#7C3AED', purpleLight: '#6D28D9', purpleDark: '#5B21B6',
  purpleBg: 'rgba(124,58,237,0.08)',
  text: '#1E293B', textMuted: '#64748B',
  green: '#16A34A', greenBg: 'rgba(22,163,74,0.10)',
  amber: '#D97706', amberBg: 'rgba(217,119,6,0.10)',
  orange: '#EA580C', orangeBg: 'rgba(234,88,12,0.08)',
  red: '#DC2626', redBg: 'rgba(220,38,38,0.10)',
  blue: '#2563EB', blueBg: 'rgba(37,99,235,0.08)',
};

const Badge = ({ status }) => {
  const MAP = {
    PENDING:     { color: C.amber,       bg: C.amberBg,   label: 'Pending' },
    IN_PROGRESS: { color: C.purpleLight, bg: C.purpleBg,  label: 'In Progress' },
    COMPLETED:   { color: C.green,       bg: C.greenBg,   label: 'Completed' },
    PACKING:     { color: C.purpleLight, bg: C.purpleBg,  label: 'Packing' },
    PACKED:      { color: C.green,       bg: C.greenBg,   label: 'Packed' },
  };
  const cfg = MAP[status] || { color: C.textMuted, bg: '#f1f5f9', label: status };
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
      width: 48, height: 48, borderRadius: 12, background: bg || C.purpleBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={22} color={color || C.purple} />
    </div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

const btnStyle = (color, small = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: small ? '5px 10px' : '8px 16px',
  background: `${color}22`, border: `1px solid ${color}55`,
  borderRadius: 8, color, fontSize: small ? 12 : 13, fontWeight: 600, cursor: 'pointer',
});

export default function PackerDashboard() {
  useEffect(() => {
    document.title = 'Packer Dashboard - Inventory Hub';
    return () => { document.title = 'Inventory Hub'; };
  }, []);

  // ── 3 tab state ──────────────────────────────────────────────────────────
  // pendingOrders   = COMPLETED pick lists where picker clicked "Send to Packer"
  // inProgressOrders = moved here when "Start Packing" is clicked (local state move)
  // packedOrders    = moved here when "Pack" is clicked → "Send to Shipping" button
  const [pendingOrders,    setPendingOrders]    = useState([]);
  const [inProgressOrders, setInProgressOrders] = useState([]);
  const [packedOrders,     setPackedOrders]     = useState([]);
  const [sentToShippingIds, setSentToShippingIds] = useState(new Set());

  const [activeTab,     setActiveTab]     = useState('pending');
  const [expanded,      setExpanded]      = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [msg,           setMsg]           = useState('');
  const [packForms,     setPackForms]     = useState({});

  // 🟢 Online / Offline
  const [isOnline,      setIsOnline]      = useState(true);
  const [onlineLoading, setOnlineLoading] = useState(false);

  // 🏷️ Product cache
  const [productNames,  setProductNames]  = useState({});
  const [productImages, setProductImages] = useState({});

  // 🔔 Notification bell
  const [notifications, setNotifications] = useState(() => getNotifications());
  const [bellOpen,      setBellOpen]      = useState(false);
  const bellRef = useRef(null);

  const userName  = localStorage.getItem('firstName') || sessionStorage.getItem('warehouseFirstName') || 'Packer';
  const packerId  = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');
  const packerStaffId = sessionStorage.getItem('warehouseStaffId') || packerId;
  const packerEmail   = sessionStorage.getItem('warehouseEmail') || '';

  // 🔔 Only ORDER_PICKED + PACK_LIST_UPCOMING for Packer
  // ORDER_PICKED       = picker completed pick → new job arrived for packer
  // PACK_LIST_UPCOMING = manager assigned → upcoming job awareness
  // NOTE: ORDER_PACKED removed — packer should not get notification when they pack themselves
  const PACKER_NOTIF_TYPES = ['ORDER_PICKED', 'PACK_LIST_UPCOMING'];
  const packerNotifications = notifications.filter(n => PACKER_NOTIF_TYPES.includes(n.type));
  const unreadCount = packerNotifications.filter(n => !n.read).length;

  // ── Helper: is this pick list assigned to me? ────────────────────────────
  const isMyList = useCallback((pl) => {
    const firstName  = (sessionStorage.getItem('warehouseFirstName') || '').trim();
    const lastName   = (sessionStorage.getItem('warehouseLastName')  || '').trim();
    const packerName = `${firstName} ${lastName}`.trim();
    const idMatch        = packerId && (
      String(pl.assignedPackerId) === String(packerId) ||
      String(pl.assignedPackerId) === String(packerStaffId)
    );
    const nameMatch      = packerName && pl.assignedPackerName &&
      pl.assignedPackerName.trim().toLowerCase() === packerName.toLowerCase();
    const firstNameMatch = firstName && pl.assignedPackerName &&
      pl.assignedPackerName.trim().toLowerCase().startsWith(firstName.toLowerCase());
    const emailMatch     = packerEmail && pl.assignedPackerEmail &&
      pl.assignedPackerEmail.toLowerCase() === packerEmail.toLowerCase();
    return idMatch || nameMatch || firstNameMatch || emailMatch;
  }, [packerId, packerStaffId, packerEmail]);

  // ── Load PENDING: COMPLETED pick lists where picker clicked "Send to Packer" ──
  const loadPendingOrders = useCallback(async () => {
    try {
      // Fetch COMPLETED pick lists assigned to this packer
      let myLists = [];
      if (packerEmail) {
        try {
          const res = await fetch(
            `${WAREHOUSE_API}/pick-lists/assigned/packer/email/${encodeURIComponent(packerEmail)}?status=COMPLETED`,
            { headers: getHeaders() }
          );
          if (res.ok) myLists = await res.json();
        } catch { /* ignore */ }
      }
      if (!Array.isArray(myLists) || myLists.length === 0) {
        const res = await fetch(`${WAREHOUSE_API}/pick-lists/status/COMPLETED`, { headers: getHeaders() });
        if (res.ok) {
          const all = await res.json();
          myLists = Array.isArray(all) ? all.filter(isMyList) : [];
        }
      }
      // Exclude already-in-progress or already-packed (tracked locally)
      const inProgressIds = new Set(inProgressOrders.map(p => p.id));
      const packedIds     = new Set(packedOrders.map(p => p.id));
      const sentIds       = sentToShippingIds;
      setPendingOrders(
        myLists.filter(pl => !inProgressIds.has(pl.id) && !packedIds.has(pl.id) && !sentIds.has(pl.id))
      );
    } catch { /* ignore */ }
  }, [packerEmail, isMyList, inProgressOrders, packedOrders, sentToShippingIds]);

  // ── Load product names/images for a list of pick lists ───────────────────
  const fetchProductInfo = useCallback((lists) => {
    const missingIds = [];
    lists.forEach(pl => {
      (pl.lines || []).forEach(line => {
        if (line.productId && !line.productName  && !productNames[line.productId])  missingIds.push(line.productId);
        if (line.productId && !line.productImage && !productImages[line.productId]) missingIds.push(line.productId);
      });
    });
    [...new Set(missingIds)].forEach(async (productId) => {
      try {
        const res = await fetch(`${PRODUCTS_API}/getByProductId/${productId}`, { headers: { 'Content-Type': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          const name  = data.name || data.productName || null;
          const image = data.productUrl || data.imageUrl || null;
          if (name)  setProductNames(prev  => ({ ...prev,  [productId]: name  }));
          if (image) setProductImages(prev => ({ ...prev, [productId]: image }));
        }
      } catch { /* ignore */ }
    });
  }, [productNames, productImages]);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const { sendToStaff } = useWarehouseSocket({
    topics: [
      '/topic/warehouse/all',
      ...(packerId ? [`/topic/warehouse/packer/${packerId}`] : []),
    ],
    onMessage: (event) => {
      if (event.type === 'ORDER_PICKED') {
        loadPendingOrders();
        setMsg(`🔔 ${event.title || 'New order ready to pack!'}`);
        setTimeout(() => setMsg(''), 5000);
        setActiveTab('pending');
      }
      if (event.type === 'PACK_LIST_UPCOMING' || event.type === 'ORDER_PROCESSING') {
        loadPendingOrders();
        setMsg(`📋 ${event.title || 'New pick list assigned!'}`);
        setTimeout(() => setMsg(''), 5000);
      }
    },
    enabled: true,
  });

  // ── Mount + polling ───────────────────────────────────────────────────────
  useEffect(() => {
    loadPendingOrders();
    const interval = setInterval(loadPendingOrders, 60000);
    return () => clearInterval(interval);
  }, [loadPendingOrders]);

  // Fetch product info whenever lists change
  useEffect(() => { fetchProductInfo(pendingOrders);    }, [pendingOrders]);    // eslint-disable-line
  useEffect(() => { fetchProductInfo(inProgressOrders); }, [inProgressOrders]); // eslint-disable-line
  useEffect(() => { fetchProductInfo(packedOrders);     }, [packedOrders]);     // eslint-disable-line

  // 🔔 ORDER_PICKED notification → refresh pending
  useEffect(() => {
    const handler = () => {
      const notifs = getNotifications();
      setNotifications(notifs);
      if (notifs.some(n => n.type === 'ORDER_PICKED' && !n.read)) loadPendingOrders();
    };
    window.addEventListener('ims_notification_update', handler);
    return () => window.removeEventListener('ims_notification_update', handler);
  }, [loadPendingOrders]);

  // Close bell on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 🟢 Login → ONLINE
  useEffect(() => {
    const token = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');
    if (!token || !packerId) return;
    const firstName  = sessionStorage.getItem('warehouseFirstName') || '';
    const lastName   = sessionStorage.getItem('warehouseLastName')  || '';
    fetch(`${WAREHOUSE_API}/staff-status/online`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({
        staffId: Number(packerId),
        staffName: `${firstName} ${lastName}`.trim() || 'Packer',
        staffEmail: packerEmail,
        role: (sessionStorage.getItem('warehouseUserRole') || 'PACKER').toUpperCase(),
      }),
    }).catch(() => {});
  }, []); // eslint-disable-line

  // 💓 Heartbeat
  useEffect(() => {
    if (!packerId) return;
    const interval = setInterval(() => {
      fetch(`${WAREHOUSE_API}/staff-status/heartbeat`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ staffId: Number(packerId) }),
      }).catch(() => {});
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [packerId]);

  // ── Actions ───────────────────────────────────────────────────────────────

  // Pending → In Progress (Start Packing)
  const startPacking = (pickList) => {
    setPendingOrders(prev => prev.filter(pl => pl.id !== pickList.id));
    setInProgressOrders(prev => [...prev, { ...pickList, packingStartedAt: new Date().toISOString() }]);
    setActiveTab('inProgress');
    setMsg('✅ Packing started!');
    setTimeout(() => setMsg(''), 3000);
  };

  // In Progress → Packed (Pack button — saves pack details to DB)
  const submitPack = async (pickList) => {
    const form = packForms[pickList.id] || {};
    const resolvedWeight = form.weight === 'custom' ? form.weightCustom : form.weight;
    const resolvedNotes  = form.notes  === 'custom' ? form.notesCustom  : form.notes;

    if (!form.boxSize)       { setMsg('❌ Please select a Box Size.');        return; }
    if (!form.packagingType) { setMsg('❌ Please select a Packaging Type.');  return; }
    if (!resolvedWeight || isNaN(parseFloat(resolvedWeight))) {
      setMsg('❌ Please select or enter a valid Weight (kg).'); return;
    }

    setActionLoading(`pack-${pickList.id}`);
    setMsg('');
    const packerName = `${sessionStorage.getItem('warehouseFirstName') || ''} ${sessionStorage.getItem('warehouseLastName') || ''}`.trim() || userName;

    try {
      const packRes = await fetch(`${WAREHOUSE_API}/pack-details/${pickList.id}`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({
          boxSize: form.boxSize, packagingType: form.packagingType,
          weight: parseFloat(resolvedWeight), dimensions: form.dimensions || null,
          notes: resolvedNotes || null, packedBy: packerName,
          packedById: packerId ? parseInt(packerId) : null,
        }),
      });
      if (!packRes.ok) {
        const err = await packRes.json().catch(() => ({}));
        throw new Error(err.error || `Pack save failed (${packRes.status})`);
      }
      const savedPack = await packRes.json();

      // Update order status to PACKED — this is critical: if it fails, the order
      // stays PICKED and never appears in ShippingDashboard's PACKED queue.
      // Retry once on failure before surfacing the error to the packer.
      let packedStatusOk = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const statusRes = await fetch(
            `${ORDERS_DIRECT}/api/auth/admin/orders/${pickList.orderNumber}/status?status=PACKED`,
            { method: 'PATCH', headers: getHeaders() }
          );
          if (statusRes.ok) { packedStatusOk = true; break; }
          console.warn(`⚠️ PACKED status update attempt ${attempt} failed: ${statusRes.status}`);
        } catch (e) {
          console.warn(`⚠️ PACKED status update attempt ${attempt} error:`, e.message);
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
      }
      if (!packedStatusOk) {
        // Pack details saved but order status stuck at PICKED — warn packer
        console.error('❌ Could not update order status to PACKED after 2 attempts');
        setMsg(`⚠️ Pack saved, but order status update failed. Please use "Retry Status" or contact admin.`);
      }

      // NOTE: notifyOrderPacked() frontend call removed — backend PackDetailService.savePackDetail()
      // already notifies admin + shipping via WebSocket.
      // Frontend push + backend push = admin was getting double ORDER_PACKED.

      // Move from inProgress → packed
      setInProgressOrders(prev => prev.filter(pl => pl.id !== pickList.id));
      setPackedOrders(prev => [...prev, {
        ...pickList,
        packDetail: { boxSize: form.boxSize, packagingType: form.packagingType,
          weight: parseFloat(resolvedWeight), dimensions: form.dimensions || null,
          notes: resolvedNotes || null, packedBy: packerName, id: savedPack?.id },
        packedAt: new Date().toISOString(),
        _statusUpdateFailed: !packedStatusOk,
      }]);
      setPackForms(prev => { const n = { ...prev }; delete n[pickList.id]; return n; });
      setActiveTab('completed');
      if (packedStatusOk) {
        setMsg(`✅ Pick List #${pickList.id} packed! Now send to Shipping.`);
        setTimeout(() => setMsg(''), 5000);
      }
    } catch (e) {
      setMsg(`❌ Error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Completed → Send to Shipping (no notification to picker — ORDER_PACKED_FOR_SHIPPING type)
  const sendToShipping = async (pickList) => {
    if (sentToShippingIds.has(pickList.id)) return;
    setActionLoading(`ship-${pickList.id}`);
    setMsg('');
    const packerName = `${sessionStorage.getItem('warehouseFirstName') || ''} ${sessionStorage.getItem('warehouseLastName') || ''}`.trim() || userName;

    try {
      // Notify shipping service (non-fatal)
      fetch(
        `${SHIPPING_DIRECT}/api/shipping/pack/${pickList.orderNumber}${pickList.customerId ? `?customerId=${pickList.customerId}` : ''}`,
        { method: 'POST', headers: getHeaders() }
      ).catch(() => {});

      // 🔔 Notify Shipping — ORDER_PACKED_FOR_SHIPPING (not filtered to picker)
      notifyPackedSentToShipping(pickList.orderNumber, packerName, pickList.packDetail || null);

      setSentToShippingIds(prev => new Set([...prev, pickList.id]));
      setMsg(`✅ Order ${String(pickList.orderNumber).slice(0, 20)}… sent to Shipping! 🚚`);
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setMsg(`❌ Error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Retry updating order status to PACKED for orders where the initial attempt failed
  const retryPackedStatus = async (pickList) => {
    setActionLoading(`retry-${pickList.id}`);
    setMsg('');
    try {
      const res = await fetch(
        `${ORDERS_DIRECT}/api/auth/admin/orders/${pickList.orderNumber}/status?status=PACKED`,
        { method: 'PATCH', headers: getHeaders() }
      );
      if (res.ok) {
        setPackedOrders(prev => prev.map(pl =>
          pl.id === pickList.id ? { ...pl, _statusUpdateFailed: false } : pl
        ));
        setMsg(`✅ Order status updated to PACKED — now visible in Shipping.`);
        setTimeout(() => setMsg(''), 4000);
      } else {
        const errText = await res.text().catch(() => '');
        setMsg(`❌ Retry failed (${res.status}): ${errText.slice(0, 80) || 'Check auth token or backend'}`);
      }
    } catch (e) {
      setMsg(`❌ Retry error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Pack form field updater
  const updatePackForm = (id, field, value) =>
    setPackForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  // Toggle Online/Offline
  const toggleOnline = async () => {
    if (!packerId) return;
    setOnlineLoading(true);
    try {
      const endpoint = isOnline ? 'offline' : 'online';
      const body = isOnline ? { staffId: Number(packerId) } : {
        staffId: Number(packerId),
        staffName: `${sessionStorage.getItem('warehouseFirstName') || ''} ${sessionStorage.getItem('warehouseLastName') || ''}`.trim() || 'Packer',
        staffEmail: packerEmail,
        role: (sessionStorage.getItem('warehouseUserRole') || 'PACKER').toUpperCase(),
      };
      const res = await fetch(`${WAREHOUSE_API}/staff-status/${endpoint}`, {
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

  const handleLogout = () => {
    if (packerId) {
      try {
        navigator.sendBeacon
          ? navigator.sendBeacon(`${WAREHOUSE_API}/staff-status/offline`,
              new Blob([JSON.stringify({ staffId: Number(packerId) })], { type: 'application/json' }))
          : fetch(`${WAREHOUSE_API}/staff-status/offline`, {
              method: 'POST', headers: getHeaders(),
              body: JSON.stringify({ staffId: Number(packerId) }), keepalive: true,
            }).catch(() => {});
      } catch { /* ignore */ }
    }
    ['token','authToken','userRole','customerId','firstName','lastName',
     'warehouseAuthToken','warehouseToken','warehouseFirstName','warehouseLastName',
     'warehouseCustomerId','warehouseUserId','warehouseUserRole','warehouseEmail',
    ].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    window.location.href = '/warehouse/login';
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPendingOrders();
    setTimeout(() => setRefreshing(false), 600);
  };

  // ── Pack Form Component (inline) ─────────────────────────────────────────
  const PackForm = ({ pickList }) => {
    const form = packForms[pickList.id] || {};
    const resolvedWeight = form.weight === 'custom' ? form.weightCustom : form.weight;
    const isLoading = actionLoading === `pack-${pickList.id}`;
    return (
      <div style={{ background: 'rgba(124,58,237,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📦 Pack Details
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {/* Box Size */}
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>📦 Box Size *</label>
            <select value={form.boxSize || ''} onChange={e => updatePackForm(pickList.id, 'boxSize', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, boxSizing: 'border-box', cursor: 'pointer' }}>
              <option value="">Select box size</option>
              <option value="XS">XS — 10×8×4 cm</option>
              <option value="S">S — 20×15×10 cm</option>
              <option value="M">M — 30×25×15 cm</option>
              <option value="L">L — 40×35×25 cm</option>
              <option value="XL">XL — 50×40×30 cm</option>
              <option value="XXL">XXL — 60×50×40 cm</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {/* Packaging Type */}
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>🎁 Packaging Type *</label>
            <select value={form.packagingType || ''} onChange={e => updatePackForm(pickList.id, 'packagingType', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, boxSizing: 'border-box', cursor: 'pointer' }}>
              <option value="">Select type</option>
              <option value="standard">Standard Box</option>
              <option value="bubble_wrap">Bubble Wrap</option>
              <option value="fragile">Fragile — Extra Padding</option>
              <option value="poly_bag">Poly Bag</option>
              <option value="gift">Gift Wrap</option>
              <option value="envelope">Envelope / Flat Pack</option>
            </select>
          </div>
          {/* Weight */}
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}><Weight size={12} style={{ marginRight: 4 }} />Weight (kg) *</label>
            <select value={form.weight || ''} onChange={e => updatePackForm(pickList.id, 'weight', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, boxSizing: 'border-box', cursor: 'pointer' }}>
              <option value="">Select weight</option>
              {['0.1','0.25','0.5','0.75','1','1.5','2','2.5','3','4','5','7','10','15','20'].map(w =>
                <option key={w} value={w}>{w} kg</option>)}
              <option value="custom">Custom…</option>
            </select>
            {form.weight === 'custom' && (
              <input type="number" step="0.1" min="0.1" placeholder="Enter kg"
                value={form.weightCustom || ''} onChange={e => updatePackForm(pickList.id, 'weightCustom', e.target.value)}
                style={{ width: '100%', padding: '7px 12px', marginTop: 6, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, boxSizing: 'border-box' }} />
            )}
          </div>
          {/* Custom dimensions */}
          {form.boxSize === 'custom' && (
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}><Ruler size={12} style={{ marginRight: 4 }} />Dimensions (LxWxH cm)</label>
              <input type="text" placeholder="e.g. 30x20x15" value={form.dimensions || ''} onChange={e => updatePackForm(pickList.id, 'dimensions', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          )}
          {/* Notes */}
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}><Tag size={12} style={{ marginRight: 4 }} />Notes</label>
            <select value={form.notes || ''} onChange={e => updatePackForm(pickList.id, 'notes', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, boxSizing: 'border-box', cursor: 'pointer' }}>
              <option value="">Select a note (optional)</option>
              <option value="Handle with care">Handle with care</option>
              <option value="Fragile — do not bend">Fragile — do not bend</option>
              <option value="Keep dry">Keep dry</option>
              <option value="This side up">This side up</option>
              <option value="Temperature sensitive">Temperature sensitive</option>
              <option value="Do not stack">Do not stack</option>
              <option value="Gift — no invoice inside">Gift — no invoice inside</option>
              <option value="Urgent delivery">Urgent delivery</option>
              <option value="custom">Custom…</option>
            </select>
            {form.notes === 'custom' && (
              <input type="text" placeholder="Type custom note…" value={form.notesCustom || ''} onChange={e => updatePackForm(pickList.id, 'notesCustom', e.target.value)}
                style={{ width: '100%', padding: '7px 12px', marginTop: 6, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, boxSizing: 'border-box' }} />
            )}
          </div>
        </div>
        <button onClick={() => submitPack(pickList)} disabled={isLoading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
            border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
          <CheckCircle size={16} />
          {isLoading ? 'Packing…' : '📦 Pack'}
        </button>
      </div>
    );
  };

  // ── Pick Lines display (shared) ──────────────────────────────────────────
  const PickLines = ({ pickList }) => {
    if (!pickList.lines || pickList.lines.length === 0)
      return <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 16 }}>No items found</div>;
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items Picked</div>
        {pickList.lines.map((line, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', marginBottom: 4,
            background: 'rgba(22,163,74,0.06)', borderRadius: 8, fontSize: 13,
            border: `1px solid ${C.green}33`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(line.productImage || productImages[line.productId]) && (
                <img src={line.productImage || productImages[line.productId]} alt=""
                  style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: `1px solid ${C.border}`, flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none'; }} />
              )}
              <span style={{ fontWeight: 600 }}>
                {line.productName || productNames[line.productId] || `Product #${line.productId}`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{line.locationCode || 'Bin TBD'}</span>
              <span>Qty: <strong>{line.quantity || 1}</strong></span>
              <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>✅ Picked</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', 'Segoe UI', sans-serif", color: C.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseGreen {
          0%   { box-shadow: 0 0 0 0   rgba(124,58,237,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(124,58,237,0);   }
          100% { box-shadow: 0 0 0 0   rgba(124,58,237,0);   }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Packer Dashboard</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>Welcome, {userName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 🔔 Bell */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button onClick={() => { setBellOpen(o => !o); setNotifications(getNotifications()); }}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: bellOpen ? C.purpleBg : 'transparent', border: `1px solid ${bellOpen ? C.purple + '44' : C.border}`, cursor: 'pointer' }}>
              <Bell size={18} color={unreadCount > 0 ? C.purple : C.textMuted} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: C.red, color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, border: '2px solid #fff' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div style={{ position: 'absolute', top: 48, right: 0, zIndex: 9999, width: 340, maxHeight: 420, overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: `1px solid ${C.border}` }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>🔔 Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={() => { markAllRead(); setNotifications(getNotifications()); }}
                      style={{ fontSize: 11, color: C.purple, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
                  )}
                </div>
                {packerNotifications.length === 0
                  ? <div style={{ padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>No notifications</div>
                  : packerNotifications.slice(0, 20).map(n => (
                    <div key={n.id} onClick={() => { markRead(n.id); setNotifications(getNotifications()); }}
                      style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: n.read ? '#fff' : C.purpleBg, cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                        {new Date(n.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
          {/* 🟢 Online toggle */}
          <button onClick={toggleOnline} disabled={onlineLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, cursor: onlineLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13,
              border: `1.5px solid ${isOnline ? 'rgba(124,58,237,0.5)' : 'rgba(107,114,128,0.4)'}`,
              background: isOnline ? 'rgba(124,58,237,0.12)' : 'rgba(107,114,128,0.10)',
              color: isOnline ? '#7c3aed' : '#6b7280', opacity: onlineLoading ? 0.6 : 1 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: isOnline ? '#7c3aed' : '#9ca3af', boxShadow: isOnline ? '0 0 0 3px rgba(124,58,237,0.25)' : 'none', animation: isOnline ? 'pulseGreen 2s ease-in-out infinite' : 'none' }} />
            {onlineLoading ? 'Updating…' : isOnline ? 'Online' : 'Offline'}
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 8, color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '28px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <StatCard icon={Package}     label="Packing Pending"  value={pendingOrders.length}    color={C.amber}  bg={C.amberBg} />
          <StatCard icon={Box}         label="In Progress"      value={inProgressOrders.length} color={C.purple} bg={C.purpleBg} />
          <StatCard icon={CheckCircle} label="Packed"           value={packedOrders.length}     color={C.green}  bg={C.greenBg} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
          {[
            { key: 'pending',    label: `⏳ Packing Pending (${pendingOrders.length})` },
            { key: 'inProgress', label: `🔄 In Progress (${inProgressOrders.length})` },
            { key: 'completed',  label: `✅ Completed (${packedOrders.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '7px 18px', borderRadius: 20,
              border: `1px solid ${activeTab === tab.key ? C.purple : C.border}`,
              background: activeTab === tab.key ? C.purpleBg : 'transparent',
              color: activeTab === tab.key ? C.purpleLight : C.textMuted,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{tab.label}</button>
          ))}
          <button onClick={handleRefresh} disabled={refreshing} style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', background: C.purpleBg, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.purpleLight, fontSize: 13, fontWeight: 600,
            cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1,
          }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Message */}
        {msg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: msg.startsWith('✅') ? C.greenBg : msg.startsWith('⚠️') ? C.amberBg : C.redBg,
            color: msg.startsWith('✅') ? C.green : msg.startsWith('⚠️') ? C.amber : C.red,
            border: `1px solid ${msg.startsWith('✅') ? C.green : msg.startsWith('⚠️') ? C.amber : C.red}33`,
          }}>{msg}</div>
        )}

        {/* ── PENDING TAB ── */}
        {activeTab === 'pending' && (
          <>
            {pendingOrders.length === 0 && (
              <div style={{ color: C.textMuted, textAlign: 'center', padding: 60, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
                ⏳ No orders waiting to be packed — will appear here when picker clicks "Send to Packer"
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingOrders.map(pl => (
                <div key={pl.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div onClick={() => setExpanded(expanded === pl.id ? null : pl.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={16} color={C.amber} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>Pick List #{pl.id}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                          Order: {String(pl.orderNumber || '').slice(0, 20)}… &nbsp;·&nbsp; {fmtDate(pl.completedAt || pl.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Badge status="PENDING" />
                      <button onClick={e => { e.stopPropagation(); startPacking(pl); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: `linear-gradient(135deg, ${C.amber}, #B45309)`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        🚀 Start Packing
                      </button>
                      {expanded === pl.id ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
                    </div>
                  </div>
                  {expanded === pl.id && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 18px' }}>
                      <PickLines pickList={pl} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── IN PROGRESS TAB ── */}
        {activeTab === 'inProgress' && (
          <>
            {inProgressOrders.length === 0 && (
              <div style={{ color: C.textMuted, textAlign: 'center', padding: 60, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
                🔄 No orders in progress — click "Start Packing" from the Pending tab
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inProgressOrders.map(pl => (
                <div key={pl.id} style={{ background: C.card, border: `1px solid ${C.purple}33`, borderRadius: 12, overflow: 'hidden' }}>
                  <div onClick={() => setExpanded(expanded === pl.id ? null : pl.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: C.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box size={16} color={C.purple} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>Pick List #{pl.id}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                          Order: {String(pl.orderNumber || '').slice(0, 20)}… &nbsp;·&nbsp; Started: {fmtDate(pl.packingStartedAt)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Badge status="IN_PROGRESS" />
                      {expanded === pl.id ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
                    </div>
                  </div>
                  {expanded === pl.id && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 18px' }}>
                      <PickLines pickList={pl} />
                      <PackForm pickList={pl} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── COMPLETED TAB ── */}
        {activeTab === 'completed' && (
          <>
            {packedOrders.length === 0 && (
              <div style={{ color: C.textMuted, textAlign: 'center', padding: 60, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
                ✅ No packed orders yet — pack from the In Progress tab
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {packedOrders.map(pl => {
                const isSent = sentToShippingIds.has(pl.id);
                return (
                  <div key={pl.id} style={{ background: C.card, border: `1px solid ${pl._statusUpdateFailed ? C.red + '66' : isSent ? C.orange + '44' : C.green + '44'}`, borderRadius: 12, overflow: 'hidden' }}>
                    {/* Warning banner for failed status update */}
                    {pl._statusUpdateFailed && (
                      <div style={{ padding: '8px 18px', background: C.redBg, borderBottom: `1px solid ${C.red}33`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>
                          ⚠️ Order status stuck at PICKED — Shipping won't see this order until fixed.
                        </span>
                        <button
                          onClick={() => retryPackedStatus(pl)}
                          disabled={actionLoading === `retry-${pl.id}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: C.red, border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 700, cursor: actionLoading === `retry-${pl.id}` ? 'not-allowed' : 'pointer', opacity: actionLoading === `retry-${pl.id}` ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                          <RefreshCw size={11} />
                          {actionLoading === `retry-${pl.id}` ? 'Retrying…' : 'Retry Status'}
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: isSent ? C.orangeBg : C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSent ? <Truck size={16} color={C.orange} /> : <CheckCircle size={16} color={C.green} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                            Pick List #{pl.id}
                            {isSent && <span style={{ marginLeft: 8, fontSize: 11, color: C.orange, fontWeight: 700 }}>🚚 Sent to Shipping</span>}
                          </div>
                          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                            Order: {String(pl.orderNumber || '').slice(0, 20)}… &nbsp;·&nbsp; Packed: {fmtDate(pl.packedAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isSent ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: C.orangeBg, border: `1px solid ${C.orange}44`, fontSize: 12, color: C.orange, fontWeight: 700 }}>
                            <Truck size={12} /> Sent to Shipping ✅
                          </span>
                        ) : (
                          <button onClick={() => sendToShipping(pl)} disabled={actionLoading === `ship-${pl.id}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: `linear-gradient(135deg, ${C.orange}, #9A3412)`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: actionLoading === `ship-${pl.id}` ? 'not-allowed' : 'pointer', opacity: actionLoading === `ship-${pl.id}` ? 0.7 : 1 }}>
                            <Truck size={14} />
                            {actionLoading === `ship-${pl.id}` ? 'Sending…' : '🚚 Send to Shipping'}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Pack detail summary */}
                    {pl.packDetail && (
                      <div style={{ borderTop: `1px solid ${C.green}22`, padding: '10px 18px', background: 'rgba(22,163,74,0.03)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        {pl.packDetail.boxSize      && <span style={{ fontSize: 12, color: C.textMuted }}>📦 <strong>Box:</strong> {pl.packDetail.boxSize}{pl.packDetail.dimensions ? ` (${pl.packDetail.dimensions})` : ''}</span>}
                        {pl.packDetail.packagingType && <span style={{ fontSize: 12, color: C.textMuted }}>🎁 <strong>Type:</strong> {pl.packDetail.packagingType.replace('_', ' ')}</span>}
                        {pl.packDetail.weight        && <span style={{ fontSize: 12, color: C.textMuted }}>⚖️ <strong>Weight:</strong> {pl.packDetail.weight} kg</span>}
                        {pl.packDetail.notes         && <span style={{ fontSize: 12, color: C.textMuted }}>📝 <strong>Notes:</strong> {pl.packDetail.notes}</span>}
                        {pl.packDetail.packedBy      && <span style={{ fontSize: 12, color: C.textMuted }}>👤 <strong>By:</strong> {pl.packDetail.packedBy}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
