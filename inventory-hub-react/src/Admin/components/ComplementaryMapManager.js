import React, { useState, useEffect } from 'react';
import { imsService } from '../../services/imsApi';

/**
 * ComplementaryMapManager
 * Admin panel component to manage subcategory complementary mappings.
 * These mappings power the "Relevant Products" section on product detail pages.
 *
 * Example: Mobile Phones (6) → Watch (7), Earphones (8)
 *          When user views iPhone → shows Watch + Earphones as relevant products
 */
export default function ComplementaryMapManager() {
  const [subcategories, setSubcategories] = useState([]);
  const [mappings,      setMappings]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');

  // Form state
  const [form, setForm] = useState({
    subcategoryId: '',
    complementarySubcategoryId: '',
    label: '',
    addReverse: true   // auto-add reverse mapping (B→A)
  });

  // Filter state
  const [filterSubcat, setFilterSubcat] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subcats, maps] = await Promise.all([
        imsService.products.getAllSubcategories(),
        imsService.products.getComplementaryMappings()
      ]);
      setSubcategories(subcats || []);
      setMappings(maps || []);
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getSubcatName = (id) => {
    const s = subcategories.find(s => Number(s.id) === Number(id));
    return s ? s.name : `Subcategory #${id}`;
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.subcategoryId || !form.complementarySubcategoryId) {
      setError('Both subcategories are required');
      return;
    }
    if (form.subcategoryId === form.complementarySubcategoryId) {
      setError('Source and complementary subcategory cannot be the same');
      return;
    }

    setSaving(true);
    setError('');
    try {
      // Add A → B
      const res = await imsService.products.addComplementaryMapping(
        Number(form.subcategoryId),
        Number(form.complementarySubcategoryId),
        form.label
      );
      if (res.error) { setError(res.error); setSaving(false); return; }

      // Optionally add B → A (reverse)
      if (form.addReverse) {
        await imsService.products.addComplementaryMapping(
          Number(form.complementarySubcategoryId),
          Number(form.subcategoryId),
          form.label
        ).catch(() => {}); // ignore if reverse already exists
      }

      setForm({ subcategoryId: '', complementarySubcategoryId: '', label: '', addReverse: true });
      await loadData();
      showSuccess(`Mapping added: ${getSubcatName(form.subcategoryId)} ↔ ${getSubcatName(form.complementarySubcategoryId)}`);
    } catch (e) {
      setError('Failed to add mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subcategoryId, complementarySubcategoryId) => {
    if (!window.confirm(`Remove mapping: ${getSubcatName(subcategoryId)} → ${getSubcatName(complementarySubcategoryId)}?`)) return;
    try {
      await imsService.products.removeComplementaryMapping(subcategoryId, complementarySubcategoryId);
      await loadData();
      showSuccess('Mapping removed');
    } catch (e) {
      setError('Failed to remove mapping');
    }
  };

  const filteredMappings = filterSubcat
    ? mappings.filter(m => Number(m.subcategoryId) === Number(filterSubcat))
    : mappings;

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p style={{ color: '#6b7280', marginTop: 12 }}>Loading mappings...</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🔗 Complementary Product Mappings</h2>
          <p style={styles.subtitle}>
            Define which subcategories are complementary to each other.
            These power the <strong>"Relevant Products"</strong> section on product detail pages.
          </p>
        </div>
        <div style={styles.badge}>{mappings.length} mappings</div>
      </div>

      {/* ── How it works ── */}
      <div style={styles.infoBox}>
        <span style={styles.infoIcon}>💡</span>
        <div>
          <strong>How it works:</strong>
          <ul style={styles.infoList}>
            <li><strong>Option A (this form):</strong> Admin defines subcategory pairs → all products from complementary subcategory are shown</li>
            <li><strong>Option B (product attribute):</strong> Add attribute <code>complementarySubcategories = 7,8</code> on a specific product for product-level overrides</li>
            <li>Both sources are merged automatically in real-time</li>
          </ul>
        </div>
      </div>

      {/* ── Alerts ── */}
      {error   && <div style={styles.alertError}>⚠️ {error}</div>}
      {success && <div style={styles.alertSuccess}>✅ {success}</div>}

      {/* ── Add Form ── */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Add New Mapping</h3>
        <form onSubmit={handleAdd} style={styles.form}>
          <div style={styles.formRow}>
            {/* Source subcategory */}
            <div style={styles.formGroup}>
              <label style={styles.label}>When viewing products from</label>
              <select
                style={styles.select}
                value={form.subcategoryId}
                onChange={e => setForm(f => ({ ...f, subcategoryId: e.target.value }))}
                required
              >
                <option value="">Select subcategory...</option>
                {subcategories.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                ))}
              </select>
            </div>

            <div style={styles.arrow}>→</div>

            {/* Complementary subcategory */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Show products from</label>
              <select
                style={styles.select}
                value={form.complementarySubcategoryId}
                onChange={e => setForm(f => ({ ...f, complementarySubcategoryId: e.target.value }))}
                required
              >
                <option value="">Select complementary subcategory...</option>
                {subcategories
                  .filter(s => String(s.id) !== String(form.subcategoryId))
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                  ))}
              </select>
            </div>

            {/* Label */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Label (optional)</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. Accessories, Frequently Bought"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
          </div>

          {/* Reverse mapping checkbox */}
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.addReverse}
              onChange={e => setForm(f => ({ ...f, addReverse: e.target.checked }))}
              style={{ marginRight: 8 }}
            />
            Also add reverse mapping (B → A automatically)
          </label>

          <button type="submit" style={styles.btnPrimary} disabled={saving}>
            {saving ? 'Adding...' : '+ Add Mapping'}
          </button>
        </form>
      </div>

      {/* ── Existing Mappings Table ── */}
      <div style={styles.card}>
        <div style={styles.tableHeader}>
          <h3 style={styles.cardTitle}>Existing Mappings</h3>
          <select
            style={{ ...styles.select, width: 220 }}
            value={filterSubcat}
            onChange={e => setFilterSubcat(e.target.value)}
          >
            <option value="">All subcategories</option>
            {subcategories.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {filteredMappings.length === 0 ? (
          <div style={styles.empty}>
            <span style={{ fontSize: 32 }}>🗂️</span>
            <p>No mappings defined yet.</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>
              Add mappings above to power the "Relevant Products" section.
            </p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>When viewing</th>
                <th style={styles.th}>Show products from</th>
                <th style={styles.th}>Label</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map(m => (
                <tr key={m.id} style={styles.tr}>
                  <td style={styles.td}>
                    <span style={styles.subcatBadge}>{getSubcatName(m.subcategoryId)}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>#{m.subcategoryId}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.subcatBadge, background: '#dbeafe', color: '#1d4ed8' }}>
                      {getSubcatName(m.complementarySubcategoryId)}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>#{m.complementarySubcategoryId}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ color: '#6b7280', fontSize: 13 }}>{m.label || '—'}</span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.btnDelete}
                      onClick={() => handleDelete(m.subcategoryId, m.complementarySubcategoryId)}
                    >
                      🗑 Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Quick Setup Guide ── */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>📋 Quick Setup for Electronics</h3>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
          Click to auto-add common complementary mappings for your current subcategories:
        </p>
        <div style={styles.quickBtns}>
          <button
            style={styles.btnQuick}
            onClick={async () => {
              setSaving(true);
              // Mobile Phones ↔ Watch
              await imsService.products.addComplementaryMapping(6, 7, 'Accessories').catch(() => {});
              await imsService.products.addComplementaryMapping(7, 6, 'Pair with Phone').catch(() => {});
              // Laptop ↔ Watch
              await imsService.products.addComplementaryMapping(1, 7, 'Accessories').catch(() => {});
              await imsService.products.addComplementaryMapping(7, 1, 'Pair with Laptop').catch(() => {});
              await loadData();
              showSuccess('Electronics mappings added!');
              setSaving(false);
            }}
            disabled={saving}
          >
            ⚡ Add Electronics Mappings (Phone↔Watch, Laptop↔Watch)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root:         { padding: '24px', maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:        { fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 },
  subtitle:     { fontSize: 13, color: '#6b7280', marginTop: 4 },
  badge:        { background: '#f3f4f6', color: '#374151', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' },
  infoBox:      { display: 'flex', gap: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#1e40af' },
  infoIcon:     { fontSize: 20, flexShrink: 0 },
  infoList:     { margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.7 },
  alertError:   { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 },
  alertSuccess: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 },
  card:         { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 20 },
  cardTitle:    { fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 14px 0' },
  form:         { display: 'flex', flexDirection: 'column', gap: 14 },
  formRow:      { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' },
  formGroup:    { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 180 },
  label:        { fontSize: 12, fontWeight: 600, color: '#374151' },
  select:       { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111827', background: '#fff', cursor: 'pointer' },
  input:        { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111827' },
  arrow:        { fontSize: 20, color: '#9ca3af', paddingBottom: 8, alignSelf: 'flex-end' },
  checkboxLabel:{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#374151', cursor: 'pointer' },
  btnPrimary:   { padding: '9px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' },
  tableHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' },
  tr:           { borderBottom: '1px solid #f3f4f6' },
  td:           { padding: '10px 12px', fontSize: 13, color: '#374151' },
  subcatBadge:  { background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  btnDelete:    { padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  empty:        { textAlign: 'center', padding: '32px 0', color: '#6b7280' },
  loadingWrap:  { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40 },
  spinner:      { width: 32, height: 32, border: '3px solid #e5e7eb', borderTop: '3px solid #111827', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  quickBtns:    { display: 'flex', gap: 10, flexWrap: 'wrap' },
  btnQuick:     { padding: '8px 16px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 },
};
