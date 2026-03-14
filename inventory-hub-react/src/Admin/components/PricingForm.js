import React, { useState, useEffect } from 'react';
import { imsService } from '../../services/imsApi';
import '../css/Categories.css';

export default function PricingForm({ isOpen, onClose, editingPricing, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState({
    productId: '',
    mrp: '',
    sellingPrice: '',
    unitSize: '',
    unitLabel: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      if (editingPricing) {
        setPricing({
          productId: editingPricing.productId.toString(),
          mrp: editingPricing.mrp.toString(),
          sellingPrice: editingPricing.sellingPrice.toString(),
          unitSize: editingPricing.unitSize.toString(),
          unitLabel: editingPricing.unitLabel
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingPricing]);

  const loadProducts = async () => {
    try {
      const productsData = await imsService.products.getAllProducts();
      setProducts(productsData || []);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const resetForm = () => {
    setPricing({
      productId: '',
      mrp: '',
      sellingPrice: '',
      unitSize: '',
      unitLabel: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPricing(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!pricing.productId || !pricing.mrp || !pricing.sellingPrice || !pricing.unitSize || !pricing.unitLabel) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        productId: parseInt(pricing.productId),
        mrp: parseFloat(pricing.mrp),
        sellingPrice: parseFloat(pricing.sellingPrice),
        unitSize: parseFloat(pricing.unitSize),
        unitLabel: pricing.unitLabel
      };

      if (editingPricing) {
        await imsService.pricing.updatePricing(editingPricing.productId, payload);
        alert('Pricing updated successfully!');
      } else {
        await imsService.pricing.addPricing(payload);
        alert('Pricing added successfully!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getProductDisplay = (product) => {
    return `${product.name} - ${product.productBarcode} (ID: ${product.productId})`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '500px', maxWidth: '90vw' }}>
        <div className="modal-header">
          <h3>{editingPricing ? 'Edit Pricing' : 'Add New Pricing'}</h3>
          <button 
            className="modal-close" 
            onClick={onClose}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <select
              name="productId"
              value={pricing.productId}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">Select Product *</option>
              {products.map(product => (
                <option key={product.productId} value={product.productId}>
                  {getProductDisplay(product)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <input
              type="number"
              step="0.01"
              name="mrp"
              placeholder="MRP (₹) *"
              value={pricing.mrp}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <input
              type="number"
              step="0.01"
              name="sellingPrice"
              placeholder="Selling Price (₹) *"
              value={pricing.sellingPrice}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <input
              type="number"
              step="0.01"
              name="unitSize"
              placeholder="Unit Size *"
              value={pricing.unitSize}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <input
              type="text"
              name="unitLabel"
              placeholder="Unit Label (e.g., ml, kg, pieces) *"
              value={pricing.unitLabel}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 20px', border: 'none', borderRadius: '4px', background: '#007bff', color: 'white', cursor: 'pointer' }}
            >
              {loading ? 'Saving...' : editingPricing ? 'Update' : 'Add Pricing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}