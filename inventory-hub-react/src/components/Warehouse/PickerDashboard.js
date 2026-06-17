import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package, CheckCircle, Clock, LogOut, RefreshCw,
  ChevronDown, ChevronUp, MapPin, AlertTriangle, List, Bell
} from 'lucide-react';
import {
  notifyOrderPicked, notifyOrderProcessing,
  getNotifications, markRead, markAllRead, deleteNotification, getUnreadCount,
  notifyPickComplete
} from '../../services/notificationStore';
import { useWarehouseSocket } from '../../services/useWarehouseSocket';

const API = 'http://localhost:9999/api/warehouse'; // routed through API gateway (handles CORS)
const ORDERS_API = 'http://localhost:9999';
const PRODUCTS_API = 'http://localhost:9999/api/products';

const getHeaders = () => {
  const token = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

const fmtDate = (v) =>
  v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const C = {
  dark:      '#F8FAFC',
  card:      '#FFFFFF',
  cardHover: '#F1F5F9',
  border:    '#E2E8F0',
  blue:      '#2563EB',
  blueLight: '#1D4ED8',
  blueDark:  '#1E40AF',
  blueBg:    'rgba(37,99,235,0.08)',
  text:      '#1E293B',
  textMuted: '#64748B',
  green:     '#16A34A',
  greenBg:   'rgba(22,163,74,0.10)',
  amber:     '#D97706',
  amberBg:   'rgba(217,119,6,0.10)',
  red:       '#DC2626',
  redBg:     'rgba(220,38,38,0.10)',
};

const STATUS_CFG = {
  PENDING:     { color: C.amber,     bg: C.amberBg,  label: 'Pending' },
  IN_PROGRESS: { color: C.blueLight, bg: C.blueBg,   label: 'In Progress' },
  COMPLETED:   { color: C.green,     bg: C.greenBg,  label: 'Completed' },
  CANCELLED:   { color: C.red,       bg: C.redBg,    label: 'Cancelled' },
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
      width: 48, height: 48, borderRadius: 12, background: bg || C.blueBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={22} color={color || C.blue} />
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
  background: `${color}22`,
  border: `1px solid ${color}55`,
  borderRadius: 8,
  color: color,
  fontSize: small ? 12 : 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
});

