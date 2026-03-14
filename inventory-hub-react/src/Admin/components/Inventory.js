import React, { useState, useEffect } from 'react';
import '../css/Inventory.css';
import { FaPlus, FaFilePdf, FaFileExcel, FaTrash, FaEdit, FaTimes, FaFilter } from 'react-icons/fa';
import { inventoryService, productsService, pricingService } from '../../services/imsApi';

// Real-time event system for inventory updates
class InventoryEventManager {
  constructor() {
    this.listeners = [];
  }
  
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
  
  emit(eventType, data) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, data);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }
}

// Global inventory event manager
window.inventoryEventManager = window.inventoryEventManager || new InventoryEventManager();

const statusOptions = ["All", "AVAILABLE", "SOLD", "RESERVED", "DAMAGED"];
const platformStatusOptions = ["ENABLED", "DISABLED"];
const conditionOptions = ["NEW", "GOOD", "FAIR", "DAMAGED"];

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // New states for product dropdown and auto-fill
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    barcode: '',
    productId: '',
    categoryId: '',
    subcategoryId: '',
    warehouseId: 1,
    inventoryStatus: 'AVAILABLE',
    platformStatus: 'ENABLED',
    conditionStatus: 'GOOD',
    mrp: '',
    showroomPrice: '',
    buyPrice: '',
    sellingPrice: '',
    stockSource: 'SUPPLIER',
    isCustomerReturned: false,
    isWarehouseDamaged: false,
    createdBy: 1,
    updatedBy: 1
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(price || 0);
  };

  useEffect(() => {
    loadInventory();
    loadProducts();
    loadCategories();
    
    // Subscribe to real-time inventory events
    const unsubscribe = window.inventoryEventManager.subscribe((eventType, data) => {
      console.log('📦 Inventory event received:', eventType, data);
      
      switch(eventType) {
        case 'INVENTORY_ADDED':
          // Add new inventory item to current list
          setInventory(prev => {
            const exists = prev.find(item => item.barcode === data.barcode);
            if (!exists) {
              const newList = [...prev, data];
              setFilteredInventory(statusFilter === 'All' ? newList : 
                newList.filter(item => item.inventoryStatus === statusFilter));
              return newList;
            }
            return prev;
          });
          break;
          
        case 'INVENTORY_UPDATED':
          // Update existing inventory item
          setInventory(prev => {
            const updated = prev.map(item => 
              item.barcode === data.barcode ? { ...item, ...data } : item
            );
            setFilteredInventory(statusFilter === 'All' ? updated : 
              updated.filter(item => item.inventoryStatus === statusFilter));
            return updated;
          });
          break;
          
        case 'INVENTORY_DELETED':
          // Remove inventory item
          setInventory(prev => {
            const filtered = prev.filter(item => item.barcode !== data.barcode);
            setFilteredInventory(statusFilter === 'All' ? filtered : 
              filtered.filter(item => item.inventoryStatus === statusFilter));
            return filtered;
          });
          break;
          
        case 'REFRESH_INVENTORY':
          // Full refresh
          loadInventory();
          break;
      }
    });
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadInventory, 30000);
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [statusFilter]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryService.getAvailableStock();
      console.log('Loaded inventory:', data);
      setInventory(data || []);
      setFilteredInventory(data || []);
    } catch (err) {
      console.error('Inventory load error:', err);
      setError('Failed to load inventory: ' + err.message);
      setInventory([]);
      setFilteredInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Load all products for dropdown
  const loadProducts = async () => {
    try {
      const allProducts = await productsService.getAllProducts();
      setProducts(allProducts || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const allCategories = await productsService.getAllCategories();
      setCategories(allCategories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Handle product selection - automatically populate category, subcategory and pricing
  const handleProductChange = async (productId) => {
    try {
      const product = products.find(p => p.id === parseInt(productId));
      if (product) {
        setSelectedProduct(product);
        
        // Auto-populate category and subcategory from selected product
        setFormData(prev => ({
          ...prev,
          productId: productId,
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId,
          // Auto-fill pricing from product if available
          mrp: product.price || prev.mrp,
          showroomPrice: product.price ? (product.price * 0.9) : prev.showroomPrice,
          sellingPrice: product.price ? (product.price * 0.85) : prev.sellingPrice,
          buyPrice: product.price ? (product.price * 0.7) : prev.buyPrice
        }));

        // Load subcategories for the selected category
        if (product.categoryId) {
          const subs = await productsService.getSubcategoriesByCategory(product.categoryId);
          setSubcategories(subs || []);
        }

        // Try to get pricing data from pricing service
        try {
          const pricingData = await pricingService.getPricingByProductId(productId);
          if (pricingData) {
            setFormData(prev => ({
              ...prev,
              mrp: pricingData.mrp || prev.mrp,
              showroomPrice: pricingData.showroomPrice || prev.showroomPrice,
              buyPrice: pricingData.buyPrice || prev.buyPrice,
              sellingPrice: pricingData.sellingPrice || prev.sellingPrice
            }));
          }
        } catch (pricingError) {
          console.log('No pricing data found, using product price');
        }
      }
    } catch (error) {
      console.error('Error handling product selection:', error);
    }
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    if (status === "All") {
      setFilteredInventory(inventory);
    } else {
      setFilteredInventory(inventory.filter(item => item.inventoryStatus === status));
    }
  };

  const handleEdit = (barcode) => {
    const item = inventory.find(i => i.barcode === barcode);
    setEditingItem(item);
    setFormData({
      barcode: item.barcode,
      productId: item.productId,
      categoryId: item.categoryId,
      subcategoryId: item.subcategoryId,
      warehouseId: item.warehouseId,
      inventoryStatus: item.inventoryStatus,
      platformStatus: item.platformStatus,
      conditionStatus: item.conditionStatus,
      mrp: item.mrp,
      showroomPrice: item.showroomPrice,
      buyPrice: item.buyPrice,
      sellingPrice: item.sellingPrice,
      stockSource: item.stockSource,
      isCustomerReturned: item.isCustomerReturned,
      isWarehouseDamaged: item.isWarehouseDamaged,
      createdBy: item.createdBy,
      updatedBy: item.updatedBy
    });
    setShowModal(true);
  };

  const handleDelete = async (barcode) => {
    if (window.confirm('Are you sure you want to disable this inventory item?')) {
      setLoading(true);
      try {
        await inventoryService.disableInventory(barcode, 1);
        
        // Emit real-time delete event
        window.inventoryEventManager.emit('INVENTORY_DELETED', { barcode });
        
        alert('✅ Inventory item disabled successfully!');
        // Don't reload - real-time events will update the UI
        // await loadInventory();
      } catch (err) {
        console.error('Delete error:', err);
        alert('❌ Failed to disable inventory: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExportPDF = () => {
    const csvContent = filteredInventory.map(i => 
      `${i.sku},${i.productName},${i.quantity},${i.price},${i.category},${i.status}`
    ).join('\n');
    const blob = new Blob([`SKU,Product Name,Quantity,Price,Category,Status\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
  };

  const handleExportExcel = () => {
    const csvContent = filteredInventory.map(i => 
      `${i.sku},${i.productName},${i.quantity},${i.price},${i.category},${i.status}`
    ).join('\n');
    const blob = new Blob([`SKU,Product Name,Quantity,Price,Category,Status\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.xlsx';
    a.click();
  };

  const handleAddInventory = () => {
    console.log('Add Inventory clicked - Opening modal');
    setEditingItem(null);
    setSelectedProduct(null);
    setFormData({
      barcode: '',
      productId: '',
      categoryId: '',
      subcategoryId: '',
      warehouseId: 1,
      inventoryStatus: 'AVAILABLE',
      platformStatus: 'ENABLED',
      conditionStatus: 'GOOD',
      mrp: '',
      showroomPrice: '',
      buyPrice: '',
      sellingPrice: '',
      stockSource: 'SUPPLIER',
      isCustomerReturned: false,
      isWarehouseDamaged: false,
      createdBy: 1,
      updatedBy: 1
    });
    setShowModal(true);
    console.log('Modal state set to true');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const inventoryData = {
        barcode: formData.barcode,
        productId: parseInt(formData.productId),
        categoryId: parseInt(formData.categoryId),
        subcategoryId: parseInt(formData.subcategoryId),
        warehouseId: parseInt(formData.warehouseId),
        inventoryStatus: formData.inventoryStatus,
        platformStatus: formData.platformStatus,
        conditionStatus: formData.conditionStatus,
        mrp: parseFloat(formData.mrp),
        showroomPrice: parseFloat(formData.showroomPrice),
        buyPrice: parseFloat(formData.buyPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        stockSource: formData.stockSource,
        isCustomerReturned: formData.isCustomerReturned,
        isWarehouseDamaged: formData.isWarehouseDamaged,
        createdBy: parseInt(formData.createdBy),
        updatedBy: parseInt(formData.updatedBy)
      };

      console.log('Submitting inventory data:', inventoryData);

      if (editingItem) {
        await inventoryService.updatePrice(formData.barcode, {
          mrp: inventoryData.mrp,
          showroomPrice: inventoryData.showroomPrice,
          sellingPrice: inventoryData.sellingPrice
        });
        
        // Emit real-time update event
        window.inventoryEventManager.emit('INVENTORY_UPDATED', {
          ...editingItem,
          ...inventoryData
        });
        
        alert('✅ Inventory updated successfully!');
      } else {
        const newInventory = await inventoryService.createInventory(inventoryData);
        
        // Emit real-time add event
        window.inventoryEventManager.emit('INVENTORY_ADDED', {
          ...inventoryData,
          // Add any additional fields that might be returned from API
          ...(newInventory || {})
        });
        
        alert('✅ Inventory added successfully!');
      }
      
      setShowModal(false);
      // Don't reload - real-time events will update the UI
      // await loadInventory();
    } catch (err) {
      console.error('Submit error:', err);
      alert('❌ Failed to save inventory: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'AVAILABLE': 'status-instock',
      'RESERVED': 'status-lowstock',
      'SOLD': 'status-outstock',
      'DAMAGED': 'status-outstock'
    };
    return `status-badge ${statusClasses[status] || ''}`;
  };

  if (loading && inventory.length === 0) return <div className="inventory-page"><div style={{padding: '40px', textAlign: 'center'}}>Loading inventory...</div></div>;

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <h2>Inventory Management</h2>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          {!error && !loading && (
            <span style={{color: 'green', fontSize: '14px'}}>
              ✅ Connected - {filteredInventory.length} items loaded
            </span>
          )}
          {error && <span style={{color: 'red', fontSize: '14px'}}>⚠️ {error}</span>}
          {loading && <span style={{color: 'orange', fontSize: '14px'}}>🔄 Loading...</span>}
          <button 
            className="add-inventory-btn" 
            onClick={() => {
              loadInventory();
              window.inventoryEventManager.emit('REFRESH_INVENTORY');
            }}
            style={{background: '#22c55e'}}
            title="Refresh Data"
          >
            🔄 Refresh
          </button>
          <button className="add-inventory-btn" onClick={handleAddInventory}>
            <FaPlus /> Add Inventory
          </button>
        </div>
      </div>

      <div className="inventory-filter">
        <div className="filter-label">
          <FaFilter /> Filter by Status:
        </div>
        <select 
          className="status-dropdown"
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
        >
          {statusOptions.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="inventory-card">
        <div className="inventory-card-header">
          <h3>Inventory List ({filteredInventory.length})</h3>
          <div className="inventory-export-buttons">
            <button className="inventory-pdf-btn" onClick={handleExportPDF}>
              <FaFilePdf /> PDF
            </button>
            <button className="inventory-excel-btn" onClick={handleExportExcel}>
              <FaFileExcel /> Excel
            </button>
          </div>
        </div>

        <table className="inventory-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Barcode</th>
              <th>Product ID</th>
              <th>MRP</th>
              <th>Selling Price</th>
              <th>Buy Price</th>
              <th>Condition</th>
              <th>Inventory Status</th>
              <th>Platform Status</th>
              <th className="inventory-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.length > 0 ? filteredInventory.map((item) => (
              <tr key={item.id || item.barcode}>
                <td>{item.id || 'N/A'}</td>
                <td className="inventory-sku">{item.barcode}</td>
                <td>{item.productId}</td>
                <td>{formatPrice(item.mrp || 0)}</td>
                <td>{formatPrice(item.sellingPrice || 0)}</td>
                <td>{formatPrice(item.buyPrice || 0)}</td>
                <td>{item.conditionStatus}</td>
                <td>
                  <span className={getStatusBadge(item.inventoryStatus)}>
                    {item.inventoryStatus}
                  </span>
                </td>
                <td>
                  <span className={item.platformStatus === 'ENABLED' ? 'status-instock' : 'status-outstock'}>
                    {item.platformStatus}
                  </span>
                </td>
                <td className="inventory-action-col">
                  <div className="inventory-action-buttons">
                    <FaEdit 
                      className="inventory-edit-icon" 
                      onClick={() => handleEdit(item.barcode)}
                      title="Edit Item"
                    />
                    <FaTrash 
                      className="inventory-delete-icon" 
                      onClick={() => handleDelete(item.barcode)}
                      title="Disable Item"
                    />
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="10" style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                  {loading ? 'Loading inventory...' : error ? 'Error loading data. Please check backend connection.' : 'No inventory items found. Click "Add Inventory" to add items.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              width: '95%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px'}}>
              <h3 style={{fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0}}>
                {editingItem ? 'Edit Inventory' : 'Add Inventory'}
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', padding: '5px'}}
                type="button"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
              {/* Product Selection Dropdown */}
              <div style={{marginBottom: '8px', gridColumn: '1 / -1'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Select Product *</label>
                <select
                  name="productId"
                  value={formData.productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required
                  style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#fff'}}
                >
                  <option value="">-- Select Product --</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} (ID: {product.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Show selected product details */}
              {selectedProduct && (
                <div style={{
                  gridColumn: '1 / -1',
                  background: '#e7f3ff',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  borderLeft: '4px solid #007bff'
                }}>
                  <h4 style={{margin: '0 0 8px 0', fontSize: '14px', color: '#0f172a'}}>Selected Product Details:</h4>
                  <p style={{margin: '4px 0', fontSize: '12px', color: '#374151'}}><strong>Name:</strong> {selectedProduct.name}</p>
                  <p style={{margin: '4px 0', fontSize: '12px', color: '#374151'}}><strong>Category ID:</strong> {selectedProduct.categoryId}</p>
                  <p style={{margin: '4px 0', fontSize: '12px', color: '#374151'}}><strong>Subcategory ID:</strong> {selectedProduct.subcategoryId}</p>
                  {selectedProduct.price && (
                    <p style={{margin: '4px 0', fontSize: '12px', color: '#374151'}}><strong>Product Price:</strong> ₹{selectedProduct.price}</p>
                  )}
                  <p style={{margin: '4px 0', fontSize: '11px', color: '#6b7280', fontStyle: 'italic'}}>Pricing fields have been auto-filled based on product data</p>
                </div>
              )}

              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Barcode *</label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  placeholder="Enter barcode"
                  disabled={editingItem}
                  required
                  style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box'}}
                />
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Product ID (Auto-filled)</label>
                <input
                  type="number"
                  name="productId"
                  value={formData.productId}
                  readOnly
                  placeholder="Auto-populated from product selection"
                  style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#f9fafb', cursor: 'not-allowed'}}
                />
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Category ID (Auto-filled)</label>
                <input type="number" name="categoryId" value={formData.categoryId} readOnly placeholder="Auto-populated" style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#f9fafb', cursor: 'not-allowed'}} />
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Subcategory ID (Auto-filled)</label>
                <input type="number" name="subcategoryId" value={formData.subcategoryId} readOnly placeholder="Auto-populated" style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#f9fafb', cursor: 'not-allowed'}} />
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>MRP (Auto-filled) *</label>
                <input type="number" step="0.01" name="mrp" value={formData.mrp} onChange={handleInputChange} placeholder="Auto-filled from product" required style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#f0f8ff', borderLeft: '3px solid #007bff'}} />
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Showroom Price (Auto-filled) *</label>
                <input type="number" step="0.01" name="showroomPrice" value={formData.showroomPrice} onChange={handleInputChange} placeholder="Auto-filled from product" required style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#f0f8ff', borderLeft: '3px solid #007bff'}} />
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Buy Price (Auto-filled) *</label>
                <input type="number" step="0.01" name="buyPrice" value={formData.buyPrice} onChange={handleInputChange} placeholder="Auto-filled from product" required style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#f0f8ff', borderLeft: '3px solid #007bff'}} />
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Selling Price (Auto-filled) *</label>
                <input type="number" step="0.01" name="sellingPrice" value={formData.sellingPrice} onChange={handleInputChange} placeholder="Auto-filled from product" required style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#f0f8ff', borderLeft: '3px solid #007bff'}} />
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Condition *</label>
                <select name="conditionStatus" value={formData.conditionStatus} onChange={handleInputChange} required style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#fff'}}>
                  {conditionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Inventory Status *</label>
                <select name="inventoryStatus" value={formData.inventoryStatus} onChange={handleInputChange} required style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#fff'}}>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="SOLD">SOLD</option>
                  <option value="DAMAGED">DAMAGED</option>
                </select>
              </div>
              <div style={{marginBottom: '8px', gridColumn: '1 / -1'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Platform Status *</label>
                <select name="platformStatus" value={formData.platformStatus} onChange={handleInputChange} required style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#fff'}}>
                  {platformStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div style={{gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb'}}>
                <button type="button" onClick={() => setShowModal(false)} disabled={loading} style={{padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'}}>Cancel</button>
                <button type="submit" disabled={loading} style={{padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'}}>{loading ? 'Saving...' : (editingItem ? 'Update' : 'Add')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
