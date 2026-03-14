import React, { useState, useEffect } from 'react';
import '../css/CustomersModernPro.css';
import { FaUserPlus, FaEdit, FaTrash, FaUserShield, FaUser, FaPowerOff, FaSearch, FaUsers, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { adminService } from '../../services/adminApi';

export default function CustomersModernPro() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery, roleFilter, statusFilter]);

  const loadCustomers = async () => {
    try {
      const response = await fetch('http://localhost:2000/api/auth/admin/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let result = [...customers];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(customer => {
        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        return fullName.toLowerCase().includes(query) || 
               customer.email?.toLowerCase().includes(query);
      });
    }
    
    if (roleFilter !== 'all') {
      result = result.filter(customer => customer.role === roleFilter);
    }
    
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter(customer => customer.isActive === isActive);
    }
    
    setFilteredCustomers(result);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customerId: customer.id || customer.customerId,
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      email: customer.email,
      phone: customer.phoneNumber || customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await adminService.customers.deleteCustomer(deletingCustomer.id || deletingCustomer.customerId);
      await loadCustomers();
      setDeletingCustomer(null);
    } catch (error) {
      alert('Failed to delete customer: ' + error.message);
    }
  };

  const handleRoleChange = async (customerId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await adminService.customers.updateUserRole(customerId, newRole);
      loadCustomers();
    } catch (error) {
      alert('Failed to update role: ' + error.message);
    }
  };

  const handleStatusToggle = async (customerId, currentStatus) => {
    // Implement status toggle logic here
    console.log('Toggle status for:', customerId, currentStatus);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const nameParts = formData.name.split(' ');
      const customerData = {
        id: parseInt(formData.customerId),
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: formData.email,
        phoneNumber: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode
      };
      
      if (editingCustomer) {
        await adminService.customers.updateCustomer(customerData.id, customerData);
      } else {
        await adminService.customers.addCustomerDetails(customerData);
      }
      
      await loadCustomers();
      handleCloseModal();
    } catch (err) {
      alert('Failed to save customer: ' + err.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({ customerId: '', name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '' });
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'NA';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const stats = {
    total: customers.length,
    admins: customers.filter(c => c.role === 'ADMIN').length,
    users: customers.filter(c => c.role === 'USER' || !c.role).length,
    active: customers.filter(c => c.isActive !== false).length
  };

  if (loading) {
    return (
      <div className="cmp-loading">
        <div className="cmp-spinner"></div>
      </div>
    );
  }

  return (
    <div className="cmp-container">
      <main className="cmp-main">
        <div className="cmp-content">
          {/* Header */}
          <div className="cmp-header">
            <div>
              <h1 className="cmp-title">Customer Management</h1>
              <p className="cmp-subtitle">Manage users, roles, and permissions</p>
            </div>
            <button className="cmp-btn-primary" onClick={() => setIsModalOpen(true)}>
              <FaUserPlus className="cmp-icon" />
              Add Customer
            </button>
          </div>

          {/* Stats Cards */}
          <div className="cmp-stats-grid">
            <div className="cmp-stat-card">
              <div className="cmp-stat-content">
                <div>
                  <p className="cmp-stat-label">Total Users</p>
                  <p className="cmp-stat-value cmp-stat-primary">{stats.total}</p>
                </div>
                <div className="cmp-stat-icon cmp-stat-icon-primary">
                  <FaUsers />
                </div>
              </div>
            </div>
            <div className="cmp-stat-card">
              <div className="cmp-stat-content">
                <div>
                  <p className="cmp-stat-label">Administrators</p>
                  <p className="cmp-stat-value cmp-stat-violet">{stats.admins}</p>
                </div>
                <div className="cmp-stat-icon cmp-stat-icon-violet"></div>
              </div>
            </div>
            <div className="cmp-stat-card">
              <div className="cmp-stat-content">
                <div>
                  <p className="cmp-stat-label">Customers</p>
                  <p className="cmp-stat-value cmp-stat-emerald">{stats.users}</p>
                </div>
                <div className="cmp-stat-icon cmp-stat-icon-emerald"></div>
              </div>
            </div>
            <div className="cmp-stat-card">
              <div className="cmp-stat-content">
                <div>
                  <p className="cmp-stat-label">Active Users</p>
                  <p className="cmp-stat-value cmp-stat-amber">{stats.active}</p>
                </div>
                <div className="cmp-stat-icon cmp-stat-icon-amber"></div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="cmp-search-card">
            <div className="cmp-search-wrapper">
              <FaSearch className="cmp-search-icon" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cmp-search-input"
              />
            </div>
            <div className="cmp-filters">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="cmp-select"
              >
                <option value="all">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="USER">Customer</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="cmp-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="cmp-table-card">
            {filteredCustomers.length === 0 ? (
              <div className="cmp-empty">
                <p>No customers found</p>
              </div>
            ) : (
              <table className="cmp-table">
                <thead>
                  <tr className="cmp-table-header">
                    <th>User</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Joined</th>
                    <th className="cmp-text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => {
                    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A';
                    return (
                      <tr key={customer.id || customer.customerId} className="cmp-table-row">
                        <td>
                          <div className="cmp-user-cell">
                            <div className="cmp-avatar">
                              {getInitials(customer.firstName, customer.lastName)}
                            </div>
                            <span className="cmp-user-name">{fullName}</span>
                          </div>
                        </td>
                        <td>
                          <div>
                            <p className="cmp-contact-email">{customer.email}</p>
                            <p className="cmp-contact-phone">{customer.phoneNumber || customer.phone || 'N/A'}</p>
                          </div>
                        </td>
                        <td>
                          <span className={`cmp-badge ${customer.role === 'ADMIN' ? 'cmp-badge-admin' : 'cmp-badge-user'}`}>
                            {customer.role === 'ADMIN' ? <FaUserShield className="cmp-badge-icon" /> : <FaUser className="cmp-badge-icon" />}
                            {customer.role === 'ADMIN' ? 'Admin' : 'Customer'}
                          </span>
                        </td>
                        <td>
                          <span className={`cmp-badge ${customer.isActive !== false ? 'cmp-badge-active' : 'cmp-badge-inactive'}`}>
                            {customer.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="cmp-date-cell">{formatDate(customer.lastLoginAt)}</td>
                        <td className="cmp-date-cell">{formatDate(customer.createdAt)}</td>
                        <td>
                          <div className="cmp-actions">
                            <button
                              className="cmp-action-btn cmp-action-edit"
                              onClick={() => handleEdit(customer)}
                              title="Edit Details"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className={`cmp-action-btn ${customer.role === 'ADMIN' ? 'cmp-action-admin' : 'cmp-action-role'}`}
                              onClick={() => handleRoleChange(customer.id || customer.customerId, customer.role || 'USER')}
                              title={customer.role === 'ADMIN' ? 'Make Customer' : 'Make Admin'}
                            >
                              <FaUserShield />
                            </button>
                            <button
                              className="cmp-action-btn cmp-action-status"
                              onClick={() => handleStatusToggle(customer.id || customer.customerId, customer.isActive)}
                              title={customer.isActive !== false ? 'Deactivate' : 'Activate'}
                            >
                              {customer.isActive !== false ? <FaToggleOn /> : <FaToggleOff />}
                            </button>
                            <button
                              className="cmp-action-btn cmp-action-delete"
                              onClick={() => setDeletingCustomer(customer)}
                              title="Delete User"
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

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="cmp-modal-overlay" onClick={handleCloseModal}>
          <div className="cmp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cmp-modal-header">
              <h3>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button className="cmp-modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="cmp-modal-form">
              <div className="cmp-form-group">
                <label>Customer ID</label>
                <input
                  type="number"
                  value={formData.customerId}
                  onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                  required
                  disabled={editingCustomer}
                  placeholder="Enter customer ID"
                />
              </div>
              <div className="cmp-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Enter full name"
                />
              </div>
              <div className="cmp-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  placeholder="Enter email address"
                />
              </div>
              <div className="cmp-form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="cmp-form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Enter address"
                />
              </div>
              <div className="cmp-form-row">
                <div className="cmp-form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Enter city"
                  />
                </div>
                <div className="cmp-form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="Enter state"
                  />
                </div>
                <div className="cmp-form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                    placeholder="Enter pincode"
                  />
                </div>
              </div>
              <div className="cmp-modal-footer">
                <button type="button" className="cmp-btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="cmp-btn-primary">
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <div className="cmp-modal-overlay" onClick={() => setDeletingCustomer(null)}>
          <div className="cmp-modal cmp-modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="cmp-modal-header">
              <h3>Delete Customer</h3>
              <button className="cmp-modal-close" onClick={() => setDeletingCustomer(null)}>×</button>
            </div>
            <div className="cmp-modal-body">
              <p>Are you sure you want to delete <strong>{deletingCustomer.firstName} {deletingCustomer.lastName}</strong>?</p>
              <p className="cmp-warning-text">This action cannot be undone.</p>
            </div>
            <div className="cmp-modal-footer">
              <button className="cmp-btn-secondary" onClick={() => setDeletingCustomer(null)}>
                Cancel
              </button>
              <button className="cmp-btn-danger" onClick={handleDelete}>
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
