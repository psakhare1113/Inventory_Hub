import React, { useState, useEffect } from 'react';
import { imsService } from '../../services/imsApi';
import { X, Package } from 'lucide-react';
import '../css/ProductForm.css';

const generateBarcode = () => {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PRD-${ts}-${rand}`;
};

export default function SimpleProductForm({ isOpen, onClose, editingProduct, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [product, setProduct] = useState({
    productBarcode: '', name: '', description: '',
    categoryId: '', subcategoryId: '',
    status: 'ACTIVE', productUrl: '', eligibleForReturn: true
  });

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      editingProduct ? setProduct(editingProduct) : resetForm();
    }
  }, [isOpen, editingProduct]);

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' };
      const [catsRes, subsRes] = await Promise.all([
        fetch('http://localhost:9999/api/categories', { headers }),
        fetch('http://localhost:9999/api/subcategories', { headers })
      ]);
      setCategories(catsRes.ok ? await catsRes.json() : []);
      setSubcategories(subsRes.ok ? await subsRes.json() : []);
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setProduct({ productBarcode: generateBarcode(), name: '', description: '', categoryId: '', subcategoryId: '', status: 'ACTIVE', productUrl: '', eligibleForReturn: true });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('http://localhost:9999/api/images/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const url = data.imageUrl;
      setProduct(prev => ({ ...prev, productUrl: url }));
    } catch (err) {
      alert('Image upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product.productBarcode || !product.categoryId || !product.subcategoryId) {
      alert('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...product, categoryId: parseInt(product.categoryId), subcategoryId: parseInt(product.subcategoryId) };
      if (editingProduct) {
        await imsService.products.updateProduct(editingProduct.productId, payload);
        alert('Product updated successfully!');
      } else {
        await imsService.products.createProduct(payload);
        alert('Product added successfully!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredSubs = subcategories.filter(s => s.categoryId === parseInt(product.categoryId));

  return (
    <div className="modal-overlay">
      <div className="modal-content professional-product-form" style={{ width: '700px', maxWidth: '95vw' }}>

        {/* Header — same as ProductForm */}
        <div className="modal-header">
          <div className="header-content">
            <div className="header-icon"><Package size={22} /></div>
            <div>
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="professional-form">

          {/* Sample Reference — at top */}
          {!editingProduct && (
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowSample(s => !s)}
                style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', background: showSample ? '#e0e7ff' : '#f9fafb', color: showSample ? '#4338ca' : '#6b7280', border: `1px solid ${showSample ? '#c7d2fe' : '#e5e7eb'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {showSample ? '✕ Hide Sample' : '📋 View Sample Form'}
              </button>
              {showSample && (
                <div style={{ marginTop: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px', fontSize: '11px', lineHeight: '1.6', textAlign: 'left' }}>
                  <p style={{ margin: '0 0 6px', fontWeight: '700', color: '#92400e', fontSize: '11px' }}>📌 Sample Reference:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', color: '#374151' }}>
                    <span><strong>Category:</strong> Electronics</span>
                    <span><strong>Subcategory:</strong> Laptops</span>
                    <span><strong>Name:</strong> Dell Inspiron 15</span>
                    <span><strong>Barcode:</strong> PRD-12345678-0042</span>
                    <span style={{ gridColumn: '1 / -1' }}><strong>Description:</strong> The Dell Inspiron 15 is a powerful everyday laptop featuring a 15.6" Full HD display, Intel Core i5 processor, 8GB RAM, and 512GB SSD storage — ideal for work, study, and entertainment.</span>
                    <span style={{ gridColumn: '1 / -1' }}><strong>Image:</strong> Upload clear product photo</span>
                    <span><strong>Status:</strong> Active</span>
                    <span><strong>Return:</strong> ✓ Eligible</span>
                  </div>
                  <p style={{ margin: '6px 0 0', color: '#b45309', fontSize: '10px' }}>💡 Barcode auto-generated — change to match your system (e.g. BED-01)</p>
                </div>
              )}
            </div>
          )}

          {/* Category + Subcategory */}
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-select" name="categoryId" value={product.categoryId} onChange={handleChange} required>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subcategory *</label>
                <select className="form-select" name="subcategoryId" value={product.subcategoryId} onChange={handleChange} required disabled={!product.categoryId}>
                  <option value="">Select Subcategory</option>
                  {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-input" type="text" name="name" placeholder="e.g. Wireless Headphones" value={product.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Product Barcode *</label>
                <input className="form-input" type="text" name="productBarcode" placeholder="e.g. BED-01" value={product.productBarcode} onChange={handleChange} required />
              </div>              <div className="form-group full-width">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" name="description" placeholder="Brief product description..." value={product.description} onChange={handleChange} rows={2} style={{ minHeight: '60px' }} />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">Product Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Hidden file input */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  id="spf-img"
                  style={{ display: 'none' }}
                />
                {/* Upload button */}
                <label
                  htmlFor="spf-img"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '9px 16px', background: '#3b82f6', color: '#fff',
                    borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0
                  }}
                >
                  {uploading ? '⏳ Uploading...' : '📁 Upload Image'}
                </label>
                {/* URL field — always visible, auto-filled after upload */}
                <input
                  className="form-input"
                  type="text"
                  name="productUrl"
                  placeholder="Image URL (auto-filled after upload)"
                  value={product.productUrl}
                  onChange={handleChange}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>

          {/* Status + Return */}
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" name="status" value={product.status} onChange={handleChange}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <label style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#374151', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" name="eligibleForReturn" checked={product.eligibleForReturn} onChange={handleChange} style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer', flexShrink: 0, margin: 0 }} />
                  Eligible for Return
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
