import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, RefreshCw, Calendar,
  ShoppingCart, Package, RotateCcw, DollarSign, AlertCircle, Star, Truck
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { imsService } from '../../services/imsApi';

// ── Colours ──────────────────────────────────────────────────────────────────
const COLORS = {
  sale:    '#6366f1',
  cost:    '#f59e0b',
  profit:  '#10b981',
  return:  '#ef4444',
  damage:  '#f97316',
  order:   '#3b82f6',
};

const ORDER_STATUS_COLORS = [
  '#10b981','#3b82f6','#6366f1','#f59e0b','#ef4444',
  '#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899',
];

const PAYMENT_COLORS = ['#10b981','#ef4444','#f59e0b','#6366f1'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const num = (n) => Number(n || 0).toLocaleString('en-IN');

function KpiCard({ title, value, sub, icon: Icon, color, trend }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '20px 24px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
      display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{title}</span>
        <div style={{ background: color + '18', borderRadius: 8, padding: 8 }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af' }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          {trend >= 0
            ? <TrendingUp size={13} color="#10b981" />
            : <TrendingDown size={13} color="#ef4444" />}
          <span style={{ color: trend >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            {Math.abs(trend)}%
          </span>
          <span style={{ color: '#9ca3af' }}>vs yesterday</span>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{ margin: '28px 0 14px', fontSize: 15, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}
    </h3>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 12, color: '#374151' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', fontSize: 12, color: p.color }}>
          {p.name}: {p.name.toLowerCase().includes('₹') || ['Revenue','Cost','Profit'].includes(p.name)
            ? fmt(p.value) : num(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Analytics() {
  // ── state ──
  const [salesData,   setSalesData]   = useState([]);
  const [returnData,  setReturnData]  = useState([]);
  const [damageData,  setDamageData]  = useState([]);
  const [orders,      setOrders]      = useState([]);
  const [inventory,   setInventory]   = useState([]);
  const [refunds,     setRefunds]     = useState([]);
  const [returns,     setReturns]     = useState([]);
  const [products,    setProducts]    = useState([]);

  // top products
  const [topPeriod,      setTopPeriod]      = useState('monthly'); // 'monthly' | 'yearly'
  const [topYear,        setTopYear]        = useState(new Date().getFullYear());
  const [topMonth,       setTopMonth]       = useState(new Date().getMonth() + 1);
  const [topData,        setTopData]        = useState({ topProducts: [], monthlyTrend: {} });
  const [topLoading,     setTopLoading]     = useState(false);

  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [lastSync, setLastSync] = useState(null);

  // date range
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate,   setToDate]   = useState(today);
  const [useRange, setUseRange] = useState(false);

  // ── fetch ──
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchSales = useRange
        ? imsService.inventory.getSalesByDateRange('SALE',   fromDate, toDate)
        : imsService.inventory.getDailySales('SALE');
      const fetchReturn = useRange
        ? imsService.inventory.getSalesByDateRange('RETURN', fromDate, toDate)
        : imsService.inventory.getDailySales('RETURN');
      const fetchDamage = useRange
        ? imsService.inventory.getSalesByDateRange('DAMAGE', fromDate, toDate)
        : imsService.inventory.getDailySales('DAMAGE');

      const [sd, rd, dd, ord, inv, ref, ret, prods] = await Promise.allSettled([
        fetchSales,
        fetchReturn,
        fetchDamage,
        imsService.orders.getAllOrders(),
        imsService.inventory.getAllInventory(),
        imsService.orders.getAllRefunds(),
        imsService.orders.getAllReturns(),
        imsService.products.getAllProducts(),
      ]);

      setSalesData(  sd.status    === 'fulfilled' ? (sd.value    || []) : []);
      setReturnData( rd.status    === 'fulfilled' ? (rd.value    || []) : []);
      setDamageData( dd.status    === 'fulfilled' ? (dd.value    || []) : []);
      setOrders(     ord.status   === 'fulfilled' ? (ord.value   || []) : []);
      setInventory(  inv.status   === 'fulfilled' ? (inv.value   || []) : []);
      setRefunds(    ref.status   === 'fulfilled' ? (ref.value   || []) : []);
      setReturns(    ret.status   === 'fulfilled' ? (ret.value   || []) : []);

      // Fetch attributes for all products to get isBestseller / freeShipping flags
      if (prods.status === 'fulfilled' && prods.value?.length > 0) {
        const rawProducts = prods.value;
        const attrResults = await Promise.allSettled(
          rawProducts.map(p => imsService.products.getProductAttributes(p.productId))
        );
        const enriched = rawProducts.map((p, i) => {
          const attrs = attrResults[i].status === 'fulfilled' ? (attrResults[i].value || []) : [];
          return {
            ...p,
            isBestseller: attrs.find(a => a.attributeName === 'isBestseller')?.attributeValue === 'true',
            freeShipping: attrs.find(a => a.attributeName === 'freeShipping')?.attributeValue === 'true',
          };
        });
        setProducts(enriched);
      } else {
        setProducts([]);
      }

      if (sd.status === 'rejected') setError('Sales analytics endpoint not reachable — restart inventory-service.');
      setLastSync(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [useRange, fromDate, toDate]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // auto-refresh every 60 s
  useEffect(() => {
    const id = setInterval(loadAll, 60000);
    return () => clearInterval(id);
  }, [loadAll]);

  // ── Top Products fetch (re-runs when period/year/month changes) ──
  const loadTopProducts = useCallback(async () => {
    setTopLoading(true);
    try {
      const data = await imsService.reports.getTopProducts({
        period: topPeriod,
        year:   topYear,
        month:  topPeriod === 'monthly' ? topMonth : undefined,
        limit:  10,
      });
      setTopData(data || { topProducts: [], monthlyTrend: {} });
    } catch (e) {
      console.error('Top products fetch error:', e);
    } finally {
      setTopLoading(false);
    }
  }, [topPeriod, topYear, topMonth]);

  useEffect(() => { loadTopProducts(); }, [loadTopProducts]);

  // ── derived KPIs ──
  const totalRevenue = salesData.reduce((s, r) => s + Number(r.totalSales  || 0), 0);
  const totalCost    = salesData.reduce((s, r) => s + Number(r.totalCost   || 0), 0);
  // Recalculate profit as revenue - cost (ignore backend profit column which may have stale buyPrice data)
  const totalProfit  = totalRevenue - totalCost;
  const totalOrders  = orders.length;
  const deliveredOrders = orders.filter(o => o.orderStatus === 'DELIVERED').length;
  const totalRefundAmt  = refunds.reduce((s, r) => s + Number(r.totalRefundAmount || 0), 0);
  const totalReturns    = returns.length;
  const pendingReturns  = returns.filter(r => r.returnStatus === 'PENDING').length;

  // ── Best Seller & Free Shipping product lists ──
  const bestsellerProducts  = products.filter(p => p.isBestseller);
  const freeShippingProducts = products.filter(p => p.freeShipping);

  // ── Top Selling Products (derived from orders + products) ──
  // Build productId → { name, imageUrl } lookup from products state
  const productLookup = {};
  products.forEach(p => {
    productLookup[p.productId] = { name: p.name, imageUrl: p.productUrl };
  });

  // Aggregate order items across all orders
  const salesMap = {};
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const pid = item.productId;
      if (!pid) return;
      if (!salesMap[pid]) {
        salesMap[pid] = { productId: pid, totalQuantity: 0, totalRevenue: 0, orderCount: 0 };
      }
      salesMap[pid].totalQuantity += Number(item.quantity || 1);
      salesMap[pid].totalRevenue  += Number(item.totalPrice || item.unitPrice || 0);
      salesMap[pid].orderCount    += 1;
    });
  });

  // Sort by units sold, take top 10, attach product name
  const topSellingProducts = Object.values(salesMap)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10)
    .map((p, i) => ({
      ...p,
      rank: i + 1,
      name:     productLookup[p.productId]?.name     || `Product #${p.productId}`,
      imageUrl: productLookup[p.productId]?.imageUrl || null,
    }));

  // ── chart data ──

  // Revenue line chart — merge sales + return by date
  const revenueChartData = salesData.map(s => {
    const rev  = Number(s.totalSales || 0);
    const cost = Number(s.totalCost  || 0);
    return {
      date:    s.date,
      Revenue: rev,
      Cost:    cost,
      Profit:  rev - cost,   // recalculate — don't use stale backend profit column
    };
  });

  // Order status pie
  const orderStatusMap = {};
  orders.forEach(o => {
    const k = o.orderStatus || 'UNKNOWN';
    orderStatusMap[k] = (orderStatusMap[k] || 0) + 1;
  });
  const orderStatusData = Object.entries(orderStatusMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Payment status pie
  const paymentMap = {};
  orders.forEach(o => {
    const k = o.paymentStatus || 'UNKNOWN';
    paymentMap[k] = (paymentMap[k] || 0) + 1;
  });
  const paymentData = Object.entries(paymentMap).map(([name, value]) => ({ name, value }));

  // Inventory status bar
  const invMap = {};
  inventory.forEach(i => {
    const k = i.inventoryStatus || 'UNKNOWN';
    invMap[k] = (invMap[k] || 0) + 1;
  });
  const invData = Object.entries(invMap)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count }));

  // Return status bar
  const retMap = {};
  returns.forEach(r => {
    const k = r.returnStatus || 'UNKNOWN';
    retMap[k] = (retMap[k] || 0) + 1;
  });
  const returnStatusData = Object.entries(retMap).map(([status, count]) => ({ status, count }));

  // ── render ──
  return (
    <div style={{ padding: '24px', background: '#f9fafb', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={26} color="#6366f1" /> Analytics
          </h2>
          {lastSync && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
              Last synced: {lastSync.toLocaleTimeString()} · Auto-refresh every 60s
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Date range toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" checked={useRange} onChange={e => setUseRange(e.target.checked)} />
            Date Range
          </label>
          {useRange && (
            <>
              <input type="date" value={fromDate} max={toDate}
                onChange={e => setFromDate(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
              <span style={{ color: '#9ca3af', fontSize: 13 }}>to</span>
              <input type="date" value={toDate} min={fromDate} max={today}
                onChange={e => setToDate(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
            </>
          )}
          <button onClick={loadAll} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: '#6366f1', color: 'white', border: 'none', borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
              opacity: loading ? 0.7 : 1 }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 20, color: '#b91c1c', fontSize: 13 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 8 }}>
        <KpiCard title="Total Revenue"    value={fmt(totalRevenue)} sub={`${salesData.length} days of data`}  icon={DollarSign}   color="#6366f1" />
        <KpiCard title="Total Profit"     value={fmt(totalProfit)}  sub={`Margin: ${totalRevenue > 0 ? ((totalProfit/totalRevenue)*100).toFixed(1) : 0}%`} icon={TrendingUp} color="#10b981" />
        <KpiCard title="Total Cost"       value={fmt(totalCost)}    sub="Buy price × qty"                      icon={Package}      color="#f59e0b" />
        <KpiCard title="Total Orders"     value={num(totalOrders)}  sub={`${deliveredOrders} delivered`}       icon={ShoppingCart} color="#3b82f6" />
        <KpiCard title="Total Refunds"    value={fmt(totalRefundAmt)} sub={`${refunds.length} refund records`} icon={RotateCcw}    color="#ef4444" />
        <KpiCard title="Total Returns"    value={num(totalReturns)}   sub={`${pendingReturns} pending`}           icon={RotateCcw}    color="#f97316" />
        <KpiCard title="Inventory Items"  value={num(inventory.length)} sub={`${invMap['AVAILABLE'] || 0} available`} icon={Package} color="#8b5cf6" />
      </div>

      {/* ── Top Selling Products (from orders) ── */}
      <SectionTitle><TrendingUp size={16} color="#6366f1" /> Top Selling Products</SectionTitle>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 8, overflow: 'hidden' }}>
        {topSellingProducts.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

            {/* Left — Horizontal Bar Chart */}
            <div style={{ padding: '20px 16px', borderRight: '1px solid #f3f4f6' }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Units Sold</p>
              <ResponsiveContainer width="100%" height={Math.max(topSellingProducts.length * 36, 200)}>
                <BarChart
                  data={topSellingProducts.map(p => ({ name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name, Units: p.totalQuantity, fullName: p.name }))}
                  layout="vertical"
                  margin={{ left: 0, right: 24, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip
                    formatter={(val) => [val, 'Units Sold']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                  />
                  <Bar dataKey="Units" radius={[0, 6, 6, 0]}>
                    {topSellingProducts.map((_, i) => (
                      <Cell key={i} fill={ORDER_STATUS_COLORS[i % ORDER_STATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Right — Ranked Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['', 'Product', 'Units', 'Revenue', 'Orders'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topSellingProducts.map((p, i) => (
                    <tr key={p.productId} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px' }}>
                        {i === 0 ? <span style={{ fontSize: 18 }}>🥇</span>
                          : i === 1 ? <span style={{ fontSize: 18 }}>🥈</span>
                          : i === 2 ? <span style={{ fontSize: 18 }}>🥉</span>
                          : <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#f3f4f6', fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>{i + 1}</span>
                        }
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 34, height: 34, borderRadius: 7, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Package size={16} color="#9ca3af" />
                            </div>
                          )}
                          <span style={{ fontWeight: 600, color: '#111827', fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 700, color: '#6366f1', fontSize: 15 }}>{num(p.totalQuantity)}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 3 }}>units</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#10b981' }}>{fmt(p.totalRevenue)}</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280' }}>{num(p.orderCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState icon={TrendingUp} msg="No order data yet. Once orders are placed, top selling products will appear here." />
        )}
      </div>

      {/* ── Best Seller + Free Shipping Product Lists ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 8 }}>

        {/* Best Sellers */}
        <div>
          <SectionTitle><Star size={16} color="#f59e0b" /> Best Seller Products ({bestsellerProducts.length})</SectionTitle>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {bestsellerProducts.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fffbeb' }}>
                      {['#', 'Product', 'Category', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#92400e', borderBottom: '1px solid #fde68a', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bestsellerProducts.map((p, i) => (
                      <tr key={p.productId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '9px 14px', color: '#9ca3af', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {p.productUrl && (
                              <img src={p.productUrl} alt={p.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.productBarcode}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '9px 14px', color: '#6b7280', fontSize: 12 }}>{p.categoryId || '—'}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: p.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                            color: p.status === 'ACTIVE' ? '#065f46' : '#991b1b',
                          }}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Star} msg='No products tagged as "isBestseller = true" yet. Set the attribute in Product Form.' />
            )}
          </div>
        </div>

        {/* Free Shipping */}
        <div>
          <SectionTitle><Truck size={16} color="#0ea5e9" /> Free Shipping Products ({freeShippingProducts.length})</SectionTitle>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {freeShippingProducts.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f0f9ff' }}>
                      {['#', 'Product', 'Category', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#0369a1', borderBottom: '1px solid #bae6fd', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {freeShippingProducts.map((p, i) => (
                      <tr key={p.productId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '9px 14px', color: '#9ca3af', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {p.productUrl && (
                              <img src={p.productUrl} alt={p.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.productBarcode}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '9px 14px', color: '#6b7280', fontSize: 12 }}>{p.categoryId || '—'}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: p.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                            color: p.status === 'ACTIVE' ? '#065f46' : '#991b1b',
                          }}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Truck} msg='No products tagged as "freeShipping = true" yet. Set the attribute in Product Form.' />
            )}
          </div>
        </div>
      </div>

      {/* ── Top Selling Products ── */}
      <SectionTitle><TrendingUp size={16} color="#6366f1" /> Top Selling Products</SectionTitle>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 20px 16px', marginBottom: 8 }}>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
          {/* Period toggle */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
            {['monthly', 'yearly'].map(p => (
              <button key={p} onClick={() => setTopPeriod(p)}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: topPeriod === p ? '#6366f1' : 'transparent',
                  color: topPeriod === p ? '#fff' : '#6b7280',
                  transition: 'all 0.15s'
                }}>
                {p === 'monthly' ? '📅 Monthly' : '📆 Yearly'}
              </button>
            ))}
          </div>

          {/* Year picker */}
          <select value={topYear} onChange={e => setTopYear(Number(e.target.value))}
            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, color: '#374151' }}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Month picker — only for monthly */}
          {topPeriod === 'monthly' && (
            <select value={topMonth} onChange={e => setTopMonth(Number(e.target.value))}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, color: '#374151' }}>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          )}

          <button onClick={loadTopProducts} disabled={topLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
              background: '#6366f1', color: 'white', border: 'none', borderRadius: 7,
              cursor: topLoading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: topLoading ? 0.7 : 1 }}>
            <RefreshCw size={13} /> {topLoading ? 'Loading…' : 'Refresh'}
          </button>

          {topData.periodLabel && (
            <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>
              Period: <strong style={{ color: '#374151' }}>{topData.periodLabel}</strong>
              {' · '}{topData.totalItems || 0} order items
            </span>
          )}
        </div>

        {topLoading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', fontSize: 13 }}>Loading top products…</div>
        ) : topData.topProducts?.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Bar Chart */}
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Units Sold (Top 10)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topData.topProducts.map(p => ({
                    name: `P-${p.productId}`,
                    productId: p.productId,
                    Units: p.totalQuantity,
                    Revenue: p.totalRevenue,
                  }))}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip
                    formatter={(val, name) => name === 'Revenue' ? [fmt(val), 'Revenue'] : [num(val), 'Units Sold']}
                    labelFormatter={label => `Product ${label.replace('P-', '')}`}
                  />
                  <Bar dataKey="Units" radius={[0, 6, 6, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Rank', 'Product ID', 'Units Sold', 'Revenue', 'Orders'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topData.topProducts.map((p, i) => (
                    <tr key={p.productId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                          background: i === 0 ? '#fef3c7' : i === 1 ? '#f3f4f6' : i === 2 ? '#fde8d8' : '#f9fafb',
                          color: i === 0 ? '#d97706' : i === 1 ? '#6b7280' : i === 2 ? '#ea580c' : '#9ca3af',
                        }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : p.rank}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111827' }}>#{p.productId}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ fontWeight: 700, color: '#6366f1', fontSize: 14 }}>{num(p.totalQuantity)}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 3 }}>units</span>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: '#10b981' }}>{fmt(p.totalRevenue)}</td>
                      <td style={{ padding: '9px 12px', color: '#6b7280' }}>{num(p.orderCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState icon={TrendingUp} msg={`No order items found for ${topData.periodLabel || 'this period'}. Place some orders to see top products.`} />
        )}

        {/* Yearly monthly trend sparklines */}
        {topPeriod === 'yearly' && topData.topProducts?.length > 0 && Object.keys(topData.monthlyTrend || {}).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Monthly Trend per Product ({topYear})</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {topData.topProducts.slice(0, 6).map(p => {
                const trend = topData.monthlyTrend[p.productId] || [];
                return (
                  <div key={p.productId} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      Product #{p.productId} · {num(p.totalQuantity)} units
                    </p>
                    <ResponsiveContainer width="100%" height={60}>
                      <BarChart data={trend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Bar dataKey="quantity" fill="#6366f1" radius={[2, 2, 0, 0]} />
                        <Tooltip
                          formatter={v => [v, 'Units']}
                          labelFormatter={m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Revenue / Cost / Profit Line Chart ── */}
      <SectionTitle><TrendingUp size={16} color="#6366f1" /> Revenue · Cost · Profit Trend</SectionTitle>
      <div style={{ background: 'white', borderRadius: 12, padding: '20px 16px', border: '1px solid #e5e7eb', marginBottom: 8 }}>
        {revenueChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Revenue" stroke={COLORS.sale}   strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Cost"    stroke={COLORS.cost}   strokeWidth={2}   dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Profit"  stroke={COLORS.profit} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={TrendingUp} msg="No sales transaction data yet. Complete some orders to see trends." />
        )}
      </div>

      {/* ── Order Status + Payment Status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 8 }}>

        {/* Order Status Pie */}
        <div>
          <SectionTitle><ShoppingCart size={16} color="#3b82f6" /> Order Status Breakdown</SectionTitle>
          <div style={{ background: 'white', borderRadius: 12, padding: '20px 16px', border: '1px solid #e5e7eb' }}>
            {orderStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={orderStatusData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                      {orderStatusData.map((_, i) => (
                        <Cell key={i} fill={ORDER_STATUS_COLORS[i % ORDER_STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
                  {orderStatusData.map((d, i) => (
                    <span key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#374151' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: ORDER_STATUS_COLORS[i % ORDER_STATUS_COLORS.length], display: 'inline-block' }} />
                      {d.name} ({d.value})
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={ShoppingCart} msg="No orders found." />
            )}
          </div>
        </div>

        {/* Payment Status Pie */}
        <div>
          <SectionTitle><DollarSign size={16} color="#10b981" /> Payment Status</SectionTitle>
          <div style={{ background: 'white', borderRadius: 12, padding: '20px 16px', border: '1px solid #e5e7eb' }}>
            {paymentData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={paymentData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                      {paymentData.map((_, i) => (
                        <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
                  {paymentData.map((d, i) => (
                    <span key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#374151' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PAYMENT_COLORS[i % PAYMENT_COLORS.length], display: 'inline-block' }} />
                      {d.name} ({d.value})
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={DollarSign} msg="No payment data found." />
            )}
          </div>
        </div>
      </div>

      {/* ── Inventory Health Bar ── */}
      <SectionTitle><Package size={16} color="#8b5cf6" /> Inventory Health</SectionTitle>
      <div style={{ background: 'white', borderRadius: 12, padding: '20px 16px', border: '1px solid #e5e7eb', marginBottom: 8 }}>
        {invData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={invData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={140} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {invData.map((_, i) => (
                  <Cell key={i} fill={ORDER_STATUS_COLORS[i % ORDER_STATUS_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={Package} msg="No inventory data found." />
        )}
      </div>

      {/* ── Returns & Damage ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>

        {/* Return status */}
        <div>
          <SectionTitle><RotateCcw size={16} color="#ef4444" /> Return Status</SectionTitle>
          <div style={{ background: 'white', borderRadius: 12, padding: '20px 16px', border: '1px solid #e5e7eb' }}>
            {returnStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={returnStatusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={RotateCcw} msg="No return records found." />
            )}
          </div>
        </div>

        {/* Damage trend */}
        <div>
          <SectionTitle><AlertCircle size={16} color="#f97316" /> Damage Trend</SectionTitle>
          <div style={{ background: 'white', borderRadius: 12, padding: '20px 16px', border: '1px solid #e5e7eb' }}>
            {damageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={damageData.map(d => ({ date: d.date, Amount: Number(d.totalSales || 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Amount" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={AlertCircle} msg="No damage records found." />
            )}
          </div>
        </div>
      </div>

      {/* ── Refunds Table ── */}
      {refunds.length > 0 && (
        <>
          <SectionTitle><RotateCcw size={16} color="#6366f1" /> Recent Refunds</SectionTitle>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Reference','Order #','Customer ID','Amount','Status','Date'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {refunds.slice(0, 10).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px', color: '#374151' }}>{r.refundReference || '—'}</td>
                      <td style={{ padding: '10px 16px', color: '#374151' }}>{r.orderNumber || '—'}</td>
                      <td style={{ padding: '10px 16px', color: '#374151' }}>{r.customerId || '—'}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#10b981' }}>{fmt(r.totalRefundAmount)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: r.refundStatus === 'COMPLETED' ? '#d1fae5' : r.refundStatus === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                          color:      r.refundStatus === 'COMPLETED' ? '#065f46' : r.refundStatus === 'REJECTED' ? '#991b1b' : '#92400e',
                        }}>{r.refundStatus}</span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#9ca3af' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

function EmptyState({ icon: Icon, msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af' }}>
      <Icon size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
      <p style={{ margin: 0, fontSize: 13 }}>{msg}</p>
    </div>
  );
}
