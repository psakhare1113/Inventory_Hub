const fs = require('fs');
const path = 'd:/Inventory-Hub/inventory-hub-react/src/components/Warehouse/WarehouseDashboard.js';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Find line with canDo
const canDoLine = lines.findIndex(l => l.includes("const canDo = (action) => (PO_ROLE_ACTIONS"));
console.log('canDo at line:', canDoLine + 1);
console.log('canDo line:', lines[canDoLine]);
console.log('next line:', lines[canDoLine + 1]);

// Insert syncPricingFromThresholds function after canDo line
const syncFunc = `
  // Sync Pricing from Thresholds — existing thresholds madhe missing pricing entries create karto
  const syncPricingFromThresholds = async () => {
    setSyncPricingLoading(true);
    setTriggerMsg('');
    try {
      const adminToken = sessionStorage.getItem('adminToken') || localStorage.getItem('authToken') || localStorage.getItem('token');
      const warehouseToken = sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken');
      const authToken = adminToken || warehouseToken;

      // Load all thresholds
      const threshList = thresholds.length > 0 ? thresholds : await (async () => {
        const r = await fetch(API + '/auto-po/thresholds', { headers: getHeaders() });
        return r.ok ? await r.json() : [];
      })();

      if (!threshList.length) {
        setTriggerMsg('No thresholds configured yet');
        setSyncPricingLoading(false);
        return;
      }

      const PRICING_BASE = 'http://localhost:9999/api/products';
      const pricingHeaders = {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': 'Bearer ' + authToken }),
      };

      let created = 0, updated = 0, skipped = 0;

      for (const t of threshList) {
        const pid = Number(t.productId);
        const unitPrice = Number(t.unitPrice || 0);
        if (!pid || unitPrice <= 0) { skipped++; continue; }

        const sellingPrice = parseFloat((unitPrice * 1.18).toFixed(2));
        const mrp = sellingPrice;

        try {
          const checkRes = await fetch(PRICING_BASE + '/priceByProductId/' + pid, { headers: pricingHeaders });
          const existing = checkRes.ok ? await checkRes.json().catch(() => null) : null;

          if (existing && existing.productId) {
            if (!existing.costPrice || Number(existing.costPrice) === 0) {
              await fetch(PRICING_BASE + '/updatePrice/' + pid, {
                method: 'PUT', headers: pricingHeaders,
                body: JSON.stringify({
                  productId: pid,
                  mrp: existing.mrp || mrp,
                  costPrice: unitPrice,
                  sellingPrice: existing.sellingPrice || sellingPrice,
                  gstRate: existing.gstRate || 18,
                }),
              });
              updated++;
            } else {
              skipped++;
            }
          } else {
            const addRes = await fetch(PRICING_BASE + '/addPrice', {
              method: 'POST', headers: pricingHeaders,
              body: JSON.stringify({ productId: pid, costPrice: unitPrice, sellingPrice, mrp, gstRate: 18 }),
            });
            if (addRes.ok) created++;
            else skipped++;
          }
        } catch (e) {
          console.warn('Sync pricing error for product', pid, e.message);
          skipped++;
        }
      }

      setTriggerMsg('Pricing Sync Done — Created: ' + created + ', Updated: ' + updated + ', Skipped: ' + skipped);
      window.dispatchEvent(new CustomEvent('pricingUpdated', { detail: { source: 'syncButton', created, updated } }));
    } catch (e) {
      setTriggerMsg('Sync failed: ' + e.message);
    } finally {
      setSyncPricingLoading(false);
    }
  };
`;

// Insert after canDo line
const newLines = [
  ...lines.slice(0, canDoLine + 1),
  syncFunc,
  ...lines.slice(canDoLine + 1)
];

const newContent = newLines.join('\n');
fs.writeFileSync(path, newContent, 'utf8');
console.log('SUCCESS: syncPricingFromThresholds inserted after line', canDoLine + 1);
console.log('New file size:', newContent.length);
