import React, { useState, useEffect, useCallback } from 'react';
import { Search, CreditCard, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const API = 'http://localhost:9999/api';

const getToken = () =>
  sessionStorage.getItem('adminToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const fmt = (val) => val ?? '—';
const fmtAmt = (val) => val != null ? `₹${parseFloat(val).toFixed(2)}` : '—';
const fmtDate = (val) => {
  if (!val) return '—';
  const dt = Array.isArray(val)
    ? new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0, val[5] || 0)
    : new Date(typeof val === 'string' && !val.endsWith('Z') && !val.includes('+') ? val + 'Z' : val);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const PAYMENT_STATUS_META = {
  SUCCESS:    { label: 'Success',    color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle size={12} /> },
  COMPLETED:  { label: 'Completed',  color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle size={12} /> },
  FAILED:     { label: 'Failed',     color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={12} /> },
  PENDING:    { label: 'Pending',    color: '#d97706', bg: '#fef3c7', icon: <Clock size={12} /> },
  REFUNDED:   { label: 'Refunded',   color: '#7c3aed', bg: '#ede9fe', icon: <RefreshCw size={12} /> },
  INITIATED:  { label: 'Initiated',  color: '#0891b2', bg: '#e0f2fe', icon: <Clock size={12} /> },
  CREATED:    { label: 'Created',    color: '#2563eb', bg: '#dbeafe', icon: <Clock size={12} /> },
  VERIFICATION_FAILED: { label: 'Verify Failed', color: '#b91c1c', bg: '#fecaca', icon: <AlertCircle size={12} /> },
};

function PaymentBadge({ status }) {
  const key = status?.toUpperCase().replace(/ /g, '_');
  const m = PAYMENT_STATUS_META[key] || { label: status || '—', color: '#6b7280', bg: '#f3f4f6', icon: null };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
      color: m.color, background: m.bg, whiteSpace: 'nowrap',
    }}>
      {m.icon}{m.label}
    </span>
  );
}

const TH = ({ children }) => (
  <th style={{
    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
  }}>
    {children}
  </th>
);

const TD = ({ children, mono }) => (
  <td style={{
    padding: '10px 14px', borderBottom: '1px solid #f3f4f6', color: '#374151',
    fontFamily: mono ? 'monospace' : undefined, fontSize: mono ? 12 : 13,
  }}>
    {children}
  </td>
);

const TABS = [
  { key: 'transactions',  label: 'Transactions',       icon: <CreditCard size={14} /> },
  { key: 'gateway',       label: 'Gateway Payments',   icon: <CheckCircle size={14} /> },
  { key: 'refunds',       label: 'Refunds',            icon: <RefreshCw size={14} /> },
];

