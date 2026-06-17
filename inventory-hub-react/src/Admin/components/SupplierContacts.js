import React, { useState, useEffect } from 'react';
import '../css/Contacts.css';
import { FaPlus, FaFilePdf, FaFileExcel, FaTrash, FaEdit, FaTimes, FaSearch, FaSync } from 'react-icons/fa';
import { imsService } from '../../services/imsApi';

export default function SupplierContacts() {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    contactPerson: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    status: 'ACTIVE',
    category: '',
    rating: 0
  });

  const colors = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'pink'];

  const loadSuppliers = async () => {
    setLoading(true);
    const data = await imsService.suppliers.getAll();
    setSuppliers(data);
    setFilteredSuppliers(data);
    const statsData = await imsService.suppliers.getStats();
    setStats(statsData);
    setLoading(false);
  };

  useEffect(() => {
    loadSuppliers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSuppliers, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [searchQuery, suppliers]);

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      company: supplier.company,
      contactPerson: supplier.contactPerson,
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      pincode: supplier.pincode || '',
      gstNumber: supplier.gstNumber || '',
      status: supplier.status,
      category: supplier.category || '',
      rating: supplier.rating || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      const result = await imsService.suppliers.delete(id);
      if (result.success) {
        loadSuppliers();
      } else {
        alert(result.error || 'Failed to delete supplier');
      }
    }
  };

  const handleExportPDF = () => {
    const csvContent = filteredSuppliers.map(s => 
      `${s.name},${s.email},${s.phone},${s.company},${s.contactPerson},${s.status}`
    ).join('\n');
    const blob = new Blob([`Name,Email,Phone,Company,Contact Person,Status\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suppliers.csv';
    a.click();
  };

  const handleExportExcel = () => {
    handleExportPDF(); // Same as CSV for now
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setFormData({
      name: '', email: '', phone: '', company: '', contactPerson: '',
      address: '', city: '', state: '', pincode: '', gstNumber: '',
      status: 'ACTIVE', category: '', rating: 0
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (editingSupplier) {
      const result = await imsService.suppliers.update(editingSupplier.supplierId, formData);
      if (result.error) {
        alert(result.error);
      }
    } else {
      const result = await imsService.suppliers.create(formData);
      if (result.error) {
        alert(result.error);
      }
    }
    setShowModal(false);
    loadSuppliers();
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getStatusBadge = (status) => {
    const styles = {
      'ACTIVE': { background: '#d1fae5', color: '#065f46' },
      'INACTIVE': { background: '#fef3c7', color: '#92400e' },
      'BLACKLISTED': { background: '#fee2e2', color: '#991b1b' },
      'PENDING': { background: '#dbeafe', color: '#1e40af' }
    };
    return styles[status] || { background: '#f3f4f6', color: '#374151' };
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="contacts-page">
      {/* Header */}
      <div className="contacts-header">
        <div>
          <h2>Supplier Contacts</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {stats.totalSuppliers || 0} Total · {stats.activeSuppliers || 0} Active · 
            ₹{(stats.totalPurchaseValue || 0).toLocaleString('en-IN')} Total Purchase
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="add-contact-btn" onClick={loadSuppliers} disabled={loading} style={{ background: '#6366f1' }}>
            <FaSync className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="add-contact-btn" onClick={handleAddSupplier}>
            <FaPlus /> Add Supplier
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 10px 10px 36px', border: '1px solid #d1d5db',
              borderRadius: 8, fontSize: 14
            }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="contacts-card">
        <div className="contacts-card-header">
          <h3>Supplier List ({filteredSuppliers.length})</h3>
          <div className="contacts-export-buttons">
            <button className="contacts-pdf-btn" onClick={handleExportPDF}>
              <FaFilePdf /> PDF
            </button>
            <button className="contacts-excel-btn" onClick={handleExportExcel}>
              <FaFileExcel /> Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <table className="contacts-table">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company</th>
              <th>Contact Person</th>
              <th>Category</th>
              <th>Status</th>
              <th>Rating</th>
              <th className="contact-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((supplier, idx) => (
              <tr key={supplier.supplierId}>
                <td>
                  <div className={`contact-avatar ${colors[idx % colors.length]}`}>
                    {getInitials(supplier.name)}
                  </div>
                </td>
                <td>{supplier.name}</td>
                <td>{supplier.email}</td>
                <td>{supplier.phone}</td>
                <td>{supplier.company}</td>
                <td>{supplier.contactPerson}</td>
                <td>{supplier.category || '—'}</td>
                <td>
                  <span style={{
                    ...getStatusBadge(supplier.status),
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
                  }}>
                    {supplier.status}
                  </span>
                </td>
                <td>
                  {supplier.rating ? `⭐ ${supplier.rating.toFixed(1)}` : '—'}
                </td>
                <td className="contact-action-col">
                  <div className="contact-action-buttons">
                    <FaEdit 
                      className="contact-edit-icon" 
                      onClick={() => handleEdit(supplier)}
                      title="Edit Supplier"
                    />
                    <FaTrash 
                      className="contact-delete-icon" 
                      onClick={() => handleDelete(supplier.supplierId)}
                      title="Delete Supplier"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSuppliers.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            {loading ? 'Loading suppliers...' : 'No suppliers found'}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <FaTimes className="close-btn" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit} className="contact-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label htmlFor="name">Supplier Name *</label>
                  <input id="name" type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="company">Company *</label>
                  <input id="company" type="text" name="company" value={formData.company} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="contactPerson">Contact Person *</label>
                  <input id="contactPerson" type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input id="email" type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone *</label>
                  <input id="phone" type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <input id="category" type="text" name="category" value={formData.category} onChange={handleInputChange} placeholder="e.g., Electronics" />
                </div>
                <div className="form-group">
                  <label htmlFor="gstNumber">GST Number</label>
                  <input id="gstNumber" type="text" name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="status">Status *</label>
                  <select id="status" name="status" value={formData.status} onChange={handleInputChange} required>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="PENDING">Pending</option>
                    <option value="BLACKLISTED">Blacklisted</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input id="address" type="text" name="address" value={formData.address} onChange={handleInputChange} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input id="city" type="text" name="city" value={formData.city} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="state">State</label>
                  <input id="state" type="text" name="state" value={formData.state} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="pincode">Pincode</label>
                  <input id="pincode" type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} />
                </div>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingSupplier ? 'Update Supplier' : 'Add Supplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
