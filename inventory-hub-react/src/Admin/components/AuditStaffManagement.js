import React, { useState, useEffect } from 'react';
import {
  UserPlus, Trash2, RefreshCw, Mail,
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

// Only AUDITOR and VIEWER roles
const ROLES = [
  { value: 'AUDITOR', label: '📋 Auditor', color: '#4f46e5', desc: 'View audit logs, cycle counts & inventory records' },
  { value: 'VIEWER',  label: '👁️ Viewer',  color: '#6b7280', desc: 'Read-only access to warehouse overview' },
];

const getRoleConfig = (role) =>
  ROLES.find(r => r.value === role) || { label: role, color: '#6b7280', desc: '' };

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
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
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text }}><X size={14} /></button>
    </div>
  );
}

// ─── Add Staff Modal ──────────────────────────────────────────────────────────
function AddAuditStaffModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'AUDITOR', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim()) { setError('First name is required'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Valid email is required'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/admin/audit-staff/add`, {
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
      onSuccess(`✅ ${form.firstName} added as ${form.role}. Credentials sent to ${form.email.trim().toLowerCase()}. Login: /audit/login`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Add Audit Staff</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Login portal: <strong>/audit/login</strong></p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={lbl}>First Name *</label>
              <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Rahul" style={inp} required />
            </div>
            <div>
              <label style={lbl}>Last Name</label>
              <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Patil" style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Email Address *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="auditor@company.com" style={{ ...inp, paddingLeft: 36 }} required />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Role *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ROLES.map(role => (
                <button key={role.value} type="button" onClick={() => setForm(f => ({ ...f, role: role.value }))}
                  style={{ padding: '12px', border: `2px solid ${form.role === role.value ? role.color : '#e2e8f0'}`, borderRadius: 10, background: form.role === role.value ? `${role.color}15` : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: form.role === role.value ? role.color : '#374151' }}>{role.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{role.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Password <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Auto-generated if empty" style={{ ...inp, paddingRight: 44, flex: 1 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 4 }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><XCircle size={15} /> {error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#64748b' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 10, background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #6366f1)', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Adding...</> : <><UserPlus size={15} /> Add & Send Credentials</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuditStaffManagement() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]         = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterRole, setFilterRole] = useState('ALL');

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/admin/audit-staff`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to load audit staff');
      const data = await res.json();
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Could not load audit staff. Check backend connection.', 'error');
      setStaffList([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadStaff(); }, []);

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove ${name}?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${AUTH_API}/admin/audit-staff/remove?staffId=${id}`, { method: 'DELETE', headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(`${name} removed`);
      setStaffList(prev => prev.filter(s => s.id !== id));
    } catch (err) { showToast(err.message, 'error'); }
    finally { setDeletingId(null); }
  };

  const filtered = filterRole === 'ALL' ? staffList : staffList.filter(s => s.role === filterRole);
  const auditorCount = staffList.filter(s => s.role === 'AUDITOR').length;
  const viewerCount  = staffList.filter(s => s.role === 'VIEWER').length;

  return (
    <div style={{ padding: '28px 32px', background: '#f1f5f9', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>🔍 Audit Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Manage Auditor & Viewer accounts · Login portal: <strong style={{ color: '#4f46e5' }}>/audit/login</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadStaff} style={{ padding: '9px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff', boxShadow: '0 2px 8px rgba(79,70,229,0.35)' }}>
            <UserPlus size={16} /> Add Audit Staff
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', count: staffList.length, color: '#4f46e5', bg: '#eef2ff' },
          { label: 'Auditors', count: auditorCount, color: '#4f46e5', bg: '#eef2ff' },
          { label: 'Viewers',  count: viewerCount,  color: '#6b7280', bg: '#f8fafc' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 12, padding: '14px 22px', minWidth: 110 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['ALL', 'AUDITOR', 'VIEWER'].map(r => (
          <button key={r} onClick={() => setFilterRole(r)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${filterRole === r ? '#4f46e5' : '#e2e8f0'}`, background: filterRole === r ? '#eef2ff' : '#fff', color: filterRole === r ? '#4f46e5' : '#64748b', cursor: 'pointer' }}>
            {r === 'ALL' ? `All (${staffList.length})` : r === 'AUDITOR' ? `📋 Auditor (${auditorCount})` : `👁️ Viewer (${viewerCount})`}
          </button>
        ))}
      </div>

      {/* Staff table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Audit Staff ({filtered.length})</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} /><p>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>No audit staff yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Add an Auditor or Viewer to get started</div>
            <button onClick={() => setShowModal(true)} style={{ marginTop: 16, padding: '10px 24px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>+ Add First Audit Staff</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Staff Member', 'Email', 'Role', 'Login Portal', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const rc = getRoleConfig(s.role);
                  return (
                    <tr key={s.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${rc.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: rc.color }}>
                            {(s.firstName || '?')[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.firstName} {s.lastName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={12} style={{ color: '#94a3b8' }} />{s.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: `${rc.color}15`, color: rc.color, fontSize: 11, fontWeight: 700, border: `1px solid ${rc.color}30` }}>{rc.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, background: '#eef2ff', padding: '3px 10px', borderRadius: 6 }}>/audit/login</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => handleRemove(s.id, `${s.firstName} ${s.lastName}`)} disabled={deletingId === s.id}
                          style={{ padding: '6px 12px', border: '1.5px solid #fca5a5', borderRadius: 8, background: '#fff', cursor: deletingId === s.id ? 'not-allowed' : 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, opacity: deletingId === s.id ? 0.6 : 1 }}>
                          {deletingId === s.id ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />} Remove
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
      <div style={{ marginTop: 20, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Shield size={18} style={{ color: '#4f46e5', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: '#3730a3' }}>
          <strong>Auditor</strong> — Overview + Cycle Counts + Audit Logs tabs &nbsp;|&nbsp;
          <strong>Viewer</strong> — Overview only (read-only) &nbsp;|&nbsp;
          Both login at <strong>/audit/login</strong>
        </div>
      </div>

      {showModal && <AddAuditStaffModal onClose={() => setShowModal(false)} onSuccess={(msg) => { showToast(msg); loadStaff(); }} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const lbl = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };
const inp = { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box', background: '#fff' };