export default function Payments() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [gatewayPayments, setGatewayPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const safeFetch = async (url) => {
        const res = await fetch(url, { headers });
        if (res.status === 401) throw new Error('Unauthorized — please re-login as Admin.');
        if (res.status === 403) throw new Error('Forbidden — Admin role required.');
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      };

      if (tab === 'transactions') {
        const [txData, refundData] = await Promise.all([
          safeFetch(`${API}/auth/admin/payments/transactions`),
          safeFetch(`${API}/auth/admin/payments/refunds`).catch(() => []),
        ]);
        setTransactions(Array.isArray(txData) ? txData : []);
        setRefunds(Array.isArray(refundData) ? refundData : []);
      } else if (tab === 'gateway') {
        const data = await safeFetch(`${API}/auth/admin/payments/gateway`);
        setGatewayPayments(Array.isArray(data) ? data : []);
      } else if (tab === 'refunds') {
        const data = await safeFetch(`${API}/auth/admin/payments/refunds`);
        setRefunds(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(activeTab); }, [activeTab, load]);

  const s = search.toLowerCase();

  // Stats derived from transactions
  const totalRevenue = transactions
    .filter(t => ['SUCCESS', 'COMPLETED'].includes(t.status?.toUpperCase()))
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const stats = [
    { label: 'Total Transactions', value: transactions.length,                                                                  color: '#6b7280', icon: <CreditCard size={15} /> },
    { label: 'Successful',         value: transactions.filter(t => ['SUCCESS','COMPLETED'].includes(t.status?.toUpperCase())).length, color: '#16a34a', icon: <CheckCircle size={15} /> },
    { label: 'Failed',             value: transactions.filter(t => t.status?.toUpperCase() === 'FAILED').length,                color: '#dc2626', icon: <XCircle size={15} /> },
    { label: 'Refunded',           value: Math.max(
                                     transactions.filter(t => t.status?.toUpperCase() === 'REFUNDED').length,
                                     refunds.length
                                   ),                                                                                           color: '#7c3aed', icon: <RefreshCw size={15} /> },
    { label: 'Total Revenue',      value: `₹${totalRevenue.toFixed(2)}`,                                                        color: '#0891b2', icon: <CreditCard size={15} /> },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Payments</h1>
        <button
          onClick={() => load(activeTab)}
          style={{
            padding: '7px 14px', background: '#7c3aed', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff',
            boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
            width: 'fit-content', flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          marginBottom: 12, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.text}
        </div>
      )}

      {/* Stats — only on transactions tab */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 10, padding: '12px 16px',
              borderLeft: `4px solid ${s.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>{s.value}</p>
                </div>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ overflowX: 'auto', borderBottom: '1px solid #e5e7eb', marginBottom: 0 }}>
        <nav style={{ display: 'flex', gap: 0, minWidth: 'max-content' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSearch(''); }}
              style={{
                padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
                color: activeTab === t.key ? '#7c3aed' : '#6b7280',
                borderBottom: activeTab === t.key ? '2px solid #7c3aed' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', margin: '16px 0' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          placeholder={`Search ${TABS.find(t => t.key === activeTab)?.label}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 8,
          marginBottom: 12, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span>❌ {error}</span>
          {(error.includes('401') || error.includes('Unauthorized') || error.includes('re-login')) && (
            <button
              onClick={() => { window.location.href = '/admin/login'; }}
              style={{ padding: '5px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Re-Login
            </button>
          )}
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {activeTab === 'transactions' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['ID', 'Transaction ID', 'Order Number', 'Amount', 'Currency', 'Method', 'Status', 'Created At'].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</td></tr>
                ) : transactions.filter(t =>
                  t.orderNumber?.toLowerCase().includes(s) ||
                  t.paymentTxnId?.toLowerCase().includes(s) ||
                  t.paymentMethod?.toLowerCase().includes(s) ||
                  t.status?.toLowerCase().includes(s)
                ).length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No transactions found</td></tr>
                ) : (
                  transactions.filter(t =>
                    t.orderNumber?.toLowerCase().includes(s) ||
                    t.paymentTxnId?.toLowerCase().includes(s) ||
                    t.paymentMethod?.toLowerCase().includes(s) ||
                    t.status?.toLowerCase().includes(s)
                  ).map(t => (
                    <tr key={t.id} style={{ background: '#fff' }}>
                      <TD>{t.id}</TD>
                      <TD mono>{t.paymentTxnId ? `${t.paymentTxnId.slice(0, 18)}...` : '—'}</TD>
                      <TD mono>{t.orderNumber ? `${t.orderNumber.slice(0, 18)}...` : '—'}</TD>
                      <TD><span style={{ fontWeight: 700, color: '#111827' }}>{fmtAmt(t.amount)}</span></TD>
                      <TD>{fmt(t.currency)}</TD>
                      <TD>
                        <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, background: '#f3f4f6', color: '#374151', fontWeight: 600 }}>
                          {fmt(t.paymentMethod)}
                        </span>
                      </TD>
                      <TD><PaymentBadge status={t.status} /></TD>
                      <TD>{fmtDate(t.createdAt)}</TD>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── GATEWAY PAYMENTS ── */}
      {activeTab === 'gateway' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['ID', 'Order ID', 'Payment ID', 'Amount', 'Currency', 'Customer', 'Email', 'Status', 'Created At'].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</td></tr>
                ) : gatewayPayments.filter(g =>
                  g.orderId?.toLowerCase().includes(s) ||
                  g.paymentId?.toLowerCase().includes(s) ||
                  g.customerName?.toLowerCase().includes(s) ||
                  g.customerEmail?.toLowerCase().includes(s) ||
                  g.status?.toLowerCase().includes(s)
                ).length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No gateway payments found</td></tr>
                ) : (
                  gatewayPayments.filter(g =>
                    g.orderId?.toLowerCase().includes(s) ||
                    g.paymentId?.toLowerCase().includes(s) ||
                    g.customerName?.toLowerCase().includes(s) ||
                    g.customerEmail?.toLowerCase().includes(s) ||
                    g.status?.toLowerCase().includes(s)
                  ).map(g => (
                    <tr key={g.id} style={{ background: '#fff' }}>
                      <TD>{g.id}</TD>
                      <TD mono>{g.orderId ? `${g.orderId.slice(0, 16)}...` : '—'}</TD>
                      <TD mono>{g.paymentId ? `${g.paymentId.slice(0, 16)}...` : '—'}</TD>
                      {/* Gateway amount is stored in paise (×100) — convert back to rupees for display */}
                      <TD><span style={{ fontWeight: 700, color: '#111827' }}>{g.amount != null ? `₹${(parseFloat(g.amount) / 100).toFixed(2)}` : '—'}</span></TD>
                      <TD>{fmt(g.currency)}</TD>
                      <TD>{fmt(g.customerName)}</TD>
                      <TD style={{ fontSize: 12, color: '#6b7280' }}>{fmt(g.customerEmail)}</TD>
                      <TD><PaymentBadge status={g.status} /></TD>
                      <TD>{fmtDate(g.createdAt)}</TD>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REFUNDS ── */}
      {activeTab === 'refunds' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['ID', 'Order Number', 'Refund Txn ID', 'Amount', 'Reason', 'Status', 'Refunded At'].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</td></tr>
                ) : refunds.filter(r =>
                  r.orderNumber?.toLowerCase().includes(s) ||
                  r.refundTxnId?.toLowerCase().includes(s) ||
                  r.refundReason?.toLowerCase().includes(s) ||
                  r.refundStatus?.toLowerCase().includes(s)
                ).length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No refunds found</td></tr>
                ) : (
                  refunds.filter(r =>
                    r.orderNumber?.toLowerCase().includes(s) ||
                    r.refundTxnId?.toLowerCase().includes(s) ||
                    r.refundReason?.toLowerCase().includes(s) ||
                    r.refundStatus?.toLowerCase().includes(s)
                  ).map(r => (
                    <tr key={r.id} style={{ background: '#fff' }}>
                      <TD>{r.id}</TD>
                      <TD mono>{r.orderNumber ? `${r.orderNumber.slice(0, 18)}...` : '—'}</TD>
                      <TD mono>{r.refundTxnId ? `${r.refundTxnId.slice(0, 18)}...` : '—'}</TD>
                      <TD><span style={{ fontWeight: 700, color: '#7c3aed' }}>{fmtAmt(r.refundAmount)}</span></TD>
                      <TD style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmt(r.refundReason)}</TD>
                      <TD><PaymentBadge status={r.refundStatus} /></TD>
                      <TD>{fmtDate(r.refundedAt)}</TD>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
