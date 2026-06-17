import React, { useState, useEffect } from 'react';
import '../css/PurchaseOrders.css';
import { FaPlus, FaFilePdf, FaFileExcel, FaTrash, FaEdit, FaTimes, FaSearch, FaSync, FaEye, FaCheck, FaBan } from 'react-icons/fa';
import { imsService } from '../../services/imsApi';
import { notifyPOApproved, notifyPricingAdded, notifyPricingUpdated } from '../../services/notificationStore';

// ─── Role helpers ─────────────────────────────────────────────────────────────
// PO Workflow:
//   CREATE  → WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN
//   APPROVE → ADMIN, FINANCE_TEAM
//   CANCEL  → ADMIN, PROCUREMENT, FINANCE_TEAM
//   RECEIVE → WAREHOUSE_MANAGER, ADMIN  (via GRN — separate screen)

const ROLE_LABELS = {
  WAREHOUSE_MANAGER: '🏭 Warehouse Manager',
  PROCUREMENT:       '📋 Procurement Team',
  INVENTORY_MANAGER: '📦 Inventory Manager',
  FINANCE_TEAM:      '💰 Finance Team',
  ADMIN:             '🔑 Admin',
};

const canCreatePO   = (role) => ['WAREHOUSE_MANAGER','PROCUREMENT','INVENTORY_MANAGER','ADMIN'].includes(role);
const canApprovePO  = (role) => ['ADMIN','FINANCE_TEAM'].includes(role);
const canCancelPO   = (role) => ['ADMIN','PROCUREMENT','FINANCE_TEAM'].includes(role);
const canDeletePO   = (role) => ['ADMIN'].includes(role);

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({});
  const [toast, setToast] = useState(null);

  // Current user role — read from sessionStorage (admin) or localStorage
  const currentRole = (() => {
    if (sessionStorage.getItem('isAdminSession') === 'true') {
      return sessionStorage.getItem('adminRole') || 'ADMIN';
    }
    return localStorage.getItem('userRole') || localStorage.getItem('role') || 'ADMIN';
  })();

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };
  
  // Dropdown data
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  const [formData, setFormData] = useState({
    supplierId: '',
    warehouseId: '',
    expectedDeliveryDate: '',
    poDate: new Date().toISOString().split('T')[0],
    creditTerms: 'NET_30',
    currency: 'INR',
    receiveMaterials: true,
    shipToAddress: '',
    notes: '',
    status: 'PENDING',
    orderLines: []
  });

  const [newOrderLine, setNewOrderLine] = useState({
    productId: '',
    quantity: 1,
    unitPrice: ''
  });

  const statusOptions = ['DRAFT', 'APPROVED', 'RECEIVING', 'CLOSED', 'CANCELLED'];
  const statusColors = {
    'DRAFT':     { bg: '#fef3c7', color: '#92400e' },
    'APPROVED':  { bg: '#dbeafe', color: '#1e40af' },
    'RECEIVING': { bg: '#e0e7ff', color: '#4338ca' },
    'CLOSED':    { bg: '#d1fae5', color: '#065f46' },
    'CANCELLED': { bg: '#fee2e2', color: '#991b1b' }
  };

  useEffect(() => {
    loadPurchaseOrders();
    loadSuppliers();
    loadWarehouses();
    loadProducts();
    
    const interval = setInterval(loadPurchaseOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = purchaseOrders.filter(po =>
        po.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.warehouseName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(purchaseOrders);
    }
  }, [searchQuery, purchaseOrders]);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      const data = await imsService.purchaseOrders.getAll();
      setPurchaseOrders(data || []);
      setFilteredOrders(data || []);
      
      const statsData = await imsService.purchaseOrders.getStats();
      setStats(statsData || {});
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await imsService.suppliers.getAll();
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      console.log('🏭 Loading warehouses...');
      const data = await imsService.warehouses.getAll();
      console.log('🏭 Warehouses received:', data);
      console.log('🏭 Warehouses count:', data?.length || 0);
      setWarehouses(data || []);
    } catch (error) {
      console.error('❌ Error loading warehouses:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await imsService.products.getAllProducts();
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.supplierId === parseInt(supplierId));
    setSelectedSupplier(supplier);
    setFormData({ ...formData, supplierId });
  };

  const handleWarehouseChange = (warehouseId) => {
    const warehouse = warehouses.find(
      w => (w.id || w.warehouseId) === parseInt(warehouseId)
    );
    // Ship To Address — warehouse name + city auto-fill
    const autoAddress = warehouse
      ? `${warehouse.name || warehouse.warehouseName}${warehouse.city ? ', ' + warehouse.city : ''}${warehouse.address ? ' — ' + warehouse.address : ''}`
      : '';
    setFormData({ ...formData, warehouseId, shipToAddress: autoAddress });
  };

  const handleAddOrderLine = () => {
    if (!newOrderLine.productId || !newOrderLine.quantity || !newOrderLine.unitPrice) {
      showToast('error', 'Please fill all order line fields');
      return;
    }

    const product = products.find(p => p.productId === parseInt(newOrderLine.productId));
    const lineTotal = parseFloat(newOrderLine.quantity) * parseFloat(newOrderLine.unitPrice);

    const orderLine = {
      productId: parseInt(newOrderLine.productId),
      productName: product?.name || 'Unknown',
      sku: product?.productBarcode || product?.sku || '',
      quantity: parseInt(newOrderLine.quantity),       // kept for display/total calc
      qtyOrdered: parseInt(newOrderLine.quantity),     // backend field name
      unitPrice: parseFloat(newOrderLine.unitPrice),
      lineTotal: lineTotal
    };

    setFormData({
      ...formData,
      orderLines: [...formData.orderLines, orderLine]
    });

    setNewOrderLine({ productId: '', quantity: 1, unitPrice: '' });
  };

  const handleRemoveOrderLine = (index) => {
    const updatedLines = formData.orderLines.filter((_, i) => i !== index);
    setFormData({ ...formData, orderLines: updatedLines });
  };

  const calculateTotal = () => {
    return formData.orderLines.reduce((sum, line) => sum + line.lineTotal, 0);
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      supplierId: order.supplierId,
      warehouseId: order.warehouseId,
      expectedDeliveryDate: order.expectedDate?.split('T')[0] || order.expectedDeliveryDate?.split('T')[0] || '',
      poDate: order.poDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      creditTerms: order.creditTerms || 'NET_30',
      currency: order.currency || 'INR',
      receiveMaterials: order.receiveMaterials !== undefined ? order.receiveMaterials : true,
      shipToAddress: order.shipToAddress || '',
      notes: order.notes || '',
      status: order.status,
      orderLines: (order.lines || order.orderLines || []).map(l => ({
        productId: l.productId,
        productName: l.productName,
        sku: l.sku || '',
        quantity: l.qtyOrdered || l.quantity,
        qtyOrdered: l.qtyOrdered || l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: (l.qtyOrdered || l.quantity) * l.unitPrice
      }))
    });
    const supplier = suppliers.find(s => s.supplierId === order.supplierId);
    setSelectedSupplier(supplier);
    setShowModal(true);
  };

  const handleView = (order) => {
    setViewingOrder(order);
    setShowViewModal(true);
  };

  const handleDelete = async (poId) => {
    if (!canDeletePO(currentRole)) {
      showToast('error', 'Access denied: Only Admin can delete Purchase Orders.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      const result = await imsService.purchaseOrders.delete(poId);
      if (result.success) {
        loadPurchaseOrders();
        showToast('success', 'Purchase order deleted successfully');
      } else {
        showToast('error', result.error || 'Failed to delete purchase order');
      }
    }
  };

  const handleApprove = async (poId) => {
    if (!canApprovePO(currentRole)) {
      showToast('error', `Access denied: Only Admin or Finance Team can approve POs. Your role: ${ROLE_LABELS[currentRole] || currentRole}`);
      return;
    }
    if (window.confirm('Are you sure you want to approve this Purchase Order?')) {
      const result = await imsService.purchaseOrders.approve(poId);
      if (result.error) {
        showToast('error', result.error);
      } else {
        notifyPOApproved(
          result.poNumber || `PO-${poId}`,
          result.supplierName || 'Supplier'
        );
        showToast('success', `✅ PO Approved by ${ROLE_LABELS[currentRole] || currentRole}! Warehouse team has been notified.`);
        loadPurchaseOrders();
      }
    }
  };

  const handleCancel = async (poId) => {
    if (!canCancelPO(currentRole)) {
      showToast('error', `Access denied: Only Admin, Procurement, or Finance Team can cancel POs.`);
      return;
    }
    if (window.confirm('Are you sure you want to cancel this Purchase Order?')) {
      const result = await imsService.purchaseOrders.cancel(poId);
      if (result && result.error) {
        showToast('error', result.error);
      } else {
        showToast('success', 'Purchase Order cancelled.');
        loadPurchaseOrders();
      }
    }
  };

  const handleAddPurchaseOrder = () => {
    if (!canCreatePO(currentRole)) {
      showToast('error', `Access denied: Only Warehouse Manager, Procurement, Inventory Manager, or Admin can create POs. Your role: ${ROLE_LABELS[currentRole] || currentRole}`);
      return;
    }
    setEditingOrder(null);
    setSelectedSupplier(null);
    setFormData({
      supplierId: '',
      warehouseId: '',
      expectedDeliveryDate: '',
      poDate: new Date().toISOString().split('T')[0],
      creditTerms: 'NET_30',
      currency: 'INR',
      receiveMaterials: true,
      shipToAddress: '',
      notes: '',
      status: 'PENDING',
      orderLines: []
    });
    setNewOrderLine({ productId: '', quantity: 1, unitPrice: '' });
    setShowModal(true);
  };

  // ── AUTO PRICING SYNC FROM PO LINES ─────────────────────────────────────────
  // PO create झाल्यावर लगेच प्रत्येक product साठी:
  //   1. costPrice = PO unitPrice (actual negotiated supplier price)
  //   2. sellingPrice = costPrice + packaging(₹50) + shipping(₹80) + profit(₹500) + GST(18%)
  //   3. MRP = sellingPrice × 1.20 (rounded to ₹100)
  //   4. discount = (MRP - sellingPrice) / MRP × 100
  // Returns array of sync results for notifications
  const syncPricingFromPOLines = async (orderLines, poNumber) => {
    const DEFAULT_PACKAGING = 50;
    const DEFAULT_SHIPPING  = 80;
    const DEFAULT_PROFIT    = 500;
    const DEFAULT_GST       = 18;
    const MRP_BUFFER        = 1.20;

    const results = [];

    console.log('🔄 syncPricingFromPOLines START — lines:', orderLines.length, 'PO:', poNumber);

    for (const line of orderLines) {
      // ── Guard: skip invalid lines ──────────────────────────────────────────
      const productId = parseInt(line.productId);
      const unitPrice = parseFloat(line.unitPrice);

      if (!productId || isNaN(productId) || !unitPrice || unitPrice <= 0) {
        console.warn('⚠️ Skipping line — invalid productId or unitPrice:', line);
        continue;
      }

      const costPrice    = unitPrice;
      const gstAmt       = costPrice * DEFAULT_GST / 100;
      const sellingPrice = parseFloat((costPrice + DEFAULT_PACKAGING + DEFAULT_SHIPPING + DEFAULT_PROFIT + gstAmt).toFixed(2));
      const mrp          = parseFloat((Math.ceil(sellingPrice * MRP_BUFFER / 100) * 100).toFixed(2));
      const discount     = parseFloat(((mrp - sellingPrice) / mrp * 100).toFixed(2));
      const productName  = line.productName || `Product #${productId}`;

      console.log(`📦 Processing: ${productName} (ID:${productId}) costPrice=₹${costPrice} → selling=₹${sellingPrice} MRP=₹${mrp} discount=${discount}%`);

      try {
        // ── Check if pricing exists ──────────────────────────────────────────
        let existing = null;
        try {
          existing = await imsService.pricing.getPricingByProductId(productId);
          console.log(`  getPricingByProductId(${productId}) →`, existing ? `found (id=${existing.id})` : 'not found');
        } catch (checkErr) {
          console.warn(`  getPricingByProductId(${productId}) threw:`, checkErr.message);
          existing = null;
        }

        const isUpdate = existing && existing.productId;

        const pricingPayload = {
          productId,
          costPrice,
          sellingPrice,
          mrp,
          discount,
          packagingCost: DEFAULT_PACKAGING,
          shippingCost:  DEFAULT_SHIPPING,
          profitMargin:  DEFAULT_PROFIT,
          gstRate:       DEFAULT_GST,
        };

        if (isUpdate) {
          await imsService.pricing.updatePricing(productId, pricingPayload);
          console.log(`  ✅ UPDATED pricing for ${productName}`);
          notifyPricingUpdated(productName, poNumber, sellingPrice, mrp, discount);
        } else {
          await imsService.pricing.addPricing(pricingPayload);
          console.log(`  ✅ CREATED pricing for ${productName}`);
          notifyPricingAdded(productName, poNumber);
        }

        results.push({ productId, productName, poNumber, costPrice, sellingPrice, mrp, discount, isUpdate });

      } catch (err) {
        console.error(`  ❌ Pricing sync FAILED for product ${productId} (${productName}):`, err.message, err);
      }
    }

    console.log(`🔄 syncPricingFromPOLines DONE — synced ${results.length}/${orderLines.length} products`);
    return results;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supplierId || !formData.warehouseId) {
      showToast('error', 'Please select supplier and warehouse');
      return;
    }

    if (formData.orderLines.length === 0) {
      showToast('error', 'Please add at least one order line');
      return;
    }

    setLoading(true);
    try {
      // Map frontend field names → backend field names
      // requestedByRole — backend la kalel ki kon ne PO create kela
      const orderData = {
        supplierId: parseInt(formData.supplierId),
        warehouseId: parseInt(formData.warehouseId),
        expectedDate: formData.expectedDeliveryDate,
        poDate: formData.poDate || new Date().toISOString().split('T')[0],
        creditTerms: formData.creditTerms || 'NET_30',
        currency: formData.currency || 'INR',
        receiveMaterials: formData.receiveMaterials !== undefined ? formData.receiveMaterials : true,
        shipToAddress: formData.shipToAddress || '',
        notes: formData.notes || '',
        termsAndConditions: '',
        requestedByRole: currentRole,
        lines: formData.orderLines.map(line => ({
          productId: parseInt(line.productId),
          productName: line.productName || 'Product',
          sku: line.sku || '',
          qtyOrdered: parseInt(line.quantity),
          unitPrice: parseFloat(line.unitPrice),
          notes: line.notes || ''
        }))
      };

      console.log('📦 Sending PO data:', JSON.stringify(orderData, null, 2));

      if (editingOrder) {
        const result = await imsService.purchaseOrders.update(editingOrder.id, orderData);
        if (result.error) {
          showToast('error', result.error);
        } else {
          showToast('success', 'Purchase order updated successfully');
        }
      } else {
        const result = await imsService.purchaseOrders.create(orderData);
        if (result.error) {
          showToast('error', result.error);
        } else {
          showToast('success', 'Purchase order created successfully');

          // ── AUTO PRICING SYNC ─────────────────────────────────────────────
          console.log('🚀 PO created:', result.poNumber, '| Starting pricing sync...');
          console.log('📋 orderLines to sync:', JSON.stringify(formData.orderLines, null, 2));

          const syncResults = await syncPricingFromPOLines(
            formData.orderLines,
            result.poNumber || 'New PO'
          );

          console.log(`✅ Pricing synced for ${syncResults.length} product(s) from PO ${result.poNumber}`);

          // Pricing page ला event पाठवा — table auto-refresh होईल
          window.dispatchEvent(new CustomEvent('pricingUpdated', {
            detail: { source: 'PO_CREATE', poNumber: result.poNumber, count: syncResults.length }
          }));
        } // end else (new PO)
      } // end else (not editing)

      setShowModal(false);
      loadPurchaseOrders();
    } catch (err) {
      console.error('Submit error:', err);
      showToast('error', 'Failed to save purchase order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(price || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getStatusBadge = (status) => {
    const style = statusColors[status] || { bg: '#f3f4f6', color: '#374151' };
    return {
      background: style.bg,
      color: style.color,
      padding: '4px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600
    };
  };

  return (
    <div className="purchase-orders-page">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex', alignItems: 'center', gap: 8, minWidth: 280
        }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="po-header">
        <div>
          <h2>Purchase Orders</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {stats.totalOrders || 0} Total · {stats.pendingOrders || 0} Pending · 
            {formatPrice(stats.totalValue || 0)} Total Value
          </p>
          {/* Role badge — shows current user's role */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 6, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: canApprovePO(currentRole) ? '#dbeafe' : canCreatePO(currentRole) ? '#d1fae5' : '#f3f4f6',
            color:      canApprovePO(currentRole) ? '#1e40af' : canCreatePO(currentRole) ? '#065f46' : '#374151',
          }}>
            {ROLE_LABELS[currentRole] || currentRole}
            {canApprovePO(currentRole) && <span style={{ marginLeft: 4 }}>· Can Approve</span>}
            {!canApprovePO(currentRole) && canCreatePO(currentRole) && <span style={{ marginLeft: 4 }}>· Can Create</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="po-btn po-refresh-btn" 
            onClick={loadPurchaseOrders} 
            disabled={loading}
          >
            <FaSync className={loading ? 'spin' : ''} /> Refresh
          </button>
          {canCreatePO(currentRole) && (
            <button className="po-btn po-add-btn" onClick={handleAddPurchaseOrder}>
              <FaPlus /> Create Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <FaSearch style={{ 
            position: 'absolute', 
            left: 12, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: '#9ca3af' 
          }} />
          <input
            type="text"
            placeholder="Search purchase orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 36px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14
            }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="po-card">
        <div className="po-card-header">
          <h3>Purchase Order List ({filteredOrders.length})</h3>
          <div className="po-export-buttons">
            <button className="po-pdf-btn">
              <FaFilePdf /> PDF
            </button>
            <button className="po-excel-btn">
              <FaFileExcel /> Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <table className="po-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Warehouse</th>
              <th>Order Date</th>
              <th>Expected Delivery</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id || order.poId}>
                <td style={{ fontWeight: 600, color: '#4338ca' }}>{order.poNumber}</td>
                <td>{order.supplierName}</td>
                <td>{order.warehouseName || order.warehouseId}</td>
                <td>{formatDate(order.createdAt || order.orderDate)}</td>
                <td>{formatDate(order.expectedDate || order.expectedDeliveryDate)}</td>
                <td style={{ fontWeight: 600 }}>{formatPrice(order.totalAmount)}</td>
                <td>
                  <span style={getStatusBadge(order.status)}>
                    {order.status}
                  </span>
                </td>
                <td className="po-action-col">
                  <div className="po-action-buttons">
                    <FaEye 
                      className="po-view-icon" 
                      onClick={() => handleView(order)}
                      title="View Details"
                    />
                    {/* Approve — only ADMIN / FINANCE_TEAM */}
                    {order.status === 'DRAFT' && canApprovePO(currentRole) && (
                      <FaCheck
                        className="po-approve-icon"
                        title={`Approve PO (${ROLE_LABELS[currentRole] || currentRole})`}
                        onClick={() => handleApprove(order.id)}
                      />
                    )}
                    {/* Cancel — ADMIN, PROCUREMENT, FINANCE_TEAM */}
                    {(order.status === 'DRAFT' || order.status === 'APPROVED') && canCancelPO(currentRole) && (
                      <FaBan
                        className="po-delete-icon"
                        title="Cancel PO"
                        style={{ color: '#f59e0b' }}
                        onClick={() => handleCancel(order.id)}
                      />
                    )}
                    {/* Edit — WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN (DRAFT only) */}
                    {order.status === 'DRAFT' && canCreatePO(currentRole) && (
                      <FaEdit 
                        className="po-edit-icon" 
                        onClick={() => handleEdit(order)}
                        title="Edit"
                      />
                    )}
                    {/* Delete — ADMIN only, DRAFT only */}
                    {order.status === 'DRAFT' && canDeletePO(currentRole) && (
                      <FaTrash 
                        className="po-delete-icon" 
                        onClick={() => handleDelete(order.id)}
                        title="Delete"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            {loading ? 'Loading purchase orders...' : 'No purchase orders found'}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal po-modal" style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <h3>{editingOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}</h3>
              <FaTimes className="close-btn" onClick={() => setShowModal(false)} />
            </div>
            
            <form onSubmit={handleSubmit} className="po-form">
              {/* Row 1: Supplier | Ship To (Warehouse) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Supplier Selection */}
                <div className="form-group">
                  <label htmlFor="supplierId">Supplier *</label>
                  <select
                    id="supplierId"
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    required
                    style={{ fontSize: 14, padding: 10 }}
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.supplierId} value={supplier.supplierId}>
                        {supplier.name} — {supplier.company}
                      </option>
                    ))}
                  </select>
                  {selectedSupplier && (
                    <div style={{
                      marginTop: 6, padding: '6px 10px',
                      background: '#f0f9ff', borderRadius: 6,
                      fontSize: 12, color: '#0369a1'
                    }}>
                      📞 {selectedSupplier.phone} • ✉️ {selectedSupplier.email} • 🏷️ {selectedSupplier.category || 'N/A'}
                    </div>
                  )}
                </div>

                {/* Ship To (Warehouse) */}
                <div className="form-group">
                  <label htmlFor="warehouseId">Ship To (Warehouse) *</label>
                  <select
                    id="warehouseId"
                    name="warehouseId"
                    value={formData.warehouseId}
                    onChange={(e) => handleWarehouseChange(e.target.value)}
                    required
                    style={{ fontSize: 14, padding: 10 }}
                  >
                    <option value="">-- Select Warehouse --</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id || warehouse.warehouseId} value={warehouse.id || warehouse.warehouseId}>
                        {warehouse.name || warehouse.warehouseName} — {warehouse.city || ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: PO Date | Expected Delivery Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label htmlFor="poDate">PO Date *</label>
                  <input
                    id="poDate"
                    type="date"
                    value={formData.poDate}
                    onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="expectedDeliveryDate">Expected Delivery Date *</label>
                  <input
                    id="expectedDeliveryDate"
                    type="date"
                    name="expectedDeliveryDate"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Row 3: Credit Terms | Currency | Receive Materials */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label htmlFor="creditTerms">Credit Terms</label>
                  <select
                    id="creditTerms"
                    value={formData.creditTerms}
                    onChange={(e) => setFormData({ ...formData, creditTerms: e.target.value })}
                    style={{ fontSize: 14, padding: 10 }}
                  >
                    <option value="IMMEDIATE">Immediate</option>
                    <option value="NET_15">Net 15</option>
                    <option value="NET_30">Net 30</option>
                    <option value="NET_45">Net 45</option>
                    <option value="NET_60">Net 60</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    style={{ fontSize: 14, padding: 10 }}
                  >
                    <option value="INR">INR ₹</option>
                    <option value="USD">USD $</option>
                    <option value="EUR">EUR €</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="receiveMaterials">Receive Materials</label>
                  <select
                    id="receiveMaterials"
                    value={formData.receiveMaterials === true ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, receiveMaterials: e.target.value === 'true' })}
                    style={{ fontSize: 14, padding: 10 }}
                  >
                    <option value="true">✅ Yes — Warehouse receives</option>
                    <option value="false">❌ No — Third-party receiving</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Ship To Address | Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label htmlFor="shipToAddress">Ship To Address</label>
                  <input
                    id="shipToAddress"
                    type="text"
                    value={formData.shipToAddress}
                    onChange={(e) => setFormData({ ...formData, shipToAddress: e.target.value })}
                    placeholder="Auto-filled from warehouse selection"
                    style={{ fontSize: 14, padding: 10 }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <input
                    id="notes"
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes or instructions..."
                    style={{ fontSize: 14, padding: 10 }}
                  />
                </div>
              </div>

              {/* Status (edit only) */}
              {editingOrder && (
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Order Lines Section */}
              <div style={{ gridColumn: '1 / -1', marginTop: 20 }}>
                <h4 style={{ marginBottom: 12, color: '#0f172a' }}>Order Lines *</h4>
                
                {/* Add Order Line Form */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr 1fr auto', 
                  gap: 10, 
                  marginBottom: 16,
                  padding: 12,
                  background: '#f8fafc',
                  borderRadius: 8
                }}>
                  <select
                    value={newOrderLine.productId}
                    onChange={(e) => setNewOrderLine({ ...newOrderLine, productId: e.target.value })}
                    style={{ fontSize: 13, padding: 8 }}
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(product => (
                      <option key={product.productId} value={product.productId}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={newOrderLine.quantity}
                    onChange={(e) => setNewOrderLine({ ...newOrderLine, quantity: e.target.value })}
                    style={{ fontSize: 13, padding: 8 }}
                  />
                  
                  <input
                    type="number"
                    placeholder="Unit Price (₹)"
                    min="0"
                    step="0.01"
                    value={newOrderLine.unitPrice}
                    onChange={(e) => setNewOrderLine({ ...newOrderLine, unitPrice: e.target.value })}
                    style={{ fontSize: 13, padding: 8 }}
                  />
                  
                  <button
                    type="button"
                    onClick={handleAddOrderLine}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    Add Line
                  </button>
                </div>

                {/* Order Lines Table */}
                {formData.orderLines.length > 0 && (
                  <table style={{ width: '100%', fontSize: 13, marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ padding: 8, textAlign: 'left' }}>Product</th>
                        <th style={{ padding: 8, textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: 8, textAlign: 'right' }}>Unit Price</th>
                        <th style={{ padding: 8, textAlign: 'right' }}>Line Total</th>
                        <th style={{ padding: 8, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.orderLines.map((line, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: 8 }}>{line.productName}</td>
                          <td style={{ padding: 8, textAlign: 'right' }}>{line.quantity}</td>
                          <td style={{ padding: 8, textAlign: 'right' }}>{formatPrice(line.unitPrice)}</td>
                          <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>
                            {formatPrice(line.lineTotal)}
                          </td>
                          <td style={{ padding: 8, textAlign: 'center' }}>
                            <FaTrash
                              style={{ color: '#ef4444', cursor: 'pointer' }}
                              onClick={() => handleRemoveOrderLine(index)}
                            />
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                        <td colSpan={3} style={{ padding: 12, textAlign: 'right' }}>
                          Estimated Total:
                        </td>
                        <td style={{ padding: 12, textAlign: 'right', fontSize: 16, color: '#0369a1' }}>
                          {formatPrice(calculateTotal())}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {formData.orderLines.length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: 20, 
                    color: '#9ca3af',
                    background: '#fef3c7',
                    borderRadius: 6
                  }}>
                    No order lines added yet. Please add at least one product.
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="modal-buttons" style={{ gridColumn: '1 / -1', marginTop: 20 }}>
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={loading || formData.orderLines.length === 0}>
                  {loading ? 'Saving...' : (editingOrder ? 'Update Purchase Order' : 'Create Purchase Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingOrder && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowViewModal(false)}>
          <div className="modal po-modal" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3>Purchase Order Details - {viewingOrder.poNumber}</h3>
              <FaTimes className="close-btn" onClick={() => setShowViewModal(false)} />
            </div>
            
            <div style={{ padding: 20 }}>
              {/* Header Info */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: 20, 
                marginBottom: 20,
                padding: 16,
                background: '#f8fafc',
                borderRadius: 8
              }}>
                <div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Supplier</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{viewingOrder.supplierName} {viewingOrder.supplierCompany ? `— ${viewingOrder.supplierCompany}` : ''}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Warehouse</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{viewingOrder.warehouseName || `Warehouse #${viewingOrder.warehouseId}`}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Order Date</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{formatDate(viewingOrder.createdAt)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Expected Delivery</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{formatDate(viewingOrder.expectedDate)}</p>
                </div>
                {viewingOrder.poDate && (
                  <div>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>PO Date</p>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{formatDate(viewingOrder.poDate)}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Status</p>
                  <span style={getStatusBadge(viewingOrder.status)}>{viewingOrder.status}</span>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Total Amount</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#0369a1' }}>{formatPrice(viewingOrder.totalAmount)}</p>
                </div>
                {viewingOrder.creditTerms && (
                  <div>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Credit Terms</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{viewingOrder.creditTerms.replace('_', ' ')}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Currency</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{viewingOrder.currency || 'INR'}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Receive Materials</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: viewingOrder.receiveMaterials ? '#065f46' : '#991b1b' }}>
                    {viewingOrder.receiveMaterials ? '✅ Yes — Warehouse receives' : '❌ No — Third-party'}
                  </p>
                </div>
                {viewingOrder.shipToAddress && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Ship To Address</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{viewingOrder.shipToAddress}</p>
                  </div>
                )}
                {/* Requested By Role */}
                {viewingOrder.requestedByRole && (
                  <div>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Requested By</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                      {ROLE_LABELS[viewingOrder.requestedByRole] || viewingOrder.requestedByRole}
                    </p>
                  </div>
                )}
                {/* Approved By Role */}
                {viewingOrder.approvedByRole && (
                  <div>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Approved By</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>
                      {ROLE_LABELS[viewingOrder.approvedByRole] || viewingOrder.approvedByRole}
                      {viewingOrder.approvedAt && (
                        <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>
                          on {formatDate(viewingOrder.approvedAt)}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {viewingOrder.notes && (
                <div style={{ marginBottom: 20, padding: 12, background: '#fef9c3', borderRadius: 6 }}>
                  <p style={{ fontSize: 12, color: '#854d0e', fontWeight: 600, marginBottom: 4 }}>Notes:</p>
                  <p style={{ fontSize: 13, color: '#713f12' }}>{viewingOrder.notes}</p>
                </div>
              )}

              {/* Order Lines */}
              <h4 style={{ marginBottom: 12, color: '#0f172a' }}>Order Lines</h4>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: 10, textAlign: 'left' }}>Product</th>
                    <th style={{ padding: 10, textAlign: 'right' }}>Quantity</th>
                    <th style={{ padding: 10, textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: 10, textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingOrder.lines || viewingOrder.orderLines || []).map((line, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 10 }}>{line.productName}</td>
                      <td style={{ padding: 10, textAlign: 'right' }}>{line.qtyOrdered || line.quantity}</td>
                      <td style={{ padding: 10, textAlign: 'right' }}>{formatPrice(line.unitPrice)}</td>
                      <td style={{ padding: 10, textAlign: 'right', fontWeight: 600 }}>
                        {formatPrice((line.qtyOrdered || line.quantity) * line.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
