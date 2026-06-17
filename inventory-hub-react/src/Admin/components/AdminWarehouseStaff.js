import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Trash2, RefreshCw, Mail,
  Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, X, Shield
} from 'lucide-react';

const AUTH_API = 'http://localhost:9999/api/auth';

const getAdminToken = () =>
  sessionStorage.getItem('adminToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getAdminToken()}`,
});

// ─── Role config — AUDITOR + VIEWER excluded (managed via Audit Management) ──
const ROLES = [
  { value: 'WAREHOUSE_MANAGER', label: '🏭 Warehouse Manager', color: '#0d9488', desc: 'Full warehouse access' },
  { value: 'RECEIVING',         label: '📥 Receiving Staff',   color: '#0891b2', desc: 'Receives incoming goods' },
  { value: 'PICKER',            label: '🔍 Picker',            color: '#059669', desc: 'Picks items for orders' },
  { value: 'PACKER',            label: '📦 Packer',            color: '#d97706', desc: 'Packs items for shipping' },
  { value: 'SHIPPING',          label: '🚚 Shipping Staff',    color: '#dc2626', desc: 'Handles outgoing shipments' },
];

// Roles excluded from this component — managed in Audit Management
const AUDIT_ROLES = ['AUDITOR', 'VIEWER'];

const getRoleConfig = (role) =>
  ROLES.find(r => r.value === role) || { label: role, color: '#6b7280', desc: '' };

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: '#f0fdf4', border: '#16a34a', text: '#15803d', icon: <CheckCircle size={16} /> },
    error:   { bg: '#fef2f2', border: '#dc2626', text: '#b91c1c', icon: <XCircle size={16} /> },
    info:    { bg: '#eff6ff', border: '#2563eb', text: '#1d4ed8', icon: <AlertTriangle size={16} /> },
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10,
      padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 280, maxWidth: 380,
    }}>
      <span style={{ color: c.border }}>{c.icon}</span>
      <span style={{ color: c.text, fontSize: 14, flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Add Staff Modal ──────────────────────────────────────────────────────────
function AddStaffModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', role: 'WAREHOUSE_MANAGER', password: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.firstName.trim()) { setError('First name is required'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Valid email is required'); return; }
    if (!form.role) { setError('Role is required'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/warehouse/manager/staff/add`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim().toLowerCase(),
          role:      form.role,
          password:  form.password.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to add staff');

      onSuccess(`✅ ${form.firstName} added as ${form.role}. Credentials sent to ${form.email}`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32, width: '100%',
        maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
              Add Warehouse Staff
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Staff will receive login credentials via email
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#f1f5f9', border: 'none', borderRadius: 8,
            padding: '6px 10px', cursor: 'pointer', color: '#64748b',
          }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="Rahul"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="Patil"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email Address *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="rahul@warehouse.com"
                style={{ ...inputStyle, paddingLeft: 36 }}
                required
              />
            </div>
          </div>

          {/* Role */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Role *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ROLES.map(role => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, role: role.value }))}
                  style={{
                    padding: '10px 12px',
                    border: `2px solid ${form.role === role.value ? role.color : '#e2e8f0'}`,
                    borderRadius: 10,
                    background: form.role === role.value ? `${role.color}15` : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.role === role.value ? role.color : '#374151' }}>
                    {role.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{role.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Password{' '}
              <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — auto-generated if empty)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Leave empty to auto-generate"
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>
              💡 Auto-generated password will be sent to staff's email
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, color: '#b91c1c', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <XCircle size={15} /> {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', border: '1.5px solid #e2e8f0',
                borderRadius: 10, background: '#fff', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: '#64748b',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: '12px', border: 'none',
                borderRadius: 10,
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  Adding Staff...
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  Add Staff & Send Credentials
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminWarehouseStaff() {
  const [staffList, setStaffList]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast]             = useState(null);
  const [deletingId, setDeletingId]   = useState(null);
  const [filterRole, setFilterRole]   = useState('ALL');
  const [search, setSearch]           = useState('');

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/admin/warehouse-staff`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to load warehouse staff');
      const data = await res.json();
      // Exclude AUDITOR + VIEWER — they are managed in Audit Management
      setStaffList(Array.isArray(data) ? data.filter(s => !AUDIT_ROLES.includes(s.role)) : []);
    } catch (err) {
      try {
        const res2 = await fetch(`${AUTH_API}/warehouse/manager/staff`, { headers: getHeaders() });
        if (!res2.ok) throw new Error('Failed to load staff');
        const data2 = await res2.json();
        setStaffList(Array.isArray(data2) ? data2.filter(s => !AUDIT_ROLES.includes(s.role)) : []);
      } catch {
        showToast('Could not load warehouse staff. Check backend connection.', 'error');
        setStaffList([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  const handleRemoveStaff = async (staffId, staffName) => {
    if (!window.confirm(`Remove ${staffName} from warehouse team?`)) return;
    setDeletingId(staffId);
    try {
      const res = await fetch(`${AUTH_API}/warehouse/manager/staff/remove?staffId=${staffId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove staff');
      showToast(`${staffName} removed from team`);
      setStaffList(prev => prev.filter(s => s.id !== staffId));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = staffList.filter(s => {
    const matchRole = filterRole === 'ALL' || s.role === filterRole;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.role?.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r.value] = staffList.filter(s => s.role === r.value).length;
    return acc;
  }, {});

  return (
    <div style={{ padding: '28px 32px', background: '#f1f5f9', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
            🏭 Warehouse Staff
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {staffList.length} staff member{staffList.length !== 1 ? 's' : ''} · Auditor & Viewer managed via Audit Management
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={loadStaff}
            style={{
              padding: '9px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8,
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, color: '#64748b',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '9px 20px', border: 'none', borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 700, color: '#fff',
              boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
            }}
          >
            <UserPlus size={16} />
            Add Staff
          </button>
        </div>
      </div>

      {/* Role Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {ROLES.map(role => (
          <div
            key={role.value}
            onClick={() => setFilterRole(filterRole === role.value ? 'ALL' : role.value)}
            style={{
              background: filterRole === role.value ? `${role.color}15` : '#fff',
              border: `1.5px solid ${filterRole === role.value ? role.color : '#e2e8f0'}`,
              borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: role.color }}>
              {roleCounts[role.value] || 0}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {role.label}
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '14px 18px',
        border: '1px solid #e2e8f0', marginBottom: 20,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Search by name, email or role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '2 1 200px', padding: '9px 12px', borderRadius: 8,
            border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterRole('ALL')}
            style={pillStyle(filterRole === 'ALL', '#6366f1')}
          >
            All ({staffList.length})
          </button>
          {ROLES.filter(r => roleCounts[r.value] > 0).map(role => (
            <button
              key={role.value}
              onClick={() => setFilterRole(filterRole === role.value ? 'ALL' : role.value)}
              style={pillStyle(filterRole === role.value, role.color)}
            >
              {role.label} ({roleCounts[role.value]})
            </button>
          ))}
        </div>
      </div>

      {/* Staff List */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            Staff Directory ({filtered.length})
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p>Loading staff...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>No staff found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {staffList.length === 0
                ? 'Add your first warehouse staff member to get started'
                : 'Try adjusting your search or filter'}
            </div>
            {staffList.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  marginTop: 16, padding: '10px 24px', border: 'none', borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                }}
              >
                + Add First Staff Member
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Staff Member', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left', fontWeight: 600,
                      color: '#64748b', fontSize: 11.5, textTransform: 'uppercase',
                      letterSpacing: '0.5px', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((staff, i) => {
                  const rc = getRoleConfig(staff.role);
                  const initials = `${(staff.firstName || '?')[0]}${(staff.lastName || '')[0] || ''}`.toUpperCase();
                  return (
                    <tr key={staff.id || i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: `${rc.color}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: rc.color, flexShrink: 0,
                          }}>
                            {initials}
                          </div>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {staff.firstName} {staff.lastName}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Mail size={12} style={{ color: '#94a3b8' }} />
                          {staff.email}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          background: `${rc.color}15`, color: rc.color,
                          fontSize: 11, fontWeight: 700, border: `1px solid ${rc.color}30`,
                        }}>
                          {rc.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {staff.createdAt
                          ? new Date(staff.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => handleRemoveStaff(staff.id, `${staff.firstName} ${staff.lastName}`)}
                          disabled={deletingId === staff.id}
                          style={{
                            padding: '6px 12px', border: '1.5px solid #fca5a5',
                            borderRadius: 8, background: '#fff',
                            cursor: deletingId === staff.id ? 'not-allowed' : 'pointer',
                            color: '#dc2626', fontSize: 12, fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 5,
                            opacity: deletingId === staff.id ? 0.6 : 1,
                          }}
                        >
                          {deletingId === staff.id
                            ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Trash2 size={12} />}
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div style={{
        marginTop: 20, background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: 12, padding: '14px 18px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <Shield size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: '#1d4ed8' }}>
          <strong>Role Access:</strong> Warehouse Manager → full access &nbsp;|&nbsp;
          Receiving → PO + GRN &nbsp;|&nbsp;
          Picker/Packer/Shipping → order fulfilment &nbsp;|&nbsp;
          <span style={{ color: '#4f46e5' }}>Auditor + Viewer → managed via <strong>Audit Management</strong></span>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => {
            showToast(msg);
            loadStaff();
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
  borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none',
  boxSizing: 'border-box', background: '#fff',
};

const labelStyle = {
  fontSize: 13, fontWeight: 600, color: '#374151',
  display: 'block', marginBottom: 6,
};

const pillStyle = (active, color) => ({
  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
  border: `1.5px solid ${active ? color : '#e2e8f0'}`,
  background: active ? `${color}15` : '#fff',
  color: active ? color : '#64748b',
  cursor: 'pointer', transition: 'all 0.15s',
});
