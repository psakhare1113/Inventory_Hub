import React, { useState, useEffect, useRef } from 'react';
import '../css/Invoice.css';
import { FaFilePdf, FaFileExcel, FaFilter, FaEye, FaSyncAlt, FaTimes, FaPrint } from 'react-icons/fa';
import JsBarcode from 'jsbarcode';

const API = 'http://localhost:9999/api';

const getToken = () =>
  sessionStorage.getItem('adminToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

const getAuthHeaders = () => {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

const fmtDate = (val) =>
  val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtAmt = (val) =>
  val != null ? `₹${parseFloat(val).toFixed(2)}` : '—';

// Map order status → invoice status label
const mapStatus = (orderStatus) => {
  const s = (orderStatus || '').toUpperCase();
  if (s === 'DELIVERED') return 'Paid';
  if (s === 'CANCELLED' || s === 'FAILED') return 'Cancelled';
  if (s === 'CONFIRMED' || s === 'PROCESSING' || s === 'PACKED' || s === 'SHIPPED' || s === 'OUT_FOR_DELIVERY') return 'Pending';
  return 'Pending';
};

const STATUS_OPTIONS = ['All', 'Pending', 'Paid', 'Cancelled'];

const STATUS_CLASSES = {
  Paid: 'status-paid',
  Pending: 'status-pending',
  Cancelled: 'status-overdue',
};

// ── Barcode Component (renders via JsBarcode into an SVG) ─────────────────────
function BarcodeImage({ value, label }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!value || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.8,
        height: 50,
        displayValue: true,
        fontSize: 11,
        margin: 6,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch (e) {
      console.warn('Barcode render failed:', e);
    }
  }, [value]);

  if (!value) return null;

  return (
    <div style={{ textAlign: 'center' }}>
      {label && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>{label}</div>}
      <svg ref={svgRef} />
    </div>
  );
}

