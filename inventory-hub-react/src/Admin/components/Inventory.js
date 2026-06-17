import React, { useState, useEffect } from 'react';
import '../css/Inventory.css';
import '../css/InventoryEnhanced.css';
import { FaPlus, FaFilePdf, FaFileExcel, FaTrash, FaEdit, FaTimes, FaFilter } from 'react-icons/fa';
import { inventoryService, productsService, pricingService, authService } from '../../services/imsApi';

// Import the inventory fix utility
import { 
  populateInventoryTable as utilPopulateTable, 
  addTestInventoryData as utilAddTestData,
  testInventoryService as utilTestService,
  fetchInventoryData as utilFetchData
} from '../../utils/inventoryFix';

// Import the new inventory data fix utility
import { 
  fetchInventoryData as newFetchInventoryData,
  testBackendServices,
  addTestInventoryData as newAddTestData,
  getServiceStatus
} from '../../utils/inventoryDataFix';



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

// ─── Grouped Inventory Table ─────────────────────────────────────────────────
function GroupedInventoryTable({ filteredInventory, inventory, loading, error, formatPrice, getStatusBadge, onEdit, onDelete, products }) {
  const [expandedProducts, setExpandedProducts] = useState({});

  // Helper: get product name by productId
  const getProductName = (productId) => {
    const product = products?.find(p => p.productId === parseInt(productId));
    return product ? (product.productName || product.name || `Product #${productId}`) : `Product #${productId}`;
  };

  // Group by productId
  const groups = filteredInventory.reduce((acc, item) => {
    const key = item.productId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const toggleExpand = (productId) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  if (loading && filteredInventory.length === 0) {
    return (
      <div style={{textAlign:'center', padding:'40px', color:'#666'}}>
        <div style={{width:'40px',height:'40px',border:'4px solid #f3f3f3',borderTop:'4px solid #3498db',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}></div>
        <p>Loading inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{textAlign:'center', padding:'40px'}}>
        <div style={{background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', padding:'24px', color:'#991b1b', maxWidth:'520px', margin:'0 auto'}}>
          <div style={{fontSize:'32px', marginBottom:'10px'}}>⚠️</div>
          <div style={{fontWeight:'600', fontSize:'15px', marginBottom:'8px'}}>Failed to load inventory</div>
          <div style={{fontSize:'13px', color:'#b91c1c', wordBreak:'break-word'}}>{error}</div>
        </div>
      </div>
    );
  }

  if (filteredInventory.length === 0) {
    return (
      <div style={{textAlign:'center', padding:'40px', color:'#6b7280', fontSize:'14px'}}>
        <div style={{fontSize:'32px', marginBottom:'10px'}}>📭</div>
        No inventory data found.
      </div>
    );
  }

  return (
    <table className="inventory-table">
      <thead>
        <tr>
          <th>Product ID</th>
          <th>Product Name</th>
          <th>Base Barcode</th>
          <th>MRP</th>
          <th>Selling Price</th>
          <th>Buy Price</th>
          <th>Stock Summary</th>
          <th>Platform</th>
          <th>Units (expand)</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(groups).map(([productId, items]) => {
          const first = items[0];
          const availableCount = inventory.filter(i => i.productId === first.productId && i.inventoryStatus === 'AVAILABLE').length;
          const reservedCount = inventory.filter(i => i.productId === first.productId && i.inventoryStatus === 'RESERVED').length;
          const soldCount = inventory.filter(i => i.productId === first.productId && (i.inventoryStatus === 'SALE' || i.inventoryStatus === 'SOLD')).length;
          const isExpanded = expandedProducts[productId];

          return (
            <React.Fragment key={productId}>
              {/* ── Summary Row ── */}
              <tr style={{background: '#f8fafc', fontWeight: '600', borderTop: '2px solid #e2e8f0'}}>
                <td>{productId}</td>
                <td style={{color: '#1e40af', fontWeight: '700'}}>{getProductName(productId)}</td>
                <td className="inventory-sku">{first.barcode?.replace(/-\d+$/, '') || first.barcode}</td>
                <td>{formatPrice(first.mrp || 0)}</td>
                <td>{formatPrice(first.sellingPrice || 0)}</td>
                <td>{formatPrice(first.buyPrice || 0)}</td>
                <td>
                  <div style={{fontSize:'12px', lineHeight:'1.8'}}>
                    <span style={{background:'#dcfce7',color:'#166534',padding:'2px 8px',borderRadius:'10px',marginRight:'4px',fontWeight:'700'}}>✅ {availableCount} Available</span>
                    {reservedCount > 0 && <span style={{background:'#fef9c3',color:'#854d0e',padding:'2px 8px',borderRadius:'10px',marginRight:'4px'}}>🔒 {reservedCount} Reserved</span>}
                    {soldCount > 0 && <span style={{background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:'10px'}}>📦 {soldCount} Sold</span>}
                  </div>
                </td>
                <td>
                  <span className={first.platformStatus === 'ENABLED' ? 'status-instock' : 'status-outstock'}>
                    {first.platformStatus}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => toggleExpand(productId)}
                    style={{background: isExpanded ? '#e0e7ff' : '#eff6ff', border:'1px solid #c7d2fe', borderRadius:'6px', padding:'4px 12px', cursor:'pointer', fontSize:'12px', fontWeight:'600', color:'#4338ca'}}
                  >
                    {isExpanded ? '▲ Collapse' : `▼ ${items.length} units`}
                  </button>
                </td>
              </tr>

              {/* ── Individual Unit Rows (expanded) ── */}
              {isExpanded && items.map((item) => (
                <tr key={item.id || item.barcode} style={{background:'#fafafa', fontSize:'13px'}}>
                  <td style={{paddingLeft:'24px', color:'#94a3b8'}}>↳ {item.id || 'N/A'}</td>
                  <td style={{color:'#94a3b8', fontSize:'12px'}}>{getProductName(item.productId)}</td>
                  <td className="inventory-sku" style={{color:'#64748b'}}>{item.barcode}</td>
                  <td>{formatPrice(item.mrp || 0)}</td>
                  <td>{formatPrice(item.sellingPrice || 0)}</td>
                  <td>{formatPrice(item.buyPrice || 0)}</td>
                  <td>
                    <span className={getStatusBadge(item.inventoryStatus)}>
                      {item.inventoryStatus}
                    </span>
                  </td>
                  <td>{item.conditionStatus}</td>
                  <td className="inventory-action-col">
                    <div className="inventory-action-buttons">
                      {/* Edit/Delete removed - Warehouse manages inventory */}
                      <span style={{fontSize: '12px', color: '#94a3b8'}}>View Only</span>
                    </div>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

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
    // Test connection first, then load data
    const initializeInventory = async () => {
      await testInventoryConnection();
      await loadInventory();
      await loadProducts();
      await loadCategories();
    };
    
    initializeInventory();
    
    // Subscribe to real-time inventory events
    const unsubscribe = window.inventoryEventManager.subscribe((eventType, data) => {
      console.log('📦 Inventory event received:', eventType, data);
      
      switch(eventType) {
        case 'INVENTORY_ADDED':
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
          setInventory(prev => {
            const filtered = prev.filter(item => item.barcode !== data.barcode);
            setFilteredInventory(statusFilter === 'All' ? filtered : 
              filtered.filter(item => item.inventoryStatus === statusFilter));
            return filtered;
          });
          break;
          
        case 'REFRESH_INVENTORY':
          loadInventory();
          break;
      }
    });
    
    // Listen for role changes
    const handleRoleChange = () => {
      loadInventory(); // Reload data with new role
    };

    // Listen for pricing updates — refresh inventory so MRP/price columns stay in sync
    const handlePricingUpdate = () => {
      loadInventory();
    };
    
    window.addEventListener('roleChanged', handleRoleChange);
    window.addEventListener('pricingUpdated', handlePricingUpdate);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadInventory, 30000);
    
    return () => {
      clearInterval(interval);
      unsubscribe();
      window.removeEventListener('roleChanged', handleRoleChange);
      window.removeEventListener('pricingUpdated', handlePricingUpdate);
    };
  }, [statusFilter]);

  // Test inventory service connection
  const testInventoryConnection = async () => {
    try {
      console.log('🔍 Testing inventory service connection...');
      // Force admin role for inventory operations
      const originalRole = localStorage.getItem('userRole');
      localStorage.setItem('userRole', 'ADMIN');
      
      const testResult = await inventoryService.testConnection();
      console.log('✅ Inventory service test result:', testResult);
      
      // Restore original role
      if (originalRole) {
        localStorage.setItem('userRole', originalRole);
      }
      
      return testResult;
    } catch (error) {
      console.error('❌ Inventory service test failed:', error);
      return { error: error.message };
    }
  };

  // Enhanced inventory loading with better error handling
  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading inventory data with enhanced error handling...');
      
      // Use the new utility function for better error handling
      const result = await newFetchInventoryData();
      
      if (result.success) {
        const data = result.data || [];
        console.log('✅ Inventory data loaded successfully:', data.length, 'items');
        setInventory(data);
        setFilteredInventory(data);
      } else {
        console.error('❌ Failed to load inventory:', result.error);
        setError(result.error || 'Failed to load inventory data');
        setInventory([]);
        setFilteredInventory([]);
      }
      
    } catch (err) {
      console.error('❌ Unexpected error in loadInventory:', err);
      setError('Unexpected error: ' + err.message + '. Please check browser console for details.');
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

  // Load categories and subcategories
  const loadCategories = async () => {
    try {
      const [allCategories, allSubcategories] = await Promise.all([
        productsService.getAllCategories(),
        productsService.getAllSubcategories()
      ]);
      setCategories(allCategories || []);
      setSubcategories(allSubcategories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Handle product selection - automatically populate category, subcategory and pricing
  const handleProductChange = async (productId) => {
    try {
      const product = products.find(p => p.productId === parseInt(productId));
      if (product) {
        setSelectedProduct(product);
        
        // Generate a unique inventory barcode — always fresh, never reuse product barcode
        const productBarcode = editingItem
          ? formData.barcode
          : (() => {
              const ts = Date.now().toString().slice(-8);
              const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
              return `PRD-${ts}-${rand}`;
            })();
        
        // Auto-populate all fields from selected product
        setFormData(prev => ({
          ...prev,
          productId: productId,
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId,
          barcode: productBarcode
        }));

        // Load subcategories for the selected category
        if (product.categoryId) {
          const subs = await productsService.getSubcategoriesByCategory(product.categoryId);
          setSubcategories(subs || []);
        }

        // Get pricing data from pricing service
        try {
          const parsedProductId = parseInt(productId);
          console.log('🔄 Fetching pricing data for product ID:', parsedProductId);
          let pricingResponse = await pricingService.getPricingByProductId(parsedProductId);

          // Fallback: search in all pricing list if direct fetch returns null
          if (!pricingResponse || pricingResponse.error) {
            console.log('⚠️ Direct pricing fetch failed, trying getAllPricing fallback...');
            const allPricing = await pricingService.getAllPricing();
            pricingResponse = allPricing.find(p => parseInt(p.productId) === parsedProductId) || null;
          }
          
          if (pricingResponse && !pricingResponse.error) {
            console.log('✅ Pricing data loaded:', pricingResponse);
            
            // Extract pricing data from response
            const mrp = pricingResponse.mrp || '';
            const sellingPrice = pricingResponse.sellingPrice || '';
            const costPrice = pricingResponse.costPrice || '';
            const unitSize = pricingResponse.unitSize || '';
            const unitLabel = pricingResponse.unitLabel || '';
            
            setFormData(prev => ({
              ...prev,
              mrp: mrp,
              showroomPrice: mrp ? (mrp * 0.9).toFixed(2) : '',
              buyPrice: costPrice,          // ← pricing table च्या costPrice ने auto-fill
              sellingPrice: sellingPrice
            }));
            
            console.log('💰 Pricing auto-filled:', {
              mrp: mrp,
              costPrice: costPrice,
              sellingPrice: sellingPrice,
              unitSize: unitSize,
              unitLabel: unitLabel
            });
          } else {
            console.log('⚠️ No pricing data found for product ID:', productId);
            // Set empty pricing if no pricing data found
            setFormData(prev => ({
              ...prev,
              mrp: '',
              showroomPrice: '',
              buyPrice: '',
              sellingPrice: ''
            }));
          }
        } catch (pricingError) {
          console.log('❌ Error fetching pricing data:', pricingError);
          // Set empty pricing fields if no data available
          setFormData(prev => ({
            ...prev,
            mrp: '',
            showroomPrice: '',
            buyPrice: '',
            sellingPrice: ''
          }));
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
    if (window.confirm('Are you sure you want to delete this inventory item? This action cannot be undone.')) {
      setLoading(true);
      try {
        const result = await inventoryService.deleteInventory(barcode);
        
        if (result.success) {
          // Emit real-time delete event
          window.inventoryEventManager.emit('INVENTORY_DELETED', { barcode });
          alert('✅ ' + result.message);
        } else {
          alert('❌ ' + result.error);
        }
      } catch (err) {
        console.error('Delete error:', err);
        alert('❌ Failed to delete inventory: ' + err.message);
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
      quantity: 1,
      createdBy: 1,
      updatedBy: 1
    });
    setShowModal(true);
    console.log('Modal state set to true');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // ── Price validation ──
    const buyP  = parseFloat(formData.buyPrice);
    const sellP = parseFloat(formData.sellingPrice);
    const mrpP  = parseFloat(formData.mrp);

    if (buyP > 0 && sellP > 0 && buyP >= sellP) {
      alert(`❌ Buy Price (₹${buyP}) cannot be greater than or equal to Selling Price (₹${sellP})!\n\nRule: Buy Price < Selling Price\nExample: Buy Price ₹800, Selling Price ₹1,200`);
      setLoading(false);
      return;
    }
    if (sellP > 0 && mrpP > 0 && sellP > mrpP) {
      alert(`❌ Selling Price (₹${sellP}) cannot be greater than MRP (₹${mrpP})!`);
      setLoading(false);
      return;
    }

    try {
      const baseData = {
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

      if (editingItem) {
        // Edit: single item update
        const result = await inventoryService.updateInventory(formData.barcode, { ...baseData, barcode: formData.barcode });
        if (result && result.error) throw new Error(result.error);
        window.inventoryEventManager.emit('INVENTORY_UPDATED', { ...editingItem, ...baseData });
        alert('✅ Inventory updated successfully!');
      } else {
        // Add: create N units with unique barcodes
        const qty = parseInt(formData.quantity) || 1;
        // Sanitize base barcode — strip any colon-suffixed segments that may have been stored previously
        const baseBarcode = formData.barcode.replace(/:[^/]*$/, '');
        let successCount = 0;
        let failCount = 0;

        for (let i = 1; i <= qty; i++) {
          // barcode: BED-01-1, BED-01-2 ... or BED-01 if qty=1
          const barcode = qty === 1 ? baseBarcode : `${baseBarcode}-${i}`;
          try {
            const result = await inventoryService.createInventory({ ...baseData, barcode });
            if (result.error) { failCount++; console.error(`Failed unit ${i}:`, result.error); }
            else { successCount++; window.inventoryEventManager.emit('INVENTORY_ADDED', { ...baseData, barcode }); }
          } catch (err) {
            failCount++;
            console.error(`Error unit ${i}:`, err.message);
          }
        }

        if (failCount === 0) {
          alert(`✅ ${successCount} inventory unit${successCount > 1 ? 's' : ''} added successfully!`);
        } else {
          alert(`⚠️ ${successCount} units added, ${failCount} failed. Check console for details.`);
        }
      }

      setShowModal(false);
      await loadInventory();
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
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <h2>Inventory Management</h2>
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            color: '#92400e',
            fontWeight: '600'
          }}>
            ℹ️ Inventory is managed by Warehouse. View only.
          </div>
        </div>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          {loading && <span style={{color: 'orange', fontSize: '14px'}}>🔄 Loading...</span>}
          {/* Add Inventory button removed - Warehouse manages inventory */}
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
            <button 
              className="inventory-refresh-btn" 
              onClick={loadInventory}
              disabled={loading}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginRight: '8px',
                fontSize: '14px'
              }}
            >
              🔄 {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button className="inventory-pdf-btn" onClick={handleExportPDF}>
              <FaFilePdf /> PDF
            </button>
            <button className="inventory-excel-btn" onClick={handleExportExcel}>
              <FaFileExcel /> Excel
            </button>
          </div>
        </div>

        <GroupedInventoryTable
          filteredInventory={filteredInventory}
          inventory={inventory}
          loading={loading}
          error={error}
          formatPrice={formatPrice}
          getStatusBadge={getStatusBadge}
          onEdit={handleEdit}
          onDelete={handleDelete}
          products={products}
        />
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
                    <option key={product.productId} value={product.productId}>
                      {product.name} (ID: {product.productId})
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
                  <h4 style={{margin: '0 0 8px 0', fontSize: '14px', color: '#0f172a'}}>✅ Product Auto-Selected:</h4>
                  <p style={{margin: '4px 0', fontSize: '12px', color: '#374151'}}><strong>Name:</strong> {selectedProduct.name}</p>
                  <p style={{margin: '4px 0', fontSize: '12px', color: '#374151'}}><strong>Product ID:</strong> {selectedProduct.productId}</p>
                  <p style={{margin: '4px 0', fontSize: '12px', color: '#374151'}}><strong>Product Barcode:</strong> {selectedProduct.productBarcode}</p>
                  <p style={{margin: '4px 0', fontSize: '12px', color: '#374151'}}><strong>Category ID:</strong> {selectedProduct.categoryId}</p>
                  <p style={{margin: '4px 0', fontSize: '12px', color: '#374151'}}><strong>Subcategory ID:</strong> {selectedProduct.subcategoryId}</p>
                  <p style={{margin: '4px 0', fontSize: '11px', color: '#22c55e', fontStyle: 'italic'}}>🔄 Auto-filling: Barcode, Category, Subcategory, and Pricing data...</p>
                  {formData.mrp && (
                    <p style={{margin: '4px 0', fontSize: '11px', color: '#16a34a', fontWeight: 'bold'}}>
                      💰 Pricing loaded: MRP ₹{formData.mrp} | Cost ₹{formData.buyPrice || '—'} | Selling ₹{formData.sellingPrice}
                      {formData.buyPrice && formData.sellingPrice && parseFloat(formData.buyPrice) > 0 && (
                        <span style={{color: '#6366f1', marginLeft: 6}}>
                          → Profit/unit: ₹{(parseFloat(formData.sellingPrice) - parseFloat(formData.buyPrice)).toFixed(0)}
                        </span>
                      )}
                      {selectedProduct.unitSize && selectedProduct.unitLabel && (
                        <span style={{color: '#6b7280'}}> ({selectedProduct.unitSize} {selectedProduct.unitLabel})</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Barcode (From Product) *</label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  placeholder="Auto-filled from selected product"
                  disabled={editingItem}
                  required
                  style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: editingItem ? '#f9fafb' : '#f0f8ff', borderLeft: editingItem ? 'none' : '3px solid #007bff'}}
                />
              </div>

              {/* Quantity field — only for new entries */}
              {!editingItem && (
                <div style={{marginBottom: '8px', gridColumn: '1 / -1', background: '#fefce8', border: '2px solid #facc15', borderRadius: '8px', padding: '12px'}}>
                  <label style={{display: 'block', marginBottom: '4px', fontWeight: '700', color: '#92400e', fontSize: '13px'}}>
                    📦 How many units to add? (Quantity)
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    required
                    style={{width: '100%', padding: '10px', border: '2px solid #facc15', borderRadius: '6px', fontSize: '15px', fontWeight: '700', boxSizing: 'border-box', background: '#fff'}}
                  />
                  <p style={{margin: '6px 0 0', fontSize: '11px', color: '#78350f'}}>
                    ⚡ If quantity &gt; 1, barcodes are auto-generated: <strong>{formData.barcode || 'PRD-XXXXXXXX-XXXX'}-1</strong>, <strong>{formData.barcode || 'PRD-XXXXXXXX-XXXX'}-2</strong>, ...
                  </p>
                </div>
              )}
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
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>
                  Buy Price * <span style={{color: formData.buyPrice ? '#16a34a' : '#dc2626', fontWeight:700}}>
                    {formData.buyPrice ? '← Auto-filled from Pricing (you can edit)' : '← Set costPrice in Pricing first'}
                  </span>
                </label>
                <input type="number" step="0.01" name="buyPrice" value={formData.buyPrice} onChange={handleInputChange}
                  placeholder="Auto-filled from Pricing costPrice once set"
                  required
                  style={{width: '100%', padding: '8px', border: `1px solid ${formData.buyPrice && formData.sellingPrice && parseFloat(formData.buyPrice) >= parseFloat(formData.sellingPrice) ? '#ef4444' : '#f59e0b'}`, borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: formData.buyPrice ? '#f0fdf4' : '#fffbeb', borderLeft: `3px solid ${formData.buyPrice && formData.sellingPrice && parseFloat(formData.buyPrice) >= parseFloat(formData.sellingPrice) ? '#ef4444' : formData.buyPrice ? '#10b981' : '#f59e0b'}`}} />
                {!formData.buyPrice && (
                  <p style={{color:'#d97706', fontSize:'11px', marginTop:'3px', fontWeight:500}}>
                    ⚠️ Go to Pricing → Add/Edit Pricing → set Cost Price — it will auto-fill here
                  </p>
                )}
                {formData.buyPrice && formData.sellingPrice && parseFloat(formData.buyPrice) >= parseFloat(formData.sellingPrice) && (
                  <p style={{color:'#ef4444', fontSize:'11px', marginTop:'3px', fontWeight:500}}>
                    ⚠️ Buy Price must be less than Selling Price!
                  </p>
                )}
              </div>
              <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151', fontSize: '13px'}}>Selling Price (Auto-filled) * <span style={{color:'#6b7280', fontWeight:400}}>— Customer ला विकण्याची किंमत</span></label>
                <input type="number" step="0.01" name="sellingPrice" value={formData.sellingPrice} onChange={handleInputChange} placeholder="Auto-filled from product" required
                  style={{width: '100%', padding: '8px', border: `1px solid ${formData.buyPrice && formData.sellingPrice && parseFloat(formData.buyPrice) >= parseFloat(formData.sellingPrice) ? '#ef4444' : '#d1d5db'}`, borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#f0f8ff', borderLeft: `3px solid ${formData.buyPrice && formData.sellingPrice && parseFloat(formData.buyPrice) >= parseFloat(formData.sellingPrice) ? '#ef4444' : '#007bff'}`}} />
                {formData.buyPrice && formData.sellingPrice && parseFloat(formData.buyPrice) > 0 && parseFloat(formData.sellingPrice) > parseFloat(formData.buyPrice) && (
                  <p style={{color:'#10b981', fontSize:'11px', marginTop:'3px'}}>
                    ✅ Profit: ₹{(parseFloat(formData.sellingPrice) - parseFloat(formData.buyPrice)).toFixed(2)} per unit
                  </p>
                )}
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
