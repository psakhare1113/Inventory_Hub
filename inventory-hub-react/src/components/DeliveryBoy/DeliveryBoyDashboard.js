import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Truck, CheckCircle, MapPin, RefreshCw, LogOut, Clock, Star, Bell, RotateCcw, XCircle } from 'lucide-react';
import { imsService } from '../../services/imsApi';
import { getNotifications, markRead, markAllRead } from '../../services/notificationStore';

const API = 'http://localhost:9999/api';
const PRODUCTS_API = 'http://localhost:9999/api/products';

const getHeaders = () => {
  const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

const fmtDate = (v) =>
  v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtAmt = (v) => (v != null ? `₹${parseFloat(v).toFixed(2)}` : '—');

// Golden theme palette
const G = {
  gold:       '#D4A017',
  goldLight:  '#F5C842',
  goldDark:   '#A07810',
  goldBg:     '#FDF6E3',
  goldBorder: '#E8C84A',
  dark:       '#1A1A2E',
  darkCard:   '#16213E',
  surface:    '#FFFFFF',
  text:       '#1A1A2E',
  textMuted:  '#6B7280',
  green:      '#16a34a',
  greenBg:    '#dcfce7',
  amber:      '#d97706',
  amberBg:    '#fef3c7',
  red:        '#dc2626',
  redBg:      '#fee2e2',
};

const STATUS_META = {
  SHIPPED:          { bg: '#FFF8E1', color: G.goldDark,  border: G.goldBorder, label: 'Ready to Pick',    emoji: '📦' },
  OUT_FOR_DELIVERY: { bg: '#FFF3E0', color: '#E65100',   border: '#FFB74D',    label: 'Out for Delivery', emoji: '🚚' },
  DELIVERED:        { bg: G.greenBg, color: G.green,     border: '#86efac',    label: 'Delivered',        emoji: '✅' },
};

const styles = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${G.dark} 0%, #0F3460 100%)`,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  header: {
    background: `linear-gradient(90deg, ${G.dark} 0%, #0F3460 60%, ${G.goldDark} 100%)`,
    borderBottom: `3px solid ${G.gold}`,
    padding: '0 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 70,
    boxShadow: `0 4px 20px rgba(212,160,23,0.25)`,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logoArea: { display: 'flex', alignItems: 'center', gap: 12 },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 2px 10px rgba(212,160,23,0.4)`,
  },
  headerTitle: { color: '#FFFFFF', margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' },
  headerSub: { color: G.goldLight, margin: 0, fontSize: 12, fontWeight: 500 },
  headerActions: { display: 'flex', gap: 10, alignItems: 'center' },
  headerBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: `1px solid rgba(212,160,23,0.3)`,
    borderRadius: 10, padding: '8px 14px', color: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
  },
  body: { padding: '28px 24px', maxWidth: 820, margin: '0 auto' },
  // Stats
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 },
  statCard: (color, glowColor) => ({
    background: G.surface,
    borderRadius: 16,
    padding: '20px 22px',
    borderTop: `4px solid ${color}`,
    boxShadow: `0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.05)`,
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
  }),
  statIconWrap: (color) => ({
    width: 44, height: 44, borderRadius: 12,
    background: color + '18',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),
  statLabel: { margin: 0, fontSize: 11, color: G.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { margin: '4px 0 0', fontSize: 32, fontWeight: 800, color: G.text, lineHeight: 1 },
  // Filter tabs
  filterBar: {
    display: 'flex', gap: 8, marginBottom: 20,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 6,
    border: '1px solid rgba(212,160,23,0.15)',
  },
  filterBtn: (active) => ({
    padding: '9px 18px', borderRadius: 10, border: 'none',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
    background: active ? `linear-gradient(135deg, ${G.gold}, ${G.goldLight})` : 'transparent',
    color: active ? G.dark : 'rgba(255,255,255,0.7)',
    boxShadow: active ? `0 2px 10px rgba(212,160,23,0.35)` : 'none',
    letterSpacing: '0.2px',
  }),
  // Order card
  orderCard: {
    background: G.surface,
    borderRadius: 16,
    padding: '20px 22px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    border: '1px solid #F3F4F6',
    transition: 'transform 0.15s, box-shadow 0.15s',
    marginBottom: 14,
  },
  orderNum: { margin: 0, fontFamily: 'monospace', fontSize: 13, color: '#1d4ed8', fontWeight: 800 },
  orderMeta: { margin: '3px 0 0', fontSize: 12, color: G.textMuted },
  badge: (meta) => ({
    padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: meta.bg, color: meta.color,
    border: `1px solid ${meta.border}`,
    display: 'inline-flex', alignItems: 'center', gap: 4,
  }),
  addressBox: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    margin: '14px 0', padding: '10px 14px',
    background: G.goldBg, borderRadius: 10,
    border: `1px solid ${G.goldBorder}`,
  },
  divider: { height: 1, background: '#F3F4F6', margin: '14px 0' },
  amountText: { fontSize: 18, fontWeight: 800, color: G.text },
  // Action buttons
  pickupBtn: {
    padding: '10px 20px',
    background: `linear-gradient(135deg, ${G.gold}, ${G.goldLight})`,
    color: G.dark, border: 'none', borderRadius: 10,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: `0 3px 12px rgba(212,160,23,0.4)`,
    display: 'flex', alignItems: 'center', gap: 6,
    transition: 'all 0.2s',
  },
  deliverBtn: {
    padding: '10px 20px',
    background: `linear-gradient(135deg, #16a34a, #22c55e)`,
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 3px 12px rgba(22,163,74,0.35)',
    display: 'flex', alignItems: 'center', gap: 6,
    transition: 'all 0.2s',
  },
  doneBadge: {
    fontSize: 13, color: G.green, fontWeight: 700,
    display: 'flex', alignItems: 'center', gap: 5,
    background: G.greenBg, padding: '8px 14px', borderRadius: 10,
    border: '1px solid #86efac',
  },
  // Empty state
  emptyState: {
    textAlign: 'center', padding: '60px 20px',
    background: G.surface, borderRadius: 16,
    border: '1px dashed #E5E7EB',
  },
  // Toast
  toast: (type) => ({
    position: 'fixed', top: 80, right: 24, zIndex: 9999,
    padding: '14px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
    background: type === 'success'
      ? `linear-gradient(135deg, ${G.green}, #22c55e)`
      : `linear-gradient(135deg, ${G.red}, #ef4444)`,
    color: '#fff',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    display: 'flex', alignItems: 'center', gap: 8,
    animation: 'slideIn 0.3s ease',
    minWidth: 260,
  }),
  // Loading spinner
  spinner: {
    textAlign: 'center', padding: '80px 20px',
    color: 'rgba(255,255,255,0.5)',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 700,
    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
    textTransform: 'uppercase', letterSpacing: '0.8px',
  },
};

