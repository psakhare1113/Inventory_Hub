import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Package, Settings } from 'lucide-react';
import '../css/Products.css';
import '../css/ProductForm.css';
import { imsService } from '../../services/imsApi';
import ApiService from '../../services/api';
import ProductForm from './ProductForm';
import SimpleProductForm from './SimpleProductForm';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [pricingData, setPricingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [selectedProductForAttributes, setSelectedProductForAttributes] = useState(null);
  const [productAttributes, setProductAttributes] = useState({});
  const [newAttribute, setNewAttribute] = useState({ attributeName: '', attributeValue: '' });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData, subcategoriesData] = await Promise.all([
        imsService.products.getAllProducts(),
        imsService.products.getAllCategories(),
        imsService.products.getAllSubcategories()
      ]);
      
      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setSubcategories(subcategoriesData || []);
      
      // Load attributes for all products
      const attributesMap = {};
      for (const product of productsData || []) {
        if (product && product.productId) {
          try {
            const attributes = await imsService.products.getProductAttributes(product.productId);
            attributesMap[product.productId] = attributes || [];
          } catch (err) {
            attributesMap[product.productId] = [];
          }
        }
      }
      setProductAttributes(attributesMap);
      
      // Try to load pricing data, but don't fail if it doesn't work
      try {
        const pricingDataRes = await imsService.pricing.getAllPricing();
        setPricingData(pricingDataRes || []);
      } catch (pricingErr) {
        console.warn('Pricing API not available:', pricingErr.message);
        setPricingData([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Spring Boot backend error:', err);
      if (err.message.includes('ERR_CONNECTION_REFUSED') || err.message.includes('Network error')) {
        setError('❌ InventoryManagementSystem backend is not running on port 9094. Please start the backend server first.');
      } else if (err.message.includes('404')) {
        setError('❌ Backend endpoints not found. Check if InventoryManagementSystem is properly configured.');
      } else {
        setError('❌ Failed to connect: ' + err.message);
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    loadProducts();
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product? This will also delete all related pricing, inventory, and attributes data.')) {
      try {
        // Delete related data first
        try {
          // Delete pricing data
          await imsService.pricing.deletePricing(id);
        } catch (pricingErr) {
          console.warn('Pricing deletion failed:', pricingErr.message);
        }
        
        try {
          // Delete inventory data
          await imsService.inventory.disableInventory(id, 1); // Using admin ID 1
        } catch (inventoryErr) {
          console.warn('Inventory deletion failed:', inventoryErr.message);
        }
        
        // Delete product attributes from localStorage if exists
        localStorage.removeItem(`product_attributes_${id}`);
        
        // Finally delete the product
        await imsService.products.deleteProduct(id);
        await loadProducts();
        alert('Product and all related data deleted successfully!');
      } catch (err) {
        alert('Failed to delete product: ' + err.message);
      }
    }
  };

  const handleManageAttributes = async (product) => {
    setSelectedProductForAttributes(product);
    try {
      const attributes = await imsService.products.getProductAttributes(product.productId);
      setProductAttributes({ [product.productId]: attributes || [] });
    } catch (err) {
      console.warn('Attributes API not available for product', product.id, ':', err.message);
      // Set empty array if attributes API fails
      setProductAttributes({ [product.id]: [] });
    }
    setShowAttributesModal(true);
  };

  const handleAddAttribute = async () => {
    if (!newAttribute.attributeName || !newAttribute.attributeValue) {
      alert('Please fill both attribute name and value');
      return;
    }
    
    try {
      await imsService.products.addProductAttribute(selectedProductForAttributes.productId, newAttribute);
      const updatedAttributes = await imsService.products.getProductAttributes(selectedProductForAttributes.productId);
      setProductAttributes(prev => ({ ...prev, [selectedProductForAttributes.productId]: updatedAttributes || [] }));
      setNewAttribute({ attributeName: '', attributeValue: '' });
      alert('Attribute added successfully!');
      // Reload products to refresh the main table
      loadProducts();
    } catch (err) {
      console.error('Failed to add attribute:', err);
      if (err.message.includes('400')) {
        alert('Backend error: Attributes API endpoint may not be properly configured. Please check your backend server.');
      } else {
        alert('Failed to add attribute: ' + err.message);
      }
    }
  };

  // Category-wise attribute templates
  const getAttributeTemplates = (categoryId) => {
    const templates = {
      1: ['RAM', 'Storage', 'Camera', 'Battery', 'Processor', 'Display', 'Screen Size', 'OS'], // Electronics
      2: ['Material', 'Dimensions', 'Weight', 'Color', 'Warranty', 'Assembly Required'], // Furniture
      3: ['Size', 'Color', 'Material', 'Brand', 'Care Instructions', 'Fit Type'] // Clothing
    };
    return templates[categoryId] || ['Brand', 'Model', 'Color', 'Size', 'Material', 'Warranty'];
  };

  const handleBulkAttributeAdd = () => {
    alert('Bulk attribute functionality has been removed. Use individual product settings instead.');
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productBarcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-6">Loading products from Spring Boot backend...</div>;

  return (
    <div className="admin products-page">
      <div className="products-header">
        <h2>Products Management</h2>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <span style={{fontSize: '14px', color: error ? 'red' : 'green'}}>
            {error ? '❌ Backend Error' : '✅ Connected to Spring Boot'}
          </span>
          <button className="add-product-btn" onClick={() => setShowAddForm(true)}>
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </div>

      <div className="products-card">
        <div className="products-card-header">
          <h3>Product Inventory ({filteredProducts.length} items)</h3>
        </div>

        {/* Using SimpleProductForm for minimal interface */}
        <SimpleProductForm
          isOpen={showAddForm}
          onClose={handleCloseForm}
          editingProduct={editingProduct}
          onSuccess={handleFormSuccess}
        />
        
        {/* Alternative: Use full ProductForm for advanced features */}
        {/* 
        <ProductForm
          isOpen={showAddForm}
          onClose={handleCloseForm}
          editingProduct={editingProduct}
          onSuccess={handleFormSuccess}
        />
        */}

        <div className="products-search">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search products by name or barcode..."
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
              <th>Category</th>
              <th>Subcategory</th>
              <th>Base Price</th>
              <th>Pricing Info</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const category = categories.find(cat => cat.id === product.categoryId);
                const subcategory = subcategories.find(sub => sub.id === product.subcategoryId);
                const productPricing = pricingData.find(p => p.productId === product.productId);
                
                const attributes = productAttributes[product.productId] || [];
                
                return (
                  <tr key={product.productId}>
                    <td>{product.productId}</td>
                    <td>
                      <div className="product-info">
                        <div className="product-avatar">
                          📦
                        </div>
                        <div>
                          <div className="product-name">{product.name || 'Unnamed Product'}</div>
                          {product.description && (
                            <div className="product-description" style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
                              {product.description.length > 60 ? product.description.substring(0, 60) + '...' : product.description}
                            </div>
                          )}
                          <div className="product-barcode" style={{ color: '#888', fontSize: '11px' }}>Barcode: {product.productBarcode}</div>
                          {attributes.length > 0 && (
                            <div className="product-attributes">
                              <div style={{display: 'flex', flexWrap: 'wrap', gap: '2px'}}>
                                {attributes.slice(0, 3).map((attr, idx) => (
                                  <span key={idx} className="attribute-badge">
                                    {attr.attributeName} {attr.attributeValue}
                                  </span>
                                ))}
                                {attributes.length > 3 && (
                                  <span className="attribute-badge more-badge">
                                    +{attributes.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {product.productUrl && (
                            <div className="product-url">
                              <a href={product.productUrl} target="_blank" rel="noopener noreferrer">
                                View Image
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{category?.name || `ID: ${product.categoryId}`}</td>
                    <td>{subcategory?.name || `ID: ${product.subcategoryId}`}</td>
                    <td>
                      <div className="product-price">
                        ₹{product.price || '0.00'}
                      </div>
                    </td>
                    <td>
                      {productPricing ? (
                        <div style={{fontSize: '12px'}}>
                          <div><strong>MRP:</strong> ₹{productPricing.mrp}</div>
                          <div><strong>Selling:</strong> ₹{productPricing.sellingPrice}</div>
                          <div><strong>Unit:</strong> {productPricing.unitSize} {productPricing.unitLabel}</div>
                          <div style={{color: 'green'}}>
                            <strong>Discount:</strong> {((productPricing.mrp - productPricing.sellingPrice) / productPricing.mrp * 100).toFixed(1)}%
                          </div>
                        </div>
                      ) : (
                        <span style={{color: '#999', fontSize: '12px'}}>No pricing set</span>
                      )}
                    </td>
                    <td>
                      <div className="product-rating">★ {product.rating || 'No rating'}/5</div>
                    </td>
                    <td>
                      <span className={`status-badge ${(product.status || 'ACTIVE').toLowerCase()}`}>
                        {product.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="product-action-col">
                      <div className="product-action-buttons">
                        <Edit 
                          className="product-edit-icon" 
                          size={16} 
                          onClick={() => handleEditProduct(product)}
                          title="Edit Product"
                        />
                        <Settings 
                          className="product-edit-icon" 
                          size={16} 
                          onClick={() => handleManageAttributes(product)}
                          title="Manage Attributes"
                          style={{ color: '#17a2b8', cursor: 'pointer' }}
                        />
                        <Trash2 
                          className="product-delete-icon" 
                          size={16} 
                          onClick={() => handleDeleteProduct(product.productId)}
                          title="Delete Product"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                  {loading ? 'Loading products...' : 'No products found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Attributes Management Modal */}
      {showAttributesModal && selectedProductForAttributes && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '12px',
            width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <h3>Manage Attributes - {selectedProductForAttributes.productBarcode}</h3>
            
            {/* Add New Attribute */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h4>Add New Attribute</h4>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Attribute Name (e.g., color, storage)"
                  value={newAttribute.attributeName}
                  onChange={(e) => setNewAttribute({...newAttribute, attributeName: e.target.value})}
                  style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  placeholder="Attribute Value (e.g., White, 200GB)"
                  value={newAttribute.attributeValue}
                  onChange={(e) => setNewAttribute({...newAttribute, attributeValue: e.target.value})}
                  style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <button 
                  onClick={handleAddAttribute}
                  style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Existing Attributes */}
            <div style={{ marginBottom: '20px' }}>
              <h4>Current Attributes</h4>
              {productAttributes[selectedProductForAttributes.productId]?.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Attribute</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productAttributes[selectedProductForAttributes.productId].map((attr, index) => (
                      <tr key={index}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{attr.attributeName}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{attr.attributeValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No attributes added yet</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setShowAttributesModal(false);
                  setSelectedProductForAttributes(null);
                  setNewAttribute({ attributeName: '', attributeValue: '' });
                }}
                style={{ padding: '12px 24px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}