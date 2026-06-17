import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Trash2, RefreshCw, Mail, Shield,
  Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, X
} from 'lucide-react';

const AUTH_API = 'http://localhost:9999/api/auth';

const getToken = () =>
  sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// Role config — AUDITOR + VIEWER excluded (managed by Admin only)
const ROLES = [
  { value: 'RECEIVING', label: '📥 Receiving Staff',  color: '#0891b2', desc: 'Receives incoming goods' },
  { value: 'PICKER',    label: '🔍 Picker',           color: '#059669', desc: 'Picks items for orders' },
  { value: 'PACKER',    label: '📦 Packer',           color: '#d97706', desc: 'Packs items for shipping' },
  { value: 'SHIPPING',  label: '🚚 Shipping Staff',   color: '#dc2626', desc: 'Handles outgoing shipments' },
];

// Roles managed exclusively by Admin — not shown or addable here
const ADMIN_ONLY_ROLES = ['AUDITOR', 'VIEWER'];

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
    firstName: '', lastName: '', email: '', role: 'RECEIVING', password: ''
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
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          password: form.password.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add staff');

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
        maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
              Add New Staff Member
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
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                First Name *
              </label>
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
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Last Name
              </label>
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
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Email Address *
            </label>
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
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
              Role *
            </label>
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

          {/* Password (optional) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Password <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — auto-generated if empty)</span>
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
                borderRadius: 10, background: loading ? '#94a3b8' : '#0d9488',
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

// ─── Main Staff Management Component ─────────────────────────────────────────

// Picker availability stored in localStorage: { [staffId]: true/false }
const PICKER_AVAIL_KEY = 'picker_availability';

const getPickerAvailability = () => {
  try { return JSON.parse(localStorage.getItem(PICKER_AVAIL_KEY) || '{}'); }
  catch { return {}; }
};

const setPickerAvailability = (staffId, available) => {
  const map = getPickerAvailability();
  map[staffId] = available;
  localStorage.setItem(PICKER_AVAIL_KEY, JSON.stringify(map));
  // Dispatch event so PickListAssignment can react
  window.dispatchEvent(new Event('picker_availability_update'));
};

export { getPickerAvailability };

export default function StaffManagement() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterRole, setFilterRole] = useState('ALL');
  const [pickerAvailability, setPickerAvailabilityState] = useState(getPickerAvailability);

  const userRole = sessionStorage.getItem('warehouseUserRole') || '';

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const togglePickerAvailability = (staffId) => {
    const current = pickerAvailability[staffId] !== false; // default = available
    setPickerAvailability(staffId, !current);
    setPickerAvailabilityState(getPickerAvailability());
    showToast(
      `${staffList.find(s => s.id === staffId)?.firstName || 'Picker'} marked as ${!current ? 'Available' : 'Unavailable'}`,
      !current ? 'success' : 'info'
    );
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/warehouse/manager/staff`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to load staff');
      const data = await res.json();
      // Exclude AUDITOR + VIEWER — managed by Admin only
      setStaffList(Array.isArray(data) ? data.filter(s => !ADMIN_ONLY_ROLES.includes(s.role)) : []);
    } catch (err) {
      showToast(err.message, 'error');
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

  const filteredStaff = filterRole === 'ALL'
    ? staffList
    : staffList.filter(s => s.role === filterRole);

  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r.value] = staffList.filter(s => s.role === r.value).length;
    return acc;
  }, {});

  // Only WAREHOUSE_MANAGER can manage staff
  if (userRole !== 'WAREHOUSE_MANAGER') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Shield size={48} style={{ color: '#dc2626', marginBottom: 16 }} />
        <h3 style={{ color: '#1e293b', margin: '0 0 8px' }}>Access Denied</h3>
        <p style={{ color: '#64748b' }}>Only Warehouse Manager can manage staff.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
            Staff Management
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
            {staffList.length} staff member{staffList.length !== 1 ? 's' : ''} in your warehouse team
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={loadStaff}
            style={{
              padding: '10px 16px', border: '1.5px solid #e2e8f0', borderRadius: 10,
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
              padding: '10px 20px', border: 'none', borderRadius: 10,
              background: '#0d9488', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 700, color: '#fff',
              boxShadow: '0 2px 8px rgba(13,148,136,0.3)',
            }}
          >
            <UserPlus size={16} />
            Add Staff
          </button>
        </div>
      </div>

      {/* Role Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
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
            <div style={{ fontSize: 22, fontWeight: 800, color: role.color }}>
              {roleCounts[role.value] || 0}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {role.label.replace(/^[^\s]+\s/, '')}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterRole('ALL')}
          style={filterPillStyle(filterRole === 'ALL', '#0d9488')}
        >
          All ({staffList.length})
        </button>
        {ROLES.filter(r => roleCounts[r.value] > 0).map(role => (
          <button
            key={role.value}
            onClick={() => setFilterRole(role.value)}
            style={filterPillStyle(filterRole === role.value, role.color)}
          >
            {role.label} ({roleCounts[role.value]})
          </button>
        ))}
      </div>

      {/* Staff Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p>Loading staff...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, background: '#f8fafc',
          borderRadius: 16, border: '2px dashed #e2e8f0',
        }}>
          <Users size={48} style={{ color: '#cbd5e1', marginBottom: 16 }} />
          <h3 style={{ color: '#1e293b', margin: '0 0 8px' }}>No Staff Members</h3>
          <p style={{ color: '#64748b', margin: '0 0 20px' }}>
            {filterRole === 'ALL'
              ? 'Add your first staff member to get started'
              : `No ${filterRole} staff found`}
          </p>
          {filterRole === 'ALL' && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '10px 24px', border: 'none', borderRadius: 10,
                background: '#0d9488', color: '#fff', cursor: 'pointer',
                fontSize: 14, fontWeight: 700,
              }}
            >
              + Add First Staff Member
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredStaff.map(staff => {
            const roleConfig = getRoleConfig(staff.role);
            return (
              <div
                key={staff.id}
                style={{
                  background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14,
                  padding: '16px 20px', display: 'flex', alignItems: 'center',
                  gap: 16, flexWrap: 'wrap',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.15s',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: `${roleConfig.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: roleConfig.color,
                  flexShrink: 0,
                }}>
                  {(staff.firstName || staff.email || '?')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                    {staff.firstName} {staff.lastName}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Mail size={12} />
                    {staff.email}
                  </div>
                </div>

                {/* Role Badge */}
                <div style={{
                  padding: '5px 14px', borderRadius: 20,
                  background: `${roleConfig.color}15`,
                  color: roleConfig.color,
                  fontSize: 12, fontWeight: 700,
                  border: `1px solid ${roleConfig.color}30`,
                  flexShrink: 0,
                }}>
                  {roleConfig.label}
                </div>

                {/* Joined Date */}
                <div style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>
                  Joined {staff.createdAt
                    ? new Date(staff.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </div>

                {/* Availability Toggle — only for PICKER role */}
                {staff.role === 'PICKER' && (() => {
                  const isAvailable = pickerAvailability[staff.id] !== false;
                  return (
                    <div
                      onClick={() => togglePickerAvailability(staff.id)}
                      title={isAvailable ? 'Click to mark Unavailable' : 'Click to mark Available'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer', flexShrink: 0,
                        padding: '5px 12px',
                        borderRadius: 20,
                        border: `1.5px solid ${isAvailable ? '#16a34a' : '#d1d5db'}`,
                        background: isAvailable ? '#f0fdf4' : '#f9fafb',
                        transition: 'all 0.2s',
                        userSelect: 'none',
                      }}
                    >
                      {/* Toggle pill */}
                      <div style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: isAvailable ? '#16a34a' : '#d1d5db',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}>
                        <div style={{
                          position: 'absolute', top: 3,
                          left: isAvailable ? 18 : 3,
                          width: 14, height: 14, borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: isAvailable ? '#16a34a' : '#9ca3af',
                      }}>
                        {isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  );
                })()}

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveStaff(staff.id, `${staff.firstName} ${staff.lastName}`)}
                  disabled={deletingId === staff.id}
                  style={{
                    padding: '7px 14px', border: '1.5px solid #fca5a5',
                    borderRadius: 8, background: '#fff', cursor: deletingId === staff.id ? 'not-allowed' : 'pointer',
                    color: '#dc2626', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                    opacity: deletingId === staff.id ? 0.6 : 1,
                    flexShrink: 0,
                  }}
                >
                  {deletingId === staff.id
                    ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Trash2 size={13} />}
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin-only roles notice */}
      <div style={{
        marginTop: 20, background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: 12, padding: '12px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <Shield size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: '#1d4ed8' }}>
          <strong>Note:</strong> Auditor and Viewer roles are managed by Admin only and are not available here.
        </div>
      </div>

      {/* Add Staff Modal */}
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

      {/* Spin animation */}
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
  transition: 'border-color 0.15s',
};

const filterPillStyle = (active, color) => ({
  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
  border: `1.5px solid ${active ? color : '#e2e8f0'}`,
  background: active ? `${color}15` : '#fff',
  color: active ? color : '#64748b',
  cursor: 'pointer', transition: 'all 0.15s',
});
