import React, { useState, useEffect } from 'react';
import '../css/Customers.css';
import { FaPlus, FaTrash, FaEdit, FaTh, FaList } from 'react-icons/fa';
import { adminService } from '../../services/adminApi';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || customer.role === filterRole;
    return matchesSearch && matchesRole;
  });

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
    const interval = setInterval(() => {
      loadCustomers();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await fetch('http://localhost:2000/api/auth/admin/customers');
      if (response.ok) {
        const customersData = await response.json();
        setCustomers(customersData || []);
        setError(null);
      } else {
        setError(`Server error: ${response.status}`);
        setCustomers([]);
      }
    } catch (err) {
      setError('Cannot connect to server');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customerId: customer.id || customer.customerId,
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.name || '',
      email: customer.email,
      phone: customer.phoneNumber || customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await adminService.customers.deleteCustomer(customerId);
        await loadCustomers();
        alert('Customer deleted successfully!');
      } catch (error) {
        alert('Failed to delete customer: ' + error.message);
      }
    }
  };

  const handleToggleRole = async (customerId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (window.confirm(`Change role to ${newRole}?`)) {
      try {
        await adminService.customers.updateUserRole(customerId, newRole);
        alert(`Role updated to ${newRole} successfully!`);
        loadCustomers();
      } catch (error) {
        alert('Failed to update role: ' + error.message);
      }
    }
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
        customerId: parseInt(formData.customerId),
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode
      };
      
      if (editingCustomer) {
        await adminService.customers.updateCustomer(customerData.id || customerData.customerId, customerData);
        alert('Customer updated successfully!');
      } else {
        await adminService.customers.addCustomerDetails(customerData);
        alert('Customer added successfully!');
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

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'NA';
  };

  if (loading) return <div className="p-6">Loading customers from database...</div>;

  return (
    <div className="customers-page-modern">
      <div className="customers-header-modern">
        <div>
          <h2>Customer Management</h2>
          <div className="status-badge">
            <span className="status-dot"></span>
            <span className="status-text">
              {error ? '❌ Database Error' : `✅ ${filteredCustomers.length} Customers Loaded`}
            </span>
          </div>
        </div>
      </div>

      <div className="controls-card">
        <div className="controls-wrapper">
          <div className="controls-left">
            <button className="add-btn-modern" onClick={() => setIsModalOpen(true)}>
              <FaPlus /> Add Customer
            </button>
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-modern"
            />
            <select 
              value={filterRole} 
              onChange={(e) => setFilterRole(e.target.value)}
              className="filter-select-modern"
            >
              <option value="all">All Roles</option>
              <option value="USER">Users</option>
              <option value="ADMIN">Admins</option>
            </select>
          </div>
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <FaTh /> Grid
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <FaList /> List
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="customers-grid">
          {filteredCustomers.map((customer) => {
            const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.name || 'N/A';
            return (
              <div key={customer.id || customer.customerId} className="customer-card-modern">
                <div className="card-header-section">
                  <div className="customer-info">
                    <div className="avatar-modern">
                      {getInitials(fullName)}
                    </div>
                    <div>
                      <h3 className="customer-name">{fullName}</h3>
                      <p className="customer-id">ID: {customer.id || customer.customerId}</p>
                    </div>
                  </div>
                  <span className={`status-badge-card ${customer.role === 'ADMIN' ? 'admin' : 'user'}`}>
                    {customer.role === 'ADMIN' ? 'ADMIN' : 'ACTIVE'}
                  </span>
                </div>
                <div className="card-contact">
                  <div className="contact-item">
                    <span>📧</span>
                    <span>{customer.email}</span>
                  </div>
                  <div className="contact-item">
                    <span>📱</span>
                    <span>{customer.phoneNumber || customer.phone || 'N/A'}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="action-btn edit" onClick={() => handleEdit(customer)}>
                    ✏️ Edit
                  </button>
                  <button 
                    className="action-btn role" 
                    onClick={() => handleToggleRole(customer.id || customer.customerId, customer.role || 'USER')}
                  >
                    🔄 Change Role
                  </button>
                  <button 
                    className="action-btn delete" 
                    onClick={() => handleDelete(customer.id || customer.customerId)}
                  >
                    🗑️ Delete
                  </button>
                  <button className="action-btn deactivate">
                    ⏸️ Deactivate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="customers-table-modern">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => {
                const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.name || 'N/A';
                return (
                  <tr key={customer.id || customer.customerId}>
                    <td>
                      <div className="table-customer-info">
                        <div className="avatar-small">
                          {getInitials(fullName)}
                        </div>
                        <div>
                          <div className="table-name">{fullName}</div>
                          <div className="table-id">ID: {customer.id || customer.customerId}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="table-email">{customer.email}</div>
                      <div className="table-phone">{customer.phoneNumber || customer.phone || 'N/A'}</div>
                    </td>
                    <td>
                      <span className={`role-badge ${customer.role === 'ADMIN' ? 'admin' : 'user'}`}>
                        {customer.role || 'USER'}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge-table active">ACTIVE</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="table-action-btn" onClick={() => handleEdit(customer)}>Edit</button>
                        <button 
                          className="table-action-btn" 
                          onClick={() => handleToggleRole(customer.id || customer.customerId, customer.role || 'USER')}
                        >
                          Change Role
                        </button>
                        <button 
                          className="table-action-btn delete" 
                          onClick={() => handleDelete(customer.id || customer.customerId)}
                        >
                          Delete
                        </button>
                        <button className="table-action-btn">Deactivate</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
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
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Enter full name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Enter address"
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Enter city"
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  placeholder="Enter state"
                />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                  placeholder="Enter pincode"
                />
              </div>
              <div className="form-buttons">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
