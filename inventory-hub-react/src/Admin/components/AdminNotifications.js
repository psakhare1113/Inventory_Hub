import { useState, useEffect, useRef } from 'react';
import {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearAll,
  getUnreadCount,
  pushNotification,
} from '../../services/notificationStore';
import { useWarehouseSocket } from '../../services/useWarehouseSocket';

// ─── Notification types config ────────────────────────────────────────────────
const TYPE_CFG = {
  // Orders
  NEW_ORDER:          { icon: '🛒', color: '#3B82F6', bg: '#EFF6FF', label: 'New Order' },
  ORDER_CONFIRMED:    { icon: '✅', color: '#10B981', bg: '#ECFDF5', label: 'Order Confirmed' },
  ORDER_PROCESSING:   { icon: '🏃', color: '#6366F1', bg: '#EEF2FF', label: 'Processing' },
  ORDER_PICKED:       { icon: '🛒', color: '#F97316', bg: '#FFF7ED', label: 'Order Picked' },
  ORDER_PACKED:       { icon: '📦', color: '#8B5CF6', bg: '#F5F3FF', label: 'Order Packed' },
  ORDER_SHIPPED:      { icon: '🚚', color: '#F97316', bg: '#FFF7ED', label: 'Order Shipped' },
  ORDER_DELIVERED:    { icon: '📦', color: '#8B5CF6', bg: '#F5F3FF', label: 'Order Delivered' },
  ORDER_CANCELLED:    { icon: '❌', color: '#EF4444', bg: '#FEF2F2', label: 'Order Cancelled' },
  // Returns
  ORDER_RETURN_REQUESTED: { icon: '🔄', color: '#D97706', bg: '#FFFBEB', label: 'Return Request' },
  // Inventory
  LOW_STOCK:          { icon: '⚠️', color: '#F59E0B', bg: '#FFFBEB', label: 'Low Stock' },
  OUT_OF_STOCK:       { icon: '🚫', color: '#EF4444', bg: '#FEF2F2', label: 'Out of Stock' },
  STOCK_RECEIVED:     { icon: '📥', color: '#10B981', bg: '#ECFDF5', label: 'Stock Received' },
  DISCREPANCY_FOUND:  { icon: '⚠️', color: '#EF4444', bg: '#FEF2F2', label: 'Discrepancy' },
  // Warehouse
  PO_CREATED:         { icon: '📝', color: '#6366F1', bg: '#EEF2FF', label: 'PO Created' },
  PO_APPROVED:        { icon: '📋', color: '#3B82F6', bg: '#EFF6FF', label: 'PO Approved' },
  GRN_CREATED:        { icon: '📦', color: '#F59E0B', bg: '#FFFBEB', label: 'GRN Created' },
  GRN_COMPLETED:      { icon: '✔️', color: '#10B981', bg: '#ECFDF5', label: 'GRN Completed' },
  TRANSFER_REQUEST:   { icon: '🔄', color: '#6366F1', bg: '#EEF2FF', label: 'Transfer Request' },
  TRANSFER_APPROVED:  { icon: '✅', color: '#10B981', bg: '#ECFDF5', label: 'Transfer Approved' },
  CYCLE_COUNT_DUE:    { icon: '🔢', color: '#F59E0B', bg: '#FFFBEB', label: 'Cycle Count Due' },
  // Pricing
  PRICING_ADDED:      { icon: '💰', color: '#0D9488', bg: '#F0FDFA', label: 'Pricing Added' },
  PRICING_UPDATED:    { icon: '🔄', color: '#0D9488', bg: '#F0FDFA', label: 'Pricing Updated' },
  // Payments
  PAYMENT_RECEIVED:   { icon: '💰', color: '#10B981', bg: '#ECFDF5', label: 'Payment Received' },
  PAYMENT_FAILED:     { icon: '💳', color: '#EF4444', bg: '#FEF2F2', label: 'Payment Failed' },
  REFUND_ISSUED:      { icon: '↩️', color: '#F59E0B', bg: '#FFFBEB', label: 'Refund Issued' },
  // Users / Delivery
  NEW_USER:           { icon: '👤', color: '#8B5CF6', bg: '#F5F3FF', label: 'New User' },
  USER_COMPLAINT:     { icon: '📢', color: '#EF4444', bg: '#FEF2F2', label: 'User Complaint' },
  DELIVERY_APPROVED:  { icon: '🚚', color: '#10B981', bg: '#ECFDF5', label: 'Delivery Partner' },
  // System
  SYSTEM_ALERT:       { icon: '🔔', color: '#6B7280', bg: '#F9FAFB', label: 'System Alert' },
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ─── Filter categories ────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',      label: 'All',      icon: '🔔', types: null },
  { key: 'orders',   label: 'Orders',   icon: '🛒', types: ['NEW_ORDER','ORDER_CONFIRMED','ORDER_PROCESSING','ORDER_PICKED','ORDER_PACKED','ORDER_SHIPPED','ORDER_DELIVERED','ORDER_CANCELLED','ORDER_RETURN_REQUESTED'] },
  { key: 'returns',  label: 'Returns',  icon: '🔄', types: ['ORDER_RETURN_REQUESTED'] },
  { key: 'pricing',  label: 'Pricing',  icon: '💰', types: ['PRICING_ADDED','PRICING_UPDATED'] },
  { key: 'payments', label: 'Payments', icon: '💳', types: ['PAYMENT_RECEIVED','PAYMENT_FAILED','REFUND_ISSUED'] },
  { key: 'users',    label: 'Users',    icon: '👤', types: ['NEW_USER','USER_COMPLAINT','DELIVERY_APPROVED'] },
  { key: 'stock',    label: 'Stock',    icon: '📦', types: ['INVENTORY_UPDATED','LOW_STOCK','OUT_OF_STOCK'] },
  { key: 'warehouse',label: 'Warehouse',icon: '🏭', types: ['PO_CREATED','PO_APPROVED','GRN_CREATED','GRN_COMPLETED'] },
];

