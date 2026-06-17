import React, { useState, useEffect, useCallback } from 'react';
import {
  FaSync, FaSearch, FaFileCsv,
  FaUser, FaShieldAlt, FaTruck, FaWarehouse, FaBoxOpen,
  FaEnvelope, FaPhone, FaBuilding,
} from 'react-icons/fa';
import { imsService } from '../../services/imsApi';

const AUTH_URL = 'http://localhost:9999/api/auth';

const getAdminToken = () =>
  sessionStorage.getItem('adminToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getAdminToken()}`,
});

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLE_TABS = [
  { key: 'ALL',               label: 'All Staff',       icon: FaUser,      color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', emoji: '👥' },
  { key: 'ADMIN',             label: 'Admins',          icon: FaShieldAlt, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', emoji: '👑' },
  { key: 'DELIVERY_BOY',      label: 'Delivery Boys',   icon: FaTruck,     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', emoji: '🚚' },
  { key: 'WAREHOUSE_MANAGER', label: 'Warehouse Staff', icon: FaWarehouse, color: '#d97706', bg: '#fffbeb', border: '#fde68a', emoji: '🏭' },
  { key: 'SUPPLIER',          label: 'Suppliers',       icon: FaBoxOpen,   color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', emoji: '📦' },
  { key: 'USER',              label: 'Customers',       icon: FaUser,      color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', emoji: '🛒' },
];

const WAREHOUSE_ROLE_LABELS = {
  WAREHOUSE_MANAGER: 'Warehouse Manager',
  RECEIVING:         'Receiving Clerk',
  AUDITOR:           'Audit Staff',
  PICKER:            'Pick Staff',
  PACKER:            'Pack Staff',
  SHIPPING:          'Shipping Staff',
  VIEWER:            'View Staff',
};

const WAREHOUSE_ROLES = ['WAREHOUSE_MANAGER', 'RECEIVING', 'AUDITOR', 'PICKER', 'PACKER', 'SHIPPING', 'VIEWER'];

const AVATAR_COLORS = ['#6366f1','#dc2626','#16a34a','#d97706','#0891b2','#7c3aed','#db2777','#0284c7'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(firstName = '', lastName = '', name = '') {
  if (firstName || lastName)
    return `${(firstName[0] || '').toUpperCase()}${(lastName[0] || '').toUpperCase()}`;
  const parts = name.trim().split(' ');
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function resolveRole(u) {
  const raw = u.role || u.userRole || '';
  if (u.isAdmin    || raw === 'ADMIN')        return 'ADMIN';
  if (u.isDeliveryBoy || raw === 'DELIVERY_BOY') return 'DELIVERY_BOY';
  if (u.isWarehouseStaff || WAREHOUSE_ROLES.includes(raw)) return 'WAREHOUSE_MANAGER';
  return 'USER';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ name, firstName, lastName, idx }) {
  const initials = getInitials(firstName, lastName, name);
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}dd, ${color})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
      boxShadow: `0 2px 8px ${color}55`,
      letterSpacing: '0.5px',
    }}>
      {initials || '?'}
    </div>
  );
}

function RoleBadge({ role, originalRole }) {
  const cfg = ROLE_TABS.find(t => t.key === role) || {
    emoji: '🔐', label: role, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb',
  };
  const label =
    role === 'WAREHOUSE_MANAGER' && originalRole && WAREHOUSE_ROLE_LABELS[originalRole]
      ? WAREHOUSE_ROLE_LABELS[originalRole]
      : cfg.label;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, border: `1.5px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {cfg.emoji} {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    ACTIVE:      { color: '#15803d', bg: '#dcfce7', dot: '#22c55e', label: 'Active' },
    INACTIVE:    { color: '#b45309', bg: '#fef3c7', dot: '#f59e0b', label: 'Inactive' },
    BLOCKED:     { color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444', label: 'Blocked' },
    PENDING:     { color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6', label: 'Pending' },
    BLACKLISTED: { color: '#6d28d9', bg: '#f5f3ff', dot: '#8b5cf6', label: 'Blacklisted' },
  };
  const s = map[status] || { color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af', label: status || '—' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: s.color, background: s.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Contacts() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [allUsers, setAllUsers]   = useState([]);
  const [whStaff, setWhStaff]     = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [msg, setMsg]             = useState('');
  // Delivery boy live status
  const [dbSummary, setDbSummary] = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setMsg('');
    try {
      // 1. Warehouse staff (separate table — fetch first to build email set)
      let warehouseEmailRoleMap = {};
      try {
        const whRes = await fetch(`${AUTH_URL}/admin/warehouse-staff`, { headers: authHeaders() });
        if (whRes.ok) {
          const whData = await whRes.json();
          const mapped = whData.map(s => ({
            ...s,
            role: 'WAREHOUSE_MANAGER',
            originalRole: s.role || s.userRole || 'WAREHOUSE_MANAGER',
            type: 'warehouse',
          }));
          setWhStaff(mapped);
          // Build email → originalRole map for deduplication
          whData.forEach(s => {
            warehouseEmailRoleMap[s.email] = s.role || 'WAREHOUSE_MANAGER';
          });
        }
      } catch (_) {
        // endpoint not yet available — will rely on role field from customers endpoint
      }

      // 2. Customers (includes admins, delivery boys, and possibly warehouse staff)
      const res = await fetch(`${AUTH_URL}/admin/customers`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const withRole = data.map(u => {
          // If this email is in warehouse_staff table, mark as warehouse
          if (warehouseEmailRoleMap[u.email]) {
            return {
              ...u,
              role: 'WAREHOUSE_MANAGER',
              originalRole: warehouseEmailRoleMap[u.email],
              type: 'user',
            };
          }
          // Otherwise use role field from backend (updated endpoint) or flags
          const resolved = resolveRole(u);
          return {
            ...u,
            role: resolved,
            originalRole: u.role || u.userRole || resolved,
            type: 'user',
          };
        });
        setAllUsers(withRole);
      } else {
        setMsg('⚠️ Could not load users — check admin token');
      }

      // 3. Suppliers
      const suppData = await imsService.suppliers.getAll();
      setSuppliers((suppData || []).map(s => ({ ...s, type: 'supplier', role: 'SUPPLIER' })));

      // 4. Delivery boy live status summary
      try {
        const dbRes = await fetch(`${AUTH_URL.replace('/auth', '')}/auth/admin/delivery-boys/status/summary`, { headers: authHeaders() });
        if (dbRes.ok) setDbSummary(await dbRes.json());
      } catch (_) { /* optional — graceful fallback */ }

    } catch (e) {
      setMsg('❌ Server error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Combine — warehouse staff already marked in allUsers; whStaff used only if not in customers table ──
  const userEmails = new Set(allUsers.map(u => u.email));
  // Only add whStaff entries that are NOT already in allUsers (pure warehouse_staff table entries)
  const whStaffOnly = whStaff.filter(s => !userEmails.has(s.email));
  const combined = [...allUsers, ...whStaffOnly, ...suppliers];

  const tabFiltered = activeTab === 'ALL'
    ? combined
    : combined.filter(u => u.role === activeTab);

  const searched = search.trim()
    ? tabFiltered.filter(u => {
        const q = search.toLowerCase();
        const name = u.type === 'supplier'
          ? `${u.name} ${u.company} ${u.email}`.toLowerCase()
          : `${u.firstName || ''} ${u.lastName || ''} ${u.email}`.toLowerCase();
        return name.includes(q);
      })
    : tabFiltered;

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = {
    ALL:               combined.length,
    ADMIN:             combined.filter(u => u.role === 'ADMIN').length,
    DELIVERY_BOY:      combined.filter(u => u.role === 'DELIVERY_BOY').length,
    WAREHOUSE_MANAGER: combined.filter(u => u.role === 'WAREHOUSE_MANAGER').length,
    SUPPLIER:          suppliers.length,
    USER:              combined.filter(u => u.role === 'USER').length,
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = searched.map(u => {
      if (u.type === 'supplier')
        return `"${u.name}","${u.email}","${u.phone || ''}","${u.company || ''}","Supplier","${u.status || ''}"`;
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      const roleLabel = u.role === 'WAREHOUSE_MANAGER' && WAREHOUSE_ROLE_LABELS[u.originalRole]
        ? WAREHOUSE_ROLE_LABELS[u.originalRole] : u.role;
      return `"${name}","${u.email}","${u.phoneNumber || ''}","—","${roleLabel}","${u.status || ''}"`;
    });
    const csv = `Name,Email,Phone,Company,Role,Status\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `contacts-${activeTab.toLowerCase()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const activeCfg = ROLE_TABS.find(t => t.key === activeTab) || ROLE_TABS[0];

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .contact-row:hover { background: #f8faff !important; }
        .tab-btn:hover { border-color: #6366f1 !important; color: #6366f1 !important; }
        .action-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1) !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>👥 Staff & Contacts Directory</h2>
          <p style={styles.subtitle}>All roles — Admins, Delivery Boys, Warehouse Staff, Suppliers, Customers</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="action-btn" onClick={exportCSV} style={styles.btnSecondary}>
            <FaFileCsv size={13} /> Export CSV
          </button>
          <button className="action-btn" onClick={loadAll} disabled={loading} style={styles.btnPrimary}>
            <FaSync size={12} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Alert ── */}
      {msg && (
        <div style={{
          ...styles.alert,
          background: msg.startsWith('❌') ? '#fef2f2' : '#fffbeb',
          color:      msg.startsWith('❌') ? '#dc2626' : '#d97706',
          borderColor: msg.startsWith('❌') ? '#fecaca' : '#fde68a',
        }}>{msg}</div>
      )}

      {/* ── Stat Cards ── */}
      <div style={styles.statsRow}>
        {ROLE_TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <div
              key={tab.key}
              className="stat-card"
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...styles.statCard,
                background: active ? tab.bg : '#fff',
                border: `1.5px solid ${active ? tab.color : '#e5e7eb'}`,
                boxShadow: active ? `0 4px 16px ${tab.color}22` : '0 1px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{tab.emoji}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: active ? tab.color : '#111827', lineHeight: 1 }}>
                {counts[tab.key] ?? 0}
              </div>
              <div style={{ fontSize: 11, color: active ? tab.color : '#6b7280', marginTop: 4, fontWeight: 600 }}>
                {tab.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Delivery Boy Live Status Bar ── */}
      {activeTab === 'DELIVERY_BOY' && (
        <div style={{
          display: 'flex', gap: 10, marginBottom: 18, padding: '14px 18px',
          background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
          borderRadius: 14, border: '1.5px solid #bbf7d0', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginRight: 4 }}>
            🚚 Live Status:
          </span>
          {dbSummary ? (
            <>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac' }}>
                🟢 Available: {dbSummary.available ?? 0}
              </span>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
                🟡 Busy: {dbSummary.busy ?? 0}
              </span>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: '#e0f2fe', color: '#0891b2', border: '1px solid #7dd3fc' }}>
                🔵 On Break: {dbSummary.onBreak ?? 0}
              </span>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}>
                ⚫ Offline: {dbSummary.offline ?? 0}
              </span>
              {dbSummary.boysWithPendingCash > 0 && (
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                  💵 Cash Pending: {dbSummary.boysWithPendingCash} boys (₹{parseFloat(dbSummary.totalCashInField || 0).toFixed(0)})
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Status tracking not yet active — register boys in Delivery Management
            </span>
          )}
        </div>
      )}

      {/* ── Search ── */}
      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 16 }}>
        <FaSearch style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 12 }} />
        <input
          type="text"
          placeholder={`Search ${activeCfg.label.toLowerCase()}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* ── Table ── */}
      <div style={styles.tableWrap}>
        {/* Header */}
        <div style={styles.tableHead}>
          <div style={{ width: 52 }} />
          <div>Name</div>
          <div>Email</div>
          <div>Phone</div>
          <div>Company / Role</div>
          <div>Role</div>
          <div>Status</div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={styles.emptyState}>
            <div style={{
              width: 36, height: 36, border: `3px solid #e5e7eb`,
              borderTopColor: activeCfg.color, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 14px',
            }} />
            <div style={{ color: '#9ca3af', fontSize: 14 }}>Loading contacts…</div>
          </div>
        )}

        {/* Empty */}
        {!loading && searched.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>{activeCfg.emoji}</div>
            <div style={{ fontWeight: 600, color: '#374151', fontSize: 15, marginBottom: 4 }}>
              No {activeCfg.label.toLowerCase()} found
            </div>
            {search && (
              <div style={{ fontSize: 13, color: '#9ca3af' }}>
                No results for "<strong>{search}</strong>"
              </div>
            )}
          </div>
        )}

        {/* Rows */}
        {!loading && searched.map((u, idx) => {
          const isSupplier = u.type === 'supplier';
          const name    = isSupplier ? (u.name || '—') : `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—';
          const email   = u.email || '—';
          const phone   = isSupplier ? (u.phone || '—') : (u.phoneNumber || '—');
          const company = isSupplier ? (u.company || '—') : '—';
          const status  = u.status || 'ACTIVE';

          return (
            <div
              key={`${u.type}-${u.id || u.supplierId}-${idx}`}
              className="contact-row"
              style={{
                ...styles.tableRow,
                background: idx % 2 === 0 ? '#fff' : '#fafbff',
                animation: `fadeIn 0.2s ease ${Math.min(idx * 0.03, 0.3)}s both`,
              }}
            >
              {/* Avatar */}
              <div style={{ width: 52, display: 'flex', justifyContent: 'center' }}>
                <Avatar name={name} firstName={u.firstName} lastName={u.lastName} idx={idx} />
              </div>

              {/* Name */}
              <div>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{name}</div>
                {isSupplier && u.contactPerson && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    Contact: {u.contactPerson}
                  </div>
                )}
              </div>

              {/* Email */}
              <div style={styles.cellFlex}>
                <FaEnvelope style={{ color: '#c4b5fd', flexShrink: 0, fontSize: 12 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: '#374151' }}>
                  {email}
                </span>
              </div>

              {/* Phone */}
              <div style={styles.cellFlex}>
                <FaPhone style={{ color: '#86efac', flexShrink: 0, fontSize: 12 }} />
                <span style={{ fontSize: 13, color: '#374151' }}>{phone}</span>
              </div>

              {/* Company */}
              <div style={styles.cellFlex}>
                {isSupplier && <FaBuilding style={{ color: '#7dd3fc', flexShrink: 0, fontSize: 12 }} />}
                <div>
                  <div style={{ fontSize: 13, color: '#374151' }}>{company}</div>
                  {isSupplier && u.category && (
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.category}</div>
                  )}
                </div>
              </div>

              {/* Role */}
              <div>
                <RoleBadge role={u.role} originalRole={u.originalRole} />
              </div>

              {/* Status */}
              <div>
                <StatusBadge status={status} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {!loading && searched.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af', textAlign: 'right' }}>
          Showing <strong style={{ color: '#6b7280' }}>{searched.length}</strong> of{' '}
          <strong style={{ color: '#6b7280' }}>{tabFiltered.length}</strong> {activeCfg.label.toLowerCase()}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    padding: '28px 28px 40px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    maxWidth: 1280,
    margin: '0 auto',
    background: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 28, flexWrap: 'wrap', gap: 14,
  },
  title: {
    margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: '5px 0 0', fontSize: 13, color: '#64748b',
  },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 18px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    border: 'none', borderRadius: 10, color: '#fff',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(99,102,241,0.35)',
    transition: 'all 0.18s',
  },
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 18px', background: '#fff',
    border: '1.5px solid #e2e8f0', borderRadius: 10, color: '#374151',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    transition: 'all 0.18s',
  },
  alert: {
    padding: '11px 16px', borderRadius: 10, marginBottom: 18,
    fontSize: 13, border: '1px solid', fontWeight: 500,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 14, marginBottom: 24,
  },
  statCard: {
    borderRadius: 14, padding: '18px 16px',
    textAlign: 'center',
  },
  tabRow: {
    display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18,
  },
  searchInput: {
    width: '100%', padding: '10px 14px 10px 38px',
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
    background: '#fff', color: '#111827',
    transition: 'border-color 0.15s',
  },
  tableWrap: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  tableHead: {
    display: 'grid',
    gridTemplateColumns: '52px 2fr 2.2fr 1.4fr 1.6fr 1.4fr 1.2fr',
    padding: '13px 20px',
    background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
    borderBottom: '1.5px solid #e2e8f0',
    fontSize: 11, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.6px',
    alignItems: 'center',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '52px 2fr 2.2fr 1.4fr 1.6fr 1.4fr 1.2fr',
    padding: '13px 20px',
    borderBottom: '1px solid #f1f5f9',
    alignItems: 'center',
    transition: 'background 0.12s',
  },
  cellFlex: {
    display: 'flex', alignItems: 'center', gap: 7,
  },
  emptyState: {
    textAlign: 'center', padding: '56px 24px', color: '#9ca3af',
  },
};
