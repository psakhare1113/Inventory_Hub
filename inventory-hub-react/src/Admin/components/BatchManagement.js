// init

import React, { useState, useEffect, useRef, useCallback } from 'react';

const API = 'http://localhost:9999/api/products';

const getToken = () => localStorage.getItem('authToken') || localStorage.getItem('token');
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

// ─── helpers ────────────────────────────────────────────────────────────────
const daysLeft = (d) => d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null;

const ExpiryChip = ({ date }) => {
  const d = daysLeft(date);
  if (d === null) return <span className="text-gray-400 text-xs">No expiry</span>;
  if (d < 0)   return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Expired {Math.abs(d)}d ago</span>;
  if (d <= 7)  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 animate-pulse">⚠ {d}d left</span>;
  if (d <= 30) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">{d}d left</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{d}d left</span>;
};

const StatusBadge = ({ status }) => {
  const map = {
    ACTIVE:   'bg-emerald-100 text-emerald-700',
    EXPIRED:  'bg-red-100 text-red-700',
    RECALLED: 'bg-amber-100 text-amber-700',
    CONSUMED: 'bg-gray-100 text-gray-600',
  };
  const icons = { ACTIVE:'●', EXPIRED:'✕', RECALLED:'⚠', CONSUMED:'◉' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || map.ACTIVE}`}>
      <span className="text-[10px]">{icons[status]}</span>{status}
    </span>
  );
};

const EMPTY = { productId:'', batchNumber:'', lotNumber:'', manufacturingDate:'', expiryDate:'', quantity:'', unitCost:'', supplierId:'', supplierBatchRef:'', status:'ACTIVE', notes:'' };

// ─── Modal ───────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-semibold transition-all duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}
      style={{ animation: 'slideInRight 0.3s ease' }}>
      <span className="text-base">{toast.type === 'error' ? '✕' : '✓'}</span>
      {toast.msg}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, sub }) {
  const colors = {
    purple: 'from-violet-500 to-purple-600',
    green:  'from-emerald-500 to-teal-600',
    red:    'from-red-500 to-rose-600',
    blue:   'from-blue-500 to-indigo-600',
    amber:  'from-amber-500 to-orange-600',
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white text-lg shadow-sm`}>{icon}</div>
        {sub && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{sub}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
    </div>
  );
}