// Admin ला फक्त customer + inventory updated + pricing + PO दिसतात.
const ADMIN_ALLOWED_TYPES = new Set([
  // Customer / Orders
  'NEW_ORDER', 'ORDER_CONFIRMED', 'ORDER_PROCESSING',
  'ORDER_PICKED', 'ORDER_PACKED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED',
  'ORDER_RETURN_REQUESTED',
  // Payments
  'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'REFUND_ISSUED',
  // Users
  'NEW_USER', 'USER_COMPLAINT', 'DELIVERY_APPROVED',
  // Inventory / Stock
  'INVENTORY_UPDATED', 'LOW_STOCK', 'OUT_OF_STOCK',
  // Pricing — PO create झाल्यावर येतात
  'PRICING_ADDED', 'PRICING_UPDATED',
  // Warehouse — PO status
  'PO_CREATED', 'PO_APPROVED', 'GRN_CREATED', 'GRN_COMPLETED',
]);

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState(() =>
    getNotifications().filter(n => ADMIN_ALLOWED_TYPES.has(n.type))
  );
  const [open, setOpen]                   = useState(false);
  const [filter, setFilter]               = useState('all');
  const panelRef                          = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── WebSocket — real-time notifications from warehouse-service ──────────────
  useWarehouseSocket({
    topics: ['/topic/admin/notifications'],
    onMessage: (event) => {
      // WebSocket event → notificationStore मध्ये push करा
      // फक्त allowed types च store करा
      if (!ADMIN_ALLOWED_TYPES.has(event.type || 'SYSTEM_ALERT')) return;
      pushNotification({
        type:    event.type    || 'SYSTEM_ALERT',
        title:   event.title   || 'Notification',
        message: event.message || '',
        source:  event.source  || 'WAREHOUSE',
        data:    event.data,
      });
      // UI refresh
      setNotifications(getNotifications().filter(n => ADMIN_ALLOWED_TYPES.has(n.type)));
    },
    enabled: true,
  });

  // Refresh from store whenever another tab/component pushes a notification
  useEffect(() => {
    const refresh = () =>
      setNotifications(getNotifications().filter(n => ADMIN_ALLOWED_TYPES.has(n.type)));

    // Same-tab events (PurchaseOrders.js, Pricing.js, etc.)
    window.addEventListener('ims_notification_update', refresh);

    // ── Cross-tab sync via BroadcastChannel ──────────────────────────────────
    // WarehouseDashboard वेगळ्या tab मधून pushNotification call करतो
    // notificationStore.js BroadcastChannel वर message पाठवतो
    // AdminNotifications ला ते catch करायला स्वतःचा listener हवा
    let bc = null;
    try {
      bc = new BroadcastChannel('ims_notifications_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'ims_notification_update') {
          // दुसऱ्या tab ने localStorage update केला — आपण refresh करतो
          refresh();
        }
      };
    } catch (e) {
      // BroadcastChannel not supported — fallback polling handles it
    }

    // Fallback polling — 5s (cross-tab साठी जर BroadcastChannel नसेल)
    const interval = setInterval(refresh, 5000);

    return () => {
      window.removeEventListener('ims_notification_update', refresh);
      bc?.close();
      clearInterval(interval);
    };
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Notification type → admin menu section mapping
  const NOTIF_NAV_MAP = {
    NEW_ORDER:        'Orders',
    ORDER_CONFIRMED:  'Orders',
    ORDER_PROCESSING: 'Orders',
    ORDER_PICKED:     'Orders',
    ORDER_PACKED:     'Orders',
    ORDER_SHIPPED:    'Shipping',
    ORDER_DELIVERED:  'Orders',
    ORDER_CANCELLED:  'Orders',
    ORDER_RETURN_REQUESTED: 'Returns',
    LOW_STOCK:        'Inventory',
    OUT_OF_STOCK:     'Inventory',
    STOCK_RECEIVED:   'Inventory',
    DISCREPANCY_FOUND:'Inventory',
    PAYMENT_RECEIVED: 'Payments',
    PAYMENT_FAILED:   'Payments',
    REFUND_ISSUED:    'Payments',
    NEW_USER:         'Customers',
    USER_COMPLAINT:   'Customers',
    DELIVERY_APPROVED:'Delivery Boys',
    PO_CREATED:       'Purchase Orders',
    PO_APPROVED:      'Purchase Orders',
    GRN_CREATED:      'Purchase Orders',
    GRN_COMPLETED:    'Purchase Orders',
    PRICING_ADDED:    'Pricing',
    PRICING_UPDATED:  'Pricing',
    LOW_STOCK:        'Inventory',
    OUT_OF_STOCK:     'Inventory',
    INVENTORY_UPDATED:'Inventory',
  };

  const handleNotifClick = (n) => {
    handleMarkRead(n.id);
    const section = NOTIF_NAV_MAP[n.type];
    if (section) {
      // Dispatch custom event — Home.js listens and calls setSelectedMenu
      window.dispatchEvent(new CustomEvent('admin_navigate', { detail: { section } }));
      setOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead();
    setNotifications(getNotifications().filter(n => ADMIN_ALLOWED_TYPES.has(n.type)));
  };

  const handleMarkRead = (id) => {
    markRead(id);
    setNotifications(getNotifications().filter(n => ADMIN_ALLOWED_TYPES.has(n.type)));
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    deleteNotification(id);
    setNotifications(getNotifications().filter(n => ADMIN_ALLOWED_TYPES.has(n.type)));
  };

  const handleClearAll = () => {
    clearAll();
    setNotifications([]);
  };

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => {
        const f = FILTERS.find(f => f.key === filter);
        return f?.types?.includes(n.type);
      });

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>

      {/* ── Bell Button ── */}
      <button
        onClick={() => {
          // Bell उघडताना fresh notifications load करा (cross-tab sync)
          setNotifications(getNotifications().filter(n => ADMIN_ALLOWED_TYPES.has(n.type)));
          setOpen(o => !o);
        }}
        style={{
          position: 'relative',
          width: 40, height: 40,
          borderRadius: '50%',
          background: open ? '#EFF6FF' : '#F9FAFB',
          border: `1px solid ${open ? '#BFDBFE' : '#E5E7EB'}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={open ? '#2563EB' : '#374151'} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 18, height: 18,
            background: '#EF4444', borderRadius: 9,
            fontSize: 10, fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '2px solid #fff', lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Notification Panel ── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 420, maxHeight: 580,
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 18px 12px', borderBottom: '1px solid #F3F4F6',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                Notifications
                {unreadCount > 0 && (
                  <span style={{
                    marginLeft: 8, background: '#EFF6FF', color: '#2563EB',
                    fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                  }}>{unreadCount} new</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                Customer, Orders &amp; Inventory alerts
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} style={{
                  fontSize: 11, fontWeight: 600, color: '#2563EB',
                  background: '#EFF6FF', border: '1px solid #BFDBFE',
                  borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                }}>Mark all read</button>
              )}
              {notifications.length > 0 && (
                <button onClick={handleClearAll} style={{
                  fontSize: 11, fontWeight: 600, color: '#6B7280',
                  background: '#F9FAFB', border: '1px solid #E5E7EB',
                  borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                }}>Clear all</button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{
            display: 'flex', gap: 0, padding: '0',
            borderBottom: '2px solid #F3F4F6', overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            {FILTERS.map(f => {
              const count = f.types
                ? notifications.filter(n => f.types.includes(n.type)).length
                : notifications.length;
              const unread = f.types
                ? notifications.filter(n => f.types.includes(n.type) && !n.read).length
                : notifications.filter(n => !n.read).length;
              const isActive = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: '10px 13px', whiteSpace: 'nowrap',
                  fontSize: 12, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                  border: 'none', borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  marginBottom: -2,
                  background: 'transparent',
                  color: isActive ? '#2563EB' : '#6B7280',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 13 }}>{f.icon}</span>
                  <span>{f.label}</span>
                  {count > 0 && (
                    <span style={{
                      minWidth: 18, height: 18, borderRadius: 9,
                      background: unread > 0 ? (isActive ? '#2563EB' : '#EF4444') : (isActive ? '#BFDBFE' : '#E5E7EB'),
                      color: unread > 0 ? '#fff' : (isActive ? '#2563EB' : '#9CA3AF'),
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px', lineHeight: 1,
                      transition: 'all 0.15s',
                    }}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {FILTERS.find(f => f.key === filter)?.icon || '🔔'}
                </div>
                {notifications.length === 0
                  ? 'No notifications yet. Customer orders and inventory updates will appear here.'
                  : `No ${filter === 'all' ? '' : FILTERS.find(f => f.key === filter)?.label + ' '}notifications`}
              </div>
            )}

            {filtered.map((n, i) => {
              const cfg = TYPE_CFG[n.type] || TYPE_CFG.SYSTEM_ALERT;
              const hasNav = !!NOTIF_NAV_MAP[n.type];
              return (
                <div key={n.id} onClick={() => handleNotifClick(n)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px',
                  background: n.read ? '#fff' : '#F0F7FF',
                  borderBottom: i < filtered.length - 1 ? '1px solid #F9FAFB' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s', position: 'relative',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = n.read ? '#F9FAFB' : '#E8F2FF'}
                  onMouseLeave={e => e.currentTarget.style.background = n.read ? '#fff' : '#F0F7FF'}
                >
                  {!n.read && (
                    <div style={{
                      position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                      width: 6, height: 6, borderRadius: '50%', background: '#2563EB',
                    }} />
                  )}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, border: `1px solid ${cfg.color}22`,
                  }}>{cfg.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: '#111827', lineHeight: 1.3 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {fmtTime(n.time)}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: cfg.color,
                        background: cfg.bg, padding: '2px 7px', borderRadius: 6,
                        border: `1px solid ${cfg.color}33`,
                      }}>{cfg.label}</span>
                      {n.source === 'WAREHOUSE' && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: '#0D9488',
                          background: 'rgba(13,148,136,0.08)', padding: '2px 7px',
                          borderRadius: 6, border: '1px solid rgba(13,148,136,0.2)',
                        }}>🏭 Warehouse</span>
                      )}
                      {hasNav && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: '#2563EB',
                          background: '#EFF6FF', padding: '2px 7px',
                          borderRadius: 6, border: '1px solid #BFDBFE',
                        }}>→ {NOTIF_NAV_MAP[n.type]}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={(e) => handleDelete(n.id, e)} style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: '#D1D5DB', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#D1D5DB'; }}
                    title="Remove"
                  >×</button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                {notifications.length} total · {unreadCount} unread
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
