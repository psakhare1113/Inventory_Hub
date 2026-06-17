import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Phone, Calendar, User, Package, CheckCircle, RefreshCw, Search } from 'lucide-react';
import '../css/Tabs.css';

const getAuthHeaders = () => {
  // Admin sessions are stored in sessionStorage (tab-specific) to avoid
  // being overwritten by a customer login in another tab.
  const isAdminSession = sessionStorage.getItem('isAdminSession') === 'true';
  const token = isAdminSession
    ? sessionStorage.getItem('adminToken')
    : localStorage.getItem('authToken') || localStorage.getItem('token');
  const role = isAdminSession ? 'ADMIN' : (localStorage.getItem('userRole') || 'USER');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    'X-User-Role': role
  };
};

const Shipping = () => {
  const [activeTab, setActiveTab] = useState('shipments');
  const [addresses, setAddresses] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deliveringOrder, setDeliveringOrder] = useState(null);
  const [deliveryMessage, setDeliveryMessage] = useState(null);   // corner toast
  const [deliveryModal, setDeliveryModal] = useState(null);       // detail modal on click
  const [actionLoading, setActionLoading] = useState(null);

  const [search, setSearch] = useState('');

  const showShipToast = (type, title, detail) => {
    setDeliveryMessage({ type, title, detail });
    setTimeout(() => setDeliveryMessage(null), 6000);
  };

  useEffect(() => {
    if (activeTab === 'addresses') {
      fetchAddresses();
    } else {
      fetchShipments();
    }
  }, [activeTab]);

  // Auto-refresh shipments when tab becomes visible (user switches back from Packages)
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && activeTab === 'shipments') {
        fetchShipments();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeTab]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch shipments and PACKED orders in parallel
      const [shipRes, ordersRes] = await Promise.all([
        fetch('http://localhost:9999/api/auth/admin/shipping/shipments', { headers: getAuthHeaders() }),
        fetch('http://localhost:9999/api/auth/admin/orders/all', { headers: getAuthHeaders() }),
      ]);

      if (shipRes.status === 401 || shipRes.status === 403) {
        setError('Unauthorized: Please log in as admin');
        return;
      }

      let shipmentData = [];
      if (shipRes.ok) {
        shipmentData = await shipRes.json() || [];
      } else {
        setError('Failed to load shipments');
      }

      // Merge: add PACKED orders that have no shipment record yet
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json() || [];
        const existingOrderNumbers = new Set(shipmentData.map(s => s.orderNumber));

        const missingShipments = ordersData
          .filter(o => o.orderStatus?.toUpperCase() === 'PACKED' && !existingOrderNumbers.has(o.orderNumber))
          .map(o => ({
            id: `virtual-${o.orderNumber}`,
            orderNumber: o.orderNumber,
            customerId: o.customerId,
            shippingAddress: 'Address not available',
            status: 'PACKED',
            trackingNumber: null,
            courierPartner: null,
            createdAt: o.createdAt,
            deliveredAt: null,
            _virtual: true, // flag: not yet in DB
          }));

        shipmentData = [...missingShipments, ...shipmentData];
      }

      console.log('✅ Shipments loaded:', shipmentData);
      setShipments(shipmentData);
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:9999/api/auth/admin/shipping/addresses', {
        headers: getAuthHeaders()
      });
      if (response.status === 401 || response.status === 403) {
        setError('Unauthorized: Please log in as admin');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Addresses loaded:', data);
        setAddresses(data || []);
      } else {
        setError('Failed to load addresses');
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Case 18: Mark order as delivered
  const markDelivered = async (orderNumber) => {
    setDeliveringOrder(orderNumber);
    setDeliveryMessage(null);
    try {
      const response = await fetch(
        `http://localhost:9999/api/auth/admin/shipping/deliver/${orderNumber}`,
        { method: 'POST', headers: getAuthHeaders() }
      );
      if (response.status === 401 || response.status === 403) {
        showShipToast('error', 'Unauthorized', 'Admin token required. Please re-login.');
        return;
      }
      if (response.ok) {
        showShipToast('success', '✅ Order Delivered!', `Order ${orderNumber.slice(0,16)}… marked as DELIVERED. The order is now complete.`);
        fetchShipments();
      } else {
        const text = await response.text();
        showShipToast('error', 'Delivery Failed', text || 'Failed to mark as delivered');
      }
    } catch (err) {
      showShipToast('error', 'Error', err.message);
    } finally {
      setDeliveringOrder(null);
    }
  };

  const markPacked = async (orderNumber) => {
    setActionLoading(orderNumber + '_pack');
    try {
      const res = await fetch(`http://localhost:9999/api/auth/admin/shipping/pack/${orderNumber}`,
        { method: 'POST', headers: getAuthHeaders() });
      if (res.ok) {
        showShipToast('success', '📦 Order Packed!', `Order ${orderNumber.slice(0,16)}… marked as PACKED. Next → Go to Shipping tab → click 🚚 Ship.`);
        fetchShipments();
      } else {
        showShipToast('error', 'Pack Failed', 'Failed to mark as packed');
      }
    } catch (err) {
      showShipToast('error', 'Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const markShipped = async (orderNumber, customerId, isVirtual) => {
    const trackingNumber = prompt('Enter AWB / Tracking Number:') || '';
    const courierPartner = prompt('Enter Courier Partner (e.g. Delhivery, BlueDart, DTDC):') || '';
    setActionLoading(orderNumber + '_ship');
    try {
      // If shipment record doesn't exist in DB yet (virtual), create it first via pack endpoint
      if (isVirtual) {
        await fetch(
          `http://localhost:9999/api/auth/admin/shipping/pack/${orderNumber}${customerId ? `?customerId=${customerId}` : ''}`,
          { method: 'POST', headers: getAuthHeaders() }
        ).catch(() => {});
      }

      // 1. Update shipment status in shipping service
      const res = await fetch(
        `http://localhost:9999/api/auth/admin/shipping/ship/${orderNumber}?trackingNumber=${encodeURIComponent(trackingNumber)}&courierPartner=${encodeURIComponent(courierPartner)}`,
        { method: 'POST', headers: getAuthHeaders() }
      );

      // 2. Update order status to SHIPPED in orders service
      await fetch(
        `http://localhost:9999/api/auth/admin/orders/${orderNumber}/status?status=SHIPPED`,
        { method: 'PATCH', headers: getAuthHeaders() }
      ).catch(() => {});

      // 3. Also update AWB + courier on the order itself
      if (trackingNumber || courierPartner) {
        await fetch(
          `http://localhost:9999/api/auth/admin/orders/${orderNumber}/awb?awbNumber=${encodeURIComponent(trackingNumber)}&courierPartner=${encodeURIComponent(courierPartner)}`,
          { method: 'PATCH', headers: getAuthHeaders() }
        ).catch(() => {});
      }

      if (res.ok) {
        showShipToast('success', '🚚 Order Shipped!', `Order ${orderNumber.slice(0,16)}… SHIPPED | AWB: ${trackingNumber || '—'} | Courier: ${courierPartner || '—'}. Next → Orders → Assign Delivery Boy.`);
        fetchShipments();
      } else {
        showShipToast('error', 'Ship Failed', 'Failed to mark as shipped');
      }
    } catch (err) {
      showShipToast('error', 'Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    let date;
    // Java's LocalDateTime without JavaTimeModule serializes as an array: [year, month, day, hour, min, sec, nano]
    if (Array.isArray(dateValue)) {
      const [year, month, day, hour = 0, min = 0, sec = 0] = dateValue;
      // JS months are 0-indexed; Java months are 1-indexed
      date = new Date(year, month - 1, day, hour, min, sec);
    } else {
      date = new Date(dateValue);
    }
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getShipmentStatusColor = (status) => {
    switch (status) {
      case 'DELIVERED':      return 'bg-green-100 text-green-800';
      case 'CREATED':        return 'bg-blue-100 text-blue-800';
      case 'PACKED':         return 'bg-yellow-100 text-yellow-800';
      case 'SHIPPED':
      case 'IN_TRANSIT':     return 'bg-purple-100 text-purple-800';
      case 'PENDING_ADDRESS': return 'bg-orange-100 text-orange-800';
      default:               return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 8, background: '#ede9fe', borderRadius: 8 }}>
            <Truck style={{ width: 24, height: 24, color: '#7c3aed' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Shipping Management</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Shipment tracking and customer addresses</p>
          </div>
        </div>
        <button
          onClick={activeTab === 'addresses' ? fetchAddresses : fetchShipments}
          style={{
            padding: '7px 14px', background: '#7c3aed', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff',
            boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
            width: 'fit-content', flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
        </button>
      </div>

      {/* ── Corner Toast (bottom-right, small) ── */}
      {deliveryMessage && (
        <div
          onClick={() => { setDeliveryModal(deliveryMessage); setDeliveryMessage(null); }}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
            minWidth: 260, maxWidth: 320,
            background: deliveryMessage.type === 'success' ? '#16a34a' : '#dc2626',
            color: '#fff', borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer',
            animation: 'slideUp 0.3s ease',
          }}
          title="Click to view details"
        >
          <span style={{ fontSize: 20, flexShrink: 0 }}>
            {deliveryMessage.type === 'success' ? '✅' : '❌'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{deliveryMessage.title}</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {deliveryMessage.detail}
            </div>
          </div>
          <span style={{ fontSize: 10, opacity: 0.7, flexShrink: 0 }}>tap for details</span>
        </div>
      )}

      {/* ── Detail Modal (shown when toast is clicked) ── */}
      {deliveryModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
          onClick={() => setDeliveryModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
              animation: 'fadeInScale 0.2s ease',
            }}
          >
            {/* Header */}
            <div style={{
              background: deliveryModal.type === 'success'
                ? 'linear-gradient(135deg,#16a34a,#22c55e)'
                : 'linear-gradient(135deg,#dc2626,#ef4444)',
              padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 32 }}>
                {deliveryModal.title?.startsWith('🚚') ? '🚚' : deliveryModal.title?.startsWith('📦') ? '📦' : deliveryModal.type === 'success' ? '✅' : '❌'}
              </span>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{deliveryModal.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>Shipping Update</div>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 22px' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{deliveryModal.detail}</p>
              {deliveryModal.type === 'success' && deliveryModal.title?.includes('Shipped') && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: '#f5f3ff', borderRadius: 10, border: '1px solid #ede9fe', fontSize: 13, color: '#4c1d95' }}>
                  💡 <strong>Next step:</strong> Go to <strong>Orders</strong> in the sidebar → find this order (status: SHIPPED) → click <strong>👤 Assign Delivery</strong>
                </div>
              )}
              {deliveryModal.type === 'success' && deliveryModal.title?.includes('Packed') && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: '#fef3c7', borderRadius: 10, border: '1px solid #fde68a', fontSize: 13, color: '#92400e' }}>
                  💡 <strong>Next step:</strong> Find this order in the Shipments table below → click <strong>🚚 Ship</strong>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{ padding: '0 22px 18px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeliveryModal(null)}
                style={{
                  padding: '9px 28px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, color: '#fff',
                  background: deliveryModal.type === 'success' ? '#16a34a' : '#dc2626',
                }}
              >Got it ✓</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
      `}</style>

      {/* Tabs */}
      <div className="tab-container">
        <nav className="tab-nav">
          <button
            onClick={() => setActiveTab('shipments')}
            className={`tab-button ${activeTab === 'shipments' ? 'active' : ''}`}
          >
            <div className="tab-icon-text">
              <Package className="tab-icon" />
              Shipments
            </div>
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`tab-button ${activeTab === 'addresses' ? 'active' : ''}`}
          >
            <div className="tab-icon-text">
              <MapPin className="tab-icon" />
              Customer Addresses
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">❌ {error}</p>
            <button
              onClick={activeTab === 'addresses' ? fetchAddresses : fetchShipments}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Shipments Tab */}
        {!loading && !error && activeTab === 'shipments' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-600">Total Shipments</p>
                <p className="text-2xl font-bold">{shipments.length}</p>
              </div>
              <div className="bg-white p-5 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-600">Pending Delivery</p>
                <p className="text-2xl font-bold text-blue-600">
                  {shipments.filter(s => s.status !== 'DELIVERED').length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h2 className="text-lg font-semibold text-gray-900">Shipments</h2>
                {/* Search box */}
                <div style={{ position: 'relative', minWidth: 240 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search order, customer, status..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '7px 12px 7px 30px',
                      border: '1px solid #d1d5db', borderRadius: 8,
                      fontSize: 13, boxSizing: 'border-box', outline: 'none',
                    }}
                  />
                </div>
              </div>
              {shipments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  No shipments found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipping Address</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Courier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered At</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[...shipments]
                        .sort((a, b) => {
                          const toMs = (v) => {
                            if (!v) return 0;
                            if (Array.isArray(v)) return new Date(v[0], v[1]-1, v[2], v[3]||0, v[4]||0, v[5]||0).getTime();
                            return new Date(v).getTime();
                          };
                          return toMs(b.createdAt) - toMs(a.createdAt);
                        })
                        .filter(s => {
                          const q = search.toLowerCase();
                          if (!q) return true;
                          return (
                            s.orderNumber?.toLowerCase().includes(q) ||
                            String(s.customerId)?.includes(q) ||
                            s.status?.toLowerCase().includes(q) ||
                            s.trackingNumber?.toLowerCase().includes(q) ||
                            s.courierPartner?.toLowerCase().includes(q) ||
                            s.shippingAddress?.toLowerCase().includes(q)
                          );
                        })
                        .map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-blue-600 whitespace-nowrap">
                            {shipment.orderNumber}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4 text-gray-400" />
                              {shipment.customerId}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600" style={{ maxWidth: 180, wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.4 }}>
                            {shipment.shippingAddress || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getShipmentStatusColor(shipment.status)}`}>
                              {shipment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {shipment.trackingNumber || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {shipment.courierPartner || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(shipment.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {shipment.deliveredAt ? formatDate(shipment.deliveredAt) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              {/* Pack button removed — packing is done in Packages section */}
                              {shipment.status === 'PACKED' && (
                                <button
                                  onClick={() => markShipped(shipment.orderNumber, shipment.customerId, shipment._virtual)}
                                  disabled={actionLoading === shipment.orderNumber + '_ship'}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                >
                                  🚚 Ship
                                </button>
                              )}
                              {/* Deliver button removed — delivery is handled by delivery boy app */}
                              {(shipment.status === 'SHIPPED' || shipment.status === 'OUT_FOR_DELIVERY') && (
                                <span className="text-xs text-purple-600 font-medium flex items-center gap-1">
                                  🚚 In Transit
                                </span>
                              )}
                              {shipment.status === 'DELIVERED' && (
                                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Delivered
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Addresses Tab */}
        {!loading && !error && activeTab === 'addresses' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-600">Total Addresses</p>
                <p className="text-2xl font-bold">{addresses.length}</p>
              </div>
              <div className="bg-white p-5 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-600">Default Addresses</p>
                <p className="text-2xl font-bold">{addresses.filter(a => a.isDefault).length}</p>
              </div>
              <div className="bg-white p-5 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-600">Unique Customers</p>
                <p className="text-2xl font-bold">{new Set(addresses.map(a => a.customerId)).size}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Customer Addresses</h2>
              </div>
              {addresses.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  No addresses found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City & State</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {addresses.map((address) => (
                        <tr key={address.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium">{address.customerId}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {address.addressLine1}
                            {address.addressLine2 && <div className="text-gray-500">{address.addressLine2}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div>{address.city}, {address.state}</div>
                            <div className="text-gray-500">{address.zipCode}, {address.country}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {address.contactPhone || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              address.isDefault ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {address.isDefault ? 'Default' : 'Secondary'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(address.createdAt)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Shipping;
