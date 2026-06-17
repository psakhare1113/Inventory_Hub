import React, { useState, useEffect } from 'react';
import { imsService } from '../../services/imsApi';
import '../css/PricingForm.css';

export default function PricingForm({ isOpen, onClose, editingPricing, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState({
    productId: '',
    mrp: '',
    sellingPrice: '',
    costPrice: '',
    packagingCost: '',
    shippingCost: '',
    profitMargin: '',
    discount: '',
    gstRate: '18',
    unitSize: '',
    unitLabel: ''
  });

  // Shipping calculator state
  const [shippingCalc, setShippingCalc] = useState({
    deliveryPincode: '',
    weightKg: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    deliverySpeed: 'STANDARD',
  });
  const [shippingOptions, setShippingOptions]   = useState(null);  // API response
  const [shippingLoading, setShippingLoading]   = useState(false);
  const [shippingCalcOpen, setShippingCalcOpen] = useState(false);

  const calcDiscount = (mrp, sp) => {
    const m = parseFloat(mrp);
    const s = parseFloat(sp);
    if (m > 0 && s >= 0) return ((m - s) / m * 100).toFixed(2);
    return '';
  };

  // Auto-calculate selling price from components
  // Formula: costPrice + packagingCost + shippingCost + profitMargin + GST(on costPrice)
  const calcSellingPrice = (cp, pkg, ship, pm, gst) => {
    const cost     = parseFloat(cp)   || 0;
    const pkgCost  = parseFloat(pkg)  || 0;
    const shipCost = parseFloat(ship) || 0;
    const profit   = parseFloat(pm)   || 0;
    const gstRate  = parseFloat(gst)  || 18;
    if (cost <= 0) return '';
    const gstAmt = cost * gstRate / 100;
    return (cost + pkgCost + shipCost + profit + gstAmt).toFixed(2);
  };

  // Fetch shipping rate from shipping-service API
  const fetchShippingRate = async () => {
    const { deliveryPincode, weightKg, lengthCm, widthCm, heightCm, deliverySpeed } = shippingCalc;
    if (!deliveryPincode || !weightKg) return;
    setShippingLoading(true);
    setShippingOptions(null);
    try {
      const res = await fetch('http://localhost:9999/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` },
        body: JSON.stringify({
          deliveryPincode,
          weightKg:      parseFloat(weightKg),
          lengthCm:      lengthCm  ? parseFloat(lengthCm)  : null,
          widthCm:       widthCm   ? parseFloat(widthCm)   : null,
          heightCm:      heightCm  ? parseFloat(heightCm)  : null,
          deliverySpeed: deliverySpeed || 'STANDARD',
          paymentMode:   'ONLINE',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShippingOptions(data);
      }
    } catch (e) {
      console.error('Shipping calc error:', e);
    } finally {
      setShippingLoading(false);
    }
  };

  // Apply selected courier charge to shippingCost field
  const applyShippingCharge = (charge) => {
    setPricing(prev => {
      const updated = { ...prev, shippingCost: charge.toFixed(2) };
      // Recalculate selling price
      const computed = calcSellingPrice(updated.costPrice, updated.packagingCost, charge.toFixed(2), updated.profitMargin, updated.gstRate);
      if (computed) {
        updated.sellingPrice = computed;
        const m = parseFloat(updated.mrp);
        const s = parseFloat(computed);
        if (m > 0 && s >= 0) updated.discount = ((m - s) / m * 100).toFixed(2);
      }
      return updated;
    });
    setShippingCalcOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadFormData();
      if (editingPricing) {
        const mrp = editingPricing.mrp?.toString() || '';
        const sp  = editingPricing.sellingPrice?.toString() || '';
        const storedDiscount = editingPricing.discount != null ? parseFloat(editingPricing.discount) : null;
        const discount = (storedDiscount !== null && storedDiscount !== 0)
          ? storedDiscount.toFixed(2)
          : calcDiscount(mrp, sp);
        setPricing({
          productId:     editingPricing.productId?.toString() || '',
          mrp,
          sellingPrice:  sp,
          costPrice:     editingPricing.costPrice     != null ? editingPricing.costPrice.toString()     : '',
          packagingCost: editingPricing.packagingCost != null ? editingPricing.packagingCost.toString() : '',
          shippingCost:  editingPricing.shippingCost  != null ? editingPricing.shippingCost.toString()  : '',
          profitMargin:  editingPricing.profitMargin  != null ? editingPricing.profitMargin.toString()  : '',
          discount:      discount || '',
          gstRate:       editingPricing.gstRate != null ? editingPricing.gstRate.toString() : '18',
          unitSize:      editingPricing.unitSize != null ? editingPricing.unitSize.toString() : '',
          unitLabel:     editingPricing.unitLabel || ''
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingPricing]);

  // 🚀 AUTO-FILL: When product is selected, auto-fill cost price from inventory
  useEffect(() => {
    if (pricing.productId && !editingPricing && pricing.productId !== '') {
      autoFillCostPriceFromInventory(pricing.productId);
    }
  }, [pricing.productId, editingPricing]);

  const loadFormData = async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      };
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('http://localhost:9999/api/products',   { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('http://localhost:9999/api/categories', { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
    } catch (err) {
      console.error('Error loading form data:', err);
    }
  };

  const resetForm = () => {
    setPricing({ productId: '', mrp: '', sellingPrice: '', costPrice: '', packagingCost: '', shippingCost: '', profitMargin: '', discount: '', gstRate: '18', unitSize: '', unitLabel: '' });
    setSelectedCategory('');
  };

  // ── Default estimated costs (company average — admin can override) ──────────
  // These are ESTIMATED values used to auto-calculate selling price & MRP.
  // Actual shipping is calculated per-order from courier API at checkout.
  const DEFAULT_PACKAGING  = 50;   // ₹50  — box/wrap/label (fixed per product type)
  const DEFAULT_SHIPPING   = 80;   // ₹80  — average courier estimate
  const DEFAULT_PROFIT     = 500;  // ₹500 — business margin
  const DEFAULT_GST        = 18;   // 18%  — electronics default
  // MRP buffer: MRP = sellingPrice × this multiplier (gives discount headroom)
  const MRP_BUFFER_FACTOR  = 1.20; // 20% above selling price → ~17% discount shown

  // 🚀 AUTO-FILL: Get cost price from inventory when product is selected
  // After cost price is fetched → auto-calculate sellingPrice + MRP using defaults
  const autoFillCostPriceFromInventory = async (productId) => {
    try {
      console.log('🔍 Auto-filling cost price for productId:', productId);
      
      // Get inventory data for this product
      const inventoryData = await imsService.inventory.getInventoryByProductId(productId);
      
      if (inventoryData && inventoryData.length > 0) {
        // Get latest inventory entry (most recent supplier rate)
        const latestInventory = inventoryData.reduce((latest, current) => {
          const latestDate = new Date(latest.createdAt || latest.updatedAt || 0);
          const currentDate = new Date(current.createdAt || current.updatedAt || 0);
          return currentDate > latestDate ? current : latest;
        });
        
        if (latestInventory.buyPrice && parseFloat(latestInventory.buyPrice) > 0) {
          const costPrice = parseFloat(latestInventory.buyPrice);

          // ── Auto-calculate Selling Price ─────────────────────────────────
          // Formula: costPrice + packaging + shipping + profit + GST(on costPrice)
          const gstAmt      = costPrice * DEFAULT_GST / 100;
          const sellingPrice = parseFloat(
            (costPrice + DEFAULT_PACKAGING + DEFAULT_SHIPPING + DEFAULT_PROFIT + gstAmt).toFixed(2)
          );

          // ── Auto-calculate MRP ────────────────────────────────────────────
          // MRP = sellingPrice × buffer (rounded to nearest ₹100 for clean display)
          const mrpRaw = sellingPrice * MRP_BUFFER_FACTOR;
          const mrp    = parseFloat((Math.ceil(mrpRaw / 100) * 100).toFixed(2));

          // ── Discount % ───────────────────────────────────────────────────
          const discount = ((mrp - sellingPrice) / mrp * 100).toFixed(2);

          setPricing(prev => ({
            ...prev,
            costPrice:     costPrice.toString(),
            packagingCost: DEFAULT_PACKAGING.toString(),
            shippingCost:  DEFAULT_SHIPPING.toString(),
            profitMargin:  DEFAULT_PROFIT.toString(),
            gstRate:       DEFAULT_GST.toString(),
            sellingPrice:  sellingPrice.toString(),
            mrp:           mrp.toString(),
            discount:      discount,
          }));
          
          showAutoFillNotification(
            `✅ Auto-calculated from inventory buyPrice ₹${costPrice}  →  Selling ₹${sellingPrice}  |  MRP ₹${mrp}  |  ${discount}% OFF  (packaging ₹${DEFAULT_PACKAGING} + shipping ₹${DEFAULT_SHIPPING} + profit ₹${DEFAULT_PROFIT} + GST ${DEFAULT_GST}%)`,
            'success'
          );
          
          console.log('✅ Auto-filled: costPrice=', costPrice, 'sellingPrice=', sellingPrice, 'mrp=', mrp, 'discount=', discount + '%');
        } else {
          console.log('⚠️ No valid buyPrice found in inventory');
          showAutoFillNotification(
            '⚠️ Inventory found but buyPrice is 0. Enter cost price manually.',
            'warning'
          );
        }
      } else {
        console.log('📦 No inventory found for this product');
        showAutoFillNotification(
          '📦 No inventory found. Enter cost price manually — selling price & MRP will auto-calculate.',
          'info'
        );
      }
    } catch (error) {
      console.log('❌ Error auto-filling cost price:', error);
      showAutoFillNotification(
        '⚠️ Could not auto-fill from inventory. Please enter cost price manually.',
        'warning'
      );
    }
  };

  // Show auto-fill notification
  const showAutoFillNotification = (message, type = 'info') => {
    const colors = {
      success: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
      warning: { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' },
      info: { bg: '#dbeafe', border: '#60a5fa', text: '#1e40af' }
    };
    
    const color = colors[type] || colors.info;
    
    // Remove existing notification
    const existing = document.querySelector('.auto-fill-notification');
    if (existing) existing.remove();
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'auto-fill-notification';
    notification.innerHTML = `
      <div style="
        background: ${color.bg}; 
        border: 1px solid ${color.border}; 
        padding: 12px 16px; 
        border-radius: 8px; 
        margin: 10px 0; 
        color: ${color.text};
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none; 
          border: none; 
          color: ${color.text}; 
          cursor: pointer; 
          font-size: 16px;
          margin-left: auto;
        ">×</button>
      </div>
    `;
    
    // Insert at top of form
    const formBody = document.querySelector('.pf-body');
    if (formBody) {
      formBody.insertBefore(notification, formBody.firstChild);
      
      // Auto-remove after 8 seconds
      setTimeout(() => {
        if (notification.parentNode) notification.remove();
      }, 8000);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPricing(prev => {
      const updated = { ...prev, [name]: value };

      // ── Step 1: Selling Price auto-calculate from breakdown components ──────
      // Triggered when any cost component changes
      const breakdownFields = ['costPrice', 'packagingCost', 'shippingCost', 'profitMargin', 'gstRate'];
      if (breakdownFields.includes(name)) {
        const computed = calcSellingPrice(
          name === 'costPrice'     ? value : updated.costPrice,
          name === 'packagingCost' ? value : updated.packagingCost,
          name === 'shippingCost'  ? value : updated.shippingCost,
          name === 'profitMargin'  ? value : updated.profitMargin,
          name === 'gstRate'       ? value : updated.gstRate,
        );
        if (computed) {
          updated.sellingPrice = computed;

          // ── Step 2: MRP auto-calculate when sellingPrice changes via breakdown
          // Only auto-set MRP if admin hasn't manually typed an MRP yet
          // (i.e. MRP is blank OR was previously auto-set — not manually overridden)
          const currentMrp = parseFloat(updated.mrp) || 0;
          const newSp      = parseFloat(computed);
          // Auto-update MRP if: blank, or MRP ≤ sellingPrice (would be invalid anyway)
          if (!updated.mrp || currentMrp <= newSp) {
            const mrpRaw = newSp * MRP_BUFFER_FACTOR;
            updated.mrp  = (Math.ceil(mrpRaw / 100) * 100).toFixed(2);
          }
        }
      }

      // ── Step 3: Discount auto-calculate from MRP vs Selling Price ───────────
      if (name === 'mrp' || name === 'sellingPrice') {
        const m = parseFloat(name === 'mrp' ? value : updated.mrp);
        const s = parseFloat(name === 'sellingPrice' ? value : updated.sellingPrice);
        if (m > 0 && s >= 0) updated.discount = ((m - s) / m * 100).toFixed(2);
      }
      // Also recalculate discount when sellingPrice changes via breakdown
      if (breakdownFields.includes(name) && updated.sellingPrice && updated.mrp) {
        const m = parseFloat(updated.mrp);
        const s = parseFloat(updated.sellingPrice);
        if (m > 0 && s >= 0) updated.discount = ((m - s) / m * 100).toFixed(2);
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pricing.productId || !pricing.mrp || !pricing.sellingPrice) {
      alert('Please fill all required fields');
      return;
    }
    const mrpVal = parseFloat(pricing.mrp);
    const spVal  = parseFloat(pricing.sellingPrice);
    const cpVal  = pricing.costPrice !== '' ? parseFloat(pricing.costPrice) : null;

    if (spVal > mrpVal)  { alert(`❌ Selling Price (₹${spVal}) cannot be greater than MRP (₹${mrpVal}).`); return; }
    if (spVal <= 0)      { alert('❌ Selling Price must be greater than 0.'); return; }
    if (mrpVal <= 0)     { alert('❌ MRP must be greater than 0.'); return; }
    if (cpVal !== null && cpVal <= 0)    { alert('❌ Cost Price must be greater than 0.'); return; }
    if (cpVal !== null && cpVal >= spVal){ alert(`❌ Cost Price (₹${cpVal}) must be less than Selling Price (₹${spVal})!`); return; }

    setLoading(true);
    try {
      const payload = {
        productId:     parseInt(pricing.productId),
        mrp:           parseFloat(pricing.mrp),
        sellingPrice:  parseFloat(pricing.sellingPrice),
        costPrice:     pricing.costPrice     !== '' ? parseFloat(pricing.costPrice)     : null,
        packagingCost: pricing.packagingCost !== '' ? parseFloat(pricing.packagingCost) : null,
        shippingCost:  pricing.shippingCost  !== '' ? parseFloat(pricing.shippingCost)  : null,
        profitMargin:  pricing.profitMargin  !== '' ? parseFloat(pricing.profitMargin)  : null,
        discount:      pricing.discount      !== '' ? parseFloat(pricing.discount)      : null,
        gstRate:       pricing.gstRate       !== '' ? parseFloat(pricing.gstRate)       : 18,
        unitSize:      pricing.unitSize      !== '' ? parseFloat(pricing.unitSize)      : null,
        unitLabel:     pricing.unitLabel || null
      };
      if (editingPricing) {
        await imsService.pricing.updatePricing(editingPricing.productId, payload);
        window.dispatchEvent(new CustomEvent('pricingUpdated', { detail: { updated: editingPricing.id, productId: editingPricing.productId } }));
        alert('✅ Pricing updated successfully!');
      } else {
        await imsService.pricing.addPricing(payload);
        window.dispatchEvent(new CustomEvent('pricingUpdated', { detail: { added: true } }));
        alert('✅ Pricing added successfully!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => String(p.categoryId) === String(selectedCategory))
    : products;

  if (!isOpen) return null;

  /* ── derived validation states ── */
  const mrpVal = parseFloat(pricing.mrp);
  const spVal  = parseFloat(pricing.sellingPrice);
  const cpVal  = parseFloat(pricing.costPrice);

  const spErr = pricing.mrp && pricing.sellingPrice && spVal > mrpVal;
  const spOk  = pricing.mrp && pricing.sellingPrice && spVal > 0 && !spErr;

  const cpErr = pricing.costPrice && pricing.sellingPrice && cpVal >= spVal;
  const cpOk  = pricing.costPrice && pricing.sellingPrice && cpVal > 0 && cpVal < spVal;

  return (
    <div className="pf-overlay">
      <div className="pf-modal">

        {/* ── Header ── */}
        <div className="pf-header">
          <h3>{editingPricing ? '✏️ Edit Pricing' : '➕ Add Pricing'}</h3>
          <button className="pf-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pf-body">

            {/* ── Section 1: Category + Product ── */}
            <div className="pf-section">
              <div className="pf-grid-2">
                <div className="pf-group">
                  <label className="pf-label">Filter by Category</label>
                  <select
                    className="pf-select"
                    value={selectedCategory}
                    onChange={e => { setSelectedCategory(e.target.value); setPricing(prev => ({ ...prev, productId: '' })); }}
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="pf-group">
                  <label className="pf-label">Product *</label>
                  <select className="pf-select" name="productId" value={pricing.productId} onChange={handleChange} required>
                    <option value="">Select Product</option>
                    {filteredProducts.map(p => (
                      <option key={p.productId} value={p.productId}>
                        {p.name || p.productBarcode} (ID: {p.productId})
                      </option>
                    ))}
                  </select>
                  {filteredProducts.length === 0 && (
                    <p className="pf-hint warning">{products.length === 0 ? 'Loading...' : 'No products'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Section 2: MRP + Selling Price ── */}
            <div className="pf-section">
              <div className="pf-grid-2">
                <div className="pf-group">
                  <label className="pf-label">
                    MRP (₹) * <span>— Maximum Retail Price (printed on product)</span>
                  </label>
                  <input
                    type="number" step="0.01" name="mrp"
                    placeholder="e.g. 20000"
                    value={pricing.mrp} onChange={handleChange} required
                    className={`pf-input ${spErr ? 'error' : ''}`}
                  />
                </div>
                <div className="pf-group">
                  <label className="pf-label">
                    Selling Price (₹) * <span>— Customer price (must be ≤ MRP)</span>
                  </label>
                  <input
                    type="number" step="0.01" name="sellingPrice"
                    placeholder="e.g. 18000"
                    value={pricing.sellingPrice} onChange={handleChange} required
                    className={`pf-input ${spErr ? 'error' : spOk ? 'ok' : ''}`}
                  />
                </div>
              </div>

              {spErr && (
                <div className="pf-feedback error">
                  ⚠️ Selling Price (₹{pricing.sellingPrice}) cannot be greater than MRP (₹{pricing.mrp})!
                </div>
              )}
              {spOk && (
                <div className="pf-feedback success">
                  ✅ Discount: ₹{(mrpVal - spVal).toFixed(2)} &nbsp;|&nbsp;
                  {(((mrpVal - spVal) / mrpVal) * 100).toFixed(1)}% off
                </div>
              )}
            </div>

            {/* ── Section 3: Cost Price + Breakdown ── */}
            <div className="pf-section">
              <div className="pf-group">
                <label className="pf-label">
                  Cost Price (₹) * <span>— Amount paid to supplier (auto-fills inventory buyPrice)</span>
                </label>
                <input
                  type="number" step="0.01" name="costPrice"
                  placeholder="e.g. 14000 — supplier rate decided on call"
                  value={pricing.costPrice} onChange={handleChange} required
                  className={`pf-input ${cpErr ? 'cp-err' : cpOk ? 'cp-ok' : 'warn'}`}
                />
                {cpErr && (
                  <p className="pf-hint error">
                    ⚠️ Cost Price (₹{pricing.costPrice}) must be less than Selling Price (₹{pricing.sellingPrice})!
                  </p>
                )}
                {cpOk && (
                  <p className="pf-hint success">
                    ✅ Profit per unit: ₹{(spVal - cpVal).toFixed(2)} &nbsp;|&nbsp;
                    Margin: {((spVal - cpVal) / spVal * 100).toFixed(1)}%
                    &nbsp;— Inventory buyPrice will be auto-filled
                  </p>
                )}
                {!pricing.costPrice && (
                  <p className="pf-hint warning">
                    ⚠️ Cost Price is blank — profit cannot be calculated in inventory without this
                  </p>
                )}
              </div>

              {/* Selling Price Breakdown */}
              <div style={{ marginTop: 14, padding: '14px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 10 }}>
                  📊 Selling Price Breakdown
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                    Fill components → Selling Price auto-calculates
                  </span>
                </div>
                <div className="pf-grid-2" style={{ gap: 10 }}>
                  <div className="pf-group">
                    <label className="pf-label">Packaging Cost (₹) <span>— box, label, wrap</span></label>
                    <input type="number" step="0.01" name="packagingCost"
                      placeholder="e.g. 20" value={pricing.packagingCost} onChange={handleChange}
                      className="pf-input" />
                  </div>
                  <div className="pf-group">
                    <label className="pf-label">Shipping Cost (₹) <span>— logistics per unit</span></label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="number" step="0.01" name="shippingCost"
                        placeholder="e.g. 30" value={pricing.shippingCost} onChange={handleChange}
                        className="pf-input" style={{ flex: 1 }} />
                      <button
                        type="button"
                        onClick={() => setShippingCalcOpen(o => !o)}
                        style={{
                          padding: '0 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          border: '1px solid #0d9488', background: shippingCalcOpen ? '#0d9488' : '#f0fdfa',
                          color: shippingCalcOpen ? '#fff' : '#0d9488', cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                        title="Calculate shipping rate by pincode + dimensions"
                      >🚚 Calculate</button>
                    </div>

                    {/* Shipping Rate Calculator Panel */}
                    {shippingCalcOpen && (
                      <div style={{ marginTop: 10, padding: 14, background: '#f0fdfa', borderRadius: 10, border: '1px solid #99f6e4' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', marginBottom: 10 }}>
                          🚚 Shipping Rate Calculator
                          <span style={{ fontSize: 10, fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>
                            Pincode + Weight + Dimensions → Courier charges
                          </span>
                        </div>

                        {/* Row 1: Pincode + Weight */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label className="pf-label">Delivery Pincode *</label>
                            <input type="text" maxLength={6} placeholder="e.g. 416416"
                              value={shippingCalc.deliveryPincode}
                              onChange={e => setShippingCalc(s => ({ ...s, deliveryPincode: e.target.value }))}
                              className="pf-input" />
                          </div>
                          <div>
                            <label className="pf-label">Weight (kg) *</label>
                            <input type="number" step="0.1" min="0.1" placeholder="e.g. 1.5"
                              value={shippingCalc.weightKg}
                              onChange={e => setShippingCalc(s => ({ ...s, weightKg: e.target.value }))}
                              className="pf-input" />
                          </div>
                        </div>

                        {/* Row 2: Dimensions (L × W × H) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label className="pf-label">Length (cm)</label>
                            <input type="number" step="0.1" placeholder="L"
                              value={shippingCalc.lengthCm}
                              onChange={e => setShippingCalc(s => ({ ...s, lengthCm: e.target.value }))}
                              className="pf-input" />
                          </div>
                          <div>
                            <label className="pf-label">Width (cm)</label>
                            <input type="number" step="0.1" placeholder="W"
                              value={shippingCalc.widthCm}
                              onChange={e => setShippingCalc(s => ({ ...s, widthCm: e.target.value }))}
                              className="pf-input" />
                          </div>
                          <div>
                            <label className="pf-label">Height (cm)</label>
                            <input type="number" step="0.1" placeholder="H"
                              value={shippingCalc.heightCm}
                              onChange={e => setShippingCalc(s => ({ ...s, heightCm: e.target.value }))}
                              className="pf-input" />
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>
                          Volumetric weight = (L × W × H) / 5000 — chargeable = max(actual, volumetric)
                        </div>

                        {/* Row 3: Speed + Calculate button */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
                          <div style={{ flex: 1 }}>
                            <label className="pf-label">Delivery Speed</label>
                            <select value={shippingCalc.deliverySpeed}
                              onChange={e => setShippingCalc(s => ({ ...s, deliverySpeed: e.target.value }))}
                              className="pf-select">
                              <option value="STANDARD">Standard (3-5 days)</option>
                              <option value="EXPRESS">Express (1-2 days)</option>
                              <option value="SAME_DAY">Same Day</option>
                            </select>
                          </div>
                          <button type="button" onClick={fetchShippingRate} disabled={shippingLoading}
                            className="pf-btn-submit" style={{ padding: '8px 16px', fontSize: 12 }}>
                            {shippingLoading ? 'Calculating...' : 'Get Rates'}
                          </button>
                        </div>

                        {/* Results */}
                        {shippingOptions && (
                          <div>
                            {shippingOptions.chargeableWeightKg && (
                              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                                Zone: <strong>{shippingOptions.zoneLabel}</strong> &nbsp;|&nbsp;
                                Chargeable weight: <strong>{shippingOptions.chargeableWeightKg} kg</strong>
                                {shippingOptions.volumetricWeightKg && (
                                  <span> (volumetric: {shippingOptions.volumetricWeightKg} kg)</span>
                                )}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                              Click a courier to apply charge ↓
                            </div>
                            {(shippingOptions.allOptions || []).map((opt, i) => (
                              <div key={i}
                                onClick={() => applyShippingCharge(opt.charge)}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '7px 10px', borderRadius: 8, marginBottom: 5, cursor: 'pointer',
                                  background: i === 0 ? '#dcfce7' : '#f8fafc',
                                  border: `1px solid ${i === 0 ? '#86efac' : '#e2e8f0'}`,
                                  fontSize: 12,
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>
                                  {i === 0 && <span style={{ color: '#16a34a', marginRight: 4 }}>★</span>}
                                  {opt.courier}
                                </span>
                                <span style={{ color: '#6b7280' }}>{opt.speedLabel}</span>
                                <span style={{ fontWeight: 700, color: '#0f766e' }}>₹{opt.charge}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="pf-group">
                    <label className="pf-label">Profit Margin (₹) <span>— decided by business team</span></label>
                    <input type="number" step="0.01" name="profitMargin"
                      placeholder="e.g. 200" value={pricing.profitMargin} onChange={handleChange}
                      className="pf-input" />
                  </div>
                  <div className="pf-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    {pricing.costPrice && (pricing.packagingCost || pricing.shippingCost || pricing.profitMargin) && (
                      <div style={{ padding: '8px 12px', background: '#dcfce7', borderRadius: 8, fontSize: 12 }}>
                        <div style={{ color: '#6b7280', marginBottom: 4 }}>Calculated Selling Price:</div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: '#166534' }}>
                          ₹{calcSellingPrice(pricing.costPrice, pricing.packagingCost, pricing.shippingCost, pricing.profitMargin, pricing.gstRate)}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
                          ₹{parseFloat(pricing.costPrice)||0} cost
                          {pricing.packagingCost ? ` + ₹${pricing.packagingCost} pkg` : ''}
                          {pricing.shippingCost  ? ` + ₹${pricing.shippingCost} ship` : ''}
                          {pricing.profitMargin  ? ` + ₹${pricing.profitMargin} profit` : ''}
                          {` + ${pricing.gstRate}% GST`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 4: Discount + GST ── */}
            <div className="pf-section">
              <div className="pf-grid-2">
                <div className="pf-group">
                  <label className="pf-label">Discount % <span>(auto-calculated)</span></label>
                  <input
                    type="number" step="0.01" name="discount"
                    placeholder="Auto-calculated"
                    value={pricing.discount} onChange={handleChange}
                    className="pf-input readonly"
                  />
                </div>
                <div className="pf-group">
                  <label className="pf-label">GST Rate %</label>
                  <select className="pf-select" name="gstRate" value={pricing.gstRate} onChange={handleChange}>
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section 5: Unit Size + Label ── */}
            <div className="pf-section">
              <div className="pf-grid-2">
                <div className="pf-group">
                  <label className="pf-label">Unit Size</label>
                  <input
                    type="number" step="0.01" name="unitSize"
                    placeholder="e.g. 500"
                    value={pricing.unitSize} onChange={handleChange}
                    className="pf-input"
                  />
                </div>
                <div className="pf-group">
                  <label className="pf-label">Unit Label</label>
                  <input
                    type="text" name="unitLabel"
                    placeholder="e.g. ml, kg, piece"
                    value={pricing.unitLabel} onChange={handleChange}
                    className="pf-input"
                  />
                </div>
              </div>
            </div>

          </div>{/* end pf-body */}

          {/* ── Actions ── */}
          <div className="pf-actions">
            <button type="button" className="pf-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="pf-btn-submit" disabled={loading}>
              {loading ? 'Saving...' : editingPricing ? 'Update' : 'Add Pricing'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
