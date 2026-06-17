import React, { useState, useEffect, useCallback } from 'react';
import '../css/CustomersModernPro.css';
import {
  FaUserPlus, FaEdit, FaTrash, FaUserShield, FaUser,
  FaSearch, FaUsers, FaToggleOn, FaToggleOff, FaCheck, FaTimes
} from 'react-icons/fa';
import { PromoteUserForm } from './PromoteUserForm';

// ── inline toast ──────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="cmp-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`cmp-toast cmp-toast-${t.type}`}>
          {t.type === 'success' ? <FaCheck /> : <FaTimes />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ config, onConfirm, onCancel }) {
  if (!config) return null;
  return (
    <div className="cmp-modal-overlay" onClick={onCancel}>
      <div className="cmp-modal cmp-modal-small" onClick={e => e.stopPropagation()}>
        <div className="cmp-modal-header">
          <h3>{config.title}</h3>
          <button className="cmp-modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="cmp-modal-body">
          <p>{config.message}</p>
          {config.warning && <p className="cmp-warning-text">{config.warning}</p>}
        </div>
        <div className="cmp-modal-footer">
          <button className="cmp-btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={config.danger ? 'cmp-btn-danger' : 'cmp-btn-primary'} onClick={onConfirm}>
            {config.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('token') || localStorage.getItem('authToken');
const getRole  = () => localStorage.getItem('userRole') || localStorage.getItem('role') || 'ADMIN';
const authHeaders = () => {
  const h = { 'Content-Type': 'application/json', 'X-User-Role': getRole() };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
};

const ENDPOINTS = {
  customers:  ['http://localhost:9999/api/auth/admin/customers'],
  create:     ['http://localhost:9999/api/auth/admin/customer'],
  update: id => [`http://localhost:9999/api/auth/admin/customer/${id}`],
  delete: id => [`http://localhost:9999/api/auth/admin/customer/${id}`],
  promote:    id => `http://localhost:9999/api/auth/admin/promote?customerId=${id}`,
  demote:     id => `http://localhost:9999/api/auth/admin/demote?customerId=${id}`,
  status:     (id, s) => `http://localhost:9999/api/auth/admin/customer/status?customerId=${id}&status=${s}`,
};

async function tryEndpoints(urls, options) {
  for (const url of urls) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch { /* try next */ }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CustomersModernPro() {
  const [customers, setCustomers]               = useState([]);
  const [deliveryBoyEmails, setDeliveryBoyEmails] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [actionLoading, setActionLoading]       = useState(null); // customerId being acted on
  const [searchQuery, setSearchQuery]           = useState('');
  const [roleFilter, setRoleFilter]             = useState('all');
  const [statusFilter, setStatusFilter]         = useState('all');
  const [editingCustomer, setEditingCustomer]   = useState(null);
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [confirmConfig, setConfirmConfig]       = useState(null);
  const [confirmCallback, setConfirmCallback]   = useState(null);
  const [showPromoteForm, setShowPromoteForm]   = useState(false);
  const [toasts, setToasts]                     = useState([]);
  const [formData, setFormData]                 = useState({
    customerId: '', firstName: '', lastName: '', email: '',
    phone: '', address: '', city: '', state: '', pincode: '', isAdmin: false
  });

  // ── toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── confirm helper ──────────────────────────────────────────────────────────
  const confirm = (config) => new Promise(resolve => {
    setConfirmConfig(config);
    setConfirmCallback(() => resolve);
  });

  const handleConfirm = () => { confirmCallback(true);  setConfirmConfig(null); setConfirmCallback(null); };
  const handleCancel  = () => { confirmCallback(false); setConfirmConfig(null); setConfirmCallback(null); };

  // ── load ────────────────────────────────────────────────────────────────────
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const [res, dbRes] = await Promise.all([
      tryEndpoints(ENDPOINTS.customers, { headers: authHeaders() }),
      fetch('http://localhost:9999/api/auth/admin/delivery-boys', { headers: authHeaders() })
        .catch(() => null),
    ]);
    if (res) {
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } else {
      setCustomers([]);
    }
    if (dbRes && dbRes.ok) {
      const dbData = await dbRes.json();
      setDeliveryBoyEmails(Array.isArray(dbData) ? dbData : []);
    } else {
      setDeliveryBoyEmails([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  // ── role helper ──────────────────────────────────────────────────────────────
  const getCustomerRole = (customer) => {
    if (customer.isAdmin === true) return 'ADMIN';
    if (customer.isDeliveryBoy === true || deliveryBoyEmails.includes(customer.email)) return 'DELIVERY_BOY';
    if (customer.isWarehouseStaff === true) return customer.warehouseRole || customer.role || 'WAREHOUSE_STAFF';
    if (customer.role && customer.role !== 'USER') return customer.role;
    return 'USER';
  };

  const WAREHOUSE_ROLES = ['WAREHOUSE_MANAGER', 'RECEIVING_CLERK', 'PICK_STAFF', 'PACK_STAFF', 'SHIPPING_STAFF', 'AUDIT_STAFF', 'VIEW_STAFF', 'PICKER', 'PACKER', 'SHIPPING'];
  const isWarehouseRole = (role) => WAREHOUSE_ROLES.includes(role?.toUpperCase());

  // ── filter ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...customers];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => {
        const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
        return name.includes(q) || c.email?.toLowerCase().includes(q);
      });
    }
    if (roleFilter === 'ADMIN') result = result.filter(c => c.isAdmin === true);
    if (roleFilter === 'DELIVERY_BOY') result = result.filter(c => c.isDeliveryBoy === true || deliveryBoyEmails.includes(c.email));
    if (roleFilter === 'WAREHOUSE_STAFF') result = result.filter(c => {
      const role = getCustomerRole(c);
      return c.isWarehouseStaff === true || isWarehouseRole(role);
    });
    if (roleFilter === 'USER')  result = result.filter(c => {
      const role = getCustomerRole(c);
      return role === 'USER';
    });
    if (statusFilter === 'active')   result = result.filter(c => c.status === 'ACTIVE' || !c.status);
    if (statusFilter === 'inactive') result = result.filter(c => c.status === 'BLOCKED');
    setFilteredCustomers(result);
  }, [customers, searchQuery, roleFilter, statusFilter, deliveryBoyEmails]);

  // ── stats (always from full list) ───────────────────────────────────────────
  const stats = {
    total:  customers.length,
    admins: customers.filter(c => c.isAdmin === true).length,
    users:  customers.filter(c => getCustomerRole(c) === 'USER').length,
    active: customers.filter(c => c.status === 'ACTIVE' || !c.status).length,
  };

  // ── optimistic update helper ────────────────────────────────────────────────
  const updateCustomerInState = (id, patch) => {
    setCustomers(prev => prev.map(c => (c.id || c.customerId) === id ? { ...c, ...patch } : c));
  };

  // ── EDIT ────────────────────────────────────────────────────────────────────
  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customerId: customer.id || customer.customerId,
      firstName:  customer.firstName || '',
      lastName:   customer.lastName  || '',
      email:      customer.email     || '',
      phone:      customer.phoneNumber || customer.phone || '',
      address:    customer.address   || '',
      city:       customer.city      || '',
      state:      customer.state     || '',
      pincode:    customer.pincode   || '',
      isAdmin:    customer.isAdmin   || false,
    });
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ customerId: '', firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', isAdmin: false });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  // ── SUBMIT (Create / Update) ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      id:          editingCustomer ? parseInt(formData.customerId) : undefined,
      firstName:   formData.firstName,
      lastName:    formData.lastName,
      email:       formData.email,
      phoneNumber: formData.phone,
      address:     formData.address,
      city:        formData.city,
      state:       formData.state,
      pincode:     formData.pincode,
      isAdmin:     formData.isAdmin,
    };

    const urls    = editingCustomer ? ENDPOINTS.update(payload.id) : ENDPOINTS.create;
    const method  = editingCustomer ? 'PUT' : 'POST';

    const res = await tryEndpoints(urls, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (res) {
      const saved = await res.json().catch(() => payload);
      if (editingCustomer) {
        // optimistic: patch in place
        updateCustomerInState(payload.id, { ...saved, ...payload });
        showToast('Customer updated successfully');
      } else {
        // add new row
        setCustomers(prev => [...prev, saved]);
        showToast('Customer added successfully');
      }
      handleCloseModal();
    } else {
      showToast('Failed to save customer. Check server connection.', 'error');
    }
  };

  // ── DELETE ───────────────────────────────────────────────────────────────────
  const handleDeleteClick = async (customer) => {
    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const ok = await confirm({
      title: 'Delete Customer',
      message: `Are you sure you want to delete ${fullName}?`,
      warning: 'This action cannot be undone.',
      confirmLabel: 'Delete Customer',
      danger: true,
    });
    if (!ok) return;

    const id = customer.id || customer.customerId;
    setActionLoading(id);
    const res = await tryEndpoints(ENDPOINTS.delete(id), { method: 'DELETE', headers: authHeaders() });
    setActionLoading(null);

    if (res) {
      // optimistic: remove from state
      setCustomers(prev => prev.filter(c => (c.id || c.customerId) !== id));
      showToast(`${fullName} deleted successfully`);
    } else {
      showToast('Failed to delete customer. Check server connection.', 'error');
    }
  };

  // ── ROLE CHANGE ──────────────────────────────────────────────────────────────
  const handleRoleChange = async (customer) => {
    const id       = customer.id || customer.customerId;
    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const isAdmin  = customer.isAdmin;

    const ok = await confirm({
      title:        isAdmin ? 'Remove Admin Role' : 'Promote to Admin',
      message:      isAdmin
        ? `Remove Admin privileges from ${fullName}? They will become a regular Customer.`
        : `Promote ${fullName} to Admin? They will have full admin access.`,
      confirmLabel: isAdmin ? 'Demote to Customer' : 'Make Admin',
      danger:       isAdmin,
    });
    if (!ok) return;

    setActionLoading(id);
    try {
      const url    = isAdmin ? ENDPOINTS.demote(id) : ENDPOINTS.promote(id);
      const method = isAdmin ? 'DELETE' : 'POST';
      const res    = await fetch(url, { method, headers: authHeaders() });

      if (res.ok) {
        const newIsAdmin = !isAdmin;
        // optimistic update — reflects immediately in table + stats
        updateCustomerInState(id, { isAdmin: newIsAdmin });

        // if the promoted/demoted user is the currently logged-in user, update session
        const currentUserId = localStorage.getItem('customerId') || localStorage.getItem('userId');
        if (String(id) === String(currentUserId)) {
          const newRole = newIsAdmin ? 'ADMIN' : 'USER';
          localStorage.setItem('isAdmin', String(newIsAdmin));
          localStorage.setItem('userRole', newRole);
          localStorage.setItem('role', newIsAdmin ? 'ADMIN' : 'CUSTOMER');
          if (newIsAdmin) {
            localStorage.setItem('isNewAdmin', 'true');
            localStorage.setItem('currentView', 'admin');
          } else {
            // Clear admin-specific session keys so stale JWT doesn't re-grant admin access
            localStorage.removeItem('isNewAdmin');
            localStorage.removeItem('hasLoggedInAsAdmin');
            localStorage.setItem('currentView', 'user');
            // Force token refresh: clear tokens so user must re-login with fresh USER token
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
          }
          window.dispatchEvent(new CustomEvent('roleChanged', { detail: { newRole } }));
        } else if (isAdmin && !newIsAdmin) {
          // Demoting another user — store their ID so their stale token is rejected on next load
          const demotedUsers = JSON.parse(localStorage.getItem('demotedUsers') || '[]');
          if (!demotedUsers.includes(String(id))) {
            demotedUsers.push(String(id));
            localStorage.setItem('demotedUsers', JSON.stringify(demotedUsers));
          }
        }

        showToast(
          newIsAdmin
            ? `${fullName} is now an Admin`
            : `${fullName} is now a regular Customer`
        );
        // Re-fetch from DB so both screens reflect the persisted change
        loadCustomers();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || `Failed to ${isAdmin ? 'demote' : 'promote'} user`, 'error');
      }
    } catch {
      showToast('Network error. Check server connection.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── STATUS TOGGLE ────────────────────────────────────────────────────────────
  const handleStatusToggle = async (customer) => {
    const id        = customer.id || customer.customerId;
    const fullName  = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const curStatus = customer.status || 'ACTIVE';
    const newStatus = curStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    const action    = newStatus === 'BLOCKED' ? 'Block' : 'Unblock';

    const ok = await confirm({
      title:        `${action} Customer`,
      message:      `${action} ${fullName}?`,
      confirmLabel: action,
      danger:       newStatus === 'BLOCKED',
    });
    if (!ok) return;

    setActionLoading(id);
    try {
      const res = await fetch(ENDPOINTS.status(id, newStatus), {
        method: 'PUT',
        headers: authHeaders(),
      });

      if (res.ok) {
        // optimistic update
        updateCustomerInState(id, { status: newStatus });
        showToast(`${fullName} has been ${action.toLowerCase()}ed`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || `Failed to ${action.toLowerCase()} customer`, 'error');
      }
    } catch {
      showToast('Network error. Check server connection.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────────────
  const getInitials = (first, last) => ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || 'NA';
  const formatDate  = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never';

  // ── render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="cmp-loading">
        <div className="cmp-spinner"></div>
      </div>
    );
  }

  return (
    <div className="cmp-container">
      <Toast toasts={toasts} />

      <main className="cmp-main">
        <div className="cmp-content">

          {/* Header */}
          <div className="cmp-header">
            <div>
              <h1 className="cmp-title">Customer Management</h1>
              <p className="cmp-subtitle">Manage users, roles, and permissions</p>
            </div>
            <div className="flex gap-3">
              <button className="cmp-btn-secondary" onClick={loadCustomers} style={{ backgroundColor: '#6b7280', color: 'white' }}>
                🔄 Refresh
              </button>
              <button className="cmp-btn-secondary" onClick={() => setShowPromoteForm(true)} style={{ backgroundColor: '#10b981', color: 'white' }}>
                <FaUserShield className="cmp-icon" /> Promote with Credentials
              </button>
              <button className="cmp-btn-primary" onClick={handleOpenAdd}>
                <FaUserPlus className="cmp-icon" /> Add Customer
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="cmp-stats-grid">
            {[
              { label: 'Total Users',     value: stats.total,  cls: 'cmp-stat-primary',  icon: <FaUsers /> },
              { label: 'Administrators',  value: stats.admins, cls: 'cmp-stat-violet',   icon: <FaUserShield /> },
              { label: 'Customers',       value: stats.users,  cls: 'cmp-stat-emerald',  icon: <FaUser /> },
              { label: 'Active Users',    value: stats.active, cls: 'cmp-stat-amber',    icon: <FaToggleOn /> },
            ].map(s => (
              <div key={s.label} className="cmp-stat-card">
                <div className="cmp-stat-content">
                  <div>
                    <p className="cmp-stat-label">{s.label}</p>
                    <p className={`cmp-stat-value ${s.cls}`}>{s.value}</p>
                  </div>
                  <div className={`cmp-stat-icon cmp-stat-icon-${s.cls.replace('cmp-stat-', '')}`}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="cmp-search-card">
            <div className="cmp-search-wrapper">
              <FaSearch className="cmp-search-icon" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="cmp-search-input"
              />
            </div>
            <div className="cmp-filters">
              <select value={roleFilter}   onChange={e => setRoleFilter(e.target.value)}   className="cmp-select">
                <option value="all">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="DELIVERY_BOY">Delivery Boy</option>
                <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                <option value="USER">Customer</option>
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="cmp-select">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="cmp-table-card">
            {filteredCustomers.length === 0 ? (
              <div className="cmp-empty">
                {customers.length === 0
                  ? <div>
                      <p><strong>No customers found in database</strong></p>
                      <p style={{ marginTop: 8, color: '#6b7280' }}>Make sure the auth server is running and customers are registered.</p>
                    </div>
                  : <p>No customers match your search criteria</p>
                }
              </div>
            ) : (
              <table className="cmp-table">
                <thead>
                  <tr className="cmp-table-header">
                    <th>ID</th>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Joined</th>
                    <th className="cmp-text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => {
                    const id         = customer.id || customer.customerId;
                    const fullName   = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A';
                    const busy       = actionLoading === id;
                    const custRole   = getCustomerRole(customer);
                    const isWH       = customer.isWarehouseStaff === true || isWarehouseRole(custRole);
                    const isDB       = custRole === 'DELIVERY_BOY';
                    const isAdm      = custRole === 'ADMIN';

                    // Human-readable warehouse role labels
                    const WH_LABELS = {
                      WAREHOUSE_MANAGER: 'WH Manager',
                      RECEIVING_CLERK:   'Receiving',
                      PICK_STAFF:        'Picker',
                      PACK_STAFF:        'Packer',
                      SHIPPING_STAFF:    'Shipping',
                      AUDIT_STAFF:       'Auditor',
                      VIEW_STAFF:        'Viewer',
                      PICKER:            'Picker',
                      PACKER:            'Packer',
                      SHIPPING:          'Shipping',
                    };
                    const roleLabel = isAdm ? 'Admin'
                      : isDB  ? 'Delivery Boy'
                      : isWH  ? (WH_LABELS[custRole?.toUpperCase()] || custRole)
                      : 'Customer';

                    const avatarClass = isAdm ? 'cmp-avatar-admin'
                      : isDB  ? 'cmp-avatar-delivery'
                      : isWH  ? 'cmp-avatar-warehouse'
                      : '';

                    const badgeClass = isAdm ? 'cmp-badge-admin'
                      : isDB  ? 'cmp-badge-delivery'
                      : isWH  ? 'cmp-badge-warehouse'
                      : 'cmp-badge-user';

                    const badgeIcon = isAdm ? <FaUserShield className="cmp-badge-icon" />
                      : isDB  ? <span className="cmp-badge-icon">🚚</span>
                      : isWH  ? <span className="cmp-badge-icon">🏭</span>
                      : <FaUser className="cmp-badge-icon" />;

                    return (
                      <tr key={id} className={`cmp-table-row${busy ? ' cmp-row-busy' : ''}`}>
                        <td><span className="cmp-customer-id">{id}</span></td>
                        <td>
                          <div className="cmp-user-cell">
                            <div className={`cmp-avatar ${avatarClass}`}>
                              {getInitials(customer.firstName, customer.lastName)}
                            </div>
                            <div className="cmp-user-details">
                              <span className="cmp-user-name">{fullName}</span>
                              <span className="cmp-user-email">{customer.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="cmp-contact-email">{customer.email}</p>
                          <p className="cmp-contact-phone">{customer.phoneNumber || customer.phone || 'N/A'}</p>
                        </td>
                        <td>
                          <span className={`cmp-badge ${badgeClass}`}>
                            {badgeIcon}
                            {roleLabel}
                          </span>
                        </td>
                        <td>
                          <span className={`cmp-badge ${customer.status === 'BLOCKED' ? 'cmp-badge-inactive' : 'cmp-badge-active'}`}>
                            {customer.status === 'BLOCKED' ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td className="cmp-date-cell">{formatDate(customer.updatedAt)}</td>
                        <td className="cmp-date-cell">{formatDate(customer.createdAt)}</td>
                        <td>
                          <div className="cmp-actions">
                            {/* Edit */}
                            <button
                              className="cmp-action-btn cmp-action-edit"
                              onClick={() => handleEdit(customer)}
                              title="Edit Details"
                              disabled={busy}
                            >
                              <FaEdit />
                            </button>
                            {/* Role toggle */}
                            <button
                              className={`cmp-action-btn ${customer.isAdmin ? 'cmp-action-admin' : 'cmp-action-role'}`}
                              onClick={() => handleRoleChange(customer)}
                              title={customer.isAdmin ? 'Demote to Customer' : 'Promote to Admin'}
                              disabled={busy}
                            >
                              <FaUserShield />
                            </button>
                            {/* Status toggle */}
                            <button
                              className="cmp-action-btn cmp-action-status"
                              onClick={() => handleStatusToggle(customer)}
                              title={customer.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                              disabled={busy}
                            >
                              {customer.status === 'BLOCKED' ? <FaToggleOff /> : <FaToggleOn />}
                            </button>
                            {/* Delete */}
                            <button
                              className="cmp-action-btn cmp-action-delete"
                              onClick={() => handleDeleteClick(customer)}
                              title="Delete User"
                              disabled={busy}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="cmp-modal-overlay" onClick={handleCloseModal}>
          <div className="cmp-modal" onClick={e => e.stopPropagation()}>
            <div className="cmp-modal-header">
              <h3>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button className="cmp-modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="cmp-modal-form">
              {!editingCustomer && (
                <div className="cmp-form-group">
                  <label>Customer ID</label>
                  <input
                    type="number"
                    value={formData.customerId}
                    onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                    required
                    placeholder="Enter customer ID"
                  />
                </div>
              )}
              <div className="cmp-form-row">
                <div className="cmp-form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    placeholder="First name"
                  />
                </div>
                <div className="cmp-form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="cmp-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="Enter email address"
                />
              </div>
              <div className="cmp-form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="cmp-form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>
              <div className="cmp-form-row">
                <div className="cmp-form-group">
                  <label>City</label>
                  <input type="text" value={formData.city}    onChange={e => setFormData({ ...formData, city: e.target.value })}    placeholder="City" />
                </div>
                <div className="cmp-form-group">
                  <label>State</label>
                  <input type="text" value={formData.state}   onChange={e => setFormData({ ...formData, state: e.target.value })}   placeholder="State" />
                </div>
                <div className="cmp-form-group">
                  <label>Pincode</label>
                  <input type="text" value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} placeholder="Pincode" />
                </div>
              </div>
              {/* Role selector in form */}
              <div className="cmp-form-group">
                <label>Role</label>
                <select
                  value={formData.isAdmin ? 'ADMIN' : 'USER'}
                  onChange={e => setFormData({ ...formData, isAdmin: e.target.value === 'ADMIN' })}
                  className="cmp-select"
                  style={{ width: '100%' }}
                >
                  <option value="USER">Customer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="cmp-modal-footer">
                <button type="button" className="cmp-btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="cmp-btn-primary">
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal config={confirmConfig} onConfirm={handleConfirm} onCancel={handleCancel} />

      {/* Promote with Credentials */}
      {showPromoteForm && (
        <PromoteUserForm
          onClose={() => setShowPromoteForm(false)}
          onSuccess={() => { loadCustomers(); showToast('User promoted successfully'); }}
        />
      )}
    </div>
  );
}
