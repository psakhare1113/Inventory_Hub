import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Download, Calendar, Filter, RefreshCw, 
  TrendingUp, ShoppingCart, Package, Users, DollarSign,
  Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { imsService } from '../../services/imsApi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const REPORT_TYPES = [
  { id: 'sales', label: 'Sales Report', icon: DollarSign },
  { id: 'orders', label: 'Orders Report', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory Report', icon: Package },
  { id: 'customers', label: 'Customer Report', icon: Users },
  { id: 'suppliers', label: 'Supplier Report', icon: TrendingUp },
];

const STATUS_COLORS = {
  DELIVERED: { bg: '#d1fae5', text: '#065f46', icon: CheckCircle },
  PENDING: { bg: '#fef3c7', text: '#92400e', icon: Clock },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b', icon: XCircle },
  PROCESSING: { bg: '#dbeafe', text: '#1e40af', icon: AlertCircle },
};

function StatCard({ label, value, subtext, icon: Icon, color }) {
  return (
    <div style={{
      background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
      padding: '20px', display: 'flex', alignItems: 'center', gap: 16
    }}>
      <div style={{ background: color + '15', borderRadius: 10, padding: 12 }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{value}</div>
        {subtext && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{subtext}</div>}
      </div>
    </div>
  );
}

export default function ReportsModern() {
  const [selectedReport, setSelectedReport] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(today);

  // Data
  const [salesData, setSalesData] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [customersData, setCustomersData] = useState([]);
  const [suppliersData, setSuppliersData] = useState([]);
  const [stats, setStats] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, orders, inventory, customers, suppliers] = await Promise.all([
        imsService.reports.getSummary(fromDate, toDate),
        imsService.orders.getAllOrders(),
        imsService.inventory.getAllInventory(),
        imsService.auth.getAllCustomers(),
        imsService.suppliers.getAll().catch(() => [])
      ]);

      // Sales data (from orders)
      const sales = orders
        .filter(o => o.orderStatus === 'DELIVERED')
        .map(o => ({
          orderNumber: o.orderNumber,
          date: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—',
          customer: o.customerId,
          amount: o.totalAmount ? Number(o.totalAmount) : 0,
          paymentStatus: o.paymentStatus,
          items: o.items?.length || 0
        }));

      setSalesData(sales);
      setOrdersData(orders);
      setInventoryData(inventory);
      setCustomersData(customers);
      setSuppliersData(suppliers);

      setStats({
        totalRevenue: summary?.totalRevenue || 0,
        totalOrders: summary?.totalOrders || 0,
        totalCustomers: customers.length,
        totalProducts: inventory.length,
        deliveredOrders: summary?.deliveredOrders || 0,
        pendingOrders: summary?.pendingOrders || 0,
      });

      setLastSync(new Date());
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const handleExportCSV = () => {
    let data = [];
    let headers = [];
    let filename = '';

    switch (selectedReport) {
      case 'sales':
        headers = ['Order #', 'Date', 'Customer ID', 'Amount', 'Payment Status', 'Items'];
        data = salesData.map(s => [s.orderNumber, s.date, s.customer, s.amount, s.paymentStatus, s.items]);
        filename = 'sales-report';
        break;
      case 'orders':
        headers = ['Order #', 'Customer', 'Status', 'Payment', 'Amount', 'Date'];
        data = ordersData.map(o => [
          o.orderNumber, o.customerId, o.orderStatus, o.paymentStatus,
          o.totalAmount || 0, o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'
        ]);
        filename = 'orders-report';
        break;
      case 'inventory':
        headers = ['Barcode', 'Product ID', 'Quantity', 'Status', 'Buy Price', 'Sell Price'];
        data = inventoryData.map(i => [
          i.barcode, i.productId, i.quantity, i.inventoryStatus,
          i.buyPrice || 0, i.sellPrice || 0
        ]);
        filename = 'inventory-report';
        break;
      case 'customers':
        headers = ['ID', 'Name', 'Email', 'Phone', 'Status'];
        data = customersData.map(c => [
          c.id, `${c.firstName} ${c.lastName}`, c.email, c.phoneNumber, c.customerStatus
        ]);
        filename = 'customers-report';
        break;
      case 'suppliers':
        headers = ['ID', 'Name', 'Company', 'Email', 'Phone', 'Status', 'Rating'];
        data = suppliersData.map(s => [
          s.supplierId, s.name, s.company, s.email, s.phone, s.status, s.rating || '—'
        ]);
        filename = 'suppliers-report';
        break;
      default:
        return;
    }

    const csv = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${today}.csv`;
    a.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241); // #6366f1
    doc.text('Business Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // #6b7280
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 28);
    doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 34);
    
    // Report type
    const reportLabel = REPORT_TYPES.find(t => t.id === selectedReport)?.label || 'Report';
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39); // #111827
    doc.text(reportLabel, 14, 44);
    
    // Table data
    let headers = [];
    let rows = [];
    
    switch (selectedReport) {
      case 'sales':
        headers = [['Order #', 'Date', 'Customer', 'Amount (Rs.)', 'Payment', 'Items']];
        rows = salesData.map(s => [
          s.orderNumber, s.date, `#${s.customer}`,
          `Rs. ${s.amount.toLocaleString('en-IN')}`, s.paymentStatus, s.items
        ]);
        break;
      case 'orders':
        headers = [['Order #', 'Customer', 'Status', 'Payment', 'Amount (Rs.)', 'Date']];
        rows = ordersData.map(o => [
          o.orderNumber, `#${o.customerId}`, o.orderStatus, o.paymentStatus,
          `Rs. ${(o.totalAmount ? Number(o.totalAmount) : 0).toLocaleString('en-IN')}`,
          o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '-'
        ]);
        break;
      case 'inventory':
        headers = [['Barcode', 'Product', 'Qty', 'Status', 'Buy Price (Rs.)', 'Sell Price (Rs.)']];
        rows = inventoryData.map(i => [
          i.barcode, `#${i.productId}`, i.quantity, i.inventoryStatus,
          `Rs. ${(i.buyPrice || 0).toLocaleString('en-IN')}`,
          `Rs. ${(i.sellPrice || 0).toLocaleString('en-IN')}`
        ]);
        break;
      case 'customers':
        headers = [['ID', 'Name', 'Email', 'Phone', 'Status']];
        rows = customersData.map(c => [
          `#${c.id}`, `${c.firstName} ${c.lastName}`, c.email, c.phoneNumber, c.customerStatus
        ]);
        break;
      case 'suppliers':
        headers = [['ID', 'Name', 'Company', 'Email', 'Phone', 'Status']];
        rows = suppliersData.map(s => [
          `#${s.supplierId}`, s.name, s.company, s.email, s.phone, s.status
        ]);
        break;
      default:
        return;
    }
    
    // Generate table
    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 50,
      theme: 'grid',
      headStyles: {
        fillColor: [99, 102, 241], // #6366f1
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [55, 65, 81] // #374151
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // #f9fafb
      },
      margin: { top: 50, left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer — use data.pageNumber from autotable (works with jsPDF v4 + autotable v5)
        const pageNumber = data.pageNumber || doc.internal.getNumberOfPages();
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // #9ca3af
        doc.text(
          `Page ${pageNumber} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    });
    
    // Save
    doc.save(`${selectedReport}-report-${today}.pdf`);
  };

  const renderTable = () => {
    switch (selectedReport) {
      case 'sales':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Order #', 'Date', 'Customer ID', 'Amount', 'Payment', 'Items'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salesData.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#6366f1' }}>#{s.orderNumber}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{s.date}</td>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>#{s.customer}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#10b981' }}>
                    ₹{s.amount.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: s.paymentStatus === 'PAID' ? '#d1fae5' : '#fef3c7',
                      color: s.paymentStatus === 'PAID' ? '#065f46' : '#92400e'
                    }}>
                      {s.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{s.items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'orders':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Order #', 'Customer', 'Status', 'Payment', 'Amount', 'Date'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordersData.map((o, i) => {
                const statusColor = STATUS_COLORS[o.orderStatus] || STATUS_COLORS.PENDING;
                const StatusIcon = statusColor.icon;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#6366f1' }}>#{o.orderNumber}</td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>#{o.customerId}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: statusColor.bg, color: statusColor.text
                      }}>
                        <StatusIcon size={12} />
                        {o.orderStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{o.paymentStatus}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      ₹{(o.totalAmount ? Number(o.totalAmount) : 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );

      case 'inventory':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Barcode', 'Product ID', 'Quantity', 'Status', 'Buy Price', 'Sell Price', 'Margin'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventoryData.map((item, i) => {
                const margin = item.sellPrice && item.buyPrice
                  ? ((item.sellPrice - item.buyPrice) / item.sellPrice * 100).toFixed(1)
                  : 0;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12 }}>{item.barcode}</td>
                    <td style={{ padding: '12px 16px', color: '#6366f1' }}>#{item.productId}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.quantity}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: item.inventoryStatus === 'AVAILABLE' ? '#d1fae5' : '#fee2e2',
                        color: item.inventoryStatus === 'AVAILABLE' ? '#065f46' : '#991b1b'
                      }}>
                        {item.inventoryStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>₹{(item.buyPrice || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>₹{(item.sellPrice || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: margin > 20 ? '#10b981' : '#f59e0b' }}>
                      {margin}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );

      case 'customers':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['ID', 'Name', 'Email', 'Phone', 'Status', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customersData.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#6366f1' }}>#{c.id}</td>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>{c.firstName} {c.lastName}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{c.email}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{c.phoneNumber}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: c.customerStatus === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                      color: c.customerStatus === 'ACTIVE' ? '#065f46' : '#991b1b'
                    }}>
                      {c.customerStatus}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'suppliers':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['ID', 'Name', 'Company', 'Email', 'Phone', 'Status', 'Rating', 'Orders'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliersData.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#6366f1' }}>#{s.supplierId}</td>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>{s.name}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{s.company}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{s.email}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{s.phone}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: s.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                      color: s.status === 'ACTIVE' ? '#065f46' : '#991b1b'
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {s.rating ? `⭐ ${s.rating.toFixed(1)}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{s.totalOrders || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Select a report type</div>;
    }
  };

  const getCurrentData = () => {
    switch (selectedReport) {
      case 'sales': return salesData;
      case 'orders': return ordersData;
      case 'inventory': return inventoryData;
      case 'customers': return customersData;
      case 'suppliers': return suppliersData;
      default: return [];
    }
  };

  return (
    <div style={{ padding: 24, background: '#f9fafb', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={28} color="#6366f1" /> Business Reports
            </h2>
            {lastSync && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
                Last synced: {lastSync.toLocaleTimeString()} · 
                <span style={{ color: autoRefresh ? '#10b981' : '#6b7280', marginLeft: 4 }}>
                  {autoRefresh ? 'Auto-refresh ON (30s)' : 'Auto-refresh OFF'}
                </span>
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
              Auto-refresh
            </label>
            <button onClick={loadData} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: '#6366f1', color: 'white', border: 'none', borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Revenue" value={`₹${stats.totalRevenue?.toLocaleString('en-IN') || 0}`} 
            subtext={`${stats.totalOrders || 0} orders`} icon={DollarSign} color="#10b981" />
          <StatCard label="Total Orders" value={stats.totalOrders || 0} 
            subtext={`${stats.deliveredOrders || 0} delivered`} icon={ShoppingCart} color="#3b82f6" />
          <StatCard label="Total Customers" value={stats.totalCustomers || 0} 
            subtext="Active users" icon={Users} color="#8b5cf6" />
          <StatCard label="Total Products" value={stats.totalProducts || 0} 
            subtext="In inventory" icon={Package} color="#f59e0b" />
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color="#6b7280" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Date Range:</span>
            <input type="date" value={fromDate} max={toDate}
              onChange={e => setFromDate(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
            <span style={{ color: '#9ca3af' }}>to</span>
            <input type="date" value={toDate} min={fromDate} max={today}
              onChange={e => setToDate(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: '#10b981', color: 'white', border: 'none', borderRadius: 8,
                cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Download size={14} /> Export CSV
            </button>
            <button onClick={handleExportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: '#ef4444', color: 'white', border: 'none', borderRadius: 8,
                cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Download size={14} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 8 }}>
        {REPORT_TYPES.map(type => {
          const Icon = type.icon;
          const isActive = selectedReport === type.id;
          return (
            <button key={type.id} onClick={() => setSelectedReport(type.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                background: isActive ? '#6366f1' : 'white',
                color: isActive ? 'white' : '#374151',
                border: isActive ? 'none' : '1px solid #e5e7eb',
                borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}>
              <Icon size={16} />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Report Table */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
            {REPORT_TYPES.find(t => t.id === selectedReport)?.label} ({getCurrentData().length} records)
          </h3>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Generated: {new Date().toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: 600 }}>
          {getCurrentData().length > 0 ? renderTable() : (
            <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
              <Filter size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14 }}>No data available for selected filters</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
