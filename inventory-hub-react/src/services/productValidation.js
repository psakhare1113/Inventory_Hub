/**
 * productValidation.js
 * Professional product validation & formatting utilities
 * Mirrors rules used by Amazon, Myntra, Flipkart
 */

// ─── Words that should NOT be title-cased (articles, conjunctions, prepositions) ───
const LOWERCASE_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
  'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'is', 'it',
  'with', 'from', 'into', 'onto', 'upon', 'over', 'under', 'via',
]);

// ─── Known brand / product names that have special casing ───
const BRAND_CASING = {
  iphone: 'iPhone',
  ipad: 'iPad',
  imac: 'iMac',
  ipod: 'iPod',
  airpods: 'AirPods',
  macbook: 'MacBook',
  oneplus: 'OnePlus',
  realme: 'Realme',
  xiaomi: 'Xiaomi',
  samsung: 'Samsung',
  lg: 'LG',
  hp: 'HP',
  dell: 'Dell',
  asus: 'ASUS',
  acer: 'Acer',
  lenovo: 'Lenovo',
  sony: 'Sony',
  jbl: 'JBL',
  bose: 'Bose',
  nike: 'Nike',
  adidas: 'Adidas',
  puma: 'Puma',
  biba: 'Biba',
  zara: 'Zara',
  h&m: 'H&M',
  levis: "Levi's",
  ikea: 'IKEA',
  philips: 'Philips',
  bosch: 'Bosch',
  whirlpool: 'Whirlpool',
  godrej: 'Godrej',
  havells: 'Havells',
  bajaj: 'Bajaj',
  prestige: 'Prestige',
};

// ─── Title Case formatter ────────────────────────────────────────────────────
export function toTitleCase(str) {
  if (!str) return '';
  const trimmed = str.replace(/\s+/g, ' ').trim();
  return trimmed
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      // Preserve known brand casing
      if (BRAND_CASING[lower]) return BRAND_CASING[lower];
      // Always capitalise first and last word
      if (index === 0) return capitalise(word);
      // Keep lowercase for articles/prepositions (unless first word)
      if (LOWERCASE_WORDS.has(lower)) return lower;
      return capitalise(word);
    })
    .join(' ');
}

