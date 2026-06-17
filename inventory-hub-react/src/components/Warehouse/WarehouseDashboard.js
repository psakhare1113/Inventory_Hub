import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Warehouse, Package, ArrowLeftRight, ClipboardList, RefreshCw,
  LogOut, CheckCircle, Clock, AlertTriangle, XCircle, Plus,
  ChevronDown, ChevronUp, Truck, BarChart2, MapPin, Eye, Users, ScrollText
} from 'lucide-react';
import {
  pushNotification,
  notifyPOCreated,
  notifyPOApproved,
  notifyGRNCreated,
  notifyGRNCompleted,
  notifyTransferRequest,
  notifyDiscrepancyFound,
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearAll,
} from '../../services/notificationStore';
import { useWarehouseSocket } from '../../services/useWarehouseSocket';
import StaffManagement from './StaffManagement';
import PickListAssignment from '../../Admin/components/PickListAssignment';
import AuditLogs from '../../Admin/components/AuditLogs';

const API = 'http://localhost:9999/api/warehouse';

const getHeaders = () => {
  const token = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');
  const role  = sessionStorage.getItem('warehouseRole') || sessionStorage.getItem('adminRole') || 'ADMIN';
  const userId = sessionStorage.getItem('warehouseUserId') || sessionStorage.getItem('adminUserId') || '1';
  return {
    'Content-Type': 'application/json',
    'X-User-Role': role,
    'X-User-Id': userId,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const fmtDate = (v) =>
  v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Color Palette (White/Light Theme) ───────────────────────────────────────
const C = {
  dark:      '#F8FAFC',
  card:      '#FFFFFF',
  cardHover: '#F1F5F9',
  border:    '#E2E8F0',
  teal:      '#0D9488',
  tealLight: '#0F766E',
  tealDark:  '#0A7A70',
  tealBg:    'rgba(13,148,136,0.08)',
  text:      '#1E293B',
  textMuted: '#64748B',
  green:     '#16A34A',
  greenBg:   'rgba(22,163,74,0.10)',
  amber:     '#D97706',
  amberBg:   'rgba(217,119,6,0.10)',
  red:       '#DC2626',
  redBg:     'rgba(220,38,38,0.10)',
  blue:      '#2563EB',
  blueBg:    'rgba(37,99,235,0.10)',
};

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS_CFG = {
  // PO
  DRAFT:      { color: C.textMuted, bg: 'rgba(255,255,255,0.06)', label: 'Draft' },
  APPROVED:   { color: C.tealLight, bg: C.tealBg,                 label: 'Approved' },
  RECEIVING:  { color: C.amber,     bg: C.amberBg,                label: 'Receiving' },
  CLOSED:     { color: C.green,     bg: C.greenBg,                label: 'Closed' },
  CANCELLED:  { color: C.red,       bg: C.redBg,                  label: 'Cancelled' },
  // GRN
  PENDING:    { color: C.amber,     bg: C.amberBg,                label: 'Pending' },
  INSPECTED:  { color: C.blue,      bg: C.blueBg,                 label: 'Inspected' },
  PUTAWAY:    { color: C.green,     bg: C.greenBg,                label: 'Putaway Done' },
  // Transfer
  REQUESTED:  { color: C.textMuted, bg: 'rgba(255,255,255,0.06)', label: 'Requested' },
  IN_TRANSIT: { color: C.amber,     bg: C.amberBg,                label: 'In Transit' },
  RECEIVED:   { color: C.blue,      bg: C.blueBg,                 label: 'Received' },
  COMPLETED:  { color: C.green,     bg: C.greenBg,                label: 'Completed' },
  // Cycle Count
  SCHEDULED:  { color: C.blue,      bg: C.blueBg,                 label: 'Scheduled' },
  IN_PROGRESS:{ color: C.amber,     bg: C.amberBg,                label: 'In Progress' },
  COUNTED:    { color: C.tealLight, bg: C.tealBg,                 label: 'Counted' },
  REJECTED:   { color: C.red,       bg: C.redBg,                  label: 'Rejected' },
};

const Badge = ({ status }) => {
  const cfg = STATUS_CFG[status] || { color: C.textMuted, bg: 'rgba(255,255,255,0.06)', label: status };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.4px',
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
    }}>{cfg.label}</span>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div style={{
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: '20px 22px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flex: '1 1 180px',
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: 12,
      background: bg || C.tealBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={22} color={color || C.teal} />
    </div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, onRefresh, loading }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>{title}</h2>
    <button
      onClick={onRefresh}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px',
        background: C.tealBg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        color: C.tealLight,
        fontSize: 13,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
      Refresh
    </button>
  </div>
);

// ─── Warehouse Notification Bell ─────────────────────────────────────────────
// Notification type → which tab to open
const NOTIF_TAB_MAP = {
  PO_CREATED:        'po',
  PO_APPROVED:       'po',
  AUTO_PO_CREATED:   'po',
  GRN_CREATED:       'grn',
  GRN_COMPLETED:     'grn',
  TRANSFER_REQUEST:  'transfers',
  TRANSFER_APPROVED: 'transfers',
  CYCLE_COUNT_DUE:   'cycle',
  DISCREPANCY_FOUND: 'cycle',
  LOW_STOCK:         'overview',
  OUT_OF_STOCK:      'overview',
  NEW_ORDER_RECEIVED:'tracking',
  ORDER_PICKED:      'tracking',
  ORDER_PACKED:      'tracking',
  ORDER_SHIPPED:     'tracking',
  ORDER_DELIVERED:   'tracking',
  ORDER_PROCESSING:  'picklist',
};

function WarehouseBell({ onNavigate }) {
  const [notifications, setNotifications] = useState(() => getNotifications());
  const [open, setOpen]   = useState(false);
  const panelRef          = useRef(null);

  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const refresh = () => setNotifications(getNotifications());
    window.addEventListener('ims_notification_update', refresh);
    // Fallback polling — 30s (WebSocket असल्यामुळे कमी केला)
    const t = setInterval(refresh, 30000);
    return () => { window.removeEventListener('ims_notification_update', refresh); clearInterval(t); };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = (id) => { markRead(id); setNotifications(getNotifications()); };
  const handleMarkAll  = ()   => { markAllRead(); setNotifications(getNotifications()); };
  const handleDelete   = (id, e) => { e.stopPropagation(); deleteNotification(id); setNotifications(getNotifications()); };
  const handleClear    = ()   => { clearAll(); setNotifications([]); };

  // Click notification → mark read + navigate to relevant tab
  const handleNotifClick = (n) => {
    markRead(n.id);
    setNotifications(getNotifications());
    const tab = NOTIF_TAB_MAP[n.type];
    if (tab && onNavigate) {
      onNavigate(tab);
      setOpen(false);
    }
  };

  // Only show warehouse-manager-relevant notifications
  // ORDER_PICKED / ORDER_PACKED / ORDER_SHIPPED हे staff-level events आहेत —
  // manager ला दिसू नयेत (picker/packer/shipping च्या bells मध्ये जातात)
  // Manager ला फक्त: PO/GRN/Transfers/Stock/ORDER_PROCESSING (assign picker) / ORDER_DELIVERED
  const warehouseNotifs = notifications.filter(n =>
    ['PO_CREATED','PO_APPROVED','AUTO_PO_CREATED','GRN_CREATED','GRN_COMPLETED','TRANSFER_REQUEST','TRANSFER_APPROVED',
     'CYCLE_COUNT_DUE','DISCREPANCY_FOUND','LOW_STOCK','OUT_OF_STOCK',
     'ORDER_PROCESSING',   // ← Admin ने processing केला → Manager assigns picker
     'NEW_ORDER_RECEIVED', // ← नवीन order आला
     'ORDER_DELIVERED',    // ← fulfillment complete
     'RECEIVING_ALERT',    // ← Receiving Clerk साठी
    ].includes(n.type)
  );
  const warehouseUnread = warehouseNotifs.filter(n => !n.read).length;

  const TYPE_ICONS = {
    PO_CREATED: '📝', PO_APPROVED: '✅', AUTO_PO_CREATED: '🤖',
    GRN_CREATED: '📦', GRN_COMPLETED: '✔️',
    TRANSFER_REQUEST: '🔄', TRANSFER_APPROVED: '✅', CYCLE_COUNT_DUE: '🔢',
    DISCREPANCY_FOUND: '⚠️', LOW_STOCK: '⚠️', OUT_OF_STOCK: '🚫',
    NEW_ORDER_RECEIVED: '🆕',
    ORDER_PROCESSING: '📋',
    ORDER_PICKED: '🏃', ORDER_PACKED: '📦', ORDER_SHIPPED: '🚚', ORDER_DELIVERED: '🎉',
    RECEIVING_ALERT: '📦',
  };

  // Tab label for "Go to" hint
  const TAB_LABELS = {
    po: 'Purchase Orders', grn: 'GRN / Receiving',
    transfers: 'Transfers', cycle: 'Cycle Counts', overview: 'Overview',
    picklist: 'Pick List Assign',
  };

  const fmtTime = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'relative', width: 38, height: 38, borderRadius: '50%',
        background: open ? C.tealBg : '#F8FAFC',
        border: `1px solid ${open ? C.teal : C.border}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }} title="Warehouse Notifications">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke={open ? C.teal : C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {warehouseUnread > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 17, height: 17, background: C.red, borderRadius: 9,
            fontSize: 9, fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', border: '2px solid #fff',
          }}>{warehouseUnread > 9 ? '9+' : warehouseUnread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 380, maxHeight: 520,
          background: '#fff', border: `1px solid ${C.border}`,
          borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
          zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px 10px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
              🏭 Warehouse Alerts
              {warehouseUnread > 0 && (
                <span style={{
                  marginLeft: 8, background: C.tealBg, color: C.teal,
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
                }}>{warehouseUnread} new</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {warehouseUnread > 0 && (
                <button onClick={handleMarkAll} style={{
                  fontSize: 10, fontWeight: 600, color: C.teal,
                  background: C.tealBg, border: `1px solid ${C.teal}33`,
                  borderRadius: 5, padding: '3px 7px', cursor: 'pointer',
                }}>Mark all read</button>
              )}
              {warehouseNotifs.length > 0 && (
                <button onClick={handleClear} style={{
                  fontSize: 10, fontWeight: 600, color: C.textMuted,
                  background: '#F9FAFB', border: `1px solid ${C.border}`,
                  borderRadius: 5, padding: '3px 7px', cursor: 'pointer',
                }}>Clear</button>
              )}
            </div>
          </div>

          {/* Hint */}
          <div style={{ padding: '6px 14px', background: '#f8fafc', borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted }}>
            💡 Click on a notification to navigate to the relevant tab
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {warehouseNotifs.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                No warehouse alerts yet
              </div>
            )}
            {warehouseNotifs.map((n, i) => {
              const tab = NOTIF_TAB_MAP[n.type];
              const tabLabel = tab ? TAB_LABELS[tab] : null;
              return (
                <div key={n.id} onClick={() => handleNotifClick(n)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px',
                  background: n.read ? '#fff' : 'rgba(13,148,136,0.05)',
                  borderBottom: i < warehouseNotifs.length - 1 ? `1px solid ${C.border}` : 'none',
                  cursor: 'pointer', position: 'relative',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = n.read ? '#f8fafc' : 'rgba(13,148,136,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? '#fff' : 'rgba(13,148,136,0.05)'; }}
                >
                  {!n.read && (
                    <div style={{
                      position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)',
                      width: 5, height: 5, borderRadius: '50%', background: C.teal,
                    }} />
                  )}
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: C.tealBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17,
                  }}>{TYPE_ICONS[n.type] || '🔔'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: C.text, lineHeight: 1.3 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {fmtTime(n.time)}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    {/* "Go to tab" chip */}
                    {tabLabel && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        marginTop: 5, padding: '2px 7px',
                        background: C.tealBg, borderRadius: 6,
                        fontSize: 10, fontWeight: 600, color: C.teal,
                      }}>
                        → {tabLabel}
                      </div>
                    )}
                  </div>
                  <button onClick={(e) => handleDelete(n.id, e)} style={{
                    flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: C.border, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.redBg; e.currentTarget.style.color = C.red; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.border; }}
                  >×</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Input style helper ───────────────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 13,
  color: C.text,
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: C.textMuted,
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

// ─── Notes Dropdown — quick-select predefined notes ──────────────────────────
const NOTE_OPTIONS = [
  // 🚨 Urgency
  'Urgent order — please prioritize',
  'Critical stock — expedite delivery',
  // 📦 Delivery
  'Standard reorder — regular stock replenishment',
  'Partial delivery acceptable',
  'Deliver during business hours only (9 AM – 6 PM)',
  'Contact warehouse manager before delivery',
  'Deliver to Gate 2 — Warehouse B',
  // 🔍 Quality
  'Quality check required on delivery',
  'Fragile items — handle with care',
  'Cold chain required — maintain temperature',
  'Inspect packaging before accepting delivery',
  // 💰 Pricing / Terms
  'Bulk discount negotiated with supplier',
  'Price confirmed on call with supplier',
  'GST invoice required',
  'Payment on delivery — COD',
  // 📋 Special Instructions
  'Auto-generated by system — low stock detected',
  'Festival/Sale stock — extra quantity ordered',
  'New product — first order from this supplier',
  'Replacement order — previous batch was defective',
  'Sample order — check quality before bulk purchase',
];

function NotesDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const appendNote = (note) => {
    onChange(value ? `${value}; ${note}` : note);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type='text'
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder='Type or select a note...'
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type='button'
          onClick={() => setOpen(o => !o)}
          style={{
            padding: '0 10px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: open ? C.tealBg : '#f8fafc', cursor: 'pointer',
            color: C.teal, fontSize: 16, lineHeight: 1,
          }}
          title='Quick select note'
        >▾</button>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 500,
          maxHeight: 220, overflowY: 'auto',
        }}>
          {NOTE_OPTIONS.map((note, i) => (
            <div
              key={i}
              onClick={() => appendNote(note)}
              style={{
                padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                color: C.text, borderBottom: i < NOTE_OPTIONS.length - 1 ? `1px solid ${C.border}` : 'none',
                background: '#fff',
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.tealBg}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Threshold Modal — Add/Edit product thresholds ───────────────────────────
function ThresholdModal({ thresholds, onClose, onSaved }) {
  const [form, setForm] = useState({
    productId: '', productName: '', warehouseId: '',
    lowStockThreshold: 50, reorderQty: 100,
    defaultSupplierId: '', autoPOEnabled: true,
    poDate:           new Date().toISOString().split('T')[0],
    expectedDate:     '',
    creditTerms:      'NET_30',
    currency:         'INR',
    receiveMaterials: true,
    shipToAddress:    '',
    notes:            '',
  });
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');
  const [products, setProducts]     = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(null);

  useEffect(() => {
    fetch(`${API}/products`,  { headers: getHeaders() }).then(r => r.ok ? r.json() : []).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/suppliers`, { headers: getHeaders() }).then(r => r.ok ? r.json() : []).then(d => setSuppliers(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/warehouses`,{ headers: getHeaders() }).then(r => r.ok ? r.json() : []).then(d => setWarehouses(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Product select — फक्त stock fetch, pricing auto-fill नाही
  const handleProductSelect = async (productId, productName) => {
    setForm(f => ({ ...f, productId, productName }));
    setCurrentStock(null);
    if (!productId) return;
    setStockLoading(true);
    try {
      const res = await fetch(`${API}/auto-po/stock/${productId}`, { headers: getHeaders() });
      if (res.ok) { const d = await res.json(); setCurrentStock(d.currentStock ?? null); }
    } catch { /* ignore */ }
    finally { setStockLoading(false); }
  };

  // Warehouse select — shipToAddress auto-fill
  const handleWarehouseSelect = (warehouseId) => {
    const w = warehouses.find(x => String(x.warehouseId || x.id) === String(warehouseId));
    const addr = w ? `${w.warehouseName || w.name}${w.city ? ', ' + w.city : ''}` : '';
    setForm(f => ({ ...f, warehouseId, shipToAddress: addr }));
  };


  const save = async () => {
    setErr('');
    if (!form.productId)            return setErr('Please select a product');
    if (!form.defaultSupplierId)    return setErr('Please select a supplier');
    if (form.lowStockThreshold < 1) return setErr('Threshold must be >= 1');
    if (form.reorderQty < 1)        return setErr('Reorder qty must be >= 1');
    setSaving(true);
    try {
      const res = await fetch(`${API}/auto-po/thresholds`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({
          productId:         Number(form.productId),
          productName:       form.productName,
          warehouseId:       Number(form.warehouseId) || 1,
          lowStockThreshold: Number(form.lowStockThreshold),
          reorderQty:        Number(form.reorderQty),
          defaultSupplierId: Number(form.defaultSupplierId),
          autoPOEnabled:     form.autoPOEnabled,
          poDate:            form.poDate,
          expectedDate:      form.expectedDate,
          creditTerms:       form.creditTerms,
          currency:          form.currency,
          receiveMaterials:  form.receiveMaterials,
          shipToAddress:     form.shipToAddress,
          notes:             form.notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSaved();
      }
      else setErr(data.error || `Error ${res.status}`);
    } catch (e) { setErr('Server error: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: `1px solid ${C.border}`,
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>⚙️ Add Auto PO Threshold</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              Stock कमी झाला तर system automatically PO create करेल
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 22 }}>✕</button>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {err && (
            <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13, background: C.redBg, color: C.red, border: `1px solid ${C.red}33` }}>
              ❌ {err}
            </div>
          )}

          {/* Existing thresholds */}
          {thresholds.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
                Existing Thresholds ({thresholds.length})
              </div>
              {thresholds.map(t => (
                <div key={t.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                  background: '#f8fafc', border: `1px solid ${C.border}`, fontSize: 12,
                }}>
                  <span style={{ fontWeight: 600, color: C.text }}>{t.productName || `Product #${t.productId}`}</span>
                  <span style={{ color: C.textMuted }}>
                    Threshold: {t.lowStockThreshold} · Reorder: {t.reorderQty}
                  </span>
                  <button
                    onClick={async () => {
                      await fetch(`${API}/auto-po/thresholds/${t.id}`, { method: 'DELETE', headers: getHeaders() });
                      onSaved();
                    }}
                    style={{ background: C.redBg, color: C.red, border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}
                  >Delete</button>
                </div>
              ))}
              <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '14px 0' }} />
            </div>
          )}

          {/* Add new threshold form */}
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Add New Threshold</div>

          {/* Row 1: Product */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Product *</label>
            <select value={form.productId} onChange={e => {
              const p = products.find(x => String(x.productId || x.id) === e.target.value);
              handleProductSelect(e.target.value, p?.name || '');
            }} style={inputStyle}>
              <option value=''>-- Select Product --</option>
              {products.map(p => (
                <option key={p.productId || p.id} value={p.productId || p.id}>{p.name}</option>
              ))}
            </select>
            {form.productId && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6,
                padding: '5px 10px', borderRadius: 8, fontSize: 12,
                background: currentStock === null ? '#f8fafc' : currentStock === 0 ? C.redBg : currentStock < 50 ? C.amberBg : C.greenBg,
                border: `1px solid ${currentStock === null ? C.border : currentStock === 0 ? C.red + '44' : currentStock < 50 ? C.amber + '44' : C.green + '44'}`,
              }}>
                <span style={{ fontWeight: 700, color: C.textMuted }}>📦 Current Stock:</span>
                {stockLoading
                  ? <span style={{ color: C.textMuted }}>Fetching...</span>
                  : currentStock === null ? <span style={{ color: C.textMuted }}>—</span>
                  : <span style={{ fontWeight: 800, color: currentStock === 0 ? C.red : currentStock < 50 ? C.amber : C.green }}>
                      {currentStock} units {currentStock === 0 ? '🚫 OUT' : currentStock < 50 ? '⚠️ LOW' : '✅ OK'}
                    </span>
                }
              </div>
            )}
          </div>

          {/* Row 2: Default Supplier | Ship To (Warehouse) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Default Supplier *</label>
              <select value={form.defaultSupplierId} onChange={e => setForm(f => ({ ...f, defaultSupplierId: e.target.value }))} style={inputStyle}>
                <option value=''>-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.supplierId} value={s.supplierId}>{s.name} — {s.company}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ship To (Warehouse)</label>
              <select value={form.warehouseId} onChange={e => handleWarehouseSelect(e.target.value)} style={inputStyle}>
                <option value=''>-- Select Warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.warehouseId || w.id} value={w.warehouseId || w.id}>
                    {w.warehouseName || w.name} — {w.city || ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: PO Date | Expected Delivery Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>PO Date</label>
              <input type='date' value={form.poDate}
                onChange={e => setForm(f => ({ ...f, poDate: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Expected Delivery Date</label>
              <input type='date' value={form.expectedDate}
                onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          {/* Row 4: Credit Terms | Currency | Receive Materials */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Credit Terms</label>
              <select value={form.creditTerms} onChange={e => setForm(f => ({ ...f, creditTerms: e.target.value }))} style={inputStyle}>
                <option value='IMMEDIATE'>Immediate</option>
                <option value='NET_15'>Net 15</option>
                <option value='NET_30'>Net 30</option>
                <option value='NET_45'>Net 45</option>
                <option value='NET_60'>Net 60</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={inputStyle}>
                <option value='INR'>INR ₹</option>
                <option value='USD'>USD $</option>
                <option value='EUR'>EUR €</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Receive Materials</label>
              <select value={form.receiveMaterials ? 'Y' : 'N'}
                onChange={e => setForm(f => ({ ...f, receiveMaterials: e.target.value === 'Y' }))} style={inputStyle}>
                <option value='Y'>Y — Warehouse receives</option>
                <option value='N'>N — Third-party</option>
              </select>
            </div>
          </div>

          {/* Row 5: Ship To Address | Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Ship To Address</label>
              <input type='text' value={form.shipToAddress}
                onChange={e => setForm(f => ({ ...f, shipToAddress: e.target.value }))}
                placeholder='Auto-filled from warehouse selection' style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <NotesDropdown
                value={form.notes}
                onChange={v => setForm(f => ({ ...f, notes: v }))}
              />
            </div>
          </div>

          {/* Row 6: Low Stock Threshold | Reorder Qty */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Low Stock Threshold *</label>
              <input type='number' min={1} value={form.lowStockThreshold}
                onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} style={inputStyle} />
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Stock falls below this → Auto PO will be triggered</div>
            </div>
            <div>
              <label style={labelStyle}>Reorder Quantity *</label>
              <input type='number' min={1} value={form.reorderQty}
                onChange={e => setForm(f => ({ ...f, reorderQty: e.target.value }))} style={inputStyle} />
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Number of units to order in the auto-generated PO</div>
            </div>
          </div>

          {/* Row 7: Auto PO toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
              <input type='checkbox' id='autoPOEnabled' checked={form.autoPOEnabled}
                onChange={e => setForm(f => ({ ...f, autoPOEnabled: e.target.checked }))} />
              <label htmlFor='autoPOEnabled' style={{ fontSize: 13, color: C.text, cursor: 'pointer' }}>
                Auto PO Enabled
              </label>
            </div>
          </div>

          {/* Preview */}
          {form.productId && form.lowStockThreshold && form.reorderQty && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14,
              background: C.tealBg, border: `1px solid ${C.teal}33`, fontSize: 12, color: C.tealLight,
            }}>
              📋 <strong>Preview:</strong> When <em>{form.productName || `Product #${form.productId}`}</em> stock
              drops below <strong>{form.lowStockThreshold}</strong> units,
              system will automatically create a DRAFT PO for <strong>{form.reorderQty} units</strong>.
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Stock drops', 'Threshold hit', 'Auto PO created', 'Backend fetches latest cost price from Pricing table', 'PO auto-filled'].map((step, idx, arr) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{idx < arr.length - 1 ? '↓' : '✅'}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              {currentStock !== null && (
                <div style={{ marginTop: 6 }}>
                  Current stock: <strong>{currentStock}</strong> units
                  {currentStock < Number(form.lowStockThreshold)
                    ? <span style={{ color: C.red, marginLeft: 6 }}>🚨 Already below threshold! PO will trigger immediately.</span>
                    : <span style={{ color: C.green, marginLeft: 6 }}>✅ Stock OK for now.</span>
                  }
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={btnStyle(C.textMuted)}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ ...btnStyle(C.teal), opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ Saving...' : '✅ Save Threshold'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create PO Modal ──────────────────────────────────────────────────────────
function CreatePOModal({ onClose, onCreated }) {
  // Use API Gateway to avoid CORS issues
  const PRODUCTS_API = 'http://localhost:9999/api/auth/admin';

  const [suppliers, setSuppliers]   = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts]     = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState('');

  const [form, setForm] = useState({
    supplierId:       '',
    warehouseId:      '',
    expectedDate:     '',
    poDate:           new Date().toISOString().split('T')[0], // today
    notes:            '',
    termsAndConditions: '',
    creditTerms:      'NET_30',
    currency:         'INR',
    shipToAddress:    '',
    receiveMaterials: true,
  });

  // PO lines — each line = one product
  const [lines, setLines] = useState([
    { productId: '', productName: '', sku: '', qtyOrdered: 1, unitPrice: '' },
  ]);

  // Load suppliers + warehouses + products on mount
  useEffect(() => {
    // ✅ Warehouse endpoints वापरतो — warehouse token ला admin path access नाही
    // /api/warehouse/products  → warehouse-service → products-service proxy
    // /api/warehouse/suppliers → warehouse-service → products-service proxy
    // /api/warehouse/warehouses → warehouse-service directly

    fetch(`${API}/suppliers`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => setSuppliers([]));

    fetch(`${API}/warehouses`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setWarehouses(Array.isArray(data) ? data : []))
      .catch(() => setWarehouses([]));

    fetch(`${API}/products`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, []);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setLine = (i, k, v) => {
    setLines(ls => {
      const copy = [...ls];
      copy[i] = { ...copy[i], [k]: v };
      // Auto-fill product details when product selected
      if (k === 'productId') {
        const prod = products.find(p => String(p.productId || p.id) === String(v));
        if (prod) {
          copy[i].productName = prod.name || prod.productName || '';
          copy[i].sku = prod.sku || prod.productBarcode || '';
          copy[i].categoryName = prod.categoryName || '';
          copy[i].subcategoryName = prod.subcategoryName || '';
          // Optionally pre-fill unit price if available
          if (prod.buyPrice || prod.price) {
            copy[i].unitPrice = prod.buyPrice || prod.price || '';
          }
        }
      }
      return copy;
    });
  };

  const addLine    = () => setLines(ls => [...ls, { productId: '', productName: '', sku: '', qtyOrdered: 1, unitPrice: '' }]);
  const removeLine = (i) => setLines(ls => ls.filter((_, idx) => idx !== i));

  const submit = async () => {
    setErr('');
    if (!form.supplierId)    return setErr('Please select a supplier');
    if (!form.expectedDate)  return setErr('Please enter expected delivery date');
    if (lines.some(l => !l.productId || !l.unitPrice || l.qtyOrdered < 1))
      return setErr('Please fill product, qty and unit price for all lines');

    const payload = {
      supplierId:         Number(form.supplierId),
      warehouseId:        Number(form.warehouseId),
      expectedDate:       form.expectedDate,
      poDate:             form.poDate,
      notes:              form.notes,
      termsAndConditions: form.termsAndConditions,
      creditTerms:        form.creditTerms,
      currency:           form.currency,
      shipToAddress:      form.shipToAddress,
      receiveMaterials:   form.receiveMaterials,
      lines: lines.map(l => ({
        productId:   Number(l.productId),
        productName: l.productName,
        sku:         l.sku,
        qtyOrdered:  Number(l.qtyOrdered),
        unitPrice:   Number(l.unitPrice),
        notes:       '',
      })),
    };

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/purchase-orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();

        // ── Sync each line's unitPrice → Admin Pricing table (background) ──────
        const PRICING_BASE = 'http://localhost:9999/api/products';
        const authToken = sessionStorage.getItem('adminToken')
          || localStorage.getItem('authToken')
          || localStorage.getItem('token')
          || sessionStorage.getItem('warehouseAuthToken')
          || sessionStorage.getItem('warehouseToken');
        const pricingHeaders = {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': 'Bearer ' + authToken }),
        };

        // ── Pricing formula constants (same as PurchaseOrders.js) ────────────
        const PKG     = 50;    // ₹50  packaging
        const SHIP    = 80;    // ₹80  estimated shipping
        const PROFIT  = 500;   // ₹500 business margin
        const GST     = 18;    // 18%  GST
        const MRP_BUF = 1.20;  // 20% buffer above selling price

        for (const l of lines) {
          const pid       = Number(l.productId);
          const costPrice = Number(l.unitPrice);
          if (!pid || costPrice <= 0) continue;

          // Full formula: costPrice + packaging + shipping + profit + GST(on costPrice)
          const gstAmt      = costPrice * GST / 100;
          const sellingPrice = parseFloat((costPrice + PKG + SHIP + PROFIT + gstAmt).toFixed(2));
          // MRP = sellingPrice × 1.20, rounded UP to nearest ₹100
          const mrp         = parseFloat((Math.ceil(sellingPrice * MRP_BUF / 100) * 100).toFixed(2));
          const discount    = parseFloat(((mrp - sellingPrice) / mrp * 100).toFixed(2));

          try {
            const checkRes = await fetch(`${PRICING_BASE}/priceByProductId/${pid}`, { headers: pricingHeaders });
            const existing = checkRes.ok ? await checkRes.json().catch(() => null) : null;

            const payload = {
              productId:     pid,
              costPrice,
              sellingPrice,
              mrp,
              discount,
              packagingCost: PKG,
              shippingCost:  SHIP,
              profitMargin:  PROFIT,
              gstRate:       GST,
            };

            if (existing && existing.productId) {
              await fetch(`${PRICING_BASE}/updatePrice/${pid}`, {
                method: 'PUT', headers: pricingHeaders,
                body: JSON.stringify(payload),
              });
            } else {
              await fetch(`${PRICING_BASE}/addPrice`, {
                method: 'POST', headers: pricingHeaders,
                body: JSON.stringify(payload),
              });
            }
            console.log(`✅ Pricing synced for product ${pid}: costPrice=₹${costPrice} → selling=₹${sellingPrice} MRP=₹${mrp} discount=${discount}%`);
          } catch (e) {
            console.warn(`⚠️ Could not sync pricing for product ${pid}:`, e.message);
            // Queue for later — Admin Pricing.js will pick this up
            const pending = JSON.parse(localStorage.getItem('pendingPricingUpdates') || '[]');
            pending.push({ productId: pid, costPrice, sellingPrice, mrp, updatedAt: new Date().toISOString() });
            localStorage.setItem('pendingPricingUpdates', JSON.stringify(pending));
          }
        }
        // Clear product cache so customer-facing pages pick up new prices
        // Also set localStorage key so Admin Pricing tab refreshes (cross-tab)
        localStorage.setItem('pricingLastUpdated', new Date().toISOString());
        window.dispatchEvent(new CustomEvent('pricingUpdated', { detail: { source: 'createPO' } }));

        // 🔔 Notify admin — pricing updated for products in this PO
        // lines state मधून directly घेतो — payload.lines नाही
        const pricedLines = lines.filter(l => l.productId && parseFloat(l.unitPrice) > 0);
        console.log('🔔 pricedLines for notification:', pricedLines.length, pricedLines);
        if (pricedLines.length > 0) {
          for (const l of pricedLines) {
            const pid       = Number(l.productId);
            const costPrice = parseFloat(l.unitPrice);
            const gstAmt    = costPrice * GST / 100;
            const sp        = parseFloat((costPrice + PKG + SHIP + PROFIT + gstAmt).toFixed(2));
            const m         = parseFloat((Math.ceil(sp * MRP_BUF / 100) * 100).toFixed(2));
            const disc      = parseFloat(((m - sp) / m * 100).toFixed(2));
            const pName     = l.productName || `Product #${pid}`;
            console.log(`🔔 Pushing PRICING_UPDATED notification for ${pName}: selling=₹${sp} MRP=₹${m}`);
            // pushNotification — extra fields pass करू नका, store internally generate करतो
            pushNotification({
              type:    'PRICING_UPDATED',
              title:   `🔄 Pricing Updated: ${pName}`,
              message: `PO ${created.poNumber || 'New PO'} → Selling ₹${sp} | MRP ₹${m} | ${disc}% OFF`,
              source:  'SYSTEM',
            });
          }
        } else {
          console.warn('⚠️ No pricedLines found — lines:', lines);
        }

        // 🔔 Notify admin + warehouse — PO created
        notifyPOCreated(
          created.poNumber || 'New PO',
          created.supplierName || form.supplierId
        );
        onCreated();
        onClose();
      } else {
        const body = await res.json().catch(() => ({}));
        setErr(body.message || `Error ${res.status}`);
      }
    } catch (e) {
      setErr('Server error: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: C.tealBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={18} color={C.teal} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Create Purchase Order</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Order goods from supplier</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {err && (
            <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: C.redBg, color: C.red, border: `1px solid ${C.red}33` }}>
              ❌ {err}
            </div>
          )}

          {/* Row 1: Supplier + Warehouse */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Supplier *</label>
              <select value={form.supplierId} onChange={e => setField('supplierId', e.target.value)} style={inputStyle}>
                <option value=''>-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.supplierId} value={s.supplierId}>
                    {s.name} — {s.company}
                  </option>
                ))}
              </select>
              {form.supplierId && (() => {
                const supplier = suppliers.find(s => String(s.supplierId) === String(form.supplierId));
                return supplier ? (
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                    📞 {supplier.phone} {supplier.email ? `• ✉️ ${supplier.email}` : ''}
                    {supplier.category ? ` • 🏷️ ${supplier.category}` : ''}
                  </div>
                ) : null;
              })()}
            </div>
            <div>
              <label style={labelStyle}>Ship To (Warehouse) *</label>
              <select value={form.warehouseId} onChange={e => {
                const w = warehouses.find(x => String(x.warehouseId || x.id) === e.target.value);
                setField('warehouseId', e.target.value);
                // Auto-fill shipToAddress from warehouse name + city
                if (w) setField('shipToAddress', `${w.warehouseName || w.name}${w.city ? ', ' + w.city : ''}`);
              }} style={inputStyle}>
                <option value=''>-- Select Warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.warehouseId || w.id} value={w.warehouseId || w.id}>
                    {w.warehouseName || w.name} — {w.city || w.location || ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: PO Date + Expected Delivery Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>PO Date *</label>
              <input type='date' value={form.poDate}
                onChange={e => setField('poDate', e.target.value)} style={inputStyle} />
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Official date when PO is created</div>
            </div>
            <div>
              <label style={labelStyle}>Expected Delivery Date *</label>
              <input type='date' value={form.expectedDate}
                onChange={e => setField('expectedDate', e.target.value)} style={inputStyle}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} />
            </div>
          </div>

          {/* Row 3: Credit Terms + Currency + Receive Materials */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Credit Terms</label>
              <select value={form.creditTerms} onChange={e => setField('creditTerms', e.target.value)} style={inputStyle}>
                <option value='IMMEDIATE'>Immediate (Cash)</option>
                <option value='NET_15'>Net 15 Days</option>
                <option value='NET_30'>Net 30 Days</option>
                <option value='NET_45'>Net 45 Days</option>
                <option value='NET_60'>Net 60 Days</option>
              </select>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Number of days before payment is due</div>
            </div>
            <div>
              <label style={labelStyle}>PO Currency</label>
              <select value={form.currency} onChange={e => setField('currency', e.target.value)} style={inputStyle}>
                <option value='INR'>INR — Indian Rupee</option>
                <option value='USD'>USD — US Dollar</option>
                <option value='EUR'>EUR — Euro</option>
                <option value='GBP'>GBP — British Pound</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Receive Materials</label>
              <select value={form.receiveMaterials ? 'Y' : 'N'}
                onChange={e => setField('receiveMaterials', e.target.value === 'Y')} style={inputStyle}>
                <option value='Y'>Y — Warehouse receives directly</option>
                <option value='N'>N — Third-party receiving</option>
              </select>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Will warehouse receive goods directly?</div>
            </div>
          </div>

          {/* Row 4: Ship To Address + Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Ship To Address</label>
              <input type='text' value={form.shipToAddress}
                onChange={e => setField('shipToAddress', e.target.value)} style={inputStyle}
                placeholder='e.g. Bangalore Warehouse, Pune DC' />
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Auto-filled when warehouse is selected</div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <NotesDropdown
                value={form.notes}
                onChange={v => setField('notes', v)}
              />
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Click ▾ to pick a ready-made note</div>
            </div>
          </div>

          {/* PO Lines */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Order Lines *</label>
              <button onClick={addLine} style={{ ...btnStyle(C.teal, true), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Plus size={12} /> Add Line
              </button>
            </div>

            {lines.map((line, i) => (
              <div key={i} style={{
                background: C.dark, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '14px', marginBottom: 10,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                  {/* Product */}
                  <div>
                    <label style={labelStyle}>Product *</label>
                    <select value={line.productId} onChange={e => setLine(i, 'productId', e.target.value)} style={inputStyle}>
                      <option value=''>-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.productId || p.id} value={p.productId || p.id}>
                          {p.name || p.productName} {p.categoryName ? `— ${p.categoryName}` : ''} {p.subcategoryName ? `(${p.subcategoryName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Qty */}
                  <div>
                    <label style={labelStyle}>Qty *</label>
                    <input type='number' value={line.qtyOrdered} min={1}
                      onChange={e => setLine(i, 'qtyOrdered', e.target.value)} style={inputStyle} />
                  </div>
                  {/* Unit Price */}
                  <div>
                    <label style={labelStyle}>Unit Price (₹) *</label>
                    <input type='number' value={line.unitPrice} min={0.01} step='0.01'
                      onChange={e => setLine(i, 'unitPrice', e.target.value)} style={inputStyle} placeholder='0.00' />
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
                      Supplier decided rate on call
                    </div>
                  </div>
                  {/* Remove */}
                  <button onClick={() => removeLine(i)} disabled={lines.length === 1}
                    style={{ ...btnStyle(C.red, true), opacity: lines.length === 1 ? 0.3 : 1, alignSelf: 'flex-end' }}>
                    <XCircle size={14} />
                  </button>
                </div>
                {/* Product details auto-filled */}
                {(line.sku || line.categoryName) && (
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, display: 'flex', gap: 12 }}>
                    {line.sku && <span>📦 SKU: {line.sku}</span>}
                    {line.categoryName && <span>🏷️ Category: {line.categoryName}</span>}
                    {line.subcategoryName && <span>→ {line.subcategoryName}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Total preview */}
          <div style={{
            background: C.tealBg, border: `1px solid ${C.teal}33`, borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.tealLight }}>Estimated Total</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.teal }}>
              ₹{lines.reduce((s, l) => s + (Number(l.qtyOrdered) * Number(l.unitPrice || 0)), 0).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={btnStyle(C.textMuted)}>Cancel</button>
            <button onClick={submit} disabled={submitting} style={{ ...btnStyle(C.teal), opacity: submitting ? 0.7 : 1 }}>
              {submitting ? '⏳ Creating...' : '✅ Create Purchase Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Purchase Orders Tab ──────────────────────────────────────────────────────
function PurchaseOrdersTab({ userRole = 'WAREHOUSE_MANAGER' }) {
  const [pos, setPos]         = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState('APPROVED');
  const [expanded, setExpanded] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg]         = useState('');
  const [viewDetailsModal, setViewDetailsModal] = useState(null);

  // ── Auto PO state ──────────────────────────────────────────────────────────
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholds, setThresholds]   = useState([]);
  const [thresholdLoading, setThresholdLoading] = useState(false);
  const [triggerMsg, setTriggerMsg]   = useState('');
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [showAutoPOSection, setShowAutoPOSection] = useState(false);
  const [syncPricingLoading, setSyncPricingLoading] = useState(false);

  // Load thresholds
  const loadThresholds = useCallback(async () => {
    setThresholdLoading(true);
    try {
      const res = await fetch(`${API}/auto-po/thresholds`, { headers: getHeaders() });
      if (res.ok) setThresholds(await res.json());
    } catch { /* ignore */ }
    finally { setThresholdLoading(false); }
  }, []);

  // Manual trigger — system ला आत्ता stock check करायला सांगा
  const triggerAutoPO = async () => {
    setTriggerLoading(true);
    setTriggerMsg('');
    try {
      const res = await fetch(`${API}/auto-po/trigger`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      setTriggerMsg(data.message || '✅ Auto PO check completed');
      load(); // PO list refresh करा
    } catch {
      setTriggerMsg('❌ Trigger failed');
    } finally {
      setTriggerLoading(false);
    }
  };

  // What this role can do
  const canDo = (action) => (PO_ROLE_ACTIONS[userRole] || PO_ROLE_ACTIONS['WAREHOUSE_MANAGER']).includes(action);

  // Sync Pricing from Thresholds — existing thresholds madhe missing pricing entries create karto
  const syncPricingFromThresholds = async () => {
    setSyncPricingLoading(true);
    setTriggerMsg('');
    try {
      const adminToken = sessionStorage.getItem('adminToken') || localStorage.getItem('authToken') || localStorage.getItem('token');
      const warehouseToken = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');
      const authToken = adminToken || warehouseToken;

      // Load all thresholds
      const threshList = thresholds.length > 0 ? thresholds : await (async () => {
        const r = await fetch(API + '/auto-po/thresholds', { headers: getHeaders() });
        return r.ok ? await r.json() : [];
      })();

      if (!threshList.length) {
        setTriggerMsg('No thresholds configured yet');
        setSyncPricingLoading(false);
        return;
      }

      const PRICING_BASE = 'http://localhost:9999/api/products';
      const pricingHeaders = {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': 'Bearer ' + authToken }),
      };

      let created = 0, updated = 0, skipped = 0;

      for (const t of threshList) {
        const pid = Number(t.productId);
        const unitPrice = Number(t.unitPrice || 0);
        if (!pid || unitPrice <= 0) { skipped++; continue; }

        const sellingPrice = parseFloat((unitPrice * 1.18).toFixed(2));
        const mrp = sellingPrice;

        try {
          const checkRes = await fetch(PRICING_BASE + '/priceByProductId/' + pid, { headers: pricingHeaders });
          const existing = checkRes.ok ? await checkRes.json().catch(() => null) : null;

          if (existing && existing.productId) {
            if (!existing.costPrice || Number(existing.costPrice) === 0) {
              await fetch(PRICING_BASE + '/updatePrice/' + pid, {
                method: 'PUT', headers: pricingHeaders,
                body: JSON.stringify({
                  productId: pid,
                  mrp: existing.mrp || mrp,
                  costPrice: unitPrice,
                  sellingPrice: existing.sellingPrice || sellingPrice,
                  gstRate: existing.gstRate || 18,
                }),
              });
              updated++;
            } else {
              skipped++;
            }
          } else {
            const addRes = await fetch(PRICING_BASE + '/addPrice', {
              method: 'POST', headers: pricingHeaders,
              body: JSON.stringify({ productId: pid, costPrice: unitPrice, sellingPrice, mrp, gstRate: 18 }),
            });
            if (addRes.ok) created++;
            else skipped++;
          }
        } catch (e) {
          console.warn('Sync pricing error for product', pid, e.message);
          skipped++;
        }
      }

      setTriggerMsg('Pricing Sync Done — Created: ' + created + ', Updated: ' + updated + ', Skipped: ' + skipped);
      window.dispatchEvent(new CustomEvent('pricingUpdated', { detail: { source: 'syncButton', created, updated } }));
    } catch (e) {
      setTriggerMsg('Sync failed: ' + e.message);
    } finally {
      setSyncPricingLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/purchase-orders/status/${status}`, { headers: getHeaders() });
      if (res.ok) setPos(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (poId, action) => {
    setActionLoading(poId + action);
    setMsg('');
    try {
      const res = await fetch(`${API}/purchase-orders/${poId}/${action}`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (res.ok) {
        const updated = await res.json().catch(() => ({}));
        setMsg(`✅ PO #${poId} ${action}d successfully`);
        if (action === 'approve') {
          notifyPOApproved(
            updated.poNumber || `PO #${poId}`,
            updated.supplierName || ''
          );
        }
        load();
      } else {
        setMsg(`❌ Action failed`);
      }
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  const statusTabs = ['DRAFT', 'APPROVED', 'RECEIVING', 'CLOSED', 'CANCELLED'];

  // ── Create PO modal state ──────────────────────────────────────────────────
  const [showCreatePO, setShowCreatePO] = useState(false);

  // Role info config
  const ROLE_INFO = {
    WAREHOUSE_MANAGER: {
      color: C.teal, bg: C.tealBg,
      icon: '👔',
      text: 'WAREHOUSE MANAGER — Create POs (DRAFT), View all POs, Cancel if needed. PO Approval is done by Admin/Finance.',
    },
    RECEIVING: {
      color: C.amber, bg: C.amberBg,
      icon: '📦',
      text: 'RECEIVING CLERK — View APPROVED POs and click "Receive Goods (GRN)" to receive incoming stock.',
    },
    AUDITOR: {
      color: '#7c3aed', bg: 'rgba(124,58,237,0.08)',
      icon: '🔍',
      text: 'AUDITOR — Read-only access. View POs and audit records.',
    },
    VIEWER: {
      color: C.textMuted, bg: '#f8fafc',
      icon: '👁',
      text: 'VIEWER — Read-only access.',
    },
  };
  const roleInfo = ROLE_INFO[userRole] || ROLE_INFO['WAREHOUSE_MANAGER'];

  return (
    <div>
      {/* Role info banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 10, marginBottom: 14,
        background: roleInfo.bg, border: `1px solid ${roleInfo.color}33`,
        fontSize: 12, color: roleInfo.color, fontWeight: 500,
      }}>
        <span style={{ fontSize: 18 }}>{roleInfo.icon}</span>
        {roleInfo.text}
      </div>

      {/* ── 🤖 Auto PO Section ─────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
      }}>
        {/* Header — click to expand/collapse */}
        <div
          onClick={() => { setShowAutoPOSection(s => !s); if (!showAutoPOSection) loadThresholds(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', cursor: 'pointer',
            background: showAutoPOSection ? 'rgba(13,148,136,0.04)' : '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: C.tealBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
                Auto PO — Low Stock Detection
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                When stock drops below threshold, system automatically creates a DRAFT PO
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {thresholds.length > 0 && (
              <span style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                background: C.tealBg, color: C.teal,
              }}>{thresholds.filter(t => t.autoPOEnabled).length} active</span>
            )}
            <span style={{ color: C.textMuted, fontSize: 18 }}>
              {showAutoPOSection ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {/* Expanded content */}
        {showAutoPOSection && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 18px' }}>

            {/* How it works */}
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14,
              background: 'rgba(13,148,136,0.05)', border: `1px solid ${C.teal}22`,
              fontSize: 12, color: C.tealLight,
            }}>
              💡 <strong>How it works:</strong> Every hour, system checks stock levels.
              If stock &lt; threshold → DRAFT PO is automatically created.
              Manager approves → Order is sent to supplier.
            </div>

            {/* Manual trigger button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <button
                onClick={triggerAutoPO}
                disabled={triggerLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px',
                  background: C.teal, color: '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: triggerLoading ? 'not-allowed' : 'pointer',
                  opacity: triggerLoading ? 0.7 : 1,
                }}
              >
                {triggerLoading ? '⏳ Checking...' : '▶ Run Stock Check Now'}
              </button>
              <button
                onClick={() => { setShowThresholdModal(true); loadThresholds(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px',
                  background: C.tealBg, color: C.tealLight,
                  border: `1px solid ${C.teal}44`, borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ⚙️ Manage Thresholds
              </button>
              {/* Sync Pricing button removed — pricing is now synced automatically when PO is created */}
            </div>

            {triggerMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13,
                background: triggerMsg.includes('✅') ? C.greenBg : C.amberBg,
                color: triggerMsg.includes('✅') ? C.green : C.amber,
                border: `1px solid ${triggerMsg.includes('✅') ? C.green : C.amber}33`,
              }}>{triggerMsg}</div>
            )}

            {/* Thresholds list */}
            {thresholdLoading && (
              <div style={{ color: C.textMuted, fontSize: 13, padding: '8px 0' }}>Loading thresholds...</div>
            )}
            {!thresholdLoading && thresholds.length === 0 && (
              <div style={{
                padding: '16px', borderRadius: 8, textAlign: 'center',
                background: '#f8fafc', border: `1px dashed ${C.border}`,
                fontSize: 13, color: C.textMuted,
              }}>
                No thresholds configured yet.
                Click <strong>"⚙️ Manage Thresholds"</strong> to add products.
              </div>
            )}
            {!thresholdLoading && thresholds.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {thresholds.map(t => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8,
                    background: t.autoPOEnabled ? C.tealBg : '#f8fafc',
                    border: `1px solid ${t.autoPOEnabled ? C.teal + '33' : C.border}`,
                    flexWrap: 'wrap', gap: 8,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>
                        {t.productName || `Product #${t.productId}`}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                        Threshold: <strong>{t.lowStockThreshold}</strong> units &nbsp;·&nbsp;
                        Reorder: <strong>{t.reorderQty}</strong> units &nbsp;·&nbsp;
                        Supplier: #{t.defaultSupplierId || '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {t.lastAutoPOCreatedAt && (
                        <span style={{ fontSize: 10, color: C.textMuted }}>
                          Last PO: {new Date(t.lastAutoPOCreatedAt).toLocaleDateString('en-IN')}
                        </span>
                      )}
                      <span style={{
                        padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: t.autoPOEnabled ? C.greenBg : C.redBg,
                        color: t.autoPOEnabled ? C.green : C.red,
                      }}>
                        {t.autoPOEnabled ? '● Active' : '○ Paused'}
                      </span>
                      {/* Toggle button */}
                      <button
                        onClick={async () => {
                          await fetch(`${API}/auto-po/thresholds/${t.id}/toggle`, {
                            method: 'PATCH', headers: getHeaders(),
                          });
                          loadThresholds();
                        }}
                        style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: 'transparent',
                          border: `1px solid ${C.border}`,
                          color: C.textMuted, cursor: 'pointer',
                        }}
                      >
                        {t.autoPOEnabled ? 'Pause' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Threshold Modal ─────────────────────────────────────────────────── */}
      {showThresholdModal && (
        <ThresholdModal
          thresholds={thresholds}
          onClose={() => setShowThresholdModal(false)}
          onSaved={() => { loadThresholds(); setShowThresholdModal(false); }}
        />
      )}

      {/* Top bar: status tabs + Create PO button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {statusTabs.map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${status === s ? C.teal : C.border}`,
              background: status === s ? C.tealBg : 'transparent',
              color: status === s ? C.tealLight : C.textMuted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              {s}
              {s === 'DRAFT' && (
                <span style={{
                  marginLeft: 5, padding: '1px 5px', borderRadius: 8,
                  background: C.amber, color: '#fff', fontSize: 10, fontWeight: 700,
                }}>NEW</span>
              )}
            </button>
          ))}
        </div>
        {/* Create PO button — Warehouse Manager can create DRAFT POs */}
        <button
          onClick={() => setShowCreatePO(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: C.teal, color: '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(13,148,136,0.25)',
          }}
        >
          <Plus size={14} /> Create Purchase Order
        </button>
      </div>

      {/* Create PO Modal */}
      {showCreatePO && (
        <CreatePOModal
          onClose={() => setShowCreatePO(false)}
          onCreated={() => { setShowCreatePO(false); setStatus('DRAFT'); load(); }}
        />
      )}

      <SectionHeader title={`Purchase Orders — ${status}`} onRefresh={load} loading={loading} />

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
          background: msg.startsWith('✅') ? C.greenBg : C.redBg,
          color: msg.startsWith('✅') ? C.green : C.red,
          border: `1px solid ${msg.startsWith('✅') ? C.green : C.red}33`,
        }}>{msg}</div>
      )}

      {loading && <div style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>Loading…</div>}

      {!loading && pos.length === 0 && (
        <div style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>
          No purchase orders with status <strong style={{ color: C.text }}>{status}</strong>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pos.map(po => (
          <div key={po.id} style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {/* PO Header row */}
            <div
              onClick={() => setExpanded(expanded === po.id ? null : po.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: C.tealBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ClipboardList size={16} color={C.teal} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                    PO #{po.poNumber || po.id}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    {/* supplierName comes from products-service via warehouse-service enrichment */}
                    🏭 {po.supplierName || `Supplier #${po.supplierId}`}
                    {po.supplierCompany ? ` — ${po.supplierCompany}` : ''}
                    &nbsp;·&nbsp; {fmtDate(po.createdAt)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge status={po.status} />
                {expanded === po.id ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === po.id && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 18px' }}>
                {/* Lines */}
                {po.lines && po.lines.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Order Lines
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {po.lines.map((line, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px',
                          background: C.bg,
                          borderRadius: 8,
                          fontSize: 13,
                          color: C.text,
                          border: `1px solid ${C.border}`,
                        }}>
                          <span style={{ fontWeight: 600 }}>
                            {line.productName && line.productName !== `Product #${line.productId}`
                              ? line.productName
                              : `Product #${line.productId}`}
                            {line.sku ? <span style={{ color: C.textMuted, fontWeight: 400 }}> · {line.sku}</span> : null}
                          </span>
                          <span style={{ color: C.textMuted }}>
                            Ordered: <strong style={{ color: C.text }}>{line.qtyOrdered}</strong>
                            &nbsp;|&nbsp;
                            Received: <strong style={{ color: line.qtyReceived >= line.qtyOrdered ? C.green : C.amber }}>{line.qtyReceived ?? 0}</strong>
                          </span>
                          <span style={{ color: C.tealLight, fontWeight: 600 }}>₹{Number(line.unitPrice).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                    {/* Total */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, fontSize: 13, color: C.textMuted }}>
                      Total: <strong style={{ color: C.tealLight, marginLeft: 6 }}>₹{Number(po.totalAmount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {/* View Details — always visible */}
                  <button
                    onClick={() => setViewDetailsModal(po)}
                    style={btnStyle(C.blue)}
                  >
                    <Eye size={14} /> View Details
                  </button>

                  {/* Receive Goods — APPROVED POs only, roles with 'receive' permission (NOT WAREHOUSE_MANAGER) */}
                  {po.status === 'APPROVED' && canDo('receive') && userRole !== 'WAREHOUSE_MANAGER' && (
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('warehouse_open_grn', { detail: { poId: po.id, poNumber: po.poNumber } }));
                      }}
                      style={btnStyle(C.teal)}
                    >
                      <Package size={14} /> Receive Goods (GRN)
                    </button>
                  )}

                  {/* Notify Team — WAREHOUSE_MANAGER only, APPROVED POs */}
                  {po.status === 'APPROVED' && userRole === 'WAREHOUSE_MANAGER' && (
                    <button
                      onClick={async () => {
                        setActionLoading(po.id + 'notify');
                        setMsg('');
                        try {
                          // Backend ला call करा — फक्त Receiving Clerk ला email जाईल
                          const res = await fetch(`${API}/purchase-orders/${po.id}/notify-receiving`, {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({
                              managerNote: `Stock incoming for PO ${po.poNumber}. Please allocate space. Expected: ${po.expectedDate || 'TBD'}`,
                            }),
                          });

                          const data = await res.json().catch(() => ({}));

                          if (res.ok) {
                            // In-app notification — फक्त RECEIVING role साठी tag करतो
                            pushNotification({
                              type:    'RECEIVING_ALERT',
                              title:   `📦 Incoming Stock: ${po.poNumber}`,
                              message: `Stock incoming from ${po.supplierName || 'Supplier'}. Expected: ${po.expectedDate || 'TBD'}. Please prepare for receiving.`,
                              source:  'WAREHOUSE',
                              forRole: 'RECEIVING',   // फक्त Receiving Clerk साठी
                              poId:    po.id,
                              poNumber: po.poNumber,
                            });
                            setMsg(`✅ Receiving Clerk notified! Email sent to receiving team for PO ${po.poNumber}.`);
                          } else {
                            setMsg(`⚠️ Notification sent (email may have failed: ${data.error || 'unknown error'})`);
                          }
                        } catch {
                          // Network error — तरी in-app notification push करा
                          pushNotification({
                            type:    'RECEIVING_ALERT',
                            title:   `📦 Incoming Stock: ${po.poNumber}`,
                            message: `Stock incoming. Please prepare for receiving.`,
                            source:  'WAREHOUSE',
                            forRole: 'RECEIVING',
                          });
                          setMsg(`⚠️ In-app notified. Email service unreachable.`);
                        } finally {
                          setActionLoading(null);
                        }
                      }}
                      disabled={actionLoading === po.id + 'notify'}
                      style={{
                        ...btnStyle(C.amber),
                        opacity: actionLoading === po.id + 'notify' ? 0.7 : 1,
                      }}
                    >
                      {actionLoading === po.id + 'notify' ? '⏳ Notifying...' : '📢 Notify Receiving'}
                    </button>
                  )}

                  {/* Approve — DRAFT POs only */}
                  {po.status === 'DRAFT' && (
                    <button
                      onClick={() => doAction(po.id, 'approve')}
                      disabled={actionLoading === po.id + 'approve'}
                      style={{
                        ...btnStyle('#16a34a'),
                        opacity: actionLoading === po.id + 'approve' ? 0.7 : 1,
                      }}
                    >
                      {actionLoading === po.id + 'approve' ? '⏳ Approving...' : '✅ Approve'}
                    </button>
                  )}

                  {/* Cancel — DRAFT or APPROVED */}
                  {(po.status === 'DRAFT' || po.status === 'APPROVED') && canDo('cancel') && (
                    <button
                      onClick={() => doAction(po.id, 'cancel')}
                      disabled={actionLoading === po.id + 'cancel'}
                      style={btnStyle(C.red)}
                    >
                      <XCircle size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ✅ Professional View Details Modal */}
      {viewDetailsModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          backdropFilter: 'blur(4px)',
        }} onClick={() => setViewDetailsModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600,
            maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
              position: 'sticky', top: 0, background: '#fff', zIndex: 1,
              borderTopLeftRadius: 16, borderTopRightRadius: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 40, height: 40, borderRadius: 10, 
                  background: C.blueBg, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <Eye size={20} color={C.blue} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17, color: C.text }}>
                    Purchase Order Details
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    PO #{viewDetailsModal.poNumber || viewDetailsModal.id}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewDetailsModal(null)} style={{ 
                background: 'none', border: 'none', cursor: 'pointer', 
                color: C.textMuted, fontSize: 24, lineHeight: 1,
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = C.redBg; e.currentTarget.style.color = C.red; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textMuted; }}
              >×</button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Status Badge */}
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>Status:</span>
                <Badge status={viewDetailsModal.status} />
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
                {/* Supplier */}
                <div style={{ 
                  padding: '14px 16px', 
                  background: C.dark, 
                  border: `1px solid ${C.border}`, 
                  borderRadius: 10 
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🏭 Supplier
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    {viewDetailsModal.supplierName || 'N/A'}
                  </div>
                  {viewDetailsModal.supplierCompany && (
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      {viewDetailsModal.supplierCompany}
                    </div>
                  )}
                </div>

                {/* Expected Date */}
                <div style={{ 
                  padding: '14px 16px', 
                  background: C.dark, 
                  border: `1px solid ${C.border}`, 
                  borderRadius: 10 
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📅 Expected Delivery
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    {viewDetailsModal.expectedDate ? new Date(viewDetailsModal.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </div>
                </div>

                {/* Total Amount */}
                <div style={{ 
                  padding: '14px 16px', 
                  background: C.tealBg, 
                  border: `1px solid ${C.teal}33`, 
                  borderRadius: 10 
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.tealLight, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    💰 Total Amount
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.teal }}>
                    ₹{Number(viewDetailsModal.totalAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Notes */}
                {viewDetailsModal.notes && (
                  <div style={{ 
                    padding: '14px 16px', 
                    background: C.dark, 
                    border: `1px solid ${C.border}`, 
                    borderRadius: 10 
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📝 Notes
                    </div>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
                      {viewDetailsModal.notes}
                    </div>
                  </div>
                )}

                {/* Order Lines */}
                {viewDetailsModal.lines && viewDetailsModal.lines.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📦 Order Lines
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {viewDetailsModal.lines.map((line, i) => (
                        <div key={i} style={{
                          padding: '12px 14px',
                          background: C.dark,
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                                {line.productName && line.productName !== `Product #${line.productId}`
                                  ? line.productName
                                  : `Product #${line.productId}`}
                              </div>
                              {line.sku && (
                                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                                  SKU: {line.sku}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.teal, textAlign: 'right' }}>
                              ₹{Number(line.unitPrice).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textMuted }}>
                            <span>Ordered: <strong style={{ color: C.text }}>{line.qtyOrdered}</strong></span>
                            <span>Received: <strong style={{ color: line.qtyReceived >= line.qtyOrdered ? C.green : C.amber }}>{line.qtyReceived ?? 0}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                <button onClick={() => setViewDetailsModal(null)} style={{
                  padding: '10px 24px',
                  background: C.blue,
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.blue; }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create GRN Modal ─────────────────────────────────────────────────────────
// Auto-generate lot number: LOT-YYYYMM-XXXX
const genLotNumber = () => {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LOT-${ym}-${rand}`;
};

// Auto-generate batch number: BATCH-YYYYMMDD-XXXX
const genBatchNumber = () => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(100 + Math.random() * 900);
  return `BATCH-${ymd}-${rand}`;
};

function CreateGRNModal({ onClose, onCreated }) {
  const [approvedPOs, setApprovedPOs] = useState([]);
  const [selectedPO, setSelectedPO]   = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [err, setErr]                 = useState('');
  const [notes, setNotes]             = useState('');
  // existing batches per product for suggestions
  const [existingBatches, setExistingBatches] = useState({});
  // ✅ Product names cache
  const [productNames, setProductNames] = useState({});

  // GRN lines — one per PO line
  const [lines, setLines] = useState([]);

  // Load APPROVED POs on mount
  useEffect(() => {
    fetch(`${API}/purchase-orders/status/APPROVED`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setApprovedPOs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // ✅ Fetch product name by ID
  const fetchProductName = async (productId) => {
    if (!productId || productNames[productId]) return;
    try {
      const token = sessionStorage.getItem('warehouseAuthToken') || localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:9999/api/auth/admin/products/${productId}`, {
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }
      });
      if (res.ok) {
        const product = await res.json();
        setProductNames(prev => ({ ...prev, [productId]: product.name || product.productName || `Product #${productId}` }));
      }
    } catch { 
      setProductNames(prev => ({ ...prev, [productId]: `Product #${productId}` }));
    }
  };

  // Fetch existing batches for a product from products-service
  const fetchBatches = async (productId) => {
    if (!productId || existingBatches[productId]) return;
    try {
      const token = sessionStorage.getItem('warehouseAuthToken') || localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:9999/api/auth/admin/products/${productId}/batches`, {
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }
      });
      if (res.ok) {
        const data = await res.json();
        setExistingBatches(prev => ({ ...prev, [productId]: Array.isArray(data) ? data : [] }));
      }
    } catch { /* ignore — batches are optional */ }
  };

  // When PO selected, pre-fill GRN lines with auto-generated lot/batch numbers
  const handlePOSelect = (poId) => {
    const po = approvedPOs.find(p => String(p.id) === String(poId));
    setSelectedPO(po || null);
    if (po && po.lines) {
      const today = new Date().toISOString().split('T')[0];
      setLines(po.lines.map(l => {
        fetchBatches(l.productId);
        fetchProductName(l.productId); // ✅ Fetch product name
        return {
          poLineId:       l.id,
          productId:      l.productId,
          productName:    l.productName || `Product #${l.productId}`, // Will be updated when fetch completes
          qtyOrdered:     l.qtyOrdered,
          qtyReceived:    l.qtyOrdered,   // default = full qty
          qtyAccepted:    l.qtyOrdered,
          qtyRejected:    0,
          lotNumber:      genLotNumber(),   // ✅ auto-generated
          batchNumber:    genBatchNumber(), // ✅ auto-generated
          expirationDate: '',
          condition:      'GOOD',
          notes:          '',
          receivedDate:   today,
        };
      }));
    } else {
      setLines([]);
    }
  };

  const setLine = (i, k, v) => {
    setLines(ls => {
      const copy = [...ls];
      copy[i] = { ...copy[i], [k]: v };
      // Auto-calc rejected when received/accepted changes
      if (k === 'qtyReceived' || k === 'qtyAccepted') {
        const recv = Number(k === 'qtyReceived' ? v : copy[i].qtyReceived);
        const acc  = Number(k === 'qtyAccepted' ? v : copy[i].qtyAccepted);
        copy[i].qtyRejected = Math.max(0, recv - acc);
      }
      return copy;
    });
  };

  // Regenerate lot/batch for a specific line
  const regenLot = (i) => setLine(i, 'lotNumber', genLotNumber());
  const regenBatch = (i) => setLine(i, 'batchNumber', genBatchNumber());

  const submit = async () => {
    setErr('');
    if (!selectedPO)          return setErr('PO select karo');
    if (lines.length === 0)   return setErr('PO la lines nahi');
    if (lines.some(l => l.qtyReceived < 1)) return setErr('Received qty 0 ashu shakta nahi');
    if (lines.some(l => l.qtyAccepted > l.qtyReceived)) return setErr('Accepted qty > Received qty ashu shakta nahi');

    const payload = {
      poId:        selectedPO.id,
      warehouseId: selectedPO.warehouseId || 1,
      notes,
      lines: lines.map(l => ({
        poLineId:       l.poLineId,
        productId:      l.productId,
        qtyReceived:    Number(l.qtyReceived),
        qtyAccepted:    Number(l.qtyAccepted),
        qtyRejected:    Number(l.qtyRejected),
        lotNumber:      l.lotNumber || null,
        batchNumber:    l.batchNumber || null,
        expirationDate: l.expirationDate || null,
        condition:      l.condition,
        notes:          l.notes || '',
      })),
    };

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/grn`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        // 🔔 Notify admin + warehouse
        notifyGRNCreated(
          created.grnNumber || 'New GRN',
          selectedPO.poNumber || `PO #${selectedPO.id}`
        );
        onCreated();
        onClose();
      } else {
        const body = await res.json().catch(() => ({}));
        setErr(body.message || `Error ${res.status}`);
      }
    } catch (e) {
      setErr('Server error: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const conditionColors = { GOOD: C.green, DAMAGED: C.amber, DEFECTIVE: C.red };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720,
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} color={C.amber} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Create Goods Receipt Note</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Receive goods from supplier against an approved PO</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {err && (
            <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: C.redBg, color: C.red, border: `1px solid ${C.red}33` }}>
              ❌ {err}
            </div>
          )}

          {/* PO Select */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Approved Purchase Order *</label>
            <select
              value={selectedPO?.id || ''}
              onChange={e => handlePOSelect(e.target.value)}
              style={inputStyle}
            >
              <option value=''>-- Select Approved PO --</option>
              {approvedPOs.map(po => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} — {po.supplierName || `Supplier #${po.supplierId}`} — Expected: {po.expectedDate}
                </option>
              ))}
            </select>
            {approvedPOs.length === 0 && (
              <div style={{ fontSize: 12, color: C.amber, marginTop: 6 }}>
                ⚠️ Koi approved PO nahi. Pehle PO create karo ani approve karo.
              </div>
            )}
          </div>

          {/* Notes — dropdown templates + custom */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>📝 Inspection Notes</label>
            {/* Quick template dropdown */}
            <select
              onChange={e => {
                if (e.target.value === 'other') {
                  setNotes('');
                } else if (e.target.value) {
                  setNotes(e.target.value);
                }
              }}
              style={{ 
                ...inputStyle, 
                marginBottom: 10, 
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 13,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              }}
            >
              <option value=''>-- Select a Quick Note Template --</option>
              <optgroup label="✅ Normal Delivery">
                <option value="All items received in good condition.">All items received in good condition.</option>
                <option value="Full quantity received as per PO. No issues.">Full quantity received as per PO. No issues.</option>
                <option value="Items received and verified. Ready for inspection.">Items received and verified. Ready for inspection.</option>
              </optgroup>
              <optgroup label="⚠️ Partial / Short Delivery">
                <option value="Short delivery received. Balance pending from supplier.">Short delivery received. Balance pending from supplier.</option>
                <option value="Partial shipment received. Remaining items to follow.">Partial shipment received. Remaining items to follow.</option>
                <option value="Quantity mismatch found. Supplier informed.">Quantity mismatch found. Supplier informed.</option>
              </optgroup>
              <optgroup label="❌ Damage / Quality Issues">
                <option value="Some items received in damaged condition. Rejection noted.">Some items received in damaged condition. Rejection noted.</option>
                <option value="Packaging damaged during transit. Items inspected.">Packaging damaged during transit. Items inspected.</option>
                <option value="Defective items found. Supplier return initiated.">Defective items found. Supplier return initiated.</option>
              </optgroup>
              <optgroup label="📦 Special Cases">
                <option value="Items received without original packaging.">Items received without original packaging.</option>
                <option value="Cold chain maintained. Temperature verified.">Cold chain maintained. Temperature verified.</option>
                <option value="Fragile items received. Extra care taken during unloading.">Fragile items received. Extra care taken during unloading.</option>
                <option value="Bulk delivery received. Counting in progress.">Bulk delivery received. Counting in progress.</option>
              </optgroup>
              <option value="other">✏️ Other — Custom note लिहा</option>
            </select>
            {/* Editable text area — always visible, pre-filled from dropdown */}
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Type a custom note or select a template above..."
              style={{ 
                ...inputStyle, 
                resize: 'vertical', 
                fontFamily: 'inherit', 
                lineHeight: 1.6,
                fontSize: 13,
                padding: '12px 14px',
                background: '#fff',
                border: `2px solid ${C.border}`,
                transition: 'all 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = C.teal; e.target.style.boxShadow = `0 0 0 3px ${C.tealBg}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
            />
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              💡 <span>Add any special observations, damage reports, or delivery issues here</span>
            </div>
          </div>

          {/* GRN Lines */}
          {selectedPO && lines.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ ...labelStyle, marginBottom: 10 }}>📦 Received Items</label>

              {lines.map((line, i) => (
                <div key={i} style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: `1px solid ${C.border}`, 
                  borderRadius: 12,
                  padding: '18px', 
                  marginBottom: 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { 
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; 
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => { 
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; 
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Product header */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    marginBottom: 14,
                    paddingBottom: 12,
                    borderBottom: `2px solid ${C.border}`,
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>
                        {productNames[line.productId] || line.productName || `Product #${line.productId}`}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>
                        ID: #{line.productId}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, alignItems: 'center' }}>
                      <div style={{
                        padding: '4px 10px',
                        background: C.blueBg,
                        border: `1px solid ${C.blue}33`,
                        borderRadius: 20,
                        color: C.blue,
                        fontWeight: 600,
                      }}>
                        PO Qty: <strong>{line.qtyOrdered}</strong>
                      </div>
                      {line.qtyReceived < line.qtyOrdered && (
                        <span style={{ 
                          padding: '4px 10px',
                          background: C.amberBg,
                          border: `1px solid ${C.amber}33`,
                          borderRadius: 20,
                          color: C.amber,
                          fontWeight: 600,
                        }}>
                          ⚠️ Short: {line.qtyOrdered - line.qtyReceived}
                        </span>
                      )}
                      {line.qtyReceived === line.qtyOrdered && (
                        <span style={{ 
                          padding: '4px 10px',
                          background: C.greenBg,
                          border: `1px solid ${C.green}33`,
                          borderRadius: 20,
                          color: C.green,
                          fontWeight: 600,
                        }}>
                          ✅ Full delivery
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Helper text */}
                  <div style={{ 
                    fontSize: 11, 
                    color: C.teal, 
                    marginBottom: 12, 
                    padding: '8px 12px', 
                    background: C.tealBg, 
                    border: `1px solid ${C.teal}33`,
                    borderRadius: 8,
                    lineHeight: 1.5,
                  }}>
                    💡 <strong>Received Qty</strong> = How many arrived from truck &nbsp;|&nbsp;
                    <strong>Accepted Qty</strong> = How many are in good condition &nbsp;|&nbsp;
                    <strong>Rejected</strong> = Auto calculated
                  </div>

                  {/* Qty row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={labelStyle}>Received Qty *</label>
                      <input type='number' value={line.qtyReceived} min={1} max={line.qtyOrdered}
                        onChange={e => setLine(i, 'qtyReceived', e.target.value)} 
                        style={{
                          ...inputStyle,
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                        placeholder={String(line.qtyOrdered)} />
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Max: {line.qtyOrdered}</div>
                    </div>
                    <div>
                      <label style={labelStyle}>Accepted Qty *</label>
                      <input type='number' value={line.qtyAccepted} min={0} max={line.qtyReceived}
                        onChange={e => setLine(i, 'qtyAccepted', e.target.value)} 
                        style={{
                          ...inputStyle,
                          fontWeight: 600,
                          fontSize: 14,
                          borderColor: C.green,
                        }}
                        placeholder={String(line.qtyReceived)} />
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Reduce if some items are damaged</div>
                    </div>
                    <div>
                      <label style={labelStyle}>Rejected Qty</label>
                      <input type='number' value={line.qtyRejected} readOnly
                        style={{ 
                          ...inputStyle, 
                          background: line.qtyRejected > 0 ? C.redBg : '#f8fafc', 
                          color: line.qtyRejected > 0 ? C.red : C.textMuted,
                          fontWeight: line.qtyRejected > 0 ? 700 : 500,
                          fontSize: 14,
                          cursor: 'not-allowed',
                        }} />
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>Auto = Received − Accepted</div>
                    </div>
                  </div>

                  {/* Condition + Lot + Batch + Expiry */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {/* Condition */}
                    <div>
                      <label style={labelStyle}>Condition *</label>
                      <select value={line.condition} onChange={e => setLine(i, 'condition', e.target.value)}
                        style={{ 
                          ...inputStyle, 
                          color: conditionColors[line.condition] || C.text, 
                          fontWeight: 600,
                          fontSize: 13,
                        }}>
                        <option value='GOOD'>✅ GOOD — All items in perfect condition</option>
                        <option value='DAMAGED'>⚠️ DAMAGED — External packaging damage</option>
                        <option value='DEFECTIVE'>❌ DEFECTIVE — Item not functional</option>
                      </select>
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <label style={labelStyle}>Expiry Date <span style={{ color: C.textMuted, fontWeight: 400 }}>(For Food / Medicine only)</span></label>
                      <input type='date' value={line.expirationDate}
                        onChange={e => setLine(i, 'expirationDate', e.target.value)}
                        style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* Lot Number — auto-generated, editable */}
                    <div>
                      <label style={labelStyle}>
                        Lot Number
                        <span style={{ marginLeft: 6, fontSize: 9, background: C.tealBg, color: C.teal, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>AUTO</span>
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type='text' value={line.lotNumber}
                          onChange={e => setLine(i, 'lotNumber', e.target.value)}
                          style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 12 }}
                          placeholder='LOT-YYYYMM-XXXX' />
                        <button type='button' onClick={() => regenLot(i)}
                          title="Generate new lot number"
                          style={{ padding: '0 10px', background: C.tealBg, border: `1px solid ${C.teal}44`, borderRadius: 8, color: C.teal, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
                          🔄
                        </button>
                      </div>
                      {/* Existing lot suggestions */}
                      {existingBatches[line.productId]?.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>Existing lots:</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {existingBatches[line.productId].slice(0, 4).map((b, bi) => (
                              <button key={bi} type='button'
                                onClick={() => setLine(i, 'lotNumber', b.lotNumber || b.batchNumber)}
                                style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, border: `1px solid ${C.border}`, background: '#f8fafc', color: C.textMuted, cursor: 'pointer', fontFamily: 'monospace' }}>
                                {b.lotNumber || b.batchNumber}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Batch Number — auto-generated, editable */}
                    <div>
                      <label style={labelStyle}>
                        Batch Number
                        <span style={{ marginLeft: 6, fontSize: 9, background: C.tealBg, color: C.teal, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>AUTO</span>
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type='text' value={line.batchNumber}
                          onChange={e => setLine(i, 'batchNumber', e.target.value)}
                          style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 12 }}
                          placeholder='BATCH-YYYYMMDD-XXX' />
                        <button type='button' onClick={() => regenBatch(i)}
                          title="Generate new batch number"
                          style={{ padding: '0 10px', background: C.tealBg, border: `1px solid ${C.teal}44`, borderRadius: 8, color: C.teal, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
                          🔄
                        </button>
                      </div>
                      {existingBatches[line.productId]?.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>Existing batches:</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {existingBatches[line.productId].slice(0, 4).map((b, bi) => (
                              <button key={bi} type='button'
                                onClick={() => setLine(i, 'batchNumber', b.batchNumber || b.lotNumber)}
                                style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, border: `1px solid ${C.border}`, background: '#f8fafc', color: C.textMuted, cursor: 'pointer', fontFamily: 'monospace' }}>
                                {b.batchNumber || b.lotNumber}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div style={{
                background: C.amberBg, border: `1px solid ${C.amber}33`, borderRadius: 10,
                padding: '12px 16px', display: 'flex', gap: 24,
              }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: C.textMuted }}>Total Received: </span>
                  <strong style={{ color: C.text }}>{lines.reduce((s, l) => s + Number(l.qtyReceived), 0)}</strong>
                </div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: C.textMuted }}>Accepted: </span>
                  <strong style={{ color: C.green }}>{lines.reduce((s, l) => s + Number(l.qtyAccepted), 0)}</strong>
                </div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: C.textMuted }}>Rejected: </span>
                  <strong style={{ color: C.red }}>{lines.reduce((s, l) => s + Number(l.qtyRejected), 0)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button onClick={onClose} style={{
              padding: '11px 24px',
              background: '#fff',
              border: `2px solid ${C.border}`,
              borderRadius: 10,
              color: C.textMuted,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { 
                e.currentTarget.style.background = C.redBg; 
                e.currentTarget.style.borderColor = C.red;
                e.currentTarget.style.color = C.red;
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.background = '#fff'; 
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.textMuted;
              }}
            >
              Cancel
            </button>
            <button onClick={submit} disabled={submitting || !selectedPO}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 28px',
                background: (submitting || !selectedPO) ? C.textMuted : C.amber,
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: (submitting || !selectedPO) ? 'not-allowed' : 'pointer',
                opacity: (submitting || !selectedPO) ? 0.6 : 1,
                transition: 'all 0.2s',
                boxShadow: (submitting || !selectedPO) ? 'none' : '0 4px 12px rgba(217,119,6,0.3)',
              }}
              onMouseEnter={e => { 
                if (!submitting && selectedPO) {
                  e.currentTarget.style.background = '#B45309';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(217,119,6,0.4)';
                }
              }}
              onMouseLeave={e => { 
                if (!submitting && selectedPO) {
                  e.currentTarget.style.background = C.amber;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(217,119,6,0.3)';
                }
              }}
            >
              {submitting ? (
                <>
                  <span style={{ 
                    display: 'inline-block', 
                    width: 14, 
                    height: 14, 
                    border: '2px solid #fff', 
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                  Creating GRN...
                </>
              ) : (
                <>
                  <Package size={16} />
                  Create GRN
                </>
              )}
            </button>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

// ─── GRN Tab ──────────────────────────────────────────────────────────────────
function GRNTab({ userRole = 'RECEIVING' }) {
  const [grns, setGrns]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg]         = useState('');
  const [inspectNotes, setInspectNotes] = useState({});
  const [grnFilter, setGrnFilter] = useState('all');
  const [showCreateGRN, setShowCreateGRN] = useState(false);
  // Warehouse locations for putaway dropdown
  const [locations, setLocations] = useState([]);
  // Selected putaway location per line: { [grnId-lineId]: locationId }
  const [putawayLocations, setPutawayLocations] = useState({});
  // ✅ Product names cache: { [productId]: productName }
  const [productNames, setProductNames] = useState({});

  // ✅ REAL FLOW (Amazon style):
  // RECEIVING: Create GRN + Inspect (physically at dock)
  // WAREHOUSE_MANAGER: Only Putaway (decides bin location)
  const canCreateGRN = userRole === 'RECEIVING';
  const canInspect   = userRole === 'RECEIVING';   // ✅ Receiving clerk inspects at dock
  const canPutaway   = userRole === 'WAREHOUSE_MANAGER'; // ✅ Manager does putaway only

  // ✅ Fetch product name by ID
  const fetchProductName = useCallback(async (productId) => {
    if (!productId || productNames[productId]) return;
    try {
      // Use direct products endpoint — no admin auth needed for read
      const res = await fetch(`http://localhost:9999/api/products/getByProductId/${productId}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const product = await res.json();
        setProductNames(prev => ({ ...prev, [productId]: product.name || product.productName || `Product #${productId}` }));
      } else {
        setProductNames(prev => ({ ...prev, [productId]: `Product #${productId}` }));
      }
    } catch { 
      setProductNames(prev => ({ ...prev, [productId]: `Product #${productId}` }));
    }
  }, [productNames]);

  // Load warehouse locations for putaway dropdown
  useEffect(() => {
    fetch(`${API}/warehouses/1/locations`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setLocations(Array.isArray(data) ? data : []))
      .catch(() => {
        // Fallback: try direct warehouse locations endpoint
        fetch(`http://localhost:9999/api/warehouse/warehouses/1/locations`, { headers: getHeaders() })
          .then(r => r.ok ? r.json() : [])
          .then(data => setLocations(Array.isArray(data) ? data : []))
          .catch(() => {});
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Try to get all GRNs — fallback to pending-putaway if no all endpoint
      const url = grnFilter === 'pending'
        ? `${API}/grn/pending-putaway`
        : `${API}/grn`; // All GRNs
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGrns(data);
        // ✅ Fetch product names for all GRN lines
        data.forEach(grn => {
          if (grn.lines) {
            grn.lines.forEach(line => {
              if (line.productId) fetchProductName(line.productId);
            });
          }
        });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [grnFilter, fetchProductName]);

  useEffect(() => { load(); }, [load]);

  const doInspect = async (grnId) => {
    const notes = inspectNotes[grnId] || 'Quality check passed';
    setActionLoading(grnId + 'inspect');
    setMsg('');
    try {
      const res = await fetch(`${API}/grn/${grnId}/inspect?notes=${encodeURIComponent(notes)}`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (res.ok) { setMsg(`✅ GRN #${grnId} inspection completed`); load(); }
      else setMsg('❌ Inspection failed');
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  const doPutaway = async (grnId, lineId, locationId) => {
    setActionLoading(grnId + 'putaway' + lineId);
    setMsg('');
    try {
      const res = await fetch(`${API}/grn/${grnId}/putaway/${lineId}?actualLocationId=${locationId}`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (res.ok) {
        setMsg(`✅ Putaway completed for line #${lineId}`);
        // 🔔 Check if all lines done → notify GRN completed
        const grnRes = await fetch(`${API}/grn/${grnId}`, { headers: getHeaders() });
        if (grnRes.ok) {
          const grn = await grnRes.json();
          const totalAccepted = (grn.lines || []).reduce((s, l) => s + (l.qtyAccepted || 0), 0);
          if (grn.status === 'COMPLETED') {
            // ✅ Notify warehouse bell — GRN completed
            notifyGRNCompleted(grn.grnNumber || `GRN #${grnId}`, totalAccepted);
            // ✅ Notify ADMIN — inventory updated after putaway
            pushNotification({
              type: 'GRN_COMPLETED',
              title: '📦 Inventory Updated',
              message: `Putaway complete for ${grn.grnNumber || `GRN #${grnId}`} — ${totalAccepted} units added to stock. Check Inventory tab.`,
              source: 'WAREHOUSE',
            });
          } else {
            // Partial putaway — still notify progress
            pushNotification({
              type: 'GRN_COMPLETED',
              title: '📍 Putaway In Progress',
              message: `Line #${lineId} putaway done for ${grn.grnNumber || `GRN #${grnId}`}. ${totalAccepted} units placed so far. Inventory has been updated.`,
              source: 'WAREHOUSE',
            });
          }
        }
        load();
      }
      else setMsg('❌ Putaway failed');
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  // ✅ Complete putaway for ALL pending lines in a GRN at once
  const doPutawayAll = async (grn) => {
    const pendingLines = (grn.lines || []).filter(l => !l.putawayCompleted);
    if (pendingLines.length === 0) return;

    setActionLoading(grn.id + 'putawayAll');
    setMsg('');
    let successCount = 0;
    let failCount = 0;

    for (const line of pendingLines) {
      const locId = putawayLocations[`${grn.id}-${line.id}`] || line.suggestedLocationId || 1;
      try {
        const res = await fetch(`${API}/grn/${grn.id}/putaway/${line.id}?actualLocationId=${locId}`, {
          method: 'PUT',
          headers: getHeaders(),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    // 🔔 Notify after all lines processed
    try {
      const grnRes = await fetch(`${API}/grn/${grn.id}`, { headers: getHeaders() });
      if (grnRes.ok) {
        const updatedGrn = await grnRes.json();
        const totalAccepted = (updatedGrn.lines || []).reduce((s, l) => s + (l.qtyAccepted || 0), 0);
        if (updatedGrn.status === 'COMPLETED') {
          notifyGRNCompleted(updatedGrn.grnNumber || `GRN #${grn.id}`, totalAccepted);
          pushNotification({
            type: 'GRN_COMPLETED',
            title: '📦 Inventory Updated',
            message: `All putaway complete for ${updatedGrn.grnNumber || `GRN #${grn.id}`} — ${totalAccepted} units added to stock. Check Inventory tab.`,
            source: 'WAREHOUSE',
          });
        }
      }
    } catch { /* ignore notification errors */ }

    if (failCount === 0) {
      setMsg(`✅ Putaway Done! All ${successCount} line(s) putaway completed — inventory updated.`);
    } else {
      setMsg(`⚠️ ${successCount} line(s) succeeded, ${failCount} failed. Please retry failed lines.`);
    }
    setActionLoading(null);
    load();
  };

  return (
    <div>
      {showCreateGRN && (
        <CreateGRNModal
          onClose={() => setShowCreateGRN(false)}
          onCreated={() => { setGrnFilter('all'); load(); setMsg('✅ GRN created! Status: PENDING — Inspection required.'); }}
        />
      )}

      {/* Role info banner */}
      {userRole === 'WAREHOUSE_MANAGER' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10, marginBottom: 14,
          background: C.tealBg, border: `1px solid ${C.teal}33`,
          fontSize: 12, color: C.teal, fontWeight: 500,
        }}>
          👔 WAREHOUSE MANAGER — View GRNs, complete Putaway to assign bin locations. GRN creation and Inspection is done by the Receiving Clerk.
        </div>
      )}
      {userRole === 'RECEIVING' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10, marginBottom: 14,
          background: C.amberBg, border: `1px solid ${C.amber}33`,
          fontSize: 12, color: C.amber, fontWeight: 500,
        }}>
          📦 RECEIVING CLERK — Create GRN when truck arrives, then Inspect goods at the dock. Putaway will be done by Warehouse Manager.
        </div>
      )}

      {/* Top bar: filter tabs + Create GRN button (RECEIVING only) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'all',     label: 'All GRNs' },
            { key: 'pending', label: 'Pending Putaway' },
          ].map(f => (
            <button key={f.key} onClick={() => setGrnFilter(f.key)} style={{
              padding: '6px 14px', borderRadius: 20,
              border: `1px solid ${grnFilter === f.key ? C.teal : C.border}`,
              background: grnFilter === f.key ? C.tealBg : 'transparent',
              color: grnFilter === f.key ? C.teal : C.textMuted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{f.label}</button>
          ))}
        </div>
        {/* Create GRN — RECEIVING role only */}
        {canCreateGRN && (
          <button onClick={() => setShowCreateGRN(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: C.amber,
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
          }}>
            <Plus size={15} /> Create GRN
          </button>
        )}
      </div>
      <SectionHeader title={grnFilter === 'pending' ? 'GRN — Pending Putaway' : 'All Goods Receipt Notes'} onRefresh={load} loading={loading} />

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
          background: msg.startsWith('✅') ? C.greenBg : C.redBg,
          color: msg.startsWith('✅') ? C.green : C.red,
          border: `1px solid ${msg.startsWith('✅') ? C.green : C.red}33`,
        }}>{msg}</div>
      )}

      {loading && <div style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>Loading…</div>}

      {!loading && grns.length === 0 && (
        <div style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>
          {grnFilter === 'pending' ? '🎉 No pending putaway GRNs' : 'No GRNs found'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {grns.map(grn => (
          <div key={grn.id} style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div
              onClick={() => setExpanded(expanded === grn.id ? null : grn.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: C.amberBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Package size={16} color={C.amber} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                    GRN #{grn.grnNumber || grn.id}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    PO #{grn.poId} &nbsp;·&nbsp; Received: {fmtDate(grn.receivedAt)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge status={grn.status} />
                {expanded === grn.id ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
              </div>
            </div>

            {expanded === grn.id && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 18px' }}>

                {/* ✅ Complete All Putaway button — shown when INSPECTED or PUTAWAY (partial) and has pending lines */}
                {(grn.status === 'INSPECTED' || grn.status === 'PUTAWAY') && canPutaway &&
                  (grn.lines || []).some(l => !l.putawayCompleted) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    marginBottom: 14,
                    background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
                  }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ fontSize: 16, marginRight: 8 }}>📦</span>
                      {(grn.lines || []).filter(l => !l.putawayCompleted).length} line(s) pending putaway
                      — uses suggested locations automatically
                    </div>
                    <button
                      onClick={() => doPutawayAll(grn)}
                      disabled={actionLoading === grn.id + 'putawayAll'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 20px',
                        background: actionLoading === grn.id + 'putawayAll' ? 'rgba(255,255,255,0.3)' : '#fff',
                        border: 'none',
                        borderRadius: 8,
                        color: actionLoading === grn.id + 'putawayAll' ? '#fff' : C.teal,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: actionLoading === grn.id + 'putawayAll' ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                    >
                      <CheckCircle size={15} />
                      {actionLoading === grn.id + 'putawayAll' ? 'Processing all lines…' : '✅ Putaway Done (All Lines)'}
                    </button>
                  </div>
                )}

                {/* GRN Lines */}
                {grn.lines && grn.lines.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📦 Received Items
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {grn.lines.map((line, i) => (
                        <div key={i} style={{
                          padding: '16px',
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                          border: `1px solid ${C.border}`,
                          borderRadius: 12,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s',
                        }}
                          onMouseEnter={e => { 
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; 
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={e => { 
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; 
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {/* Product Name & ID */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: 12,
                            paddingBottom: 12,
                            borderBottom: `1px solid ${C.border}`,
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontSize: 15, 
                                fontWeight: 700, 
                                color: C.text,
                                marginBottom: 4,
                              }}>
                                {productNames[line.productId] || `Product #${line.productId}`}
                              </div>
                              <div style={{ fontSize: 11, color: C.textMuted }}>
                                ID: #{line.productId} {line.lotNumber && `• Lot: ${line.lotNumber}`}
                              </div>
                            </div>
                            {line.putawayCompleted && (
                              <span style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                background: C.greenBg,
                                color: C.green,
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 20,
                                border: `1px solid ${C.green}33`,
                              }}>
                                <CheckCircle size={12} /> Putaway Done
                              </span>
                            )}
                          </div>

                          {/* Quantity Stats */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: 10,
                            marginBottom: line.putawayCompleted ? 0 : 12,
                          }}>
                            {/* Total Qty */}
                            <div style={{
                              padding: '10px 12px',
                              background: C.blueBg,
                              border: `1px solid ${C.blue}33`,
                              borderRadius: 8,
                            }}>
                              <div style={{ fontSize: 10, color: C.blue, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Total Qty
                              </div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: C.blue }}>
                                {line.qtyReceived ?? line.receivedQty ?? 0}
                              </div>
                            </div>

                            {/* Accepted */}
                            <div style={{
                              padding: '10px 12px',
                              background: C.greenBg,
                              border: `1px solid ${C.green}33`,
                              borderRadius: 8,
                            }}>
                              <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                ✅ Accepted
                              </div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>
                                {line.qtyAccepted ?? 0}
                              </div>
                            </div>

                            {/* Rejected (only show if > 0) */}
                            {(line.qtyRejected ?? 0) > 0 && (
                              <div style={{
                                padding: '10px 12px',
                                background: C.redBg,
                                border: `1px solid ${C.red}33`,
                                borderRadius: 8,
                              }}>
                                <div style={{ fontSize: 10, color: C.red, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  ❌ Rejected
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>
                                  {line.qtyRejected}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Putaway Action (only for INSPECTED or PUTAWAY status and WAREHOUSE_MANAGER) */}
                          {(grn.status === 'INSPECTED' || grn.status === 'PUTAWAY') && !line.putawayCompleted && canPutaway && (
                            <div style={{ 
                              display: 'flex', 
                              gap: 8, 
                              alignItems: 'center', 
                              flexWrap: 'wrap',
                              padding: '12px',
                              background: C.tealBg,
                              border: `1px solid ${C.teal}33`,
                              borderRadius: 8,
                            }}>
                              <MapPin size={14} color={C.teal} />
                              <select
                                value={putawayLocations[`${grn.id}-${line.id}`] || line.suggestedLocationId || ''}
                                onChange={e => setPutawayLocations(prev => ({ ...prev, [`${grn.id}-${line.id}`]: e.target.value }))}
                                style={{
                                  flex: 1,
                                  minWidth: 180,
                                  padding: '8px 12px', 
                                  borderRadius: 8, 
                                  fontSize: 13,
                                  fontWeight: 500,
                                  border: `1px solid ${C.border}`, 
                                  color: C.text,
                                  background: '#fff', 
                                  cursor: 'pointer',
                                  outline: 'none',
                                }}
                              >
                                <option value=''>-- Select Location --</option>
                                {/* Suggested location first */}
                                {line.suggestedLocationId && (
                                  <option value={line.suggestedLocationId}>
                                    ⭐ Suggested: Loc #{line.suggestedLocationId}
                                  </option>
                                )}
                                {/* All available locations from backend */}
                                {locations.length > 0
                                  ? locations.map(loc => (
                                      <option key={loc.id} value={loc.id}>
                                        {loc.locationCode} ({loc.area}-{loc.aisle}-{loc.binCode || loc.level})
                                      </option>
                                    ))
                                  : [
                                      // Fallback static options if no locations in DB
                                      { id: 1, code: 'A-01-BIN01' }, { id: 2, code: 'A-01-BIN02' },
                                      { id: 3, code: 'A-02-BIN01' }, { id: 4, code: 'B-01-BIN01' },
                                      { id: 5, code: 'B-02-BIN01' }, { id: 6, code: 'C-01-BIN01' },
                                    ].map(loc => (
                                      <option key={loc.id} value={loc.id}>{loc.code}</option>
                                    ))
                                }
                              </select>
                              <button
                                onClick={() => {
                                  const locId = putawayLocations[`${grn.id}-${line.id}`] || line.suggestedLocationId || 1;
                                  doPutaway(grn.id, line.id, locId);
                                }}
                                disabled={actionLoading === grn.id + 'putaway' + line.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '8px 16px',
                                  background: actionLoading === grn.id + 'putaway' + line.id ? C.textMuted : C.teal,
                                  border: 'none',
                                  borderRadius: 8,
                                  color: '#fff',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  cursor: actionLoading === grn.id + 'putaway' + line.id ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                  opacity: actionLoading === grn.id + 'putaway' + line.id ? 0.6 : 1,
                                }}
                                onMouseEnter={e => { 
                                  if (!actionLoading) e.currentTarget.style.background = C.tealDark; 
                                }}
                                onMouseLeave={e => { 
                                  if (!actionLoading) e.currentTarget.style.background = C.teal; 
                                }}
                              >
                                <MapPin size={14} /> {actionLoading === grn.id + 'putaway' + line.id ? 'Processing...' : 'Complete Putaway'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inspect action - ONLY for WAREHOUSE_MANAGER */}
                {grn.status === 'PENDING' && canInspect && (
                  <div style={{ 
                    padding: '16px',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: `2px solid ${C.teal}`,
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(13,148,136,0.1)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={16} />
                      Quality Inspection Required
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        placeholder="Enter inspection notes (e.g., All items in good condition)..."
                        value={inspectNotes[grn.id] || ''}
                        onChange={e => setInspectNotes(p => ({ ...p, [grn.id]: e.target.value }))}
                        style={{
                          flex: 1, 
                          minWidth: 250,
                          padding: '10px 14px',
                          background: '#fff',
                          border: `2px solid ${C.border}`,
                          borderRadius: 8,
                          color: C.text, 
                          fontSize: 13,
                          outline: 'none',
                          transition: 'all 0.2s',
                        }}
                        onFocus={e => { e.target.style.borderColor = C.teal; e.target.style.boxShadow = `0 0 0 3px ${C.tealBg}`; }}
                        onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
                      />
                      <button
                        onClick={() => doInspect(grn.id)}
                        disabled={actionLoading === grn.id + 'inspect'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 20px',
                          background: actionLoading === grn.id + 'inspect' ? C.textMuted : C.teal,
                          border: 'none',
                          borderRadius: 8,
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: actionLoading === grn.id + 'inspect' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: actionLoading === grn.id + 'inspect' ? 'none' : '0 4px 12px rgba(13,148,136,0.3)',
                        }}
                        onMouseEnter={e => { 
                          if (!actionLoading) {
                            e.currentTarget.style.background = C.tealDark;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(13,148,136,0.4)';
                          }
                        }}
                        onMouseLeave={e => { 
                          if (!actionLoading) {
                            e.currentTarget.style.background = C.teal;
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,148,136,0.3)';
                          }
                        }}
                      >
                        <CheckCircle size={16} /> 
                        {actionLoading === grn.id + 'inspect' ? 'Processing...' : 'Complete Inspection'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Transfers Tab ────────────────────────────────────────────────────────────
function TransfersTab() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg]             = useState('');
  const [warehouseId, setWarehouseId] = useState('1');
  const [showCreateTransfer, setShowCreateTransfer] = useState(false);

  // Simple create transfer form state
  const [transferForm, setTransferForm] = useState({
    sourceWarehouseId: '1',
    destinationWarehouseId: '',
    transferType: 'INTER_WAREHOUSE',
    productId: '',
    quantity: '',
    reason: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/transfers/warehouse/${warehouseId}`, { headers: getHeaders() });
      if (res.ok) setTransfers(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [warehouseId]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (transferId, action) => {
    setActionLoading(transferId + action);
    setMsg('');
    try {
      const res = await fetch(`${API}/transfers/${transferId}/${action}`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (res.ok) { setMsg(`✅ Transfer #${transferId} ${action}d`); load(); }
      else setMsg('❌ Action failed');
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  const createTransfer = async () => {
    if (!transferForm.destinationWarehouseId || !transferForm.productId || !transferForm.quantity) {
      setMsg('❌ Please fill all required fields');
      return;
    }
    if (parseInt(transferForm.sourceWarehouseId) === parseInt(transferForm.destinationWarehouseId)) {
      setMsg('❌ Source and destination warehouse cannot be the same');
      return;
    }
    setActionLoading('create');
    setMsg('');
    try {
      const res = await fetch(`${API}/transfers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          sourceWarehouseId: parseInt(transferForm.sourceWarehouseId),
          destinationWarehouseId: parseInt(transferForm.destinationWarehouseId),
          transferType: transferForm.transferType || 'INTER_WAREHOUSE',
          reason: transferForm.reason || '',
          notes: transferForm.notes || '',
          lines: [{
            productId: parseInt(transferForm.productId),
            qtyTransferred: parseInt(transferForm.quantity),  // ✅ fixed: quantity → qtyTransferred
          }],
        }),
      });
      if (res.ok) {
        notifyTransferRequest(transferForm.sourceWarehouseId, transferForm.destinationWarehouseId, transferForm.quantity);
        setMsg('✅ Transfer request created! Awaiting approval.');
        setShowCreateTransfer(false);
        setTransferForm({ sourceWarehouseId: '1', destinationWarehouseId: '', transferType: 'INTER_WAREHOUSE', productId: '', quantity: '', reason: '', notes: '' });
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg(`❌ ${err.message || 'Failed to create transfer'}`);
      }
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  const actionMap = {
    REQUESTED:  [{ key: 'approve', label: 'Approve', color: C.teal }, { key: 'cancel', label: 'Cancel', color: C.red }],
    APPROVED:   [{ key: 'pick',    label: 'Mark Picked', color: C.amber }],
    IN_TRANSIT: [{ key: 'receive', label: 'Receive', color: C.blue }],
    RECEIVED:   [{ key: 'complete',label: 'Complete', color: C.green }],
  };

  return (
    <div>
      {/* Header with Create Transfer button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, color: C.textMuted }}>Warehouse ID:</label>
          <input
            type="number"
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
            style={{
              width: 70, padding: '6px 10px',
              background: '#fff',
              border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontSize: 13,
            }}
          />
        </div>
        <button onClick={() => setShowCreateTransfer(!showCreateTransfer)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', background: C.blue,
          border: 'none', borderRadius: 8,
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={15} /> Create Transfer Request
        </button>
      </div>

      {/* Create Transfer Form */}
      {showCreateTransfer && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '20px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>
            🔄 New Transfer Request
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { label: 'From Warehouse *', field: 'sourceWarehouseId', type: 'number', placeholder: '1' },
              { label: 'To Warehouse *',   field: 'destinationWarehouseId', type: 'number', placeholder: '2' },
              { label: 'Product ID *',     field: 'productId', type: 'number', placeholder: 'e.g. 5' },
              { label: 'Quantity *',       field: 'quantity', type: 'number', placeholder: 'e.g. 50' },
            ].map(f => (
              <div key={f.field}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={transferForm[f.field]}
                  onChange={e => setTransferForm(prev => ({ ...prev, [f.field]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
          {/* Transfer Type + Reason row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Transfer Type *</label>
              <select
                value={transferForm.transferType}
                onChange={e => setTransferForm(prev => ({ ...prev, transferType: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="INTER_WAREHOUSE">Inter Warehouse (WH → WH)</option>
                <option value="INTRA_WAREHOUSE">Intra Warehouse (Same WH)</option>
                <option value="LOCATION_TO_LOCATION">Location to Location</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Reason</label>
              <input
                type="text"
                placeholder="e.g. Stock rebalancing, Low stock at destination..."
                value={transferForm.reason}
                onChange={e => setTransferForm(prev => ({ ...prev, reason: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Notes</label>
            <input
              type="text"
              placeholder="Optional additional notes..."
              value={transferForm.notes}
              onChange={e => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={createTransfer} disabled={actionLoading === 'create'} style={{ ...btnStyle(C.blue), fontWeight: 700 }}>
              🔄 Submit Transfer Request
            </button>
            <button onClick={() => setShowCreateTransfer(false)} style={btnStyle(C.textMuted)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <SectionHeader title="Inventory Transfers" onRefresh={load} loading={loading} />

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
          background: msg.startsWith('✅') ? C.greenBg : C.redBg,
          color: msg.startsWith('✅') ? C.green : C.red,
          border: `1px solid ${msg.startsWith('✅') ? C.green : C.red}33`,
        }}>{msg}</div>
      )}

      {loading && <div style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>Loading…</div>}

      {!loading && transfers.length === 0 && (
        <div style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>No transfers found for warehouse #{warehouseId}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {transfers.map(t => (
          <div key={t.id} style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: C.blueBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ArrowLeftRight size={16} color={C.blue} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                    Transfer #{t.id}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    From WH #{t.sourceWarehouseId} → To WH #{t.destinationWarehouseId} &nbsp;·&nbsp; {fmtDate(t.createdAt)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge status={t.status} />
                {expanded === t.id ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
              </div>
            </div>

            {expanded === t.id && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 18px' }}>
                {t.lines && t.lines.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Transfer Lines
                    </div>
                    {t.lines.map((line, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '8px 12px', marginBottom: 4,
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 8, fontSize: 13, color: C.text,
                      }}>
                        <span>Product #{line.productId}</span>
                        <span>Qty: <strong>{line.quantity}</strong></span>
                        <span style={{ color: C.textMuted }}>From Loc #{line.sourceLocationId}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(actionMap[t.status] || []).map(a => (
                    <button
                      key={a.key}
                      onClick={() => doAction(t.id, a.key)}
                      disabled={actionLoading === t.id + a.key}
                      style={btnStyle(a.color)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cycle Counts Tab ─────────────────────────────────────────────────────────
function CycleCountsTab() {
  const [counts, setCounts]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg]         = useState('');
  // countedQty per cycle count line: { [ccId]: { [lineIndex]: qty } }
  const [countedQtys, setCountedQtys] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cycle-counts/due`, { headers: getHeaders() });
      if (res.ok) setCounts(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAction = async (id, action) => {
    setActionLoading(id + action);
    setMsg('');
    try {
      const res = await fetch(`${API}/cycle-counts/${id}/${action}`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (res.ok) { setMsg(`✅ Cycle count #${id} ${action}d`); load(); }
      else setMsg('❌ Action failed');
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  // Submit counted quantities for IN_PROGRESS cycle count
  const submitCount = async (cc) => {
    const qtys = countedQtys[cc.id] || {};
    const lines = (cc.lines || []).map((line, i) => ({
      ...line,
      countedQty: parseInt(qtys[i] ?? line.countedQty ?? line.expectedQty ?? 0),
    }));

    setActionLoading(cc.id + 'submit');
    setMsg('');
    try {
      const res = await fetch(`${API}/cycle-counts/${cc.id}/record`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ lines }),
      });
      if (res.ok) {
        setMsg(`✅ Count submitted for Cycle Count #${cc.id}. Awaiting approval.`);
        // Check for discrepancies
        lines.forEach(line => {
          const variance = (line.countedQty || 0) - (line.expectedQty || 0);
          if (variance !== 0) {
            notifyDiscrepancyFound(
              `WH #${cc.warehouseId}`,
              `Product #${line.productId}`,
              line.expectedQty || 0,
              line.countedQty || 0
            );
          }
        });
        load();
      } else {
        // Fallback: try 'submit' action
        const res2 = await fetch(`${API}/cycle-counts/${cc.id}/submit`, {
          method: 'PUT',
          headers: getHeaders(),
        });
        if (res2.ok) { setMsg(`✅ Count submitted for Cycle Count #${cc.id}.`); load(); }
        else setMsg('❌ Submit failed');
      }
    } catch { setMsg('❌ Server error'); }
    finally { setActionLoading(null); }
  };

  const updateCountedQty = (ccId, lineIndex, value) => {
    setCountedQtys(prev => ({
      ...prev,
      [ccId]: { ...(prev[ccId] || {}), [lineIndex]: value },
    }));
  };

  const actionMap = {
    SCHEDULED:   [{ key: 'start',   label: 'Start Count', color: C.teal }],
    IN_PROGRESS: [], // handled separately with Record Count form
    COUNTED:     [
      { key: 'approve', label: '✅ Approve & Adjust Inventory', color: C.green },
      { key: 'reject',  label: '❌ Reject',                     color: C.red },
    ],
  };

  return (
    <div>
      <SectionHeader title="Cycle Counts — Due" onRefresh={load} loading={loading} />

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
          background: msg.startsWith('✅') ? C.greenBg : C.redBg,
          color: msg.startsWith('✅') ? C.green : C.red,
          border: `1px solid ${msg.startsWith('✅') ? C.green : C.red}33`,
        }}>{msg}</div>
      )}

      {loading && <div style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>Loading…</div>}

      {!loading && counts.length === 0 && (
        <div style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>
          🎉 No due cycle counts
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {counts.map(cc => (
          <div key={cc.id} style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div
              onClick={() => setExpanded(expanded === cc.id ? null : cc.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: C.greenBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BarChart2 size={16} color={C.green} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>
                    Cycle Count #{cc.id}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    Warehouse #{cc.warehouseId} &nbsp;·&nbsp; Due: {fmtDate(cc.scheduledDate)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge status={cc.status} />
                {expanded === cc.id ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
              </div>
            </div>

            {expanded === cc.id && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 18px' }}>

                {/* Count Lines */}
                {cc.lines && cc.lines.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Count Lines
                    </div>
                    {cc.lines.map((line, i) => {
                      const counted = countedQtys[cc.id]?.[i] ?? line.countedQty ?? '';
                      const expected = line.expectedQty ?? 0;
                      const variance = counted !== '' ? parseInt(counted) - expected : null;
                      return (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 12px', marginBottom: 6,
                          background: variance !== null && variance !== 0 ? `${C.amber}10` : 'rgba(255,255,255,0.03)',
                          borderRadius: 8, fontSize: 13, color: C.text,
                          border: `1px solid ${variance !== null && variance !== 0 ? C.amber + '44' : 'transparent'}`,
                          flexWrap: 'wrap', gap: 8,
                        }}>
                          <span style={{ fontWeight: 600 }}>Product #{line.productId}</span>
                          <span style={{ color: C.textMuted }}>
                            System: <strong style={{ color: C.text }}>{expected}</strong>
                          </span>

                          {/* Record Count input — only for IN_PROGRESS */}
                          {cc.status === 'IN_PROGRESS' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <label style={{ fontSize: 12, color: C.textMuted }}>Actual Count:</label>
                              <input
                                type="number"
                                min="0"
                                placeholder={String(expected)}
                                value={counted}
                                onChange={e => updateCountedQty(cc.id, i, e.target.value)}
                                style={{
                                  width: 80, padding: '5px 8px',
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 6, fontSize: 13, color: C.text,
                                  background: '#fff',
                                }}
                              />
                            </div>
                          ) : (
                            <span>Counted: <strong style={{ color: line.countedQty !== line.expectedQty ? C.amber : C.green }}>{line.countedQty ?? '—'}</strong></span>
                          )}

                          {/* Variance display */}
                          {variance !== null && (
                            <span style={{
                              fontWeight: 700,
                              color: variance === 0 ? C.green : C.red,
                              fontSize: 12,
                            }}>
                              {variance === 0 ? '✅ Match' : `⚠️ Variance: ${variance > 0 ? '+' : ''}${variance}`}
                            </span>
                          )}
                          {line.variance != null && cc.status !== 'IN_PROGRESS' && (
                            <span style={{ color: line.variance !== 0 ? C.red : C.green, fontWeight: 700, fontSize: 12 }}>
                              {line.variance === 0 ? '✅ Match' : `⚠️ Variance: ${line.variance > 0 ? '+' : ''}${line.variance}`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* Standard action buttons */}
                  {(actionMap[cc.status] || []).map(a => (
                    <button
                      key={a.key}
                      onClick={() => doAction(cc.id, a.key)}
                      disabled={actionLoading === cc.id + a.key}
                      style={btnStyle(a.color)}
                    >
                      {a.label}
                    </button>
                  ))}

                  {/* Submit Count button — only for IN_PROGRESS */}
                  {cc.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => submitCount(cc)}
                      disabled={actionLoading === cc.id + 'submit'}
                      style={{ ...btnStyle(C.teal), fontWeight: 700 }}
                    >
                      <CheckCircle size={14} /> Submit Count for Approval
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helper: button style ─────────────────────────────────────────────────────
function btnStyle(color, small = false) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: small ? '5px 10px' : '8px 14px',
    background: `${color}18`,
    border: `1px solid ${color}55`,
    borderRadius: 8,
    color,
    fontSize: small ? 11 : 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  };
}

// ─── Order Tracking Tab ───────────────────────────────────────────────────────
// Warehouse Manager sees all orders with real-time status:
// NEW ORDER → PICKING → PICKED → PACKING → PACKED → SHIPPED → DELIVERED
// Auto-assigned staff (Picker / Packer / Shipping) shown per order
// WebSocket instant updates — no page refresh needed
// ─────────────────────────────────────────────────────────────────────────────

const ORDER_TRACK_API    = 'http://localhost:9999/api/auth/admin/orders/all';
const PICKLIST_TRACK_API = 'http://localhost:9999/api/warehouse/pick-lists';

const TRACK_STATUS_CFG = {
  CONFIRMED:        { label: 'Confirmed',        color: '#0d9488', bg: '#ccfbf1', icon: '✅', step: 0 },
  PROCESSING:       { label: 'Picking',          color: '#2563eb', bg: '#dbeafe', icon: '🏃', step: 1 },
  PACKED:           { label: 'Packed',           color: '#d97706', bg: '#fef3c7', icon: '📦', step: 2 },
  SHIPPED:          { label: 'Shipped',          color: '#7c3aed', bg: '#ede9fe', icon: '🚚', step: 3 },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#0891b2', bg: '#e0f2fe', icon: '🛵', step: 4 },
  DELIVERED:        { label: 'Delivered',        color: '#16a34a', bg: '#dcfce7', icon: '🎉', step: 5 },
  CANCELLED:        { label: 'Cancelled',        color: '#dc2626', bg: '#fee2e2', icon: '❌', step: -1 },
};

const TRACK_STEPS = [
  { key: 'CONFIRMED',        icon: '✅', label: 'Confirmed'   },
  { key: 'PROCESSING',       icon: '🏃', label: 'Picking'     },
  { key: 'PACKED',           icon: '📦', label: 'Packed'      },
  { key: 'SHIPPED',          icon: '🚚', label: 'Shipped'     },
  { key: 'OUT_FOR_DELIVERY', icon: '🛵', label: 'Out for Del' },
  { key: 'DELIVERED',        icon: '🎉', label: 'Delivered'   },
];

function OrderTrackTimeline({ status }) {
  const upper = status?.toUpperCase();
  const cfg   = TRACK_STATUS_CFG[upper] || {};
  const currentStep = cfg.step ?? -1;
  if (currentStep < 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 8 }}>
      {TRACK_STEPS.map((step, i) => {
        const done   = i < currentStep;
        const active = i === currentStep;
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 11 : 13,
                background: done ? '#22c55e' : active ? '#2563eb' : '#e5e7eb',
                color: (done || active) ? '#fff' : '#9ca3af',
                outline: active ? '3px solid #93c5fd' : 'none',
                boxShadow: active ? '0 0 0 3px #dbeafe' : 'none',
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : step.icon}
              </div>
              <span style={{
                fontSize: 9, marginTop: 3, textAlign: 'center', lineHeight: 1.2,
                color: active ? '#2563eb' : done ? '#16a34a' : '#9ca3af',
                fontWeight: (active || done) ? 700 : 400,
                maxWidth: 40,
              }}>{step.label}</span>
              {active && <span style={{ fontSize: 8, color: '#2563eb', fontWeight: 700 }}>← now</span>}
            </div>
            {i < TRACK_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 20, minWidth: 6,
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

// Staff assignment chips — shows Picker / Packer / Shipping with pick list status
function StaffAssignmentRow({ pickList }) {
  if (!pickList) return null;
  const plStatus = pickList.status;
  const statusCfg = {
    PENDING:     { color: '#d97706', bg: '#fef3c7', label: 'Pending'     },
    IN_PROGRESS: { color: '#2563eb', bg: '#dbeafe', label: 'In Progress' },
    COMPLETED:   { color: '#16a34a', bg: '#dcfce7', label: 'Picked ✓'   },
  }[plStatus] || { color: '#6b7280', bg: '#f3f4f6', label: plStatus };

  const staff = [
    { icon: '🏃', role: 'Picker',   name: pickList.assignedPickerName   },
    { icon: '📦', role: 'Packer',   name: pickList.assignedPackerName   },
    { icon: '🚚', role: 'Shipping', name: pickList.assignedShippingName },
  ].filter(s => s.name);

  if (staff.length === 0) return (
    <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: '#fef3c7', borderRadius: 20, fontSize: 11, color: '#92400e' }}>
      ⏳ Awaiting staff assignment
    </div>
  );

  return (
    <div style={{ marginTop: 7, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.color}33` }}>
        Pick List: {statusCfg.label}
      </span>
      {staff.map(s => (
        <span key={s.role} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 9px', borderRadius: 20, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#374151' }}>
          {s.icon} <strong style={{ fontWeight: 600 }}>{s.role}:</strong>&nbsp;{s.name}
        </span>
      ))}
    </div>
  );
}

function OrderTrackingTab() {
  const [orders, setOrders]           = useState([]);
  const [pickLists, setPickLists]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setFilter]     = useState('ALL');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveEvents, setLiveEvents]   = useState([]);

  const getToken = () =>
    sessionStorage.getItem('warehouseAuthToken') ||
    sessionStorage.getItem('warehouseToken') ||
    localStorage.getItem('token');

  const fetchOrders = async () => {
    try {
      const headers = { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };

      // Fetch orders + all pick lists in parallel
      const [ordersRes, pendingRes, inProgressRes, completedRes] = await Promise.all([
        fetch(ORDER_TRACK_API, { headers }),
        fetch(`${PICKLIST_TRACK_API}/status/PENDING`,     { headers }).catch(() => null),
        fetch(`${PICKLIST_TRACK_API}/status/IN_PROGRESS`, { headers }).catch(() => null),
        fetch(`${PICKLIST_TRACK_API}/status/COMPLETED`,   { headers }).catch(() => null),
      ]);

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        setOrders(sorted);
        setLastUpdated(new Date());
      }

      // Merge all pick lists into one map
      const allPL = [
        ...(pendingRes?.ok    ? await pendingRes.json().catch(() => [])    : []),
        ...(inProgressRes?.ok ? await inProgressRes.json().catch(() => []) : []),
        ...(completedRes?.ok  ? await completedRes.json().catch(() => [])  : []),
      ];
      setPickLists(Array.isArray(allPL) ? allPL : []);

    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []); // eslint-disable-line

  // 🔌 WebSocket — real-time order status events
  useWarehouseSocket({
    topics: ['/topic/warehouse/managers', '/topic/admin/notifications', '/topic/warehouse/all'],
    onMessage: (event) => {
      const trackEvents = [
        'NEW_ORDER_RECEIVED', 'ORDER_PROCESSING', 'PICK_LIST_ASSIGNED',
        'ORDER_PICKED', 'ORDER_PACKED', 'ORDER_SHIPPED', 'ORDER_DELIVERED',
      ];
      if (trackEvents.includes(event.type)) {
        // Live event log मध्ये add करा (max 20)
        setLiveEvents(prev => [{
          id:        Date.now(),
          type:      event.type,
          title:     event.title   || event.type,
          message:   event.message || '',
          orderNumber: event.data?.orderNumber || '',
          time:      new Date(),
        }, ...prev].slice(0, 20));

        // Orders list refresh करा
        fetchOrders();
      }
    },
    enabled: true,
  });

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(fetchOrders, 30000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  const EVENT_CFG = {
    NEW_ORDER_RECEIVED: { icon: '🆕', color: '#0d9488', bg: '#ccfbf1', label: 'New Order'      },
    ORDER_PROCESSING:   { icon: '⚙️', color: '#2563eb', bg: '#dbeafe', label: 'Processing'     },
    PICK_LIST_ASSIGNED: { icon: '📋', color: '#7c3aed', bg: '#ede9fe', label: 'Staff Assigned' },
    ORDER_PICKED:       { icon: '🏃', color: '#2563eb', bg: '#dbeafe', label: 'Picked'          },
    ORDER_PACKED:       { icon: '📦', color: '#d97706', bg: '#fef3c7', label: 'Packed'          },
    ORDER_SHIPPED:      { icon: '🚚', color: '#7c3aed', bg: '#ede9fe', label: 'Shipped'         },
    ORDER_DELIVERED:    { icon: '🎉', color: '#16a34a', bg: '#dcfce7', label: 'Delivered'       },
  };

  // orderNumber → pickList lookup map
  const pickListMap = {};
  pickLists.forEach(pl => { if (pl.orderNumber) pickListMap[pl.orderNumber] = pl; });

  const fmtTime = (d) => d ? new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }) : '—';

  const fmtAgo = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  };

  // Stats
  const countBy = (st) => orders.filter(o => o.orderStatus?.toUpperCase() === st).length;
  const stats = [
    { label: 'New Orders',    value: countBy('CONFIRMED'),        color: '#0d9488', bg: '#ccfbf1', icon: '🆕' },
    { label: 'Picking',       value: countBy('PROCESSING'),       color: '#2563eb', bg: '#dbeafe', icon: '🏃' },
    { label: 'Packed',        value: countBy('PACKED'),           color: '#d97706', bg: '#fef3c7', icon: '📦' },
    { label: 'Shipped',       value: countBy('SHIPPED'),          color: '#7c3aed', bg: '#ede9fe', icon: '🚚' },
    { label: 'Out for Del.',  value: countBy('OUT_FOR_DELIVERY'), color: '#0891b2', bg: '#e0f2fe', icon: '🛵' },
    { label: 'Delivered',     value: countBy('DELIVERED'),        color: '#16a34a', bg: '#dcfce7', icon: '🎉' },
  ];

  const s = search.toLowerCase();
  const filtered = orders.filter(o => {
    const pl = pickListMap[o.orderNumber];
    const matchSearch = !s ||
      o.orderNumber?.toLowerCase().includes(s) ||
      o.customerId?.toString().includes(s) ||
      o.warehouseName?.toLowerCase().includes(s) ||
      pl?.assignedPickerName?.toLowerCase().includes(s) ||
      pl?.assignedPackerName?.toLowerCase().includes(s) ||
      pl?.assignedShippingName?.toLowerCase().includes(s);
    const matchStatus = statusFilter === 'ALL' || o.orderStatus?.toUpperCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>
            📦 Order Tracking — Real-Time
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.textMuted }}>
            Live status of all orders — who picked, who packed, which warehouse, current stage
            {lastUpdated && (
              <span style={{ marginLeft: 8, color: C.teal, fontWeight: 600 }}>
                · Updated {fmtAgo(lastUpdated)}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchOrders(); }}
          style={{ padding: '8px 16px', background: C.tealBg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.teal, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {stats.map(st => (
          <div key={st.label} style={{
            flex: '1 1 120px', background: '#fff', border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '14px 16px',
            borderLeft: `4px solid ${st.color}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 22, marginBottom: 2 }}>{st.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1 }}>{st.value}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{st.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>

        {/* Left: Orders List */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <input
                type="text"
                placeholder="Search by order / customer / warehouse / picker name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 32px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 14 }}>🔍</span>
            </div>
            <select
              value={statusFilter}
              onChange={e => setFilter(e.target.value)}
              style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: '#fff', outline: 'none' }}
            >
              <option value="ALL">All Status</option>
              {Object.entries(TRACK_STATUS_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>

          {/* Orders */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: C.textMuted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                Loading orders...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: C.textMuted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                No orders found
              </div>
            ) : (
              filtered.map((order, idx) => {
                const upper    = order.orderStatus?.toUpperCase();
                const cfg      = TRACK_STATUS_CFG[upper] || { label: upper, color: '#6b7280', bg: '#f3f4f6', icon: '❓' };
                const pickList = pickListMap[order.orderNumber];
                return (
                  <div key={order.orderNumber} style={{
                    padding: '14px 18px',
                    borderBottom: idx < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                    background: upper === 'CONFIRMED' ? '#f0fdf4' : upper === 'PROCESSING' ? '#eff6ff' : '#fff',
                    transition: 'background 0.2s',
                  }}>
                    {/* Row 1: Order ID + Status + Warehouse + Time */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        {/* Order number + status badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
                            #{order.orderNumber?.slice(0, 22)}…
                          </span>
                          <span style={{
                            padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            color: cfg.color, background: cfg.bg,
                          }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          {order.warehouseName && (
                            <span style={{ fontSize: 11, color: '#0369a1', background: '#e0f2fe', padding: '1px 8px', borderRadius: 10 }}>
                              🏭 {order.warehouseName}
                            </span>
                          )}
                        </div>

                        {/* Info row */}
                        <div style={{ display: 'flex', gap: 16, marginTop: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: C.textMuted }}>👤 Customer #{order.customerId}</span>
                          {order.deliverySpeed && (
                            <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>🚚 {order.deliverySpeed}</span>
                          )}
                          {order.deliveryPincode && (
                            <span style={{ fontSize: 11, color: C.textMuted }}>📍 {order.deliveryPincode}</span>
                          )}
                          <span style={{ fontSize: 11, color: C.textMuted }}>🕐 {fmtTime(order.createdAt)}</span>
                          {order.totalAmount && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>
                              💰 ₹{parseFloat(order.totalAmount).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* ── Staff Assignment (Picker / Packer / Shipping) ── */}
                        <StaffAssignmentRow pickList={pickList} />

                        {/* AWB / Packing Slip */}
                        {(order.packingSlipNumber || order.awbNumber) && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                            {order.packingSlipNumber && (
                              <span style={{ fontSize: 10, color: '#065f46', background: '#d1fae5', padding: '1px 7px', borderRadius: 8, fontFamily: 'monospace' }}>
                                📦 {order.packingSlipNumber}
                              </span>
                            )}
                            {order.awbNumber && (
                              <span style={{ fontSize: 10, color: '#7c3aed', background: '#ede9fe', padding: '1px 7px', borderRadius: 8, fontFamily: 'monospace' }}>
                                🚚 AWB: {order.awbNumber}
                                {order.courierPartner && ` · ${order.courierPartner}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Payment status */}
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                          color: order.paymentStatus === 'SUCCESS' ? '#166534' : '#92400e',
                          background: order.paymentStatus === 'SUCCESS' ? '#dcfce7' : '#fef3c7',
                        }}>
                          💳 {order.paymentStatus || 'PENDING'}
                        </span>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ maxWidth: 420, marginTop: 4 }}>
                      <OrderTrackTimeline status={upper} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Live Event Feed */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{
            background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden',
            position: 'sticky', top: 20,
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
              background: 'linear-gradient(135deg, #0d9488, #0f766e)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                ⚡ Live Events
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>Real-time</span>
              </div>
            </div>

            {/* Event list */}
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {liveEvents.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 12 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📡</div>
                  Waiting for events...
                  <div style={{ fontSize: 10, marginTop: 4, color: '#9ca3af' }}>
                    WebSocket connected — events will appear here in real-time
                  </div>
                </div>
              ) : (
                liveEvents.map(ev => {
                  const ecfg = EVENT_CFG[ev.type] || { icon: '🔔', color: '#6b7280', bg: '#f3f4f6', label: ev.type };
                  return (
                    <div key={ev.id} style={{
                      padding: '10px 14px',
                      borderBottom: `1px solid ${C.border}`,
                      background: '#fff',
                      animation: 'fadeIn 0.3s ease',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: ecfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16,
                        }}>{ecfg.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: ecfg.color }}>{ecfg.label}</span>
                            <span style={{ fontSize: 10, color: C.textMuted, whiteSpace: 'nowrap' }}>{fmtAgo(ev.time)}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.text, marginTop: 2, lineHeight: 1.4 }}>{ev.title}</div>
                          {ev.orderNumber && (
                            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'monospace', marginTop: 2 }}>
                              #{ev.orderNumber.slice(0, 20)}…
                            </div>
                          )}
                          {ev.message && (
                            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2, lineHeight: 1.3 }}>{ev.message}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {liveEvents.length > 0 && (
              <div style={{ padding: '8px 14px', borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
                <button
                  onClick={() => setLiveEvents([])}
                  style={{ fontSize: 11, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Clear events
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
// ─── Tab permissions per role ─────────────────────────────────────────────────
const ROLE_TABS = {
  WAREHOUSE_MANAGER: ['overview', 'po', 'grn', 'picklist', 'tracking', 'transfers', 'cycle', 'staff'],
  RECEIVING:         ['overview', 'po', 'grn'],
  AUDITOR:           ['overview', 'cycle', 'audit'],
  VIEWER:            ['overview'],
};

// What each role can DO inside PO tab
// WAREHOUSE_MANAGER: view + receive goods + cancel (cannot approve — Admin does that)
// RECEIVING: view + receive goods only (cannot approve/cancel)
const PO_ROLE_ACTIONS = {
  WAREHOUSE_MANAGER: ['view', 'receive', 'cancel'],
  RECEIVING:         ['view', 'receive'],
  AUDITOR:           ['view'],
  VIEWER:            ['view'],
};

const TABS = [
  { key: 'overview',  label: 'Overview',          icon: Warehouse },
  { key: 'grn',       label: 'GRN / Receiving',    icon: Package },
  { key: 'po',        label: 'Purchase Orders',    icon: ClipboardList },
  { key: 'picklist',  label: 'Pick List Assign',   icon: MapPin },
  { key: 'tracking',  label: 'Order Tracking',     icon: Eye },
  { key: 'transfers', label: 'Transfers',          icon: ArrowLeftRight },
  { key: 'cycle',     label: 'Cycle Counts',       icon: BarChart2 },
  { key: 'audit',     label: 'Audit Logs',         icon: ScrollText },
  { key: 'staff',     label: 'Staff',              icon: Users },
];

export default function WarehouseDashboard() {
  // ✅ Set page title based on role
  useEffect(() => {
    const role = sessionStorage.getItem('warehouseUserRole') || 'WAREHOUSE_MANAGER';
    const roleTitles = {
      'WAREHOUSE_MANAGER': 'Warehouse Manager Dashboard',
      'RECEIVING': 'Receiving Dashboard',
      'AUDITOR': 'Auditor Dashboard',
      'VIEWER': 'Warehouse Viewer Dashboard',
    };
    document.title = `${roleTitles[role] || 'Warehouse Dashboard'} - Inventory Hub`;
    return () => { document.title = 'Inventory Hub'; };
  }, []);

  // ✅ Auth guard — redirect to login if no warehouse session
  useEffect(() => {
    const token = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');
    if (!token) {
      window.location.href = '/warehouse/login';
    }
  }, []);

  const [activeTab, setActiveTab]   = useState('overview');
  const [stats, setStats]           = useState({ pendingGRN: 0, approvedPO: 0, activeTransfers: 0, dueCounts: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const userName = sessionStorage.getItem('warehouseUserName') || 'Warehouse Staff';
  const userRole = sessionStorage.getItem('warehouseUserRole') || 'WAREHOUSE_MANAGER';
  const managerId = sessionStorage.getItem('warehouseCustomerId') || sessionStorage.getItem('warehouseUserId');

  // 🔌 WebSocket — role नुसार topics subscribe करतो
  // RECEIVING role → फक्त /topic/warehouse/receiving
  // बाकी roles → /topic/warehouse/all + managers
  const { connected: wsConnected, wsAvailable } = useWarehouseSocket({
    topics: [
      // Receiving Clerk ला फक्त receiving topic — PO_APPROVED notifications
      '/topic/warehouse/receiving',
      // बाकी roles ला general topics
      ...(userRole !== 'RECEIVING' ? [
        '/topic/warehouse/all',
        '/topic/warehouse/managers',
        ...(managerId ? [`/topic/warehouse/manager/${managerId}`] : []),
      ] : []),
    ],
    onMessage: (event) => {
      // notificationStore मध्ये एकदाच push करा — duplicate push काढला
      pushNotification({
        type:    event.type    || 'SYSTEM_ALERT',
        title:   event.title   || 'Warehouse Alert',
        message: event.message || '',
        // ORDER_PICKED/PACKED/SHIPPED/DELIVERED → source WAREHOUSE tag करा (single push मध्येच)
        source:  event.source  || (
          ['ORDER_PICKED','ORDER_PACKED','ORDER_SHIPPED','ORDER_DELIVERED'].includes(event.type)
            ? 'WAREHOUSE' : 'SYSTEM'
        ),
        forRole: event.type === 'PO_APPROVED' || event.type === 'RECEIVING_ALERT'
                   ? 'RECEIVING'   // ← फक्त Receiving Clerk साठी tag
                   : undefined,
        data:    event.data,
      });

      // Tab auto-navigate — push नाही, फक्त navigate
      // ORDER_PROCESSING → Pick List tab
      if (event.type === 'ORDER_PROCESSING' || event.type === 'PICK_LIST_ASSIGNED' || event.type === 'NEW_ORDER_RECEIVED') {
        setActiveTab('picklist');
      }
      // ORDER_PICKED / ORDER_PACKED / ORDER_SHIPPED / ORDER_DELIVERED → Tracking tab
      if (['ORDER_PICKED','ORDER_PACKED','ORDER_SHIPPED','ORDER_DELIVERED','NEW_ORDER_RECEIVED'].includes(event.type)) {
        setActiveTab('tracking');
      }
      // GRN_CREATED → GRN tab
      if (event.type === 'GRN_CREATED') {
        setActiveTab('grn');
      }
      // PO_APPROVED → Receiving Clerk ला GRN tab दाखवा
      if (event.type === 'PO_APPROVED' && userRole === 'RECEIVING') {
        setActiveTab('grn');
      }
    },
    enabled: true,
  });

  // Listen for "Receive Goods" button from PO tab → switch to GRN tab
  useEffect(() => {
    const handler = () => setActiveTab('grn');
    window.addEventListener('warehouse_open_grn', handler);
    return () => window.removeEventListener('warehouse_open_grn', handler);
  }, []);

  // 🔔 Listen for ORDER_PROCESSING notification → auto-switch to Pick List tab
  // so Warehouse Manager sees the new pick list immediately
  useEffect(() => {
    const handler = () => {
      const notifs = getNotifications();
      const hasNew = notifs.some(n => n.type === 'ORDER_PROCESSING' && !n.read);
      if (hasNew) {
        setActiveTab('picklist');
      }
    };
    window.addEventListener('ims_notification_update', handler);
    return () => window.removeEventListener('ims_notification_update', handler);
  }, []);

  // Filter tabs based on role
  const allowedTabKeys = ROLE_TABS[userRole] || ROLE_TABS['WAREHOUSE_MANAGER'];
  // Use ROLE_TABS order (not TABS order) so sidebar position is correct per role
  const visibleTabs = allowedTabKeys.map(key => TABS.find(t => t.key === key)).filter(Boolean);

  // Load overview stats — real-time values from API
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Use the logged-in user's warehouse ID; fall back to fetching all transfers
      const warehouseId = sessionStorage.getItem('warehouseId') || sessionStorage.getItem('warehouseWarehouseId');
      const transferUrl = warehouseId
        ? `${API}/transfers/warehouse/${warehouseId}`
        : `${API}/transfers/warehouse/1`;

      const [grnRes, poRes, transferRes, cycleRes] = await Promise.allSettled([
        fetch(`${API}/grn/pending-putaway`,            { headers: getHeaders() }),
        fetch(`${API}/purchase-orders/status/APPROVED`, { headers: getHeaders() }),
        fetch(transferUrl,                              { headers: getHeaders() }),
        fetch(`${API}/cycle-counts/due`,               { headers: getHeaders() }),
      ]);

      const toArray = (data) => Array.isArray(data) ? data : (data?.content ?? data?.data ?? []);

      const grnsRaw      = grnRes.status      === 'fulfilled' && grnRes.value.ok      ? await grnRes.value.json()      : [];
      const posRaw       = poRes.status       === 'fulfilled' && poRes.value.ok       ? await poRes.value.json()       : [];
      const transfersRaw = transferRes.status === 'fulfilled' && transferRes.value.ok ? await transferRes.value.json() : [];
      const cyclesRaw    = cycleRes.status    === 'fulfilled' && cycleRes.value.ok    ? await cycleRes.value.json()    : [];

      const grns      = toArray(grnsRaw);
      const pos       = toArray(posRaw);
      const transfers = toArray(transfersRaw);
      const cycles    = toArray(cyclesRaw);

      setStats({
        pendingGRN:      grns.length,
        approvedPO:      pos.length,
        activeTransfers: transfers.filter(t => ['REQUESTED','APPROVED','IN_TRANSIT'].includes(t.status)).length,
        dueCounts:       cycles.length,
      });
    } catch { /* ignore */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => {
    loadStats();
    // Auto-refresh every 60 seconds for real-time feel
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const handleLogout = () => {
    // Clear warehouse session (tab-specific)
    sessionStorage.clear();
    window.location.href = '/warehouse/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `#F8FAFC`,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .wh-tab:hover { background: rgba(13,148,136,0.08) !important; color: ${C.teal} !important; }
        .wh-card-hover:hover { background: ${C.cardHover} !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: `#FFFFFF`,
        borderBottom: `2px solid ${C.border}`,
        padding: '0 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 70,
        boxShadow: `0 1px 4px rgba(0,0,0,0.08)`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px rgba(13,148,136,0.4)`,
          }}>
            <Warehouse size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Warehouse Portal</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>PixelBloom IMS</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* WS status badge — only visible when offline */}
          {!wsConnected && (
            <div title={wsAvailable ? 'Connecting to real-time service…' : 'Real-time service offline — start warehouse-service'} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px',
              borderRadius: 20,
              background: wsAvailable ? C.amberBg : C.redBg,
              border: `1px solid ${wsAvailable ? C.amber : C.red}44`,
              fontSize: 11,
              fontWeight: 600,
              color: wsAvailable ? C.amber : C.red,
              cursor: 'default',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: wsAvailable ? C.amber : C.red,
                display: 'inline-block',
                animation: wsAvailable ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }} />
              {wsAvailable ? 'Connecting…' : 'RT Offline'}
            </div>
          )}
          {wsConnected && (
            <div title="Real-time updates active" style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px',
              borderRadius: 20,
              background: C.greenBg,
              border: `1px solid ${C.green}44`,
              fontSize: 11,
              fontWeight: 600,
              color: C.green,
              cursor: 'default',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
              Live
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{userName}</div>
            <div style={{ fontSize: 11, color: C.tealLight }}>{userRole.replace('_', ' ')}</div>
          </div>
          <WarehouseBell onNavigate={setActiveTab} />
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              color: C.red,
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)' }}>
        {/* ── Sidebar ── */}
        <div style={{
          width: 220,
          background: C.card,
          borderRight: `1px solid ${C.border}`,
          padding: '20px 12px',
          flexShrink: 0,
        }}>
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                className="wh-tab"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  marginBottom: 4,
                  borderRadius: 10,
                  border: 'none',
                  background: active ? C.tealBg : 'transparent',
                  color: active ? C.tealLight : C.textMuted,
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  borderLeft: active ? `3px solid ${C.teal}` : '3px solid transparent',
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Main Content ── */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: C.text }}>
                Welcome back, {userName.split(' ')[0]} 👋
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <p style={{ margin: 0, color: C.textMuted, fontSize: 14 }}>
                  Here's your warehouse at a glance
                </p>
                <button
                  onClick={loadStats}
                  disabled={statsLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    background: C.tealBg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    color: C.tealLight,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: statsLoading ? 'not-allowed' : 'pointer',
                    opacity: statsLoading ? 0.6 : 1,
                  }}
                >
                  <RefreshCw size={12} style={{ animation: statsLoading ? 'spin 0.8s linear infinite' : 'none' }} />
                  {statsLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {/* Stat cards */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
                <StatCard icon={Package}       label="Pending GRN Putaway"  value={statsLoading ? '…' : stats.pendingGRN}      color={C.amber}  bg={C.amberBg} />
                <StatCard icon={ClipboardList} label="Approved POs"         value={statsLoading ? '…' : stats.approvedPO}      color={C.teal}   bg={C.tealBg} />
                <StatCard icon={ArrowLeftRight}label="Active Transfers"     value={statsLoading ? '…' : stats.activeTransfers} color={C.blue}   bg={C.blueBg} />
                <StatCard icon={BarChart2}     label="Due Cycle Counts"     value={statsLoading ? '…' : stats.dueCounts}       color={C.green}  bg={C.greenBg} />
              </div>

              {/* Quick action cards */}
              <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: C.text }}>Quick Actions</h2>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'Process GRN',       desc: 'Inspect & putaway received goods', tab: 'grn',       icon: Package,        color: C.amber },
                  { label: 'Approve POs',        desc: 'Review & approve purchase orders', tab: 'po',        icon: ClipboardList,  color: C.teal },
                  { label: 'Assign Pick Lists',  desc: 'Assign pickers & packers to orders', tab: 'picklist', icon: MapPin,         color: C.blue },
                  { label: 'Manage Transfers',   desc: 'Approve & track stock transfers',  tab: 'transfers', icon: ArrowLeftRight, color: C.blue },
                  { label: 'Cycle Counts',       desc: 'Start & approve stock counts',     tab: 'cycle',     icon: BarChart2,      color: C.green },
                ].filter(q => allowedTabKeys.includes(q.tab)).map(q => (
                  <div
                    key={q.tab}
                    className="wh-card-hover"
                    onClick={() => setActiveTab(q.tab)}
                    style={{
                      flex: '1 1 200px',
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: '18px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${q.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 12,
                    }}>
                      <q.icon size={18} color={q.color} />
                    </div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 4 }}>{q.label}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{q.desc}</div>
                  </div>
                ))}
              </div>

              {/* SRS Flow reminder */}
              <div style={{
                marginTop: 32,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: '20px 24px',
              }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.text }}>
                  📋 Warehouse Flow (SRS Reference)
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { step: 'PO Created', color: C.textMuted },
                    { step: '→', color: C.border },
                    { step: 'PO Approved', color: C.teal },
                    { step: '→', color: C.border },
                    { step: 'GRN Received', color: C.amber },
                    { step: '→', color: C.border },
                    { step: 'Inspected', color: C.blue },
                    { step: '→', color: C.border },
                    { step: 'Putaway Done', color: C.green },
                    { step: '→', color: C.border },
                    { step: 'Cycle Count', color: C.tealLight },
                  ].map((s, i) => (
                    <span key={i} style={{ fontSize: 13, fontWeight: s.step === '→' ? 400 : 600, color: s.color }}>
                      {s.step}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grn'       && <GRNTab userRole={userRole} />}
          {activeTab === 'po'        && <PurchaseOrdersTab userRole={userRole} />}
          {activeTab === 'picklist'  && <PickListAssignment />}
          {activeTab === 'tracking'  && <OrderTrackingTab />}
          {activeTab === 'transfers' && <TransfersTab />}
          {activeTab === 'cycle'     && <CycleCountsTab />}
          {activeTab === 'audit'     && <AuditLogs />}
          {activeTab === 'staff'     && <StaffManagement />}
        </div>
      </div>
    </div>
  );
}
