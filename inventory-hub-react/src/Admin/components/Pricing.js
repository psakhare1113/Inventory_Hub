import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, DollarSign, RefreshCw } from 'lucide-react';
import '../css/Products.css';
import { imsService } from '../../services/imsApi';
import PricingForm from './PricingForm';

export default function Pricing() {
  const [pricingData, setPricingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);
  const [syncStatus, setSyncStatus] = useState({}); // 🚀 Sync status tracking

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadPricingData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for pricing updates from other components (same tab)
  useEffect(() => {
    const handlePricingUpdate = () => {
      loadPricingData();
    };
    window.addEventListener('pricingUpdated', handlePricingUpdate);
    return () => window.removeEventListener('pricingUpdated', handlePricingUpdate);
  }, []);

  // ── Cross-tab sync: WarehouseDashboard दुसऱ्या tab मधून pricing update केल्यावर ──
  useEffect(() => {
    // BroadcastChannel — same browser, different tabs मधून pricing update catch करतो
    let channel = null;
    try {
      channel = new BroadcastChannel('ims_notifications_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'ims_notification_update') {
          // Notification आली म्हणजे pricing update झाली असेल — refresh करा
          loadPricingData();
        }
      };
    } catch (e) {
      // BroadcastChannel not supported — fallback to localStorage polling
    }

    // Fallback: localStorage 'pricingLastUpdated' key poll करा (5 seconds)
    let lastSeen = localStorage.getItem('pricingLastUpdated') || '';
    const poll = setInterval(() => {
      const current = localStorage.getItem('pricingLastUpdated') || '';
      if (current !== lastSeen) {
        lastSeen = current;
        loadPricingData();
      }
    }, 5000);

    return () => {
      channel?.close();
      clearInterval(poll);
    };
  }, []);

  // ── Pick up pending pricing updates queued by Warehouse ThresholdModal ──────
  useEffect(() => {
    const applyPendingUpdates = async () => {
      const pending = JSON.parse(localStorage.getItem('pendingPricingUpdates') || '[]');
      if (pending.length === 0) return;

      console.log('📋 Applying', pending.length, 'pending pricing update(s) from warehouse threshold...');
      const remaining = [];

      for (const update of pending) {
        try {
          // Check if pricing exists
          const existing = await imsService.pricing.getPricingByProductId(update.productId);
          if (existing && existing.productId) {
            await imsService.pricing.updatePricing(update.productId, {
              costPrice: update.costPrice,
              ...(!existing.sellingPrice || existing.sellingPrice === 0
                ? { sellingPrice: update.sellingPrice }
                : {}),
            });
          } else {
            await imsService.pricing.addPricing({
              productId:    update.productId,
              costPrice:    update.costPrice,
              sellingPrice: update.sellingPrice,
              mrp:          update.sellingPrice,
              gstRate:      18,
            });
          }
          console.log('✅ Applied pending pricing update for product', update.productId);
        } catch (e) {
          console.warn('⚠️ Could not apply pending update for product', update.productId, e.message);
          remaining.push(update); // keep for next attempt
        }
      }

      localStorage.setItem('pendingPricingUpdates', JSON.stringify(remaining));
      if (remaining.length < pending.length) {
        loadPricingData(); // refresh table
      }
    };

    applyPendingUpdates();
  }, []);

  // ── Backfill: Warehouse thresholds मधून missing pricing entries create करा ──
  useEffect(() => {
    const backfillPricingFromThresholds = async () => {
      try {
        const warehouseToken =
          sessionStorage.getItem('warehouseAuthToken') ||
          sessionStorage.getItem('warehouseToken');
        const adminToken =
          sessionStorage.getItem('adminToken') ||
          localStorage.getItem('authToken') ||
          localStorage.getItem('token');
        const token = adminToken || warehouseToken;
        if (!token) return;

        // Fetch all thresholds
        const threshRes = await fetch('http://localhost:9999/api/warehouse/auto-po/thresholds', {
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
        });
        if (!threshRes.ok) return;
        const thresholds = await threshRes.json().catch(() => []);
        if (!Array.isArray(thresholds) || thresholds.length === 0) return;

        // Fetch existing pricing
        const existingPricing = await imsService.pricing.getAllPricing().catch(() => []);
        const pricedProductIds = new Set((existingPricing || []).map(p => Number(p.productId)));

        let created = 0;
        for (const t of thresholds) {
          const pid = Number(t.productId);
          const unitPrice = Number(t.unitPrice || 0);
          if (!pid || unitPrice <= 0) continue;
          if (pricedProductIds.has(pid)) continue; // already has pricing

          // Create pricing from threshold unitPrice
          const sellingPrice = parseFloat((unitPrice * 1.18).toFixed(2));
          try {
            await imsService.pricing.addPricing({
              productId:    pid,
              costPrice:    unitPrice,
              sellingPrice,
              mrp:          sellingPrice,
              gstRate:      18,
              unitSize:     null,
              unitLabel:    null,
            });
            created++;
            console.log('✅ Backfilled pricing for product', pid, 'from threshold unitPrice', unitPrice);
          } catch (e) {
            console.warn('⚠️ Could not backfill pricing for product', pid, e.message);
          }
        }

        if (created > 0) {
          console.log('✅ Backfilled', created, 'pricing entries from warehouse thresholds');
          loadPricingData(); // refresh table
          // Clear product cache so customer-facing pages pick up new prices
          window.dispatchEvent(new CustomEvent('pricingUpdated', { detail: { source: 'backfill', count: created } }));
        }
      } catch (e) {
        console.warn('Backfill from thresholds failed:', e.message);
      }
    };

    backfillPricingFromThresholds();
  }, []);

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      const data = await imsService.pricing.getAllPricing();
      if (Array.isArray(data)) {
        setPricingData(data);
        setError(null);
        // 🚀 Check sync status after loading pricing data
        checkSyncStatus(data);
      } else {
        setPricingData([]);
        setError('Invalid pricing data format received from server');
      }
    } catch (err) {
      console.error('Error loading pricing:', err);
      setPricingData([]);
      setError(`Failed to load pricing data: ${err.message}`);
    } finally {
      setLoading(false);
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
        await loadPricingData();
        alert('✅ Pricing deleted successfully!');
        window.dispatchEvent(new CustomEvent('pricingUpdated', { detail: { deleted: id } }));
      } catch (err) {
        console.error('Error deleting pricing:', err);
        alert('Failed to delete pricing: ' + err.message);
      }
    }
  };

  // 🚀 Check sync status between pricing and inventory
  const checkSyncStatus = async (pricingList = pricingData) => {
    const statusMap = {};
    
    for (const pricing of pricingList) {
      try {
        // Get inventory data for this product
        const inventory = await imsService.inventory.getInventoryByProductId(pricing.productId);
        
        if (inventory && inventory.length > 0) {
          // Get latest inventory buyPrice
          const latestInventory = inventory.reduce((latest, current) => {
            const latestDate = new Date(latest.createdAt || latest.updatedAt || 0);
            const currentDate = new Date(current.createdAt || current.updatedAt || 0);
            return currentDate > latestDate ? current : latest;
          });
          
          const inventoryCostPrice = parseFloat(latestInventory.buyPrice || 0);
          const pricingCostPrice = parseFloat(pricing.costPrice || 0);
          
          if (inventoryCostPrice > 0) {
            if (Math.abs(inventoryCostPrice - pricingCostPrice) < 0.01) {
              statusMap[pricing.productId] = { status: 'synced', inventoryPrice: inventoryCostPrice };
            } else {
              statusMap[pricing.productId] = { status: 'out_of_sync', inventoryPrice: inventoryCostPrice, pricingPrice: pricingCostPrice };
            }
          } else {
            statusMap[pricing.productId] = { status: 'no_cost_price', inventoryPrice: 0 };
          }
        } else {
          statusMap[pricing.productId] = { status: 'no_inventory' };
        }
      } catch (error) {
        statusMap[pricing.productId] = { status: 'error' };
      }
    }
    
    setSyncStatus(statusMap);
  };

  // 🚀 Manual sync from inventory
  const handleSyncFromInventory = async (productId) => {
    try {
      const inventory = await imsService.inventory.getInventoryByProductId(productId);
      
      if (inventory && inventory.length > 0) {
        const latestInventory = inventory.reduce((latest, current) => {
          const latestDate = new Date(latest.createdAt || latest.updatedAt || 0);
          const currentDate = new Date(current.createdAt || current.updatedAt || 0);
          return currentDate > latestDate ? current : latest;
        });
        
        if (latestInventory.buyPrice && parseFloat(latestInventory.buyPrice) > 0) {
          // Update pricing with inventory cost price
          await imsService.pricing.updatePricing(productId, {
            costPrice: parseFloat(latestInventory.buyPrice)
          });
          
          // Reload data
          await loadPricingData();
          
          alert(`✅ Cost price synced from inventory: ₹${latestInventory.buyPrice}`);
        } else {
          alert('⚠️ No valid cost price found in inventory');
        }
      } else {
        alert('📦 No inventory found for this product');
      }
    } catch (error) {
      console.error('Error syncing from inventory:', error);
      alert('❌ Failed to sync from inventory: ' + error.message);
    }
  };

  const filteredPricing = pricingData
    .filter(pricing => {
      const name = (pricing.productName || '').toLowerCase();
      const barcode = (pricing.productBarcode || '').toLowerCase();
      const unit = (pricing.unitLabel || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || barcode.includes(term) || unit.includes(term);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (loading) return <div className="p-6">Loading pricing data...</div>;

  return (
    <div className="admin products-page">
      <div className="products-header">
        <h2>Pricing Management</h2>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <span style={{fontSize: '14px', color: error ? 'red' : 'green'}}>
            {error ? '❌ Backend Error' : '✅ Connected to Backend'}
          </span>
          <button
            onClick={loadPricingData}
            disabled={loading}
            title="Refresh pricing data"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', color: '#374151', opacity: loading ? 0.6 : 1 }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
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
            <strong>Backend Connection Error:</strong> {error}
            <div style={{marginTop: '10px', fontSize: '14px'}}>
              <strong>Troubleshooting:</strong>
              <ul style={{margin: '5px 0', paddingLeft: '20px'}}>
                <li>Make sure API Gateway is running on port 8080</li>
                <li>Make sure Products Service is running on port 9094</li>
                <li>Check if Service Registry (Eureka) is running on port 8761</li>
                <li>Try running: <code>restart-backend-for-pricing.bat</code></li>
              </ul>
            </div>
          </div>
        )}

        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>MRP (₹)</th>
              <th>Cost Price (₹)</th>
              <th>Selling Price (₹)</th>
              <th>Discount (%)</th>
              <th>Discount Amt (₹)</th>
              <th>Unit Size</th>
              <th>Unit Label</th>
              <th>Sync Status</th>
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
                          <div className="product-name">
                            {pricing.productName
                              ? `${pricing.productName} - ${pricing.productBarcode}`
                              : `Product ID: ${pricing.productId}`}
                          </div>
                          <div className="product-description">Product ID: {pricing.productId}</div>
                        </div>
                      </div>
                    </td>
                    <td>₹{(parseFloat(pricing.mrp) || 0).toFixed(2)}</td>
                    <td>
                      {pricing.costPrice != null
                        ? (
                          <div>
                            <span style={{ fontWeight: 600, color: '#d97706' }}>₹{(parseFloat(pricing.costPrice) || 0).toFixed(2)}</span>
                            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                              Supplier Cost
                            </div>
                          </div>
                        )
                        : <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>}
                    </td>
                    <td>₹{(parseFloat(pricing.sellingPrice) || 0).toFixed(2)}</td>
                    <td>
                      {(() => {
                        // Always show discount as positive % (MRP to Selling Price reduction)
                        const mrp = parseFloat(pricing.mrp) || 0;
                        const sp  = parseFloat(pricing.sellingPrice) || 0;
                        const discountPct = mrp > 0 ? ((mrp - sp) / mrp * 100) : 0;
                        if (discountPct > 0) {
                          return <span style={{ color: '#16a34a', fontWeight: '600', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>{discountPct.toFixed(1)}% off</span>;
                        }
                        return <span style={{ color: '#6b7280' }}>0%</span>;
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const mrp = parseFloat(pricing.mrp) || 0;
                        const sp  = parseFloat(pricing.sellingPrice) || 0;
                        const saved = mrp - sp;
                        if (saved > 0) {
                          return <span style={{ color: '#16a34a', fontWeight: '600' }}>₹{saved.toFixed(2)} saved</span>;
                        }
                        return <span style={{ color: '#6b7280' }}>₹0.00</span>;
                      })()}
                    </td>
                    <td>{pricing.unitSize}</td>
                    <td>{pricing.unitLabel}</td>
                    <td>
                      {(() => {
                        const sync = syncStatus[pricing.productId];
                        if (!sync) return <span style={{ color: '#9ca3af', fontSize: '11px' }}>⏳ Checking...</span>;
                        
                        switch (sync.status) {
                          case 'synced':
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: '#16a34a', fontSize: '11px', fontWeight: '600' }}>✅ Synced</span>
                              </div>
                            );
                          case 'out_of_sync':
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: '600' }}>⚠️ Out of Sync</span>
                                <span style={{ color: '#6b7280', fontSize: '10px' }}>Inv: ₹{sync.inventoryPrice}</span>
                                <button 
                                  onClick={() => handleSyncFromInventory(pricing.productId)}
                                  style={{ 
                                    padding: '2px 6px', fontSize: '9px', background: '#3b82f6', 
                                    color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'
                                  }}
                                  title="Sync cost price from inventory"
                                >
                                  🔄 Sync
                                </button>
                              </div>
                            );
                          case 'no_inventory':
                            return <span style={{ color: '#9ca3af', fontSize: '11px' }}>📦 No Inventory</span>;
                          case 'no_cost_price':
                            return <span style={{ color: '#f59e0b', fontSize: '11px' }}>⚠️ No Cost Price</span>;
                          case 'error':
                            return <span style={{ color: '#dc2626', fontSize: '11px' }}>❌ Error</span>;
                          default:
                            return <span style={{ color: '#9ca3af', fontSize: '11px' }}>Unknown</span>;
                        }
                      })()
                      }
                    </td>
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
                <td colSpan="12" style={{textAlign: 'center', padding: '40px', color: '#666'}}>
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