export default function DeliveryBoyDashboard() {
  const deliveryBoyId = parseInt(sessionStorage.getItem('customerId') || sessionStorage.getItem('userId') || '0');

  const [orders, setOrders]               = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [cashRefundTasks, setCashRefundTasks] = useState([]);
  const [returnStats, setReturnStats]     = useState({ approvedToday: 0, rejectedToday: 0, pendingPickup: 0 });
  const [loading, setLoading]             = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [cashRefundLoading, setCashRefundLoading] = useState(false);
  const [toast, setToast]                 = useState(null);
  const [filter, setFilter]               = useState('SHIPPED');
  const [mainTab, setMainTab]             = useState('deliveries'); // 'deliveries' | 'returns' | 'cashRefunds'
  const [actionLoading, setActionLoading] = useState(null);
  const [hovered, setHovered]             = useState(null);
  // Reject modal state
  const [rejectModal, setRejectModal]     = useState(null);
  const [rejectReason, setRejectReason]   = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  // Approve modal state
  const [approveModal, setApproveModal]   = useState(null);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [itemCondition, setItemCondition] = useState('GOOD');
  const [inspectionImages, setInspectionImages] = useState([]);
  const [approveLoading, setApproveLoading] = useState(false);
  // COD cash collection modal
  const [codModal, setCodModal]             = useState(null);
  const [codLoading, setCodLoading]         = useState(false);
  // Cash refund done modal
  const [cashRefundDoneModal, setCashRefundDoneModal] = useState(null);
  const [cashRefundDoneLoading, setCashRefundDoneLoading] = useState(false);

  // 🏷️ Product name + image cache
  const [productNames, setProductNames]   = useState({});
  const [productImages, setProductImages] = useState({});

  // 🔔 Notification bell
  const [notifications, setNotifications] = useState(() => getNotifications());
  const [bellOpen, setBellOpen]           = useState(false);
  const bellRef                           = useRef(null);
  const DELIVERY_NOTIF_TYPES = ['ORDER_ASSIGNED', 'ORDER_SHIPPED', 'ORDER_PICKED'];
  const deliveryNotifications = notifications.filter(n =>
    DELIVERY_NOTIF_TYPES.includes(n.type) || n.source === 'WAREHOUSE'
  );
  const unreadCount = deliveryNotifications.filter(n => !n.read).length;

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const [isOnline, setIsOnline]           = useState(false);
  const [onlineLoading, setOnlineLoading] = useState(false);

  // Auto go ONLINE when dashboard mounts (delivery boy logged in), go OFFLINE on unmount/logout
  useEffect(() => {
    if (!deliveryBoyId) return;

    const goOnlineOnMount = async () => {
      try {
        const res = await fetch(`${API}/auth/delivery/status/online?deliveryBoyId=${deliveryBoyId}`, {
          method: 'PATCH', headers: getHeaders(),
        });
        if (res.ok) {
          setIsOnline(true);
        } else if (res.status === 404) {
          // Not registered yet — auto-register then go online
          const name  = sessionStorage.getItem('userName')  || 'Delivery Partner';
          const email = sessionStorage.getItem('userEmail') || sessionStorage.getItem('userName') || '';
          const regRes = await fetch(`${API}/auth/admin/delivery-boys/status/register`, {
            method: 'POST', headers: getHeaders(),
            body: JSON.stringify({ deliveryBoyId, name, email, phone: '', zone: 'Zone A' }),
          });
          if (regRes.ok) {
            const retry = await fetch(`${API}/auth/delivery/status/online?deliveryBoyId=${deliveryBoyId}`, {
              method: 'PATCH', headers: getHeaders(),
            });
            if (retry.ok) setIsOnline(true);
          }
        } else {
          // Fallback: just read current status
          fetch(`${API}/auth/delivery/status/me?deliveryBoyId=${deliveryBoyId}`, { headers: getHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.status) setIsOnline(d.status === 'AVAILABLE'); })
            .catch(() => {});
        }
      } catch (_) {}
    };

    goOnlineOnMount();

    // Go OFFLINE when delivery boy closes/leaves the dashboard
    const goOfflineOnUnmount = () => {
      navigator.sendBeacon
        ? navigator.sendBeacon(
            `${API}/auth/delivery/status/offline?deliveryBoyId=${deliveryBoyId}`
          )
        : fetch(`${API}/auth/delivery/status/offline?deliveryBoyId=${deliveryBoyId}`, {
            method: 'PATCH', headers: getHeaders(), keepalive: true,
          }).catch(() => {});
    };

    window.addEventListener('beforeunload', goOfflineOnUnmount);
    return () => {
      window.removeEventListener('beforeunload', goOfflineOnUnmount);
      // Also go offline when component unmounts (e.g. logout navigates away)
      goOfflineOnUnmount();
    };
  }, [deliveryBoyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleOnline = async () => {
    if (!deliveryBoyId) { showToast('error', 'Delivery boy ID not found'); return; }
    setOnlineLoading(true);
    try {
      const endpoint = isOnline ? 'offline' : 'online';
      const res = await fetch(`${API}/auth/delivery/status/${endpoint}?deliveryBoyId=${deliveryBoyId}`, {
        method: 'PATCH', headers: getHeaders(),
      });
      if (res.ok) {
        setIsOnline(!isOnline);
        showToast('success', isOnline ? '⚫ You are now Offline' : '🟢 You are now Online & Available!');
      } else {
        showToast('error', 'Failed to update status');
      }
    } catch (e) { showToast('error', e.message); }
    finally { setOnlineLoading(false); }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Pass deliveryBoyId so backend filters by this delivery boy's assignments
      const params = deliveryBoyId ? `?deliveryBoyId=${deliveryBoyId}` : '';
      const [shippedRes, outForDelRes, deliveredRes] = await Promise.all([
        fetch(`${API}/auth/delivery/my-orders${params}`, { headers: getHeaders() }),
        fetch(`${API}/auth/delivery/out-for-delivery${params}`, { headers: getHeaders() }),
        fetch(`${API}/auth/delivery/delivered${params}`, { headers: getHeaders() }),
      ]);
      const shipped    = shippedRes.ok    ? await shippedRes.json()    : [];
      const outForDel  = outForDelRes.ok  ? await outForDelRes.json()  : [];
      const delivered  = deliveredRes.ok  ? await deliveredRes.json()  : [];

      // Backend returns DeliveryAssignment objects (deliveryStatus field) OR Order objects (orderStatus field).
      // Normalize both shapes so the dashboard always works with orderStatus.
      const normalize = (list, fallbackStatus) => list.map(item => ({
        ...item,
        // If it's a DeliveryAssignment, map deliveryStatus → orderStatus
        orderStatus: item.orderStatus
          ?? (item.deliveryStatus === 'ASSIGNED'         ? 'SHIPPED'
            : item.deliveryStatus === 'OUT_FOR_DELIVERY' ? 'OUT_FOR_DELIVERY'
            : item.deliveryStatus === 'DELIVERED'        ? 'DELIVERED'
            : fallbackStatus),
        // Ensure orderNumber is present (DeliveryAssignment has it directly)
        orderNumber: item.orderNumber,
        totalAmount: item.totalAmount ?? item.orderAmount ?? item.amount ?? 0,
        paymentMode: item.paymentMode ?? item.paymentMethod ?? '',
      }));

      const merged = [
        ...normalize(shipped,   'SHIPPED'),
        ...normalize(outForDel, 'OUT_FOR_DELIVERY'),
        ...normalize(delivered, 'DELIVERED'),
      ];
      // Deduplicate by orderNumber — keep latest status
      const unique = merged.filter((o, idx, arr) =>
        arr.findIndex(x => x.orderNumber === o.orderNumber) === idx
      );
      setOrders(unique);
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setLoading(false);
    }
  }, [deliveryBoyId]);

  // ── Fetch Cash Refund Tasks ──────────────────────────────────────────────
  const fetchCashRefundTasks = useCallback(async () => {
    if (!deliveryBoyId) return;
    setCashRefundLoading(true);
    try {
      const res = await fetch(`${API}/auth/delivery/cash-refund-tasks?deliveryBoyId=${deliveryBoyId}`, { headers: getHeaders() });
      if (res.ok) setCashRefundTasks(await res.json());
    } catch (e) {
      console.warn('Failed to load cash refund tasks:', e.message);
    } finally {
      setCashRefundLoading(false);
    }
  }, [deliveryBoyId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchCashRefundTasks(); }, [fetchCashRefundTasks]);
  useEffect(() => {
    const interval = setInterval(() => { fetchOrders(); fetchCashRefundTasks(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchCashRefundTasks]);

  // 🔔 Listen for ORDER_ASSIGNED — auto-refresh orders + show bell badge
  useEffect(() => {
    const handler = () => {
      const notifs = getNotifications();
      setNotifications(notifs);
      const hasNew = notifs.some(n => n.type === 'ORDER_ASSIGNED' && !n.read);
      if (hasNew) fetchOrders();
    };
    window.addEventListener('ims_notification_update', handler);
    return () => window.removeEventListener('ims_notification_update', handler);
  }, [fetchOrders]);

  // Close bell on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 🏷️ Fetch product names + images whenever orders OR returnRequests change
  useEffect(() => {
    const missingIds = [];
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        if (item.productId && !productNames[item.productId]) {
          missingIds.push(item.productId);
        }
      });
    });
    returnRequests.forEach(ret => {
      (ret.items || []).forEach(item => {
        if (item.productId && !productNames[item.productId]) {
          missingIds.push(item.productId);
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
          const name  = data.name || data.productName || null;
          const image = data.productUrl || data.imageUrl || null;
          if (name)  setProductNames(prev  => ({ ...prev,  [productId]: name  }));
          if (image) setProductImages(prev => ({ ...prev, [productId]: image }));
        }
      } catch { /* ignore */ }
    });
  }, [orders, returnRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch Return Requests (with customer + product info enrichment) ─────────
  const fetchReturnRequests = useCallback(async () => {
    setReturnLoading(true);
    try {
      const data = await imsService.deliveryBoy.getPendingReturnRequests(deliveryBoyId);
      const rawList = data || [];

      // ── Enrich with customer info + order items ──────────────────────────
      // Backend now returns barcode, returnReason, customerName, customerPhone, customerAddress
      // directly in return pickup tasks — no need to fetch all orders separately.
      // Only fetch customers map as lightweight fallback for missing customer info.
      let customersMap = {};
      try {
        const custRes = await fetch(`${API}/auth/admin/customers`, { headers: getHeaders() });
        if (custRes.ok) {
          const allCustomers = await custRes.json();
          (Array.isArray(allCustomers) ? allCustomers : []).forEach(c => {
            customersMap[c.id ?? c.customerId] = c;
          });
        }
      } catch (_) {}

      // Merge enriched info into each return request
      const enriched = rawList.map(ret => {
        const custId   = ret.customerId;
        const customer = customersMap[custId] || {};

        // Backend already enriches these — use fallback only if missing
        const customerName  = ret.customerName
          || (customer.firstName
            ? `${customer.firstName} ${customer.lastName || ''}`.trim()
            : null);
        const customerPhone = ret.customerPhone || customer.phone || customer.phoneNumber || null;
        const customerAddress = ret.customerAddress || null;

        return {
          ...ret,
          customerName,
          customerPhone,
          customerAddress,
          items: ret.items || [],
        };
      });
      setReturnRequests(enriched);

      // Fetch stats
      const statsRes = await fetch(`${API}/orders/return-stats`, { headers: getHeaders() });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setReturnStats(stats);
      }
    } catch (e) {
      showToast('error', 'Failed to load return requests');
    } finally {
      setReturnLoading(false);
    }
  }, []);

  useEffect(() => { fetchReturnRequests(); }, [fetchReturnRequests]);
  useEffect(() => {
    const interval = setInterval(fetchReturnRequests, 30000);
    return () => clearInterval(interval);
  }, [fetchReturnRequests]);

  // ── Confirm Cash Refund Done ─────────────────────────────────────────────
  const handleCashRefundDone = async () => {
    if (!cashRefundDoneModal) return;
    setCashRefundDoneLoading(true);
    try {
      const res = await fetch(
        `${API}/auth/delivery/cash-refund/${cashRefundDoneModal.assignmentId}/done`,
        { method: 'PATCH', headers: getHeaders() }
      );
      if (res.ok) {
        showToast('success', `₹${Number(cashRefundDoneModal.cashRefundAmount || 0).toFixed(2)} cash handed to customer ✅`);
        setCashRefundDoneModal(null);
        fetchCashRefundTasks();
      } else {
        showToast('error', 'Failed to confirm cash refund');
      }
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setCashRefundDoneLoading(false);
    }
  };

  // ── Approve Return ───────────────────────────────────────────────────────
  const handleApproveReturn = async () => {
    if (!approveRemarks.trim()) {
      showToast('error', 'Please enter inspection remarks');
      return;
    }
    // Capture identifiers before any async work so the filter is always reliable
    const targetOrderNumber = approveModal.orderNumber;
    const targetBarcode     = approveModal.barcode;

    setApproveLoading(true);
    try {
      const result = await imsService.deliveryBoy.verifyReturnPickup({
        orderNumber: targetOrderNumber,
        barcode: targetBarcode,
        approved: true,
        inspectorRemarks: approveRemarks,
        itemCondition: itemCondition,
        inspectionImages: inspectionImages, // Array of image URLs
      });
      if (result.error) {
        showToast('error', result.error);
      } else {
        showToast('success', 'Return approved successfully!');
        // Remove the card immediately — do NOT call fetchReturnRequests here
        // because the backend may not reflect the change yet, which would
        // re-add the card and undo the removal.
        setReturnRequests(prev => prev.filter(r =>
          !(r.orderNumber === targetOrderNumber && r.barcode === targetBarcode)
        ));
        setApproveModal(null);
        setApproveRemarks('');
        setItemCondition('GOOD');
        setInspectionImages([]);
        // Refresh stats only (not the card list)
        try {
          const statsRes = await fetch(`${API}/orders/return-stats`, { headers: getHeaders() });
          if (statsRes.ok) setReturnStats(await statsRes.json());
        } catch (_) {}
      }
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setApproveLoading(false);
    }
  };

  // ── Reject Return (with reason) ──────────────────────────────────────────
  const handleRejectReturn = async () => {
    if (!rejectReason.trim()) {
      showToast('error', 'Please enter a rejection reason');
      return;
    }
    setRejectLoading(true);
    try {
      const result = await imsService.deliveryBoy.verifyReturnPickup({
        orderNumber: rejectModal.orderNumber,
        barcode: rejectModal.barcode,
        approved: false,
        rejectionReason: rejectReason,
      });
      if (result.error) {
        showToast('error', result.error);
      } else {
        showToast('success', 'Return rejected');
        setRejectModal(null);
        setRejectReason('');
        fetchReturnRequests();
      }
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setRejectLoading(false);
    }
  };

  const markPickup = async (orderNumber) => {
    setActionLoading(orderNumber + '_pickup');
    try {
      const res = await fetch(`${API}/auth/delivery/${orderNumber}/pickup`, {
        method: 'PATCH', headers: getHeaders(),
      });
      if (res.ok) {
        showToast('success', 'Order picked up successfully!');
        fetchOrders();
        // 🔔 Notify admin Orders.js + user OrderHistory to refresh instantly
        window.dispatchEvent(new CustomEvent('ims_delivery_update', {
          detail: { type: 'ORDER_OUT_FOR_DELIVERY', orderNumber }
        }));
      } else showToast('error', 'Failed to update status');
    } catch (e) { showToast('error', e.message); }
    finally { setActionLoading(null); }
  };

  const markDelivered = async (orderNumber) => {
    setActionLoading(orderNumber + '_deliver');
    try {
      const res = await fetch(`${API}/auth/delivery/${orderNumber}/delivered`, {
        method: 'PATCH', headers: getHeaders(),
      });
      if (res.ok) {
        showToast('success', 'Order delivered successfully!');
        fetchOrders();
        // 🔔 Notify admin Orders.js + user OrderHistory to refresh instantly
        window.dispatchEvent(new CustomEvent('ims_delivery_update', {
          detail: { type: 'ORDER_DELIVERED', orderNumber }
        }));
      } else showToast('error', 'Failed to mark as delivered');
    } catch (e) { showToast('error', e.message); }
    finally { setActionLoading(null); }
  };

  // COD: mark delivered + record cash collected in payment-service
  const confirmCodDelivery = async () => {
    if (!codModal) return;
    setCodLoading(true);
    try {
      // Step 1: Mark order as DELIVERED in orders-service
      const deliverRes = await fetch(`${API}/auth/delivery/${codModal.orderNumber}/delivered`, {
        method: 'PATCH', headers: getHeaders(),
      });
      if (!deliverRes.ok) {
        showToast('error', 'Failed to mark order as delivered');
        setCodLoading(false);
        return;
      }

      // Step 2: Update payment status PENDING -> COLLECTED in payment-service
      try {
        await fetch(`${API}/payments/cod/collected`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ orderNumber: codModal.orderNumber }),
        });
      } catch (_) {
        // Non-critical — order is already delivered, payment update can be retried by admin
        console.warn('COD payment status update failed — admin can update manually');
      }

      showToast('success', `Cash collected & order delivered!`);
      setCodModal(null);
      fetchOrders();
      // 🔔 Notify admin Orders.js + user OrderHistory to refresh instantly
      window.dispatchEvent(new CustomEvent('ims_delivery_update', {
        detail: { type: 'ORDER_DELIVERED', orderNumber: codModal.orderNumber }
      }));
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setCodLoading(false);
    }
  };

  const handleLogout = async () => {
    // Go offline before logging out
    if (deliveryBoyId) {
      try {
        await fetch(`${API}/auth/delivery/status/offline?deliveryBoyId=${deliveryBoyId}`, {
          method: 'PATCH', headers: getHeaders(),
        });
      } catch (_) {}
    }
    ['token','authToken','isAdmin','currentView','customerId','firstName','lastName','userRole','userName'].forEach(k => sessionStorage.removeItem(k));
    window.location.href = '/';
  };

  const filtered = orders.filter(o => filter === 'ALL' ? true : o.orderStatus?.toUpperCase() === filter);
  const stats = {
    toPickup:  orders.filter(o => o.orderStatus === 'SHIPPED').length,
    outForDel: orders.filter(o => o.orderStatus === 'OUT_FOR_DELIVERY').length,
    delivered: orders.filter(o => o.orderStatus === 'DELIVERED').length,
  };
  const pendingReturns = returnRequests.length;
  const pendingCashRefunds = cashRefundTasks.length;
  const userName = sessionStorage.getItem('userName') || 'Delivery Partner';
  const now = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .order-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.12) !important; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.12) !important; }
        .hdr-btn:hover { background: rgba(212,160,23,0.2) !important; border-color: rgba(212,160,23,0.6) !important; }
        .pickup-btn:hover { transform: scale(1.03); box-shadow: 0 5px 18px rgba(212,160,23,0.55) !important; }
        .deliver-btn:hover { transform: scale(1.03); box-shadow: 0 5px 18px rgba(22,163,74,0.5) !important; }
        .approve-btn:hover { transform: scale(1.03); box-shadow: 0 5px 18px rgba(22,163,74,0.5) !important; }
        .reject-btn:hover { transform: scale(1.03); box-shadow: 0 5px 18px rgba(220,38,38,0.4) !important; }
        .main-tab:hover { background: rgba(212,160,23,0.12) !important; }
      `}</style>

      {/* ── COD Cash Collection Modal ── */}
      {codModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}
          onClick={() => !codLoading && setCodModal(null)}>
          <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:420, width:'100%', boxShadow:'0 32px 80px rgba(0,0,0,0.4)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'#16a34a', display:'flex', alignItems:'center', gap:8 }}>
                💵 Collect Cash & Deliver
              </h3>
              {!codLoading && (
                <button onClick={() => setCodModal(null)}
                  style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:32, height:32, fontSize:16, cursor:'pointer', color:'#6b7280' }}>✕</button>
              )}
            </div>

            {/* Order info */}
            <div style={{ padding:'14px 16px', background:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0', marginBottom:16 }}>
              <p style={{ margin:'0 0 2px', fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Order Number</p>
              <p style={{ margin:'0 0 10px', fontSize:13, fontWeight:700, color:'#0f172a', fontFamily:'monospace' }}>#{codModal.orderNumber?.slice(0,28)}…</p>
              <div style={{ height:1, background:'#e2e8f0', margin:'10px 0' }} />
              <p style={{ margin:'0 0 2px', fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Amount to Collect</p>
              <p style={{ margin:0, fontSize:32, fontWeight:900, color:'#16a34a' }}>₹{parseFloat(codModal.totalAmount || 0).toFixed(2)}</p>
            </div>

            {/* Instruction */}
            <div style={{ padding:'12px 14px', background:'#fefce8', borderRadius:10, border:'1px solid #fde047', marginBottom:20 }}>
              <p style={{ margin:0, fontSize:13, color:'#713f12', fontWeight:600, lineHeight:1.5 }}>
                💡 Collect <strong>₹{parseFloat(codModal.totalAmount || 0).toFixed(2)}</strong> cash from the customer before clicking confirm.
                This will mark the order as <strong>Delivered</strong> and payment as <strong>Collected</strong>.
              </p>
            </div>

            {/* Checklist */}
            <div style={{ marginBottom:20 }}>
              {[
                'Handed over the package to customer',
                'Collected exact cash amount',
                'Customer verified the order',
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'#dcfce7', border:'1.5px solid #86efac', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:11, color:'#16a34a', fontWeight:800 }}>✓</span>
                  </div>
                  <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setCodModal(null)} disabled={codLoading}
                style={{ flex:1, padding:'12px', background:'#f3f4f6', border:'none', borderRadius:10, fontSize:14, cursor: codLoading ? 'not-allowed' : 'pointer', fontWeight:600, color:'#374151', opacity: codLoading ? 0.5 : 1 }}>
                Cancel
              </button>
              <button onClick={confirmCodDelivery} disabled={codLoading}
                style={{ flex:2, padding:'12px', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor: codLoading ? 'not-allowed' : 'pointer', background: codLoading ? '#e5e7eb' : 'linear-gradient(135deg,#16a34a,#22c55e)', color: codLoading ? '#9ca3af' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow: codLoading ? 'none' : '0 4px 14px rgba(22,163,74,0.35)' }}>
                {codLoading
                  ? <><div style={{ width:16, height:16, border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'#9ca3af', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /> Confirming…</>
                  : <>💵 Confirm Cash Collected</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Modal ── */}
      {rejectModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}
          onClick={() => { setRejectModal(null); setRejectReason(''); }}>
          <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:440, width:'100%', boxShadow:'0 32px 80px rgba(0,0,0,0.35)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'#dc2626' }}>❌ Reject Return</h3>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:32, height:32, fontSize:16, cursor:'pointer', color:'#6b7280' }}>✕</button>
            </div>
            <div style={{ padding:'12px 14px', background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0', marginBottom:16 }}>
              <p style={{ margin:'0 0 2px', fontSize:12, color:'#64748b', fontWeight:600 }}>ORDER</p>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#0f172a', fontFamily:'monospace' }}>#{rejectModal.orderNumber?.slice(0,20)}…</p>
              <p style={{ margin:'4px 0 0', fontSize:12, color:'#64748b' }}>Barcode: {rejectModal.barcode}</p>
            </div>
            <p style={{ margin:'0 0 8px', fontSize:13, fontWeight:700, color:'#374151' }}>Reason for rejection *</p>
            {[
              'Item not available at address',
              'Customer refused pickup',
              'Item already damaged beyond return policy',
              'Item does not match return request',
              'Other',
            ].map(r => (
              <label key={r} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', border:`2px solid ${rejectReason === r ? '#dc2626' : '#e5e7eb'}`, borderRadius:9, cursor:'pointer', background: rejectReason === r ? '#fef2f2' : '#fff', marginBottom:8, transition:'all 0.15s' }}>
                <input type="radio" name="rejectReason" value={r} checked={rejectReason === r} onChange={() => setRejectReason(r)} style={{ width:15, height:15 }} />
                <span style={{ fontSize:13, fontWeight: rejectReason === r ? 700 : 500, color: rejectReason === r ? '#dc2626' : '#374151' }}>{r}</span>
              </label>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:18 }}>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                style={{ flex:1, padding:'11px', background:'#f3f4f6', border:'none', borderRadius:10, fontSize:14, cursor:'pointer', fontWeight:600, color:'#374151' }}>
                Cancel
              </button>
              <button onClick={handleRejectReturn} disabled={rejectLoading || !rejectReason}
                style={{ flex:2, padding:'11px', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor: rejectLoading || !rejectReason ? 'not-allowed' : 'pointer', background: rejectLoading || !rejectReason ? '#e5e7eb' : 'linear-gradient(135deg,#dc2626,#ef4444)', color: rejectLoading || !rejectReason ? '#9ca3af' : '#fff' }}>
                {rejectLoading ? 'Rejecting…' : '❌ Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Return Modal ── */}
      {approveModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)', overflowY:'auto' }}
          onClick={() => { setApproveModal(null); setApproveRemarks(''); setItemCondition('GOOD'); setInspectionImages([]); }}>
          <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:520, width:'100%', boxShadow:'0 32px 80px rgba(0,0,0,0.35)', margin:'20px 0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'#16a34a' }}>✅ Approve Return</h3>
              <button onClick={() => { setApproveModal(null); setApproveRemarks(''); setItemCondition('GOOD'); setInspectionImages([]); }}
                style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:32, height:32, fontSize:16, cursor:'pointer', color:'#6b7280' }}>✕</button>
            </div>

            {/* Order Info */}
            <div style={{ padding:'12px 14px', background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0', marginBottom:16 }}>
              <p style={{ margin:'0 0 2px', fontSize:12, color:'#64748b', fontWeight:600 }}>ORDER</p>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#0f172a', fontFamily:'monospace' }}>#{approveModal.orderNumber?.slice(0,20)}…</p>
              <p style={{ margin:'4px 0 0', fontSize:12, color:'#64748b' }}>Barcode: {approveModal.barcode}</p>
              <p style={{ margin:'4px 0 0', fontSize:12, color:'#78350f', background:'#fffbeb', padding:'4px 8px', borderRadius:6, display:'inline-block' }}>
                Reason: {approveModal.returnReason}
              </p>
            </div>

            {/* Item Condition */}
            <div style={{ marginBottom:16 }}>
              <p style={{ margin:'0 0 8px', fontSize:13, fontWeight:700, color:'#374151' }}>Item Condition *</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[
                  { value:'GOOD', label:'✅ Good', color:'#16a34a', bg:'#dcfce7' },
                  { value:'FAIR', label:'⚠️ Fair', color:'#d97706', bg:'#fef3c7' },
                  { value:'DAMAGED', label:'❌ Damaged', color:'#dc2626', bg:'#fee2e2' },
                ].map(cond => (
                  <button key={cond.value} onClick={() => setItemCondition(cond.value)}
                    style={{ padding:'10px', border:`2px solid ${itemCondition === cond.value ? cond.color : '#e5e7eb'}`, borderRadius:10, cursor:'pointer', background: itemCondition === cond.value ? cond.bg : '#fff', fontSize:12, fontWeight: itemCondition === cond.value ? 700 : 500, color: itemCondition === cond.value ? cond.color : '#374151', transition:'all 0.15s' }}>
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inspection Remarks */}
            <div style={{ marginBottom:16 }}>
              <p style={{ margin:'0 0 8px', fontSize:13, fontWeight:700, color:'#374151' }}>Inspection Remarks *</p>
              <textarea value={approveRemarks} onChange={e => setApproveRemarks(e.target.value)}
                placeholder="Describe the item condition, packaging, any visible damage, etc..."
                rows={3}
                style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:10, fontSize:13, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', outline:'none' }} />
              <p style={{ margin:'4px 0 0', fontSize:11, color:'#9ca3af', textAlign:'right' }}>{approveRemarks.length}/500</p>
            </div>

            {/* Image Upload */}
            <div style={{ marginBottom:16 }}>
              <p style={{ margin:'0 0 8px', fontSize:13, fontWeight:700, color:'#374151' }}>Inspection Photos (Optional)</p>
              <div style={{ padding:'16px', border:'2px dashed #d1d5db', borderRadius:10, textAlign:'center', background:'#f9fafb' }}>
                <p style={{ margin:'0 0 8px', fontSize:13, color:'#6b7280' }}>📸 Upload photos of the item</p>
                <input type="file" accept="image/*" multiple
                  onChange={e => {
                    const files = Array.from(e.target.files);
                    // In real app, upload to server and get URLs
                    const urls = files.map(f => URL.createObjectURL(f));
                    setInspectionImages(prev => [...prev, ...urls]);
                  }}
                  style={{ fontSize:12 }} />
                {inspectionImages.length > 0 && (
                  <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
                    {inspectionImages.map((url, idx) => (
                      <div key={idx} style={{ position:'relative', width:60, height:60, borderRadius:8, overflow:'hidden', border:'2px solid #e5e7eb' }}>
                        <img src={url} alt={`Inspection ${idx+1}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        <button onClick={() => setInspectionImages(prev => prev.filter((_, i) => i !== idx))}
                          style={{ position:'absolute', top:2, right:2, background:'#dc2626', color:'#fff', border:'none', borderRadius:'50%', width:18, height:18, fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p style={{ margin:'6px 0 0', fontSize:11, color:'#9ca3af' }}>💡 Photos help admin verify the inspection</p>
            </div>

            {/* Info Note */}
            <div style={{ padding:'10px 14px', background:'#dcfce7', borderRadius:10, border:'1px solid #86efac', marginBottom:18 }}>
              <p style={{ margin:0, fontSize:12, color:'#166534', fontWeight:600 }}>
                ℹ️ This information will be stored for admin verification and audit purposes.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setApproveModal(null); setApproveRemarks(''); setItemCondition('GOOD'); setInspectionImages([]); }}
                style={{ flex:1, padding:'11px', background:'#f3f4f6', border:'none', borderRadius:10, fontSize:14, cursor:'pointer', fontWeight:600, color:'#374151' }}>
                Cancel
              </button>
              <button onClick={handleApproveReturn} disabled={approveLoading || !approveRemarks.trim()}
                style={{ flex:2, padding:'11px', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor: approveLoading || !approveRemarks.trim() ? 'not-allowed' : 'pointer', background: approveLoading || !approveRemarks.trim() ? '#e5e7eb' : 'linear-gradient(135deg,#16a34a,#22c55e)', color: approveLoading || !approveRemarks.trim() ? '#9ca3af' : '#fff' }}>
                {approveLoading ? 'Approving…' : '✅ Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={styles.toast(toast.type)}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : '❌'} {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <Truck size={22} color={G.dark} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={styles.headerTitle}>Delivery Dashboard</h1>
            <p style={styles.headerSub}>👋 Welcome, {userName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginRight: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={13} /> {now}
          </div>
          <button className="hdr-btn" onClick={fetchOrders} style={styles.headerBtn} disabled={loading}>
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
          {/* 🔔 Notification Bell */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setBellOpen(o => !o); setNotifications(getNotifications()); }}
              style={{
                ...styles.headerBtn,
                position: 'relative',
                background: bellOpen ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.08)',
                borderColor: unreadCount > 0 ? 'rgba(212,160,23,0.6)' : 'rgba(212,160,23,0.3)',
              }}
            >
              <Bell size={16} color={unreadCount > 0 ? G.goldLight : 'rgba(255,255,255,0.6)'} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#dc2626', color: '#fff',
                  borderRadius: '50%', width: 17, height: 17,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, border: '2px solid #0F3460',
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            {bellOpen && (
              <div style={{
                position: 'absolute', top: 48, right: 0, zIndex: 9999,
                width: 320, maxHeight: 380, overflowY: 'auto',
                background: '#fff', borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                border: '1px solid #e5e7eb',
              }}>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>🔔 Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={() => { markAllRead(); setNotifications(getNotifications()); }}
                      style={{ fontSize: 11, color: G.goldDark, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                {deliveryNotifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No notifications</div>
                ) : (
                  deliveryNotifications.slice(0, 15).map(n => (
                    <div key={n.id}
                      onClick={() => { markRead(n.id); setNotifications(getNotifications()); }}
                      style={{
                        padding: '11px 16px', borderBottom: '1px solid #f1f5f9',
                        background: n.read ? '#fff' : '#FFFBEB',
                        cursor: 'pointer',
                      }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
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
            className="hdr-btn"
            onClick={toggleOnline}
            disabled={onlineLoading}
            style={{
              ...styles.headerBtn,
              background: isOnline ? 'rgba(22,163,74,0.2)' : 'rgba(107,114,128,0.2)',
              borderColor: isOnline ? 'rgba(22,163,74,0.6)' : 'rgba(107,114,128,0.4)',
              color: isOnline ? '#4ade80' : 'rgba(255,255,255,0.5)',
              minWidth: 110,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: isOnline ? '#22c55e' : '#6b7280',
              boxShadow: isOnline ? '0 0 0 3px rgba(34,197,94,0.3)' : 'none',
              animation: isOnline ? 'pulse 2s infinite' : 'none',
            }} />
            {onlineLoading ? 'Updating…' : isOnline ? 'Online' : 'Offline'}
          </button>
          <button className="hdr-btn" onClick={handleLogout} style={{ ...styles.headerBtn, borderColor: 'rgba(220,38,38,0.4)' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div style={styles.body}>

        {/* ── Main Tab Switcher ── */}
        <div style={{ display:'flex', gap:0, marginBottom:28, background:'rgba(255,255,255,0.06)', borderRadius:14, padding:5, border:'1px solid rgba(212,160,23,0.2)', width:'fit-content' }}>
          {[
            { key:'deliveries',  label:'🚚 Deliveries',      count: orders.length },
            { key:'returns',     label:'🔄 Return Pickups',  count: pendingReturns,    alert: pendingReturns > 0 },
            { key:'cashRefunds', label:'💵 Cash Refunds',    count: pendingCashRefunds, alert: pendingCashRefunds > 0 },
          ].map(tab => (
            <button key={tab.key} className="main-tab"
              onClick={() => setMainTab(tab.key)}
              style={{
                padding:'10px 22px', borderRadius:10, border:'none', cursor:'pointer',
                fontSize:13, fontWeight:700, transition:'all 0.2s',
                background: mainTab === tab.key ? `linear-gradient(135deg, ${G.gold}, ${G.goldLight})` : 'transparent',
                color: mainTab === tab.key ? G.dark : 'rgba(255,255,255,0.75)',
                boxShadow: mainTab === tab.key ? `0 2px 10px rgba(212,160,23,0.35)` : 'none',
                display:'flex', alignItems:'center', gap:8,
              }}>
              {tab.label}
              <span style={{
                background: mainTab === tab.key ? 'rgba(26,26,46,0.2)' : tab.alert ? '#dc2626' : 'rgba(255,255,255,0.15)',
                color: mainTab === tab.key ? G.dark : '#fff',
                borderRadius:10, padding:'1px 8px', fontSize:11, fontWeight:800,
              }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            DELIVERIES TAB
        ══════════════════════════════════════════════════════ */}
        {mainTab === 'deliveries' && (<>

        {/* Stats */}
        <div style={styles.statsGrid}>
          {[
            { label: 'To Pick Up',       value: stats.toPickup,  color: G.gold,   icon: <Package size={20} />,      sub: 'Awaiting pickup' },
            { label: 'Out for Delivery', value: stats.outForDel, color: '#E65100', icon: <Truck size={20} />,        sub: 'En route now' },
            { label: 'Delivered Today',  value: stats.delivered, color: G.green,   icon: <CheckCircle size={20} />,  sub: 'Completed' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={styles.statCard(s.color)}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: s.color + '12', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={styles.statLabel}>{s.label}</p>
                  <p style={styles.statValue}>{s.value}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: G.textMuted }}>{s.sub}</p>
                </div>
                <div style={styles.statIconWrap(s.color)}>
                  <span style={{ color: s.color }}>{s.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={styles.filterBar}>
          {[
            { key: 'SHIPPED',          label: '📦 To Pick Up',       count: stats.toPickup },
            { key: 'OUT_FOR_DELIVERY', label: '🚚 Out for Delivery',  count: stats.outForDel },
            { key: 'DELIVERED',        label: '✅ Delivered',          count: stats.delivered },
            { key: 'ALL',              label: '📋 All Orders',         count: orders.length },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={styles.filterBtn(filter === f.key)}>
              {f.label}
              <span style={{
                marginLeft: 6, background: filter === f.key ? 'rgba(26,26,46,0.2)' : 'rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '1px 7px', fontSize: 11,
              }}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Section label */}
        <div style={styles.sectionTitle}>
          <Star size={13} color={G.gold} fill={G.gold} />
          {filter === 'ALL' ? 'All Orders' : filter === 'SHIPPED' ? 'Pending Pickup' : filter === 'OUT_FOR_DELIVERY' ? 'In Transit' : 'Completed Deliveries'}
          <span style={{ color: G.gold, marginLeft: 4 }}>({filtered.length})</span>
        </div>

        {/* Orders */}
        {loading ? (
          <div style={styles.spinner}>
            <div style={{ width: 40, height: 40, border: `3px solid rgba(212,160,23,0.2)`, borderTopColor: G.gold, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ margin: 0, fontSize: 14 }}>Loading your orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: G.goldBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `2px dashed ${G.goldBorder}` }}>
              <Package size={28} color={G.gold} />
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: G.text }}>No orders here</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: G.textMuted }}>Nothing in this category right now</p>
          </div>
        ) : (
          <div>
            {filtered.map(order => {
              const meta = STATUS_META[order.orderStatus?.toUpperCase()] || STATUS_META['SHIPPED'];
              const isPickupLoading  = actionLoading === order.orderNumber + '_pickup';
              const isDeliverLoading = actionLoading === order.orderNumber + '_deliver';
              return (
                <div key={order.orderNumber} className="order-card" style={styles.orderCard}>
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={styles.orderNum}>#{order.orderNumber?.slice(0, 22)}…</p>
                      <p style={styles.orderMeta}>
                        <span style={{ background: '#EFF6FF', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                          Customer #{order.customerId}
                        </span>
                        <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={11} /> {fmtDate(order.createdAt)}
                        </span>
                      </p>
                    </div>
                    <span style={styles.badge(meta)}>
                      {meta.emoji} {meta.label}
                    </span>
                  </div>

                  {/* Address */}
                  <div style={styles.addressBox}>
                    <MapPin size={15} color={G.goldDark} style={{ marginTop: 1, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      {/* Customer name + phone */}
                      {(order.customerName || order.customerId) && (
                        <div style={{ fontWeight: 700, fontSize: 13, color: G.text, marginBottom: 2 }}>
                          👤 {order.customerName || `Customer #${order.customerId}`}
                          {order.customerPhone && (
                            <a href={`tel:${order.customerPhone}`}
                              style={{ marginLeft: 10, fontSize: 12, color: G.goldDark, fontWeight: 600, textDecoration: 'none' }}>
                              📞 {order.customerPhone}
                            </a>
                          )}
                        </div>
                      )}
                      {/* Full address */}
                      <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                        {order.shippingAddress || (order.customerId ? `Deliver to Customer #${order.customerId}` : 'Address not available')}
                      </span>
                      {/* AWB + Courier */}
                      {(order.awbNumber || order.courierPartner) && (
                        <div style={{ marginTop: 4, fontSize: 11, color: G.textMuted }}>
                          🚚 {order.courierPartner || 'Courier'} &nbsp;·&nbsp; AWB: <strong style={{ fontFamily: 'monospace', color: G.text }}>{order.awbNumber || '—'}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items in this order */}
                  {order.items && order.items.length > 0 && (
                    <div style={{ marginTop: 10, marginBottom: 4 }}>
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: G.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Items ({order.items.length})
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {order.items.map((item, i) => {
                          const imgSrc = item.productImage || item.productUrl || productImages[item.productId];
                          const name   = item.productName || productNames[item.productId] || `Product #${item.productId}`;
                          return (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '7px 10px', borderRadius: 8,
                              background: '#FFFBEB', border: `1px solid ${G.goldBorder}`,
                              fontSize: 13,
                            }}>
                              {imgSrc && (
                                <img src={imgSrc} alt=""
                                  style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: `1px solid ${G.goldBorder}`, flexShrink: 0 }}
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <span style={{ flex: 1, fontWeight: 600, color: G.text }}>{name}</span>
                              <span style={{ color: G.textMuted, fontSize: 12 }}>Qty: <strong style={{ color: G.text }}>{item.quantity || 1}</strong></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={styles.divider} />

                  {/* Bottom row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order Total</p>
                      <p style={styles.amountText}>{fmtAmt(order.totalAmount)}</p>
                      {order.paymentMode === 'CASH_ON_DELIVERY' && (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:4, padding:'3px 9px', background:'#fef3c7', color:'#92400e', borderRadius:20, fontSize:11, fontWeight:700, border:'1px solid #fde68a' }}>
                          💵 COD — Collect Cash
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {order.orderStatus === 'SHIPPED' && (
                        <button className="pickup-btn" onClick={() => markPickup(order.orderNumber)}
                          disabled={isPickupLoading}
                          style={{ ...styles.pickupBtn, opacity: isPickupLoading ? 0.7 : 1 }}>
                          {isPickupLoading
                            ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(26,26,46,0.3)', borderTopColor: G.dark, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Picking up…</>
                            : <><Package size={15} /> Mark Picked Up</>}
                        </button>
                      )}
                      {order.orderStatus === 'OUT_FOR_DELIVERY' && (
                        <button className="deliver-btn" onClick={() => {
                          if (order.paymentMode === 'CASH_ON_DELIVERY') {
                            setCodModal({ orderNumber: order.orderNumber, totalAmount: order.totalAmount });
                          } else {
                            markDelivered(order.orderNumber);
                          }
                        }}
                          disabled={isDeliverLoading}
                          style={{ ...styles.deliverBtn, opacity: isDeliverLoading ? 0.7 : 1,
                            ...(order.paymentMode === 'CASH_ON_DELIVERY' && {
                              background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                              boxShadow: '0 3px 12px rgba(217,119,6,0.4)',
                            })
                          }}>
                          {isDeliverLoading
                            ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Delivering…</>
                            : order.paymentMode === 'CASH_ON_DELIVERY'
                              ? <>💵 Collect Cash & Deliver</>
                              : <><CheckCircle size={15} /> Mark Delivered</>}
                        </button>
                      )}
                      {order.orderStatus === 'DELIVERED' && (
                        <span style={styles.doneBadge}>
                          <CheckCircle size={15} /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          <Bell size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          Auto-refreshes every 30 seconds
        </div>

        {/* ── Close Deliveries Tab ── */}
        </>)}

        {/* ══════════════════════════════════════════════════════
            RETURN PICKUPS TAB
        ══════════════════════════════════════════════════════ */}
        {mainTab === 'returns' && (<>

          {/* Return Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
            {[
              { label:'Pending Pickup',  value: returnStats.pendingPickup,  color:'#d97706', icon:'🔄', sub:'Awaiting your visit' },
              { label:'Approved Today',  value: returnStats.approvedToday,  color: G.green,  icon:'✅', sub:'Inspection passed' },
              { label:'Rejected Today',  value: returnStats.rejectedToday,  color:'#dc2626', icon:'❌', sub:'Failed inspection' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={styles.statCard(s.color)}>
                <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background: s.color+'12', pointerEvents:'none' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <p style={styles.statLabel}>{s.label}</p>
                    <p style={styles.statValue}>{s.value}</p>
                    <p style={{ margin:'6px 0 0', fontSize:11, color: G.textMuted }}>{s.sub}</p>
                  </div>
                  <div style={{ ...styles.statIconWrap(s.color), fontSize:22 }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Section label */}
          <div style={styles.sectionTitle}>
            <RotateCcw size={13} color={G.gold} />
            Pending Return Pickups
            <span style={{ color: G.gold, marginLeft:4 }}>({returnRequests.length})</span>
            <button onClick={fetchReturnRequests} disabled={returnLoading}
              style={{ marginLeft:'auto', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(212,160,23,0.3)', borderRadius:8, padding:'5px 12px', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
              <RefreshCw size={11} style={returnLoading ? { animation:'spin 1s linear infinite' } : {}} />
              Refresh
            </button>
          </div>

          {/* Return Cards */}
          {returnLoading ? (
            <div style={styles.spinner}>
              <div style={{ width:40, height:40, border:`3px solid rgba(212,160,23,0.2)`, borderTopColor: G.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
              <p style={{ margin:0, fontSize:14 }}>Loading return requests...</p>
            </div>
          ) : returnRequests.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ width:64, height:64, borderRadius:'50%', background: G.goldBg, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', border:`2px dashed ${G.goldBorder}` }}>
                <RotateCcw size={28} color={G.gold} />
              </div>
              <p style={{ margin:0, fontSize:16, fontWeight:700, color: G.text }}>No pending return pickups</p>
              <p style={{ margin:'6px 0 0', fontSize:13, color: G.textMuted }}>All return requests have been processed</p>
            </div>
          ) : (
            <div>
              {returnRequests.map((ret, idx) => {
                const key = `${ret.orderNumber}_${ret.barcode}`;
                const isApproving = actionLoading === `${ret.orderNumber}_${ret.barcode}_approve`;
                const isDamaged   = ret.damageDeclared === true || ret.damageDeclared === 'true';

                return (
                  <div key={idx} className="order-card" style={{ ...styles.orderCard, borderLeft:`4px solid ${isDamaged ? '#dc2626' : G.gold}` }}>

                    {/* Top row */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <div>
                        <p style={styles.orderNum}>#{ret.orderNumber?.slice(0,22)}…</p>
                        <p style={{ margin:'4px 0 0', fontSize:11, fontFamily:'monospace', color:'#64748b' }}>
                          Ref: {ret.returnReference || '—'}
                        </p>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
                        <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:'#fffbeb', color:'#d97706', border:'1px solid #fde68a' }}>
                          🔄 Pickup Pending
                        </span>
                        {isDamaged && (
                          <span style={{ padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }}>
                            ⚠️ Damage Declared
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── Customer Info (delivery card style) ── */}
                    <div style={styles.addressBox}>
                      <MapPin size={15} color={G.goldDark} style={{ marginTop:1, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        {/* Customer name + phone */}
                        <div style={{ fontWeight:700, fontSize:13, color: G.text, marginBottom:2 }}>
                          👤 {ret.customerName || `Customer #${ret.customerId}`}
                          {ret.customerPhone && (
                            <a href={`tel:${ret.customerPhone}`}
                              style={{ marginLeft:10, fontSize:12, color: G.goldDark, fontWeight:600, textDecoration:'none' }}>
                              📞 {ret.customerPhone}
                            </a>
                          )}
                        </div>
                        {/* Full address */}
                        {ret.customerAddress && (
                          <span style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>
                            {ret.customerAddress}
                          </span>
                        )}
                        {/* Barcode */}
                        <div style={{ marginTop:4, fontSize:11, color: G.textMuted }}>
                          🏷️ Barcode: <strong style={{ fontFamily:'monospace', color: G.text }}>{ret.barcode || '—'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* ── Product Items (delivery card style) ── */}
                    {ret.items && ret.items.length > 0 && (
                      <div style={{ marginTop:10, marginBottom:4 }}>
                        <p style={{ margin:'0 0 6px', fontSize:11, color: G.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                          Return Items ({ret.items.length})
                        </p>
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          {ret.items.map((item, i) => {
                            const imgSrc = item.productImage || item.productUrl || productImages[item.productId];
                            const name   = item.productName || productNames[item.productId] || `Product #${item.productId}`;
                            return (
                              <div key={i} style={{
                                display:'flex', alignItems:'center', gap:10,
                                padding:'7px 10px', borderRadius:8,
                                background:'#FFFBEB', border:`1px solid ${G.goldBorder}`,
                                fontSize:13,
                              }}>
                                {imgSrc && (
                                  <img src={imgSrc} alt=""
                                    style={{ width:36, height:36, borderRadius:6, objectFit:'cover', border:`1px solid ${G.goldBorder}`, flexShrink:0 }}
                                    onError={e => { e.target.style.display='none'; }}
                                  />
                                )}
                                <span style={{ flex:1, fontWeight:600, color: G.text }}>{name}</span>
                                <span style={{ color: G.textMuted, fontSize:12 }}>Qty: <strong style={{ color: G.text }}>{item.quantity || 1}</strong></span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Return Reason */}
                    <div style={{ padding:'10px 12px', background:'#fffbeb', borderRadius:10, border:'1px solid #fde68a', marginBottom:12 }}>
                      <p style={{ margin:'0 0 3px', fontSize:10, color:'#92400e', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>Return Reason</p>
                      <p style={{ margin:0, fontSize:13, color:'#78350f', fontWeight:600 }}>{ret.returnReason || '—'}</p>
                    </div>

                    {/* Damage Info */}
                    {isDamaged && ret.damageReason && (
                      <div style={{ padding:'10px 12px', background:'#fef2f2', borderRadius:10, border:'1px solid #fecaca', marginBottom:12 }}>
                        <p style={{ margin:'0 0 3px', fontSize:10, color:'#dc2626', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>⚠️ Damage Description</p>
                        <p style={{ margin:0, fontSize:13, color:'#991b1b', fontWeight:600 }}>{ret.damageReason}</p>
                      </div>
                    )}

                    {/* Initiated At */}
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:14, color:'#94a3b8', fontSize:12 }}>
                      <Clock size={12} />
                      Return requested: {fmtDate(ret.returnedStartedAt || ret.createdAt)}
                    </div>

                    <div style={styles.divider} />

                    {/* Action Buttons */}
                    <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                      {/* Reject */}
                      <button className="reject-btn"
                        onClick={() => setRejectModal({ orderNumber: ret.orderNumber, barcode: ret.barcode, returnReference: ret.returnReference })}
                        style={{ padding:'10px 18px', background:'linear-gradient(135deg,#fef2f2,#fee2e2)', color:'#dc2626', border:'1.5px solid #fca5a5', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'all 0.2s' }}>
                        <XCircle size={15} /> Reject
                      </button>

                      {/* Approve */}
                      <button className="approve-btn"
                        onClick={() => setApproveModal({ 
                          orderNumber: ret.orderNumber, 
                          barcode: ret.barcode, 
                          returnReference: ret.returnReference,
                          returnReason: ret.returnReason 
                        })}
                        style={{ padding:'10px 20px', background:'linear-gradient(135deg,#16a34a,#22c55e)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, boxShadow:'0 3px 12px rgba(22,163,74,0.35)', transition:'all 0.2s' }}>
                        <CheckCircle size={15} /> ✅ Approve Return
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        {/* ── Close Returns Tab ── */}
        </>)}

        {/* ══════════════════════════════════════════════════════
            CASH REFUNDS TAB — delivery boy visits customer & hands back cash
        ══════════════════════════════════════════════════════ */}
        {mainTab === 'cashRefunds' && (
          <div>
            <div style={styles.sectionTitle}>
              <span>💵</span> Cash Refund Tasks
            </div>

            {cashRefundLoading ? (
              <div style={styles.spinner}>Loading cash refund tasks…</div>
            ) : cashRefundTasks.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#374151' }}>No pending cash refunds</p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9ca3af' }}>All cash refunds have been completed</p>
              </div>
            ) : cashRefundTasks.map(task => (
              <div key={task.id} className="order-card" style={{ ...styles.orderCard, borderLeft: '4px solid #16a34a' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <p style={styles.orderNum}>#{task.orderNumber?.slice(-12)}</p>
                    <p style={styles.orderMeta}>Ref: {task.refundReference || '—'}</p>
                  </div>
                  <span style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac' }}>
                    💵 Cash Refund Pending
                  </span>
                </div>

                {/* Amount */}
                <div style={{ padding: '14px 16px', background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', marginBottom: 14, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount to Hand Back</p>
                  <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#15803d' }}>
                    ₹{Number(task.cashRefundAmount || 0).toFixed(2)}
                  </p>
                </div>

                {/* Instruction */}
                <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#92400e', fontWeight: 600, lineHeight: 1.5 }}>
                    📋 Visit the customer, verify their identity, and hand back <strong>₹{Number(task.cashRefundAmount || 0).toFixed(2)}</strong> cash. Then click "Confirm Done".
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="deliver-btn"
                    onClick={() => setCashRefundDoneModal({
                      assignmentId: task.id,
                      orderNumber: task.orderNumber,
                      cashRefundAmount: task.cashRefundAmount,
                      refundReference: task.refundReference,
                    })}
                    style={{ ...styles.deliverBtn }}>
                    <CheckCircle size={15} /> ✅ Confirm Cash Handed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Cash Refund Done Confirmation Modal ── */}
        {cashRefundDoneModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
            onClick={() => !cashRefundDoneLoading && setCashRefundDoneModal(null)}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#16a34a' }}>💵 Confirm Cash Handed</h3>
                {!cashRefundDoneLoading && (
                  <button onClick={() => setCashRefundDoneModal(null)}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                )}
              </div>

              <div style={{ padding: '14px 16px', background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', marginBottom: 16, textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>Amount Handed to Customer</p>
                <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: '#15803d' }}>
                  ₹{Number(cashRefundDoneModal.cashRefundAmount || 0).toFixed(2)}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#16a34a' }}>Order: #{cashRefundDoneModal.orderNumber?.slice(-12)}</p>
              </div>

              <div style={{ padding: '12px 14px', background: '#fefce8', borderRadius: 10, border: '1px solid #fde047', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#713f12', fontWeight: 600, lineHeight: 1.5 }}>
                  ✅ Confirm that you have physically handed <strong>₹{Number(cashRefundDoneModal.cashRefundAmount || 0).toFixed(2)}</strong> cash to the customer.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setCashRefundDoneModal(null)} disabled={cashRefundDoneLoading}
                  style={{ flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 14, cursor: cashRefundDoneLoading ? 'not-allowed' : 'pointer', fontWeight: 600, color: '#374151', opacity: cashRefundDoneLoading ? 0.5 : 1 }}>
                  Cancel
                </button>
                <button onClick={handleCashRefundDone} disabled={cashRefundDoneLoading}
                  style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: cashRefundDoneLoading ? 'not-allowed' : 'pointer', background: cashRefundDoneLoading ? '#e5e7eb' : 'linear-gradient(135deg,#16a34a,#22c55e)', color: cashRefundDoneLoading ? '#9ca3af' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {cashRefundDoneLoading
                    ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#9ca3af', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Confirming…</>
                    : <>💵 Yes, Cash Handed</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:36, color:'rgba(255,255,255,0.3)', fontSize:12 }}>
          <Bell size={12} style={{ marginRight:5, verticalAlign:'middle' }} />
          Auto-refreshes every 30 seconds
        </div>

      </div>
    </div>
  );
}