// ── PDF Invoice Modal ──────────────────────────────────────────────────────────
function InvoicePDFModal({ order, onClose }) {
  const printRef = useRef();

  // Generate barcode as a data URL for embedding in print window
  const generateBarcodeDataUrl = (value) => {
    if (!value) return null;
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, value, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 12,
        margin: 8,
        background: '#ffffff',
        lineColor: '#000000',
      });
      return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  };

  const handlePrint = () => {
    // Generate barcode images as data URLs before opening print window
    const barcodeValue = order.packingSlipNumber || order.awbNumber || order.orderNumber;
    const barcodeDataUrl = generateBarcodeDataUrl(barcodeValue);

    // Generate per-item barcodes
    const itemBarcodes = (order.items || []).map(item =>
      item.barcode ? generateBarcodeDataUrl(item.barcode) : null
    );

    const content = printRef.current.innerHTML;

    // Replace SVG barcode elements with img tags using data URLs for print
    let printContent = content;
    if (barcodeDataUrl) {
      printContent = printContent.replace(
        /(<div[^>]*id="shipping-barcode-container"[^>]*>)[\s\S]*?(<\/div>)/,
        `$1<img src="${barcodeDataUrl}" style="max-width:100%;" alt="barcode" />$2`
      );
    }

    const win = window.open('', '_blank', 'width=860,height=1000');
    win.document.write(`
      <html>
        <head>
          <title>Invoice ${order.orderNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            thead tr { background: #3b82f6; color: #fff; }
            thead th { padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            tbody td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
            .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
            .status-Paid { background: #dcfce7; color: #16a34a; }
            .status-Pending { background: #fef3c7; color: #d97706; }
            .status-Cancelled { background: #fee2e2; color: #dc2626; }
            .barcode-section { border: 1px dashed #9db7ff; padding: 12px; text-align: center; background: #f8fafc; border-radius: 6px; }
            .barcode-section img { max-width: 100%; }
            .barcode-label { font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 6px; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const invoiceStatus = mapStatus(order.orderStatus);
  const subtotal = parseFloat(order.totalAmount || 0);
  const tax = parseFloat((subtotal * 0.18).toFixed(2));
  const total = parseFloat((subtotal).toFixed(2));
  const taxableAmount = parseFloat((subtotal - tax).toFixed(2));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720, width: '95%' }}>
        {/* Modal toolbar */}
        <div className="modal-header">
          <h3>Invoice — #{order.orderNumber?.slice(0, 20)}</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              <FaPrint /> Print / Save PDF
            </button>
            <FaTimes className="close-btn" onClick={onClose} />
          </div>
        </div>

        {/* Printable invoice body */}
        <div ref={printRef} style={{ padding: '8px 0' }}>
          {/* Header */}
          <div className="inv-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, borderBottom: '3px solid #3b82f6', paddingBottom: 18 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6' }}>
                Inventory<span style={{ color: '#1a1a2e' }}>Hub</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Your trusted e-commerce partner
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: '#6b7280' }}>
              <strong style={{ fontSize: 18, color: '#1a1a2e', display: 'block', marginBottom: 4 }}>INVOICE</strong>
              <div>Invoice #: <b style={{ color: '#3b82f6' }}>INV-{order.orderNumber?.slice(-8).toUpperCase()}</b></div>
              <div>Order #: <b>{order.orderNumber?.slice(0, 20)}...</b></div>
              <div>Date: <b>{fmtDate(order.createdAt)}</b></div>
              <div style={{ marginTop: 6 }}>
                <span className={`status-badge status-${invoiceStatus}`}
                  style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    background: invoiceStatus === 'Paid' ? '#dcfce7' : invoiceStatus === 'Pending' ? '#fef3c7' : '#fee2e2',
                    color: invoiceStatus === 'Paid' ? '#16a34a' : invoiceStatus === 'Pending' ? '#d97706' : '#dc2626',
                  }}>
                  {invoiceStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Bill To / Order Info + Shipping Barcode */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180, background: '#f8fafc', borderRadius: 8, padding: 14 }}>
              <h4 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 8 }}>Bill To</h4>
              <p style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.7 }}>
                <b>Customer ID:</b> {order.customerId || '—'}<br />
                {order.customerName && <><b>Name:</b> {order.customerName}<br /></>}
                {order.customerEmail && <><b>Email:</b> {order.customerEmail}<br /></>}
                {order.shippingAddress && <><b>Address:</b> {order.shippingAddress}<br /></>}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 180, background: '#f8fafc', borderRadius: 8, padding: 14 }}>
              <h4 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 8 }}>Order Details</h4>
              <p style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.7 }}>
                <b>Payment:</b> {order.paymentStatus || '—'}<br />
                <b>Order Status:</b> {order.orderStatus || '—'}<br />
                {order.courierPartner && <><b>Courier:</b> {order.courierPartner}<br /></>}
                {order.awbNumber && <><b>AWB:</b> {order.awbNumber}<br /></>}
                {order.packingSlipNumber && <><b>Packing Slip:</b> {order.packingSlipNumber}<br /></>}
              </p>
            </div>
            {/* Shipping Barcode */}
            <div
              id="shipping-barcode-container"
              style={{ flex: 1, minWidth: 180, border: '1px dashed #9db7ff', borderRadius: 8, padding: 14, background: '#f8fafc', textAlign: 'center' }}
            >
              <div style={{ fontSize: 11, color: '#1f3c88', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {order.packingSlipNumber ? 'Packing Slip' : order.awbNumber ? 'AWB' : 'Shipping'} Barcode
              </div>
              <BarcodeImage
                value={order.packingSlipNumber || order.awbNumber || order.orderNumber}
              />
            </div>
          </div>

          {/* Items table — with per-item barcode */}
          {order.items && order.items.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr style={{ background: '#3b82f6', color: '#fff' }}>
                  {['#', 'Product ID', 'Barcode', 'Barcode Image', 'Qty', 'Unit Price', 'Total'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #e5e7eb' }}>{i + 1}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #e5e7eb', color: '#1d4ed8', fontWeight: 600 }}>{item.productId}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace' }}>{item.barcode || '—'}</td>
                    <td style={{ padding: '4px 12px', borderBottom: '1px solid #e5e7eb' }}>
                      {item.barcode
                        ? <BarcodeImage value={item.barcode} />
                        : <span style={{ fontSize: 11, color: '#9ca3af' }}>No barcode</span>
                      }
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #e5e7eb' }}>{item.quantity}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #e5e7eb' }}>{fmtAmt(item.unitPrice)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>{fmtAmt(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <table style={{ width: 280 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '5px 12px', fontSize: 13, color: '#6b7280' }}>Taxable Amount</td>
                  <td style={{ padding: '5px 12px', fontSize: 13, textAlign: 'right' }}>{fmtAmt(taxableAmount)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 12px', fontSize: 13, color: '#6b7280' }}>GST (18%)</td>
                  <td style={{ padding: '5px 12px', fontSize: 13, textAlign: 'right' }}>{fmtAmt(tax)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', fontSize: 15, fontWeight: 700, borderTop: '2px solid #3b82f6' }}>Total</td>
                  <td style={{ padding: '8px 12px', fontSize: 15, fontWeight: 700, textAlign: 'right', borderTop: '2px solid #3b82f6', color: '#3b82f6' }}>{fmtAmt(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
            Thank you for shopping with InventoryHub! For queries, contact support@inventoryhub.com
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Invoice Component ─────────────────────────────────────────────────────
export default function Invoice() {
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/admin/orders/all`, { headers: getAuthHeaders() });
      if (res.status === 401) throw new Error('Unauthorized — please log in as Admin.');
      if (res.status === 403) throw new Error('Forbidden — Admin role required.');
      if (!res.ok) throw new Error(`Failed to fetch orders (${res.status})`);
      const data = await res.json();
      setAllOrders(data);
      setFilteredOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    if (statusFilter === 'All') {
      setFilteredOrders(allOrders);
    } else {
      setFilteredOrders(allOrders.filter(o => mapStatus(o.orderStatus) === statusFilter));
    }
  }, [statusFilter, allOrders]);

  const handleExportCSV = (filename) => {
    const rows = filteredOrders.map(o =>
      `INV-${o.orderNumber?.slice(-8).toUpperCase()},${o.customerId},${o.totalAmount ?? 0},${fmtDate(o.createdAt)},${mapStatus(o.orderStatus)},${o.orderStatus}`
    );
    const csv = `Invoice #,Customer ID,Amount,Date,Invoice Status,Order Status\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="invoice-page">
      {/* Header */}
      <div className="invoice-header">
        <h2>Invoices</h2>
        <button className="add-invoice-btn" onClick={fetchOrders} disabled={loading}>
          <FaSyncAlt style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {/* Filter */}
      <div className="invoice-filter">
        <div className="filter-label">
          <FaFilter /> Filter by Status:
        </div>
        <select
          className="status-dropdown"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table card */}
      <div className="invoice-card">
        <div className="invoice-card-header">
          <h3>Invoice List ({filteredOrders.length})</h3>
          <div className="invoice-export-buttons">
            <button className="invoice-pdf-btn" onClick={() => handleExportCSV('invoices.csv')}>
              <FaFilePdf /> Export CSV
            </button>
            <button className="invoice-excel-btn" onClick={() => handleExportCSV('invoices.xlsx')}>
              <FaFileExcel /> Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Loading invoices...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>No invoices found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Order #</th>
                  <th>Customer ID</th>
                  <th>Amount</th>
                  <th>Order Status</th>
                  <th>Date</th>
                  <th>Invoice Status</th>
                  <th className="invoice-action-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const invStatus = mapStatus(order.orderStatus);
                  return (
                    <tr key={order.orderNumber}>
                      <td className="invoice-number">
                        INV-{order.orderNumber?.slice(-8).toUpperCase()}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#1d4ed8' }}>
                        #{order.orderNumber?.slice(0, 18)}...
                      </td>
                      <td>{order.customerId}</td>
                      <td style={{ fontWeight: 600 }}>{fmtAmt(order.totalAmount)}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                          background: '#f3f4f6', color: '#374151'
                        }}>
                          {order.orderStatus || '—'}
                        </span>
                      </td>
                      <td>{fmtDate(order.createdAt)}</td>
                      <td>
                        <span className={`status-badge ${STATUS_CLASSES[invStatus] || ''}`}>
                          {invStatus}
                        </span>
                      </td>
                      <td className="invoice-action-col">
                        <div className="invoice-action-buttons">
                          <FaEye
                            className="invoice-edit-icon"
                            title="View Invoice PDF"
                            onClick={() => setSelectedOrder(order)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {selectedOrder && (
        <InvoicePDFModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