function capitalise(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// ─── Normalise a name for duplicate comparison ───────────────────────────────
export function normaliseName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ─── Validate product name ───────────────────────────────────────────────────
export function validateProductName(name, existingProducts = [], editingProductId = null) {
  const errors = [];
  const warnings = [];
  const suggestions = [];

  if (!name || name.trim() === '') {
    errors.push('Product name is required.');
    return { valid: false, errors, warnings, suggestions };
  }

  const trimmed = name.trim();

  // Min length
  if (trimmed.length < 3) {
    errors.push('Product name must be at least 3 characters.');
  }

  // Max length
  if (trimmed.length > 200) {
    errors.push('Product name cannot exceed 200 characters.');
  }

  // Reject names that are only numbers or special characters
  if (/^[\d\s\W]+$/.test(trimmed)) {
    errors.push('Product name cannot contain only numbers or special characters.');
  }

  // Warn if ALL CAPS
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    warnings.push('Name is in ALL CAPS. Consider using Title Case for better readability.');
    suggestions.push(toTitleCase(trimmed));
  }

  // Warn if all lowercase
  if (trimmed === trimmed.toLowerCase() && /[a-z]/.test(trimmed)) {
    warnings.push('Name is in all lowercase. Consider using Title Case.');
    suggestions.push(toTitleCase(trimmed));
  }

  // Suggest title case if not already formatted
  const titleCased = toTitleCase(trimmed);
  if (trimmed !== titleCased && !suggestions.includes(titleCased)) {
    suggestions.push(titleCased);
  }

  // Duplicate check (case-insensitive)
  const normalised = normaliseName(trimmed);
  const duplicate = existingProducts.find(p => {
    if (editingProductId && p.productId === editingProductId) return false;
    return normaliseName(p.name || '') === normalised;
  });
  if (duplicate) {
    errors.push(`A product named "${duplicate.name}" already exists. Product names must be unique (case-insensitive).`);
  }

  // Extra spaces warning
  if (name !== name.trim() || /\s{2,}/.test(name)) {
    warnings.push('Extra spaces detected — they will be trimmed automatically.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    formatted: titleCased,
  };
}

// ─── Validate SKU / Barcode ──────────────────────────────────────────────────
export function validateSKU(sku, existingProducts = [], editingProductId = null) {
  const errors = [];

  if (!sku || sku.trim() === '') {
    errors.push('SKU / Barcode is required.');
    return { valid: false, errors };
  }

  const trimmed = sku.trim();

  if (trimmed.length < 3) {
    errors.push('SKU must be at least 3 characters.');
  }

  if (trimmed.length > 50) {
    errors.push('SKU cannot exceed 50 characters.');
  }

  // Only allow alphanumeric, hyphens, underscores
  if (!/^[A-Za-z0-9\-_]+$/.test(trimmed)) {
    errors.push('SKU can only contain letters, numbers, hyphens (-) and underscores (_).');
  }

  // Duplicate SKU check
  const duplicate = existingProducts.find(p => {
    if (editingProductId && p.productId === editingProductId) return false;
    return (p.productBarcode || '').trim().toLowerCase() === trimmed.toLowerCase();
  });
  if (duplicate) {
    errors.push(`SKU "${trimmed}" is already used by "${duplicate.name}". SKUs must be unique.`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Validate description ────────────────────────────────────────────────────
export function validateDescription(description) {
  const errors = [];
  const warnings = [];
  const tips = [];

  if (!description || description.trim() === '') {
    errors.push('Product description is required.');
    return { valid: false, errors, warnings, tips, score: 0 };
  }

  const trimmed = description.trim();
  let score = 0;

  if (trimmed.length < 50) {
    errors.push('Description must be at least 50 characters.');
  } else {
    score += 20;
  }

  if (trimmed.length > 2000) {
    errors.push('Description cannot exceed 2000 characters.');
  }

  // Quality scoring
  const lower = trimmed.toLowerCase();

  // Check for brand mention
  if (/\b(brand|by|from)\b/.test(lower) || Object.keys(BRAND_CASING).some(b => lower.includes(b))) {
    score += 20;
  } else {
    tips.push('💡 Mention the brand name for better discoverability.');
  }

  // Check for material
  if (/\b(cotton|polyester|leather|wood|metal|plastic|fabric|silk|wool|nylon|steel|aluminium|aluminum|glass|rubber|foam)\b/.test(lower)) {
    score += 20;
  } else {
    tips.push('💡 Include material/fabric details (e.g. "100% cotton", "solid wood").');
  }

  // Check for features / specs
  if (/\b(feature|includes|with|support|compatible|waterproof|wireless|bluetooth|rechargeable|adjustable|foldable|lightweight|durable)\b/.test(lower)) {
    score += 20;
  } else {
    tips.push('💡 Highlight key features (e.g. "wireless", "waterproof", "adjustable").');
  }

  // Check for size / color / usage
  if (/\b(size|color|colour|cm|mm|inch|kg|ml|litre|liter|small|medium|large|xl|xxl|perfect for|ideal for|suitable for|use)\b/.test(lower)) {
    score += 20;
  } else {
    tips.push('💡 Add size, colour, or usage context (e.g. "perfect for festive wear").');
  }

  if (trimmed.length < 100) {
    warnings.push('Short description — aim for 100+ characters for better product visibility.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    tips,
    score: Math.min(score, 100),
    length: trimmed.length,
  };
}

// ─── Validate pricing ────────────────────────────────────────────────────────
export function validatePricing(costPrice, sellingPrice, mrp) {
  const errors = [];
  const cp = parseFloat(costPrice);
  const sp = parseFloat(sellingPrice);
  const m  = parseFloat(mrp);

  if (costPrice !== '' && costPrice !== undefined) {
    if (isNaN(cp) || cp <= 0) errors.push('Cost price must be a positive number.');
  }

  if (sellingPrice !== '' && sellingPrice !== undefined) {
    if (isNaN(sp) || sp <= 0) errors.push('Selling price must be a positive number.');
    if (!isNaN(cp) && cp > 0 && !isNaN(sp) && sp < cp) {
      errors.push('Selling price cannot be lower than cost price.');
    }
  }

  if (mrp !== '' && mrp !== undefined) {
    if (isNaN(m) || m <= 0) errors.push('MRP must be a positive number.');
    if (!isNaN(sp) && sp > 0 && !isNaN(m) && sp > m) {
      errors.push('Selling price cannot exceed MRP.');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Validate stock ──────────────────────────────────────────────────────────
export function validateStock(quantity, threshold) {
  const errors = [];
  const qty = parseInt(quantity, 10);
  const thr = parseInt(threshold, 10);

  if (quantity !== '' && quantity !== undefined) {
    if (isNaN(qty) || qty < 0) errors.push('Stock quantity cannot be negative.');
  }

  if (threshold !== '' && threshold !== undefined) {
    if (isNaN(thr) || thr <= 0) errors.push('Threshold quantity must be greater than zero.');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Validate image file ─────────────────────────────────────────────────────
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_MB   = 5;
export const MIN_IMAGE_WIDTH     = 200;
export const MIN_IMAGE_HEIGHT    = 200;

export function validateImageFile(file) {
  return new Promise((resolve) => {
    const errors = [];

    if (!file) {
      resolve({ valid: false, errors: ['No file selected.'] });
      return;
    }

    // Format check
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      errors.push('Only JPG, PNG, and WEBP formats are allowed.');
    }

    // Size check
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_IMAGE_SIZE_MB) {
      errors.push(`Image size must not exceed ${MAX_IMAGE_SIZE_MB}MB. Current size: ${sizeMB.toFixed(2)}MB.`);
    }

    if (errors.length > 0) {
      resolve({ valid: false, errors });
      return;
    }

    // Resolution check via Image element
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width < MIN_IMAGE_WIDTH || img.height < MIN_IMAGE_HEIGHT) {
        errors.push(`Image resolution too low. Minimum ${MIN_IMAGE_WIDTH}×${MIN_IMAGE_HEIGHT}px required. Uploaded: ${img.width}×${img.height}px.`);
      }
      resolve({ valid: errors.length === 0, errors, width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, errors: ['Could not read image file.'] });
    };
    img.src = url;
  });
}

// ─── Description quality label ───────────────────────────────────────────────
export function descriptionQualityLabel(score) {
  if (score >= 80) return { label: 'Excellent', color: '#10b981' };
  if (score >= 60) return { label: 'Good',      color: '#3b82f6' };
  if (score >= 40) return { label: 'Fair',       color: '#f59e0b' };
  return               { label: 'Poor',          color: '#ef4444' };
}

// ─── Example description templates ──────────────────────────────────────────
export const DESCRIPTION_TEMPLATES = {
  fashion: (brand = 'Brand') =>
    `${brand} Women's Anarkali Kurta Set made from soft cotton fabric with elegant floral print, perfect for festive and casual wear. Available in sizes S, M, L, XL.`,
  electronics: (brand = 'Brand') =>
    `${brand} Wireless Bluetooth Headphones with active noise cancellation, 30-hour battery life, and premium sound quality. Compatible with iOS and Android. Lightweight and foldable design.`,
  furniture: (brand = 'Brand') =>
    `${brand} 3-Seater Sofa crafted from solid hardwood frame with premium velvet upholstery. Dimensions: 210×85×90 cm. Ideal for modern living rooms. Assembly required.`,
  beauty: (brand = 'Brand') =>
    `${brand} Moisturising Face Cream with SPF 30, enriched with Vitamin C and hyaluronic acid. Suitable for all skin types. 50ml. Dermatologically tested and paraben-free.`,
  sports: (brand = 'Brand') =>
    `${brand} Running Shoes with advanced cushioning sole and breathable mesh upper. Lightweight design for daily runs and gym workouts. Available in sizes 6–12 UK.`,
};