export default function PickerDashboard() {
  // ✅ Set page title
  useEffect(() => {
    document.title = 'Picker Dashboard - Inventory Hub';
    return () => { document.title = 'Inventory Hub'; };
  }, []);

  // ✅ Auth guard + Online status API call
  useEffect(() => {
    const token = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');
    if (!token) {
      window.location.href = '/warehouse/login';
      return;
    }

    const staffId    = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');
    const firstName  = sessionStorage.getItem('warehouseFirstName') || '';
    const lastName   = sessionStorage.getItem('warehouseLastName')  || '';
    const staffName  = `${firstName} ${lastName}`.trim() || 'Picker';
    const staffEmail = sessionStorage.getItem('warehouseEmail') || sessionStorage.getItem('warehouseUserEmail') || '';
    const role       = (sessionStorage.getItem('warehouseUserRole') || 'PICKER').toUpperCase();

    console.log('🟢 [PickerDashboard] goOnline →', { staffId, staffName, staffEmail, role });

    if (!staffId) {
      console.warn('⚠️ [PickerDashboard] staffId is null/empty — online API skipped');
      return;
    }

    // 🟢 Mark ONLINE on backend
    fetch(`${API}/staff-status/online`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ staffId: Number(staffId), staffName, staffEmail, role }),
    })
      .then(async res => {
        const text = await res.text();
        if (res.ok) {
          console.log('✅ [PickerDashboard] online API success:', text);
        } else {
          console.error('❌ [PickerDashboard] online API failed:', res.status, text);
        }
      })
      .catch(err => console.error('❌ [PickerDashboard] online API error:', err.message));

    // localStorage fallback
    try {
      const avail = JSON.parse(localStorage.getItem('picker_availability') || '{}');
      avail[staffId] = { online: true, ts: Date.now() };
      localStorage.setItem('picker_availability', JSON.stringify(avail));
      window.dispatchEvent(new Event('picker_availability_update'));
    } catch { /* ignore */ }
  }, []);

  const [pickLists, setPickLists] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg]             = useState('');
  const [stats, setStats]         = useState({ pending: 0, inProgress: 0, completed: 0 });
  const [filterStatus, setFilterStatus] = useState('PENDING');
  // 🟢 Online / Offline toggle — similar to Delivery boy
  const [isOnline, setIsOnline]         = useState(true);   // ONLINE on login
  const [onlineLoading, setOnlineLoading] = useState(false);
  // ✅ Product name cache: { [productId]: productName }
  const [productNames, setProductNames] = useState({});
  // ✅ Product image cache: { [productId]: imageUrl }
  const [productImages, setProductImages] = useState({});
  // ✅ Track which completed pick lists have been sent to packer (hide button after send)
  const [sentToPackerIds, setSentToPackerIds] = useState(new Set());

  // 🔔 Notification bell state
  const [notifications, setNotifications] = useState(() => getNotifications());
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  // 🔔 Only relevant notifications for Picker — removed source catch-all
  // ORDER_PROCESSING   = manager assigned pick list → visible to picker
  // PICK_LIST_ASSIGNED = manager ने assign केला → WebSocket via backend
  // GRN_COMPLETED      = stock putaway झाला (bin locations updated)
  // LOW_STOCK          = stock कमी आहे (awareness)
  // NOTE: PICK_COMPLETE काढला — picker ने स्वतः pick केल्यावर स्वतःला notification नको
  const PICKER_NOTIF_TYPES = ['ORDER_PROCESSING', 'PICK_LIST_ASSIGNED', 'GRN_COMPLETED', 'LOW_STOCK'];
  const pickerNotifications = notifications.filter(n =>
    PICKER_NOTIF_TYPES.includes(n.type)
  );
  const unreadCount = pickerNotifications.filter(n => !n.read).length;

  // Refresh notifications from store
  useEffect(() => {
    const refresh = () => setNotifications(getNotifications());
    window.addEventListener('ims_notification_update', refresh);
    return () => window.removeEventListener('ims_notification_update', refresh);
  }, []);

  // Close bell panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const userName = sessionStorage.getItem('warehouseFirstName') || 'Picker';
  const pickerId = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');

  // 🔌 WebSocket — Picker ला real-time assignment notifications
  const { sendToStaff } = useWarehouseSocket({
    topics: [
      '/topic/warehouse/all',
      ...(pickerId ? [`/topic/warehouse/picker/${pickerId}`] : []),
    ],
    onMessage: (event) => {
      // PICK_LIST_ASSIGNED → instant refresh + toast
      // ⚠️ NOTE: pushNotification() इथे काढला — PickListAssignment.js autoAssignAll()
      // मध्ये आधीच frontend push होतो. WebSocket + frontend दोन्ही push केल्यावर
      // picker च्या bell वर double PICK_LIST_ASSIGNED येत होती.
      // dedup guard (5s same title+type) काम करतो पण backend वेगळा title पाठवल्यास fail होतो.
      // Solution: WebSocket फक्त UI refresh + toast — notification push नाही.
      if (event.type === 'PICK_LIST_ASSIGNED') {
        load();
        loadStats();
        setMsg(`🔔 ${event.title || 'New pick list assigned!'}`);
        setTimeout(() => setMsg(''), 5000);
      }
      // PICK_COMPLETE → confirmation toast
      if (event.type === 'PICK_COMPLETE') {
        setMsg(`✅ ${event.title || 'Pick complete!'}`);
        setTimeout(() => setMsg(''), 5000);
        // notificationStore मध्ये push करा
        import('../../services/notificationStore').then(({ pushNotification }) => {
          pushNotification({
            type: 'PICK_COMPLETE',
            title: event.title || '✅ Pick Complete',
            message: event.message || '',
            source: 'WAREHOUSE',
          });
        }).catch(() => {});
      }
      // LOW_STOCK alert
      if (event.type === 'LOW_STOCK') {
        setMsg(`⚠️ ${event.message}`);
        setTimeout(() => setMsg(''), 8000);
        import('../../services/notificationStore').then(({ pushNotification }) => {
          pushNotification({
            type: 'LOW_STOCK',
            title: '⚠️ Low Stock Alert',
            message: event.message || '',
            source: 'WAREHOUSE',
          });
        }).catch(() => {});
      }
    },
    enabled: true,
  });

  // Helper: Picker → Manager ला message पाठवा (bin empty, issue, etc.)
  const reportToManager = useCallback((title, message, data = {}) => {
    const managerId = sessionStorage.getItem('warehouseManagerId');
    sendToStaff(managerId, 'PICKER', userName, 'STAFF_MESSAGE', title, message, data);
  }, [sendToStaff, userName]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pickerId = sessionStorage.getItem('warehouseCustomerId');
      const firstName = (sessionStorage.getItem('warehouseFirstName') || '').trim();
      const lastName  = (sessionStorage.getItem('warehouseLastName')  || '').trim();
      const pickerName = `${firstName} ${lastName}`.trim();

      console.log('📋 pickerId:', pickerId, '| pickerName:', pickerName, '| tab:', filterStatus);

      // Always fetch by status — then filter client-side by id OR name
      // This handles cases where assignedPickerId in DB doesn't match sessionStorage id
      const res = await fetch(`${API}/pick-lists/status/${filterStatus}`, { headers: getHeaders() });
      console.log('📋 response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        let all = Array.isArray(data) ? data : [];

        // Match by pickerId OR by first+last name (handles ID mismatch from old assignments)
        const filtered = all.filter(pl => {
          const idMatch   = pickerId && String(pl.assignedPickerId) === String(pickerId);
          const nameMatch = pickerName && pl.assignedPickerName &&
                            pl.assignedPickerName.trim().toLowerCase() === pickerName.toLowerCase();
          // Also match first name only as last fallback (e.g. "Pick Staff" → firstName="Pick")
          const firstNameMatch = firstName && pl.assignedPickerName &&
                                 pl.assignedPickerName.trim().toLowerCase().startsWith(firstName.toLowerCase());
          return idMatch || nameMatch || firstNameMatch;
        });

        console.log('📋 total fetched:', all.length, '| matched for this picker:', filtered.length);
        setPickLists(filtered);
      } else {
        console.error('📋 error:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('📋 fetch failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const loadStats = useCallback(async () => {
    try {
      const pickerId = sessionStorage.getItem('warehouseCustomerId');
      const firstName = (sessionStorage.getItem('warehouseFirstName') || '').trim();
      const lastName  = (sessionStorage.getItem('warehouseLastName')  || '').trim();
      const pickerName = `${firstName} ${lastName}`.trim();

      // Fetch all statuses in parallel
      const [pendingRes, inProgressRes, completedRes] = await Promise.all([
        fetch(`${API}/pick-lists/status/PENDING`,     { headers: getHeaders() }),
        fetch(`${API}/pick-lists/status/IN_PROGRESS`, { headers: getHeaders() }),
        fetch(`${API}/pick-lists/status/COMPLETED`,   { headers: getHeaders() }),
      ]);

      const toArr = async (r) => r.ok ? (await r.json()) : [];
      const [pending, inProgress, completed] = await Promise.all([
        toArr(pendingRes), toArr(inProgressRes), toArr(completedRes),
      ]);

      const isMyList = (pl) => {
        const idMatch        = pickerId && String(pl.assignedPickerId) === String(pickerId);
        const nameMatch      = pickerName && pl.assignedPickerName &&
                               pl.assignedPickerName.trim().toLowerCase() === pickerName.toLowerCase();
        const firstNameMatch = firstName && pl.assignedPickerName &&
                               pl.assignedPickerName.trim().toLowerCase().startsWith(firstName.toLowerCase());
        return idMatch || nameMatch || firstNameMatch;
      };

      setStats({
        pending:    pending.filter(isMyList).length,
        inProgress: inProgress.filter(isMyList).length,
        completed:  completed.filter(isMyList).length,
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); loadStats(); }, [load, loadStats]);

  // 🏷️ Fetch product names + images for all pick list lines whenever pickLists changes
  useEffect(() => {
    const missingIds = [];
    pickLists.forEach(pl => {
      (pl.lines || []).forEach(line => {
        // Fetch if name OR image is missing from both line data and cache
        const needsName  = line.productId && !line.productName  && !productNames[line.productId];
        const needsImage = line.productId && !line.productImage && !productImages[line.productId];
        if (needsName || needsImage) {
          missingIds.push(line.productId);
        }
      });
    });
    if (missingIds.length === 0) return;

    const uniqueIds = [...new Set(missingIds)];
    uniqueIds.forEach(async (productId) => {
      try {
        const res = await fetch(`${PRODUCTS_API}/getByProductId/${productId}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const name  = data.name || data.productName || data.title || null;
          const image = data.productUrl || data.imageUrl || data.image || null;
          if (name)  setProductNames(prev  => ({ ...prev,  [productId]: name  }));
          if (image) setProductImages(prev => ({ ...prev, [productId]: image }));
        }
      } catch {
        // silently ignore — fallback to "Product #id" will be used
      }
    });
  }, [pickLists]); // eslint-disable-line react-hooks/exhaustive-deps

  // 💓 Heartbeat — every 2 minutes backend ला ping करा (stale session prevent)
  useEffect(() => {
    const staffId = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');
    if (!staffId) return;
    const interval = setInterval(() => {
      fetch(`${API}/staff-status/heartbeat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ staffId: Number(staffId) }),
      }).catch(() => {});
    }, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(interval);
  }, []);

  // 🔄 Fallback polling — 60s
  useEffect(() => {
    const interval = setInterval(() => { load(); loadStats(); }, 60000);
    return () => clearInterval(interval);
  }, [load, loadStats]);

  const confirmPickLine = async (pickListId, lineId) => {
    setActionLoading(`${pickListId}-${lineId}`);
    setMsg('');
    try {
      const res = await fetch(`${API}/pick-lists/${pickListId}/lines/${lineId}/confirm`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (res.ok) {
        setMsg(`✅ Line #${lineId} confirmed`);
        load();
        loadStats();
      } else {
        setMsg('❌ Confirmation failed');
      }
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  const startPickList = async (pickListId) => {
    setActionLoading(`start-${pickListId}`);
    setMsg('');
    try {
      const res = await fetch(`${API}/pick-lists/${pickListId}/start`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (res.ok) {
        setMsg(`✅ Pick list #${pickListId} started`);
        load();
        loadStats();
      } else {
        setMsg('❌ Failed to start pick list');
      }
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  const completePickList = async (pickListId, orderNumber) => {
    setActionLoading(`complete-${pickListId}`);
    setMsg('');
    try {
      const res = await fetch(`${API}/pick-lists/${pickListId}/complete`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (res.ok) {
        // NOTE: order status PICKED update backend completePickList() मध्येच होतो (notifyOrderPicked).
        // Frontend duplicate PATCH call काढला — double status update टाळण्यासाठी.

        // NOTE: notifyOrderPicked() frontend call काढला — backend WebSocket आधीच
        // packer ला ORDER_PICKED पाठवतो (/topic/warehouse/packer/{id}).
        // Frontend + backend दोन्ही push केल्यावर packer ला double notification येत होती.

        // 🔔 Picker ला confirmation notification (फक्त picker साठी — packer ला नाही)
        notifyPickComplete(orderNumber || pickListId, userName);
        setMsg(`✅ Pick list #${pickListId} completed! Packer ला notification गेली.`);
        load();
        loadStats();
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg(`❌ Failed to complete: ${err.message || res.status}`);
      }
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  // "Send to Packer" — for already-COMPLETED pick lists (manual re-notify)
  // Embeds full pick list data in notification so PackerDashboard shows it without re-fetch
  const sendToPacker = (pickListId, orderNumber) => {
    const pickList = pickLists.find(pl => pl.id === pickListId);
    notifyOrderPicked(orderNumber || pickListId, userName, pickList || null);
    setSentToPackerIds(prev => new Set([...prev, pickListId]));
    setMsg(`✅ Pick List #${pickListId} — Packer ला notification पाठवली! 📦`);
    setTimeout(() => setMsg(''), 4000);
  };

  // 🟢 Toggle Online / Offline — Delivery boy सारखं
  const toggleOnline = async () => {
    const staffId = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');
    console.log('🔄 [toggleOnline] staffId:', staffId, '| isOnline:', isOnline);
    if (!staffId) {
      console.warn('⚠️ [toggleOnline] staffId is null — cannot toggle');
      setMsg('❌ Staff ID not found. Please re-login.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setOnlineLoading(true);
    try {
      const endpoint = isOnline ? 'offline' : 'online';
      const body = isOnline
        ? { staffId: Number(staffId) }
        : {
            staffId:    Number(staffId),
            staffName:  `${sessionStorage.getItem('warehouseFirstName') || ''} ${sessionStorage.getItem('warehouseLastName') || ''}`.trim() || 'Picker',
            staffEmail: sessionStorage.getItem('warehouseEmail') || '',
            role:       (sessionStorage.getItem('warehouseUserRole') || 'PICKER').toUpperCase(),
          };

      console.log(`📡 [toggleOnline] POST /staff-status/${endpoint}`, body);

      const res = await fetch(`${API}/staff-status/${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      const text = await res.text();
      console.log(`📡 [toggleOnline] response ${res.status}:`, text);

      if (res.ok) {
        setIsOnline(prev => !prev);
        setMsg(isOnline ? '⚫ You are now Offline' : '🟢 You are now Online!');
        setTimeout(() => setMsg(''), 3000);
        try {
          const avail = JSON.parse(localStorage.getItem('picker_availability') || '{}');
          avail[staffId] = { online: !isOnline, ts: Date.now() };
          localStorage.setItem('picker_availability', JSON.stringify(avail));
          window.dispatchEvent(new Event('picker_availability_update'));
        } catch { /* ignore */ }
      } else {
        setMsg(`❌ Status update failed (${res.status})`);
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (e) {
      console.error('❌ [toggleOnline] error:', e.message);
      setMsg('❌ ' + e.message);
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleLogout = () => {
    const staffId = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');

    // 🔴 Backend ला OFFLINE mark करा — synchronous fetch (best effort)
    if (staffId) {
      try {
        navigator.sendBeacon
          ? navigator.sendBeacon(
              `${API}/staff-status/offline`,
              new Blob([JSON.stringify({ staffId: Number(staffId) })], { type: 'application/json' })
            )
          : fetch(`${API}/staff-status/offline`, {
              method: 'POST', headers: getHeaders(),
              body: JSON.stringify({ staffId: Number(staffId) }),
              keepalive: true,
            }).catch(() => {});

        // localStorage fallback
        const avail = JSON.parse(localStorage.getItem('picker_availability') || '{}');
        avail[staffId] = { online: false, ts: Date.now() };
        localStorage.setItem('picker_availability', JSON.stringify(avail));
        window.dispatchEvent(new Event('picker_availability_update'));
      } catch { /* ignore */ }
    }

    // Clear all warehouse session keys
    ['warehouseAuthToken', 'warehouseToken', 'warehouseFirstName', 'warehouseLastName',
     'warehouseRole', 'warehouseUserId', 'warehouseCustomerId', 'warehouseUserRole',
     'warehouseUserName', 'token', 'authToken', 'userRole'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    window.location.href = '/warehouse/login';
  };

  const statusTabs = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

  return (
    <div style={{
      minHeight: '100vh',
      background: `#F8FAFC`,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: C.text,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseGreen {
          0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0);   }
          100% { box-shadow: 0 0 0 0   rgba(34,197,94,0);   }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: C.card,
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <List size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Picker Dashboard</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>Welcome, {userName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 🟢 Online / Offline Toggle — Delivery boy सारखं */}
          <button
            onClick={toggleOnline}
            disabled={onlineLoading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: 8, cursor: onlineLoading ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
              border: `1.5px solid ${isOnline ? 'rgba(22,163,74,0.5)' : 'rgba(107,114,128,0.4)'}`,
              background: isOnline ? 'rgba(22,163,74,0.12)' : 'rgba(107,114,128,0.10)',
              color: isOnline ? '#16a34a' : '#6b7280',
              opacity: onlineLoading ? 0.6 : 1,
            }}
          >
            <span style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
              background: isOnline ? '#22c55e' : '#9ca3af',
              boxShadow: isOnline ? '0 0 0 3px rgba(34,197,94,0.25)' : 'none',
              animation: isOnline ? 'pulseGreen 2s ease-in-out infinite' : 'none',
            }} />
            {onlineLoading ? 'Updating…' : isOnline ? 'Online' : 'Offline'}
          </button>

          {/* 🔔 Notification Bell */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setBellOpen(o => !o); setNotifications(getNotifications()); }}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 10,
                background: bellOpen ? C.blueBg : 'transparent',
                border: `1px solid ${bellOpen ? C.blue + '44' : C.border}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Bell size={18} color={unreadCount > 0 ? C.blue : C.textMuted} />
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

            {/* Bell Panel */}
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
                      style={{ fontSize: 11, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                {pickerNotifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                    No notifications
                  </div>
                ) : (
                  pickerNotifications.slice(0, 20).map(n => (
                    <div key={n.id} onClick={() => { markRead(n.id); setNotifications(getNotifications()); }}
                      style={{
                        padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
                        background: n.read ? '#fff' : C.blueBg,
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

          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px',
            background: C.redBg,
            border: `1px solid ${C.red}44`,
            borderRadius: 8,
            color: C.red,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '28px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <StatCard icon={Clock}        label="Pending Pick Lists"      value={stats.pending}    color={C.amber}  bg={C.amberBg} />
          <StatCard icon={Package}      label="In Progress"             value={stats.inProgress} color={C.blue}   bg={C.blueBg} />
          <StatCard icon={CheckCircle}  label="Completed Today"         value={stats.completed}  color={C.green}  bg={C.greenBg} />
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {statusTabs.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '6px 16px', borderRadius: 20,
              border: `1px solid ${filterStatus === s ? C.blue : C.border}`,
              background: filterStatus === s ? C.blueBg : 'transparent',
              color: filterStatus === s ? C.blueLight : C.textMuted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{s.replace('_', ' ')}</button>
          ))}
        </div>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>
            Pick Lists — {filterStatus.replace('_', ' ')}
          </h2>
          <button onClick={() => { load(); loadStats(); }} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', background: C.blueBg,
            border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.blueLight, fontSize: 13, fontWeight: 600,
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

        {!loading && pickLists.length === 0 && (
          <div style={{
            color: C.textMuted, textAlign: 'center', padding: 60,
            background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
          }}>
            {filterStatus === 'PENDING' ? '🎉 No pending pick lists assigned to you' : `No ${filterStatus.replace('_', ' ').toLowerCase()} pick lists`}
          </div>
        )}

        {/* Pick list cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pickLists.map(pl => {
            const isSent = sentToPackerIds.has(pl.id);
            return (
            <div key={pl.id} style={{
              background: C.card,
              border: `1px solid ${isSent ? '#7C3AED44' : C.border}`,
              borderRadius: 12, overflow: 'hidden',
              opacity: isSent ? 0.85 : 1,
            }}>
              {/* Header row */}
              <div
                onClick={() => setExpanded(expanded === pl.id ? null : pl.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: isSent ? 'rgba(124,58,237,0.10)' : C.blueBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <List size={16} color={isSent ? '#7C3AED' : C.blue} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                      Pick List #{pl.id} &nbsp;
                      <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>
                        ({pl.strategy || 'SINGLE'})
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      SO #{pl.orderNumber || pl.soId} &nbsp;·&nbsp; Created: {fmtDate(pl.createdAt)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Show SENT badge if sent to packer */}
                  {isSent ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700,
                      color: '#7C3AED', background: 'rgba(124,58,237,0.10)',
                      border: '1px solid rgba(124,58,237,0.3)',
                    }}>
                      <CheckCircle size={11} /> Sent to Packer
                    </span>
                  ) : (
                    <Badge status={pl.status} />
                  )}
                  {expanded === pl.id
                    ? <ChevronUp size={16} color={C.textMuted} />
                    : <ChevronDown size={16} color={C.textMuted} />}
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === pl.id && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 18px' }}>

                  {/* Start button for PENDING */}
                  {pl.status === 'PENDING' && (
                    <div style={{ marginBottom: 14 }}>
                      <button
                        onClick={() => startPickList(pl.id)}
                        disabled={actionLoading === `start-${pl.id}`}
                        style={btnStyle(C.blue)}
                      >
                        <Package size={14} /> Start Picking
                      </button>
                    </div>
                  )}

                  {/* Complete button for IN_PROGRESS — all lines picked */}
                  {pl.status === 'IN_PROGRESS' && pl.lines && pl.lines.every(l => l.confirmed === true) && (
                    <div style={{ marginBottom: 14 }}>
                      <button
                        onClick={() => completePickList(pl.id, pl.orderNumber)}
                        disabled={actionLoading === `complete-${pl.id}`}
                        style={{ ...btnStyle(C.green), background: C.greenBg }}
                      >
                        <CheckCircle size={14} /> Complete Picking — Send to Packer
                      </button>
                    </div>
                  )}

                  {/* Send to Packer button for COMPLETED pick lists */}
                  {pl.status === 'COMPLETED' && (
                    <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 8,
                        background: C.greenBg, border: `1px solid ${C.green}44`,
                        fontSize: 12, color: C.green, fontWeight: 600,
                      }}>
                        <CheckCircle size={13} /> Picking Complete
                      </div>
                      {sentToPackerIds.has(pl.id) ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 16px', borderRadius: 8,
                          background: 'rgba(124,58,237,0.10)',
                          border: '1px solid rgba(124,58,237,0.3)',
                          fontSize: 13, color: '#7C3AED', fontWeight: 700,
                        }}>
                          <CheckCircle size={14} /> Sent to Packer ✅
                        </div>
                      ) : (
                        <button
                          onClick={() => sendToPacker(pl.id, pl.orderNumber)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '7px 16px',
                            background: `linear-gradient(135deg, #7C3AED, #5B21B6)`,
                            border: 'none', borderRadius: 8,
                            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          <Package size={14} /> 📦 Send to Packer
                        </button>
                      )}
                    </div>
                  )}

                  {/* Pick lines */}
                  {pl.lines && pl.lines.length > 0 && (
                    <div>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: C.textMuted,
                        marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        Items to Pick
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {pl.lines.map((line, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 14px',
                            background: line.confirmed
                              ? 'rgba(34,197,94,0.06)'
                              : 'rgba(255,255,255,0.03)',
                            borderRadius: 8, fontSize: 13, color: C.text,
                            border: `1px solid ${line.confirmed ? C.green + '33' : 'transparent'}`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {line.confirmed
                                ? <CheckCircle size={14} color={C.green} />
                                : <Package size={14} color={C.blue} />}
                              {/* Product image */}
                              {(line.productImage || productImages[line.productId]) && (
                                <img
                                  src={line.productImage || productImages[line.productId]}
                                  alt=""
                                  style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: `1px solid ${C.border}`, flexShrink: 0 }}
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <span>{line.productName || productNames[line.productId] || `Product #${line.productId}`}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <span style={{ color: C.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={12} /> <strong style={{ color: C.text }}>{line.locationCode || 'Bin TBD'}</strong>
                              </span>
                              <span>Qty: <strong>{line.quantity || 1}</strong></span>
                              {line.confirmed && (
                                <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>✅ Picked</span>
                              )}
                              {pl.status === 'IN_PROGRESS' && !line.confirmed && (
                                <button
                                  onClick={() => confirmPickLine(pl.id, line.id)}
                                  disabled={actionLoading === `${pl.id}-${line.id}`}
                                  style={btnStyle(C.green, true)}
                                >
                                  <CheckCircle size={12} />
                                  {actionLoading === `${pl.id}-${line.id}` ? 'Confirming...' : 'Confirm Pick'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No lines */}
                  {(!pl.lines || pl.lines.length === 0) && (
                    <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>
                      No pick lines found
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