// ─── Field ───────────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 bg-white transition-all placeholder-gray-400";

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BatchManagement() {
  const [tab, setTab]                   = useState('batches');
  const [products, setProducts]         = useState([]);
  const [selectedPid, setSelectedPid]   = useState('');
  const [batches, setBatches]           = useState([]);
  const [expiringBatches, setExpiring]  = useState([]);
  const [loading, setLoading]           = useState(false);
  const [toast, setToast]               = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editBatch, setEditBatch]       = useState(null);
  const [form, setForm]                 = useState(EMPTY);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting]       = useState(false);
  const [expiryDays, setExpiryDays]     = useState(30);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const csvRef = useRef(); const xlsRef = useRef(); const batchCsvRef = useRef();

  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // load products
  useEffect(() => {
    fetch(API, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // load expiring
  useEffect(() => {
    fetch(`${API}/batches/expiring?days=${expiryDays}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(d => setExpiring(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [expiryDays]);

  const loadBatches = useCallback(async (pid) => {
    if (!pid) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/${pid}/batches`, { headers: authHeaders() });
      setBatches(r.ok ? await r.json() : []);
    } catch { setBatches([]); }
    finally { setLoading(false); }
  }, []);

  const openAdd = () => { setEditBatch(null); setForm({ ...EMPTY, productId: selectedPid }); setModalOpen(true); };
  const openEdit = (b) => {
    setEditBatch(b);
    setForm({ productId:b.productId||'', batchNumber:b.batchNumber||'', lotNumber:b.lotNumber||'',
      manufacturingDate:b.manufacturingDate||'', expiryDate:b.expiryDate||'', quantity:b.quantity||'',
      unitCost:b.unitCost||'', supplierId:b.supplierId||'', supplierBatchRef:b.supplierBatchRef||'',
      status:b.status||'ACTIVE', notes:b.notes||'' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId || !form.batchNumber || !form.quantity) { notify('Product, Batch Number, Quantity required!', 'error'); return; }
    const payload = { ...form, productId: Number(form.productId), quantity: Number(form.quantity), unitCost: form.unitCost ? Number(form.unitCost) : null };
    const url = editBatch ? `${API}/batches/${editBatch.id}` : `${API}/batches`;
    try {
      const r = await fetch(url, { method: editBatch ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      if (r.ok) {
        notify(editBatch ? 'Batch updated successfully' : 'Batch created successfully');
        setModalOpen(false); loadBatches(selectedPid);
      } else { const e = await r.json().catch(() => ({})); notify(e.error || 'Failed to save', 'error'); }
    } catch (ex) { notify(ex.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this batch? This action cannot be undone.')) return;
    const r = await fetch(`${API}/batches/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { notify('Batch deleted'); loadBatches(selectedPid); }
    else notify('Failed to delete', 'error');
  };

  const handleStatusChange = async (id, status) => {
    const r = await fetch(`${API}/batches/${id}/status?status=${status}`, { method: 'PATCH', headers: authHeaders() });
    if (r.ok) { notify(`Status updated to ${status}`); loadBatches(selectedPid); }
    else notify('Failed to update status', 'error');
  };

  const handleImport = async (file, type) => {
    if (!file) return;
    setImporting(true); setImportResult(null);
    const fd = new FormData(); fd.append('file', file);
    const url = type === 'batch-csv' ? `${API}/batches/import/csv` : type === 'excel' ? `${API}/import/excel` : `${API}/import/csv`;
    try {
      const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
      const res = await r.json(); setImportResult(res);
      notify(res.message || `${res.success} records imported`);
    } catch (ex) { notify('Import failed: ' + ex.message, 'error'); }
    finally { setImporting(false); }
  };

  const handleExport = async (type) => {
    const url = type === 'csv' ? `${API}/export/csv` : type === 'excel' ? `${API}/export/excel`
              : type === 'template' ? `${API}/export/template`
              : `${API}/batches/export/csv${selectedPid ? `?productId=${selectedPid}` : ''}`;
    try {
      const r = await fetch(url, { headers: authHeaders() });
      if (!r.ok) { notify('Export failed', 'error'); return; }
      const blob = await r.blob();
      const cd = r.headers.get('Content-Disposition') || '';
      const name = cd.match(/filename="?([^"]+)"?/)?.[1] || `export.${type === 'excel' ? 'xlsx' : 'csv'}`;
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
      URL.revokeObjectURL(a.href); notify(`${name} downloaded`);
    } catch (ex) { notify('Export failed: ' + ex.message, 'error'); }
  };

  const pName = (id) => products.find(p => p.productId === Number(id))?.name || `Product ${id}`;
  const filtered = batches.filter(b => {
    const matchSearch = !search || b.batchNumber?.toLowerCase().includes(search.toLowerCase()) || b.lotNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const stats = { total: batches.length, active: batches.filter(b => b.status === 'ACTIVE').length, expired: batches.filter(b => b.status === 'EXPIRED').length, qty: batches.reduce((s, b) => s + (b.quantity || 0), 0) };

  const TABS = [
    { key: 'batches', label: 'Batch Tracking',  icon: '⊞' },
    { key: 'import',  label: 'Import Data',      icon: '↑' },
    { key: 'export',  label: 'Export Data',      icon: '↓' },
    { key: 'expiry',  label: `Expiry Alerts`,    icon: '⏰', badge: expiringBatches.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <Toast toast={toast} />
      <style>{`@keyframes slideInRight{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-2xl text-white shadow-lg shadow-violet-200">
              ⊞
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Batch & Lot Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">Track product batches, lot numbers, expiry dates and bulk operations</p>
            </div>
          </div>
          {expiringBatches.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold animate-pulse">
              <span>⚠</span>
              <span>{expiringBatches.length} batches expiring within {expiryDays} days</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      {selectedPid && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon="⊞" label="Total Batches"   value={stats.total}   color="purple" />
          <StatCard icon="✓" label="Active Batches"  value={stats.active}  color="green"  />
          <StatCard icon="✕" label="Expired Batches" value={stats.expired} color="red"    />
          <StatCard icon="#" label="Total Quantity"  value={stats.qty.toLocaleString()} color="blue" />
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t.key
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-200'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            <span className="text-base">{t.icon}</span>
            {t.label}
            {t.badge > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${tab === t.key ? 'bg-white text-violet-600' : 'bg-red-500 text-white'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: BATCH TRACKING
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'batches' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Product</label>
                <select value={selectedPid} onChange={e => { setSelectedPid(e.target.value); loadBatches(e.target.value); }}
                  className={inputCls + " cursor-pointer"}>
                  <option value="">— Choose a product —</option>
                  {products.map(p => <option key={p.productId} value={p.productId}>{p.name} · {p.productBarcode}</option>)}
                </select>
              </div>
              <div className="w-56">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Search</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Batch / lot number..."
                    className={inputCls + " pl-8"} />
                </div>
              </div>
              <div className="w-36">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls + " cursor-pointer"}>
                  {['ALL','ACTIVE','EXPIRED','RECALLED','CONSUMED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <button onClick={openAdd}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-300 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
                  + Add Batch
                </button>
                {selectedPid && (
                  <button onClick={() => handleExport('batches')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold rounded-xl hover:bg-emerald-100 transition-colors">
                    ↓ Export
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
              <div className="w-10 h-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" style={{borderWidth:3}} />
              <p className="text-gray-500 text-sm">Loading batches...</p>
            </div>
          ) : !selectedPid ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-20 text-center">
              <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5">⊞</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Product</h3>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">Choose a product from the dropdown above to view and manage its batch records</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5">📋</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Batches Found</h3>
              <p className="text-gray-400 text-sm mb-6">No batch records match your current filters</p>
              <button onClick={openAdd}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
                + Add First Batch
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Table header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <div>
                  <h3 className="font-bold text-gray-900">{pName(selectedPid)}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{filtered.length} batch{filtered.length !== 1 ? 'es' : ''} found</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Total qty:</span>
                  <span className="text-sm font-bold text-gray-700">{filtered.reduce((s,b) => s+(b.quantity||0),0).toLocaleString()}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80">
                      {['Batch Number','Lot Number','Mfg Date','Expiry','Qty','Unit Cost','Status','Actions'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(b => (
                      <tr key={b.id} className="hover:bg-violet-50/30 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">{b.batchNumber}</div>
                          {b.supplierBatchRef && <div className="text-xs text-gray-400 mt-0.5">Ref: {b.supplierBatchRef}</div>}
                        </td>
                        <td className="px-5 py-4 text-gray-600">{b.lotNumber || <span className="text-gray-300">—</span>}</td>
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{b.manufacturingDate || <span className="text-gray-300">—</span>}</td>
                        <td className="px-5 py-4">
                          {b.expiryDate ? (
                            <div className="space-y-1">
                              <div className="text-gray-700 text-xs font-medium">{b.expiryDate}</div>
                              <ExpiryChip date={b.expiryDate} />
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-gray-900">{b.quantity?.toLocaleString()}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{b.unitCost ? `₹${Number(b.unitCost).toFixed(2)}` : <span className="text-gray-300">—</span>}</td>
                        <td className="px-5 py-4">
                          <select value={b.status} onChange={e => handleStatusChange(b.id, e.target.value)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer outline-none focus:ring-2 focus:ring-violet-300 transition-all"
                            style={{ background: b.status==='ACTIVE'?'#f0fdf4':b.status==='EXPIRED'?'#fef2f2':b.status==='RECALLED'?'#fffbeb':'#f9fafb',
                              color: b.status==='ACTIVE'?'#15803d':b.status==='EXPIRED'?'#dc2626':b.status==='RECALLED'?'#d97706':'#6b7280',
                              borderColor: b.status==='ACTIVE'?'#86efac':b.status==='EXPIRED'?'#fca5a5':b.status==='RECALLED'?'#fcd34d':'#d1d5db' }}>
                            {['ACTIVE','EXPIRED','RECALLED','CONSUMED'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(b)}
                              className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(b.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: IMPORT
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'import' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* CSV Import */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-2xl mb-4">📄</div>
              <h3 className="font-bold text-gray-900 mb-1">Import Products CSV</h3>
              <p className="text-xs text-gray-500 mb-4">Upload a CSV file to bulk-create products</p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 font-mono text-xs text-gray-600 leading-relaxed">
                <div className="text-violet-600 font-semibold mb-1">Required columns:</div>
                productBarcode, name, description,<br/>categoryId, subcategoryId, productUrl,<br/>eligibleForReturn
              </div>
              <div className="flex flex-col gap-2">
                <input type="file" accept=".csv" ref={csvRef} className="hidden"
                  onChange={e => { handleImport(e.target.files[0], 'csv'); e.target.value=''; }} />
                <button onClick={() => csvRef.current?.click()} disabled={importing}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {importing ? '⏳ Importing...' : '↑ Upload CSV'}
                </button>
                <button onClick={() => handleExport('template')}
                  className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition-colors">
                  ↓ Download Template
                </button>
              </div>
            </div>

            {/* Excel Import */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl mb-4">📊</div>
              <h3 className="font-bold text-gray-900 mb-1">Import Products Excel</h3>
              <p className="text-xs text-gray-500 mb-4">Upload an .xlsx file with product data</p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 font-mono text-xs text-gray-600 leading-relaxed">
                <div className="text-emerald-600 font-semibold mb-1">Same format as CSV:</div>
                Row 1 = Headers<br/>Row 2+ = Product data<br/>Supports .xlsx and .xls
              </div>
              <div className="flex flex-col gap-2">
                <input type="file" accept=".xlsx,.xls" ref={xlsRef} className="hidden"
                  onChange={e => { handleImport(e.target.files[0], 'excel'); e.target.value=''; }} />
                <button onClick={() => xlsRef.current?.click()} disabled={importing}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {importing ? '⏳ Importing...' : '↑ Upload Excel'}
                </button>
              </div>
            </div>

            {/* Batch CSV Import */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl mb-4">📦</div>
              <h3 className="font-bold text-gray-900 mb-1">Import Batches CSV</h3>
              <p className="text-xs text-gray-500 mb-4">Bulk-create batch records from CSV</p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 font-mono text-xs text-gray-600 leading-relaxed">
                <div className="text-amber-600 font-semibold mb-1">Required columns:</div>
                productId, batchNumber, lotNumber,<br/>quantity, manufacturingDate,<br/>expiryDate, unitCost
              </div>
              <div className="flex flex-col gap-2">
                <input type="file" accept=".csv" ref={batchCsvRef} className="hidden"
                  onChange={e => { handleImport(e.target.files[0], 'batch-csv'); e.target.value=''; }} />
                <button onClick={() => batchCsvRef.current?.click()} disabled={importing}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {importing ? '⏳ Importing...' : '↑ Upload Batch CSV'}
                </button>
              </div>
            </div>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`bg-white rounded-2xl shadow-sm border-2 p-6 ${importResult.failed > 0 ? 'border-red-200' : 'border-emerald-200'}`}>
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>{importResult.failed > 0 ? '⚠' : '✓'}</span> Import Results
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label:'Successful', value: importResult.success, color:'text-emerald-600', bg:'bg-emerald-50' },
                  { label:'Failed',     value: importResult.failed,  color:'text-red-600',     bg:'bg-red-50' },
                  { label:'Total Rows', value: (importResult.success||0)+(importResult.failed||0), color:'text-blue-600', bg:'bg-blue-50' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                    <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
              {importResult.errors?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <p className="text-sm font-bold text-red-700 mb-2">Errors ({importResult.errors.length}):</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="text-xs text-red-600 flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">•</span><span>{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: EXPORT
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'export' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { type:'csv',      icon:'📄', title:'Products CSV',    desc:'Export all products as a CSV file',          color:'from-violet-500 to-purple-600', btn:'Download CSV' },
            { type:'excel',    icon:'📊', title:'Products Excel',  desc:'Export all products as an Excel workbook',   color:'from-emerald-500 to-teal-600',  btn:'Download Excel' },
            { type:'template', icon:'📋', title:'Import Template', desc:'Download an empty CSV template for imports', color:'from-blue-500 to-indigo-600',   btn:'Download Template' },
            { type:'batches',  icon:'📦', title:'Batches CSV',     desc:'Export batch records for a product or all',  color:'from-amber-500 to-orange-600',  btn:'Download Batches' },
          ].map(item => (
            <div key={item.type} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl text-white shadow-sm mb-4`}>
                {item.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500 mb-4">{item.desc}</p>
              {item.type === 'batches' && (
                <select value={selectedPid} onChange={e => setSelectedPid(e.target.value)}
                  className={inputCls + " mb-3 cursor-pointer"}>
                  <option value="">All products</option>
                  {products.map(p => <option key={p.productId} value={p.productId}>{p.name}</option>)}
                </select>
              )}
              <button onClick={() => handleExport(item.type)}
                className={`w-full py-2.5 bg-gradient-to-r ${item.color} text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 duration-200`}>
                ↓ {item.btn}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: EXPIRY ALERTS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'expiry' && (
        <div className="space-y-5">
          {/* Filter */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-gray-600">Show batches expiring within:</span>
              <div className="flex gap-2">
                {[7, 15, 30, 60, 90].map(d => (
                  <button key={d} onClick={() => setExpiryDays(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      expiryDays === d
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {expiringBatches.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-20 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5">✓</div>
              <h3 className="text-lg font-semibold text-emerald-700 mb-2">All Clear!</h3>
              <p className="text-gray-400 text-sm">No batches expiring within {expiryDays} days</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-red-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-red-500 text-lg">⚠</span>
                  <h3 className="font-bold text-red-700">{expiringBatches.length} batches expiring within {expiryDays} days</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80">
                      {['Product','Batch Number','Lot Number','Expiry Date','Days Left','Quantity','Status'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expiringBatches.map(b => (
                      <tr key={b.id} className="hover:bg-red-50/20 transition-colors">
                        <td className="px-5 py-4 font-semibold text-gray-900">{pName(b.productId)}</td>
                        <td className="px-5 py-4 font-semibold text-gray-800">{b.batchNumber}</td>
                        <td className="px-5 py-4 text-gray-500">{b.lotNumber || '—'}</td>
                        <td className="px-5 py-4 text-gray-700 font-medium">{b.expiryDate}</td>
                        <td className="px-5 py-4"><ExpiryChip date={b.expiryDate} /></td>
                        <td className="px-5 py-4 font-bold text-gray-900">{b.quantity?.toLocaleString()}</td>
                        <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Add / Edit Batch
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editBatch ? 'Edit Batch' : 'Add New Batch'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Product" required>
              <select name="productId" value={form.productId} onChange={e => setForm(p => ({...p, productId: e.target.value}))} required className={inputCls + " cursor-pointer"}>
                <option value="">Select product</option>
                {products.map(p => <option key={p.productId} value={p.productId}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select name="status" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} className={inputCls + " cursor-pointer"}>
                {['ACTIVE','EXPIRED','RECALLED','CONSUMED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Batch Number" required>
              <input name="batchNumber" value={form.batchNumber} onChange={e => setForm(p => ({...p, batchNumber: e.target.value}))} required placeholder="BATCH-2026-001" className={inputCls} />
            </Field>
            <Field label="Lot Number">
              <input name="lotNumber" value={form.lotNumber} onChange={e => setForm(p => ({...p, lotNumber: e.target.value}))} placeholder="LOT-A-001" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Manufacturing Date">
              <input type="date" name="manufacturingDate" value={form.manufacturingDate} onChange={e => setForm(p => ({...p, manufacturingDate: e.target.value}))} className={inputCls} />
            </Field>
            <Field label="Expiry Date">
              <input type="date" name="expiryDate" value={form.expiryDate} onChange={e => setForm(p => ({...p, expiryDate: e.target.value}))} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Quantity" required>
              <input type="number" name="quantity" value={form.quantity} onChange={e => setForm(p => ({...p, quantity: e.target.value}))} required min="0" placeholder="100" className={inputCls} />
            </Field>
            <Field label="Unit Cost (₹)">
              <input type="number" name="unitCost" value={form.unitCost} onChange={e => setForm(p => ({...p, unitCost: e.target.value}))} step="0.01" min="0" placeholder="25.50" className={inputCls} />
            </Field>
            <Field label="Supplier ID">
              <input type="number" name="supplierId" value={form.supplierId} onChange={e => setForm(p => ({...p, supplierId: e.target.value}))} placeholder="1" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Supplier Batch Ref">
              <input name="supplierBatchRef" value={form.supplierBatchRef} onChange={e => setForm(p => ({...p, supplierBatchRef: e.target.value}))} placeholder="SUP-REF-001" className={inputCls} />
            </Field>
            <Field label="Notes">
              <input name="notes" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Optional notes..." className={inputCls} />
            </Field>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow-md shadow-violet-200 hover:shadow-lg transition-all hover:-translate-y-0.5 duration-200">
              {editBatch ? 'Save Changes' : 'Create Batch'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
