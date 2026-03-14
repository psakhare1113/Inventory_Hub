import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, DollarSign } from 'lucide-react';
import '../css/Products.css';
import { imsService } from '../../services/imsApi';
import PricingForm from './PricingForm';

export default function Pricing() {
  const [pricingData, setPricingData] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);

  // Auto-refresh every 2 seconds to get latest pricing data
  useEffect(() => {
    const interval = setInterval(() => {
      loadPricingData();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen for pricing updates from other components
  useEffect(() => {
    const handlePricingUpdate = () => {
      loadPricingData();
    };
    
    window.addEventListener('pricingUpdated', handlePricingUpdate);
    return () => window.removeEventListener('pricingUpdated', handlePricingUpdate);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const productsRes = await imsService.products.getAllProducts();
      setProducts(productsRes || []);
      await loadPricingData();
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPricingData = async () => {
    try {
      const pricingData = await imsService.pricing.getAllPricing();
      setPricingData(pricingData || []);
      setError(null);
      console.log('✅ Pricing data loaded:', pricingData?.length || 0, 'items');
    } catch (err) {
      console.error('Error loading pricing data:', err);
      setError('Failed to load pricing data: ' + err.message);
    }
  };



  const handleFormSuccess = () => {
    loadPricingData();
  };

  const handleEdit = (pricing) => {
    setEditingPricing(pricing);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingPricing(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this pricing?')) {
      try {
        await imsService.pricing.deletePricing(id);
        
        // Immediately refresh all pricing data from database
        await loadPricingData();
        
        alert('✅ Pricing deleted successfully!');
        // Trigger frontend refresh for other components
        window.dispatchEvent(new CustomEvent('pricingUpdated', { detail: { deleted: id } }));
      } catch (err) {
        console.error('Error deleting pricing:', err);
        alert('Failed to delete pricing: ' + err.message);
      }
    }
  };



  const getProductDisplay = (productId) => {
    const product = products.find(p => p.productId === productId);
    return product ? `${product.name} - ${product.productBarcode}` : `Product ID: ${productId}`;
  };

  const filteredPricing = pricingData.filter(pricing => {
    const productDisplay = getProductDisplay(pricing.productId).toLowerCase();
    return productDisplay.includes(searchTerm.toLowerCase()) ||
           (pricing.unitLabel && pricing.unitLabel.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  if (loading) return <div className="p-6">Loading pricing data...</div>;

  return (
    <div className="admin products-page">
      <div className="products-header">
        <h2>Pricing Management</h2>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <span style={{fontSize: '14px', color: error ? 'red' : 'green'}}>
            {error ? '❌ Backend Error' : '✅ Connected to Backend'}
          </span>
          <button className="add-product-btn" onClick={() => setShowAddForm(true)}>
            <Plus size={20} />
            Add Pricing
          </button>
        </div>
      </div>

      <div className="products-card">
        <div className="products-card-header">
          <h3>Product Pricing ({filteredPricing.length} items)</h3>
        </div>

        <PricingForm
          isOpen={showAddForm}
          onClose={handleCloseForm}
          editingPricing={editingPricing}
          onSuccess={handleFormSuccess}
        />

        <div className="products-search">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search by product name or unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && (
          <div style={{padding: '15px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '5px', margin: '15px 0', color: '#721c24'}}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>MRP (₹)</th>
              <th>Selling Price (₹)</th>
              <th>Discount</th>
              <th>Unit Size</th>
              <th>Unit Label</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPricing.length > 0 ? (
              filteredPricing.map((pricing) => {
                return (
                  <tr key={pricing.id}>
                    <td>{pricing.id}</td>
                    <td>
                      <div className="product-info">
                        <div className="product-avatar">
                          <DollarSign size={16} />
                        </div>
                        <div>
                          <div className="product-name">{getProductDisplay(pricing.productId)}</div>
                          <div className="product-description">Product ID: {pricing.productId}</div>
                        </div>
                      </div>
                    </td>
                    <td>₹{(pricing.mrp || 0).toFixed(2)}</td>
                    <td>₹{(pricing.sellingPrice || 0).toFixed(2)}</td>
                    <td>
                      <span style={{color: (pricing.mrp && pricing.sellingPrice && ((pricing.mrp - pricing.sellingPrice) / pricing.mrp * 100) > 0) ? 'green' : 'gray'}}>
                        {pricing.mrp && pricing.sellingPrice ? ((pricing.mrp - pricing.sellingPrice) / pricing.mrp * 100).toFixed(1) : '0'}%
                      </span>
                    </td>
                    <td>{pricing.unitSize}</td>
                    <td>{pricing.unitLabel}</td>
                    <td>{new Date(pricing.createdAt).toLocaleDateString()}</td>
                    <td className="product-action-col">
                      <div className="product-action-buttons">
                        <Edit 
                          className="product-edit-icon" 
                          size={16} 
                          onClick={() => handleEdit(pricing)}
                          title="Edit Pricing"
                        />
                        <Trash2 
                          className="product-delete-icon" 
                          size={16} 
                          onClick={() => handleDelete(pricing.id)}
                          title="Delete Pricing"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                  {loading ? 'Loading pricing data...' : 'No pricing data found'}
                  {!loading && (
                    <div style={{marginTop: '10px'}}>
                      <button 
                        onClick={() => setShowAddForm(true)}
                        className="btn-submit"
                      >
                        Add First Pricing
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}