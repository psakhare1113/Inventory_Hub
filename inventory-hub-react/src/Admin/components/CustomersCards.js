import React, { useState, useEffect } from 'react';
import '../css/CustomersCardsAdmin.css';
import { FaPlus, FaTrash, FaEdit, FaTh, FaList, FaSearch, FaPhone, FaEnvelope, FaMapMarkerAlt, FaUserShield, FaUser, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { adminService } from '../../services/adminApi';

export default function CustomersCards() {
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
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from MySQL customers API first
      try {
        const response = await fetch('http://localhost:3001/api/customers');
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
          setError(null);
          return;
        }
      } catch (mysqlError) {
        console.warn('MySQL API not available, trying admin service:', mysqlError);
      }
      
      // Fallback to admin service
      try {
        const data = await adminService.customers.getAllCustomers();
        setCustomers(data);
        setError(null);
      } catch (adminError) {
        console.warn('Admin service failed, using static data:', adminError);
        
        // Final fallback to static data
        const staticCustomers = [
          {
            id: 1,
            firstName: 'Pooja',
            lastName: 'Sakhare', 
            email: 'psakhare1113@gmail.com',
            phoneNumber: '+917757048900',
            role: 'USER',
            status: 'ACTIVE',
            address: 'Mumbai, Maharashtra'
          },
          {
            id: 2,
            firstName: 'Pooja',
            lastName: 'Sakhare',
            email: 'test@gmail.com', 
            phoneNumber: '+917757048900',
            role: 'USER',
            status: 'ACTIVE',
            address: 'Pune, Maharashtra'
          },
          {
            id: 3,
            firstName: 'Pooja',
            lastName: 'Sakhare',
            email: 'Pooja@gemail.com',
            phoneNumber: '+1234567890',
            role: 'USER', 
            status: 'ACTIVE',
            address: 'Delhi, India'
          },
          {
            id: 4,
            firstName: 'Vedanti',
            lastName: 'Kole',
            email: 'Vedanti@gemail.com',
            phoneNumber: '+1234567890',
            role: 'USER',
            status: 'ACTIVE',
            address: 'Bangalore, Karnataka'
          }
        ];
        
        setCustomers(staticCustomers);
        setError('Using static data - Backend not available');
      }
    } catch (err) {
      setError(err.message);
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

  const getRandomColor = () => {
    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'teal'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  if (loading) return <div className="loading">Loading customers...</div>;

  return (
    <div className="customers-page-modern">
      <div className="customers-header-modern">
        <div className="header-top">
          <div className="header-info">
            <h1>Customer Management</h1>
            <p>{error && error.includes('static') ? '⚠️ Using Static Data - Backend Unavailable' : error ? '❌ Database Error' : `✅ ${customers.length} Customers Loaded`}</p>
          </div>
          <button className="add-customer-btn" onClick={() => setIsModalOpen(true)}>
            <FaPlus /> Add Customer
          </button>
        </div>

        <div className="controls-bar">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search customers..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="filter-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="USER">Users</option>
            <option value="ADMIN">Admins</option>
          </select>
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <FaTh /> Grid
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <FaList /> List
            </button>
          </div>
        </div>
      </div>

      <div className={`customers-container ${viewMode}`}>
        {filteredCustomers.map((customer) => {
          const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.name || 'N/A';
          const initials = getInitials(fullName);
          const avatarColor = getRandomColor();
          
          return (
            <div key={customer.id || customer.customerId} className="customer-card">
              <div className="card-header-section">
                <div className="customer-avatar">
                  <div className={`avatar-circle ${avatarColor}`}>
                    {initials}
                  </div>
                  <div className="customer-basic-info">
                    <h3 className="customer-name">{fullName}</h3>
                    <span className="customer-id">ID: {customer.id || customer.customerId}</span>
                  </div>
                </div>
                <div className={`role-badge ${customer.role === 'ADMIN' ? 'admin' : 'active'}`}>
                  {customer.role === 'ADMIN' ? <FaUserShield /> : <FaUser />}
                  {customer.role === 'ADMIN' ? 'ADMIN' : 'ACTIVE'}
                </div>
              </div>

              <div className="card-body-section">
                <div className="contact-info">
                  <div className="info-item">
                    <span className="info-text">{customer.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-text">{customer.phoneNumber || customer.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="card-footer-section">
                <div className="button-row first">
                  <button 
                    className="action-btn edit-btn"
                    onClick={() => handleEdit(customer)}
                    title="Edit Customer"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button 
                    className={`role-toggle-btn ${customer.role === 'ADMIN' ? 'admin-btn' : 'user-btn'}`}
                    onClick={() => handleToggleRole(customer.id || customer.customerId, customer.role || 'USER')}
                  >
                    {customer.role === 'ADMIN' ? <FaToggleOff /> : <FaToggleOn />}
                    {customer.role === 'ADMIN' ? 'Deactivate Admin' : 'Change Role'}
                  </button>
                </div>
                <div className="button-row second">
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(customer.id || customer.customerId)}
                    title="Delete Customer"
                  >
                    <FaTrash /> Delete
                  </button>
                  <button 
                    className="action-btn deactivate-btn"
                    title="Deactivate Customer"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="no-customers">
          <p>No customers found matching your criteria.</p>
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