import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, RefreshCw, Calendar,
  ShoppingCart, Package, RotateCcw, DollarSign, AlertCircle,
  Download, Users, CheckCircle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { imsService } from '../../services/imsApi';

const COLORS = {
  revenue: '#6366f1',
  orders: '#3b82f6',
  refunds: '#ef4444',
  delivered: '#10b981',
  pending: '#f59e0b',
  cancelled: '#f97316'
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 12, color: '#374151' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', fontSize: 12, color: p.color }}>
          {p.name}: {p.name === 'Revenue' || p.name === 'revenue' ? fmt(p.value) : num(p.value)}
        </p>
      ))}
    </div>
  );
};

function EmptyState({ icon: Icon, msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af' }}>
      <Icon size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
      <p style={{ margin: 0, fontSize: 13 }}>{msg}</p>
    </div>
  );
}

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(today);
  const [useRange, setUseRange] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = useRange ? fromDate : null;
      const to = useRange ? toDate : null;
      const data = await imsService.reports.getSummary(from, to);
      if (data) {
        setSummary(data);
        setLastSync(new Date());
      } else {
        setError('Reports endpoint not reachable — ensure orders-service is running.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [useRange, fromDate, toDate]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(loadAll, 60000);
    return () => clearInterval(id);
  }, [loadAll]);

  const handleExportCSV = () => {
    if (!summary) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Orders', summary.totalOrders],
      ['Total Revenue', summary.totalRevenue],
      ['Net Revenue', summary.netRevenue],
      ['Total Refunds', summary.totalRefunds],
      ['Total Refund Amount', summary.totalRefundAmount],
      ['Total Returns', summary.totalReturns],
      ['Delivered Orders', summary.deliveredOrders],
      ['Pending Orders', summary.pendingOrders],
      ['Cancelled Orders', summary.cancelledOrders],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${today}.csv`;
    a.click();
  };

  // Derived chart data
  const dailyRevenueData = summary?.dailyRevenueTrend?.map(d => ({
    date: d.date?.slice(5), // MM-DD
    Revenue: d.revenue || 0
  })) || [];

  const orderStatusData = summary?.ordersByStatus
    ? Object.entries(summary.ordersByStatus).map(([name, value]) => ({ name, value }))
    : [];

  const paymentData = summary?.ordersByPayment
    ? Object.entries(summary.ordersByPayment).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div style={{ padding: '24px', background: '#f9fafb', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={26} color="#6366f1" /> Reports
          </h2>
          {lastSync && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
              Last synced: {lastSync.toLocaleTimeString()} · Auto-refresh every 60s
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <button onClick={handleExportCSV} disabled={!summary}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: '#10b981', color: 'white', border: 'none', borderRadius: 8,
              cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Download size={14} /> Export
          </button>
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

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 20, color: '#b91c1c', fontSize: 13 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard title="Total Revenue" value={fmt(summary?.totalRevenue)} sub={`${summary?.totalOrders || 0} orders`} icon={DollarSign} color="#6366f1" />
        <KpiCard title="Net Revenue" value={fmt(summary?.netRevenue)} sub="After refunds" icon={TrendingUp} color="#10b981" />
        <KpiCard title="Total Orders" value={num(summary?.totalOrders)} sub={`${summary?.deliveredOrders || 0} delivered`} icon={ShoppingCart} color="#3b82f6" />
        <KpiCard title="Pending Orders" value={num(summary?.pendingOrders)} sub="Awaiting processing" icon={Package} color="#f59e0b" />
        <KpiCard title="Total Refunds" value={fmt(summary?.totalRefundAmount)} sub={`${summary?.totalRefunds || 0} refund records`} icon={RotateCcw} color="#ef4444" />
        <KpiCard title="Total Returns" value={num(summary?.totalReturns)} sub="Return requests" icon={RotateCcw} color="#8b5cf6" />
      </div>

      {/* Revenue Trend */}
      <div style={{ background: 'white', borderRadius: 12, padding: '20px', border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} color="#6366f1" /> Daily Revenue Trend (Last 7 Days)
        </h3>
        {dailyRevenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={TrendingUp} msg="No revenue data available. Complete some orders to see trends." />
        )}
      </div>

      {/* Order Status + Payment Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>

        {/* Order Status Pie */}
        <div style={{ background: 'white', borderRadius: 12, padding: '20px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={16} color="#3b82f6" /> Order Status Breakdown
          </h3>
          {orderStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={orderStatusData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                    {orderStatusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
                {orderStatusData.map((d, i) => (
                  <span key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#374151' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={ShoppingCart} msg="No order data found." />
          )}
        </div>

        {/* Payment Status Pie */}
        <div style={{ background: 'white', borderRadius: 12, padding: '20px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={16} color="#10b981" /> Payment Status
          </h3>
          {paymentData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4}>
                    {paymentData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
                {paymentData.map((d, i) => (
                  <span key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#374151' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
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

      {/* Top Customers */}
      {summary?.topCustomers?.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, padding: '20px', border: '1px solid #e5e7eb', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="#8b5cf6" /> Top Customers by Spending
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Rank', 'Customer ID', 'Total Orders', 'Total Spent'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.topCustomers.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                        background: i === 0 ? '#fef3c7' : i === 1 ? '#f3f4f6' : '#fef9f0',
                        color: i === 0 ? '#92400e' : '#374151'
                      }}>
                        {i + 1}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>#{c.customerId}</td>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>{c.orderCount}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#10b981' }}>{fmt(c.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Table */}
      <div style={{ background: 'white', borderRadius: 12, padding: '20px', border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} color="#10b981" /> Report Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Total Orders', value: num(summary?.totalOrders), color: '#3b82f6' },
            { label: 'Delivered', value: num(summary?.deliveredOrders), color: '#10b981' },
            { label: 'Pending', value: num(summary?.pendingOrders), color: '#f59e0b' },
            { label: 'Cancelled', value: num(summary?.cancelledOrders), color: '#ef4444' },
            { label: 'Total Revenue', value: fmt(summary?.totalRevenue), color: '#6366f1' },
            { label: 'Net Revenue', value: fmt(summary?.netRevenue), color: '#10b981' },
            { label: 'Refund Amount', value: fmt(summary?.totalRefundAmount), color: '#ef4444' },
            { label: 'Returns', value: num(summary?.totalReturns), color: '#8b5cf6' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: 8, borderLeft: `3px solid ${item.color}` }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{item.value}</div>
            </div>
          ))}
        </div>
        {summary?.generatedAt && (
          <p style={{ margin: '12px 0 0', fontSize: 11, color: '#9ca3af' }}>
            Generated at: {new Date(summary.generatedAt).toLocaleString('en-IN')}
          </p>
        )}
      </div>

    </div>
  );
}
