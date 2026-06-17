/**
 * Product Recommendations Utility
 * ================================
 * Amazon / Myntra style logic for:
 *  1. Related Products    → same category/subcategory, similar price
 *  2. Relevant Products   → behavior-based (view history, cart, collaborative filtering)
 *  3. Frequently Bought Together → products often purchased with current product
 *
 * All user behavior is stored in localStorage (no backend needed for basic version).
 * For production, replace localStorage calls with API calls to a recommendation engine.
 */

// ─── Constants ────────────────────────────────────────────────────────────────
const BEHAVIOR_KEY = 'user_behavior';
const MAX_HISTORY  = 50; // max items to track per event type

// ─── Behavior Tracker ─────────────────────────────────────────────────────────
/**
 * Track user actions: view, cart, purchase, wishlist
 * This data powers the "Relevant Products" section.
 */
export const behaviorTracker = {
  /** Load behavior data from localStorage */
  get: () => {
    try {
      return JSON.parse(localStorage.getItem(BEHAVIOR_KEY) || '{}');
    } catch {
      return {};
    }
  },

  /** Save behavior data to localStorage */
  save: (data) => {
    localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(data));
  },

  /**
   * Track a product event
   * @param {'view'|'cart'|'purchase'|'wishlist'} eventType
   * @param {number|string} productId
   * @param {object} productMeta - { categoryId, subcategoryId, price }
   */
  track: (eventType, productId, productMeta = {}) => {
    const data = behaviorTracker.get();
    if (!data[eventType]) data[eventType] = [];

    const id = Number(productId);
    const entry = {
      productId: id,
      categoryId: productMeta.categoryId,
      subcategoryId: productMeta.subcategoryId,
      price: productMeta.price,
      timestamp: Date.now(),
    };

    // Remove old entry for same product (move to front = most recent)
    data[eventType] = data[eventType].filter(e => e.productId !== id);
    data[eventType].unshift(entry);

    // Keep only last MAX_HISTORY items
    if (data[eventType].length > MAX_HISTORY) {
      data[eventType] = data[eventType].slice(0, MAX_HISTORY);
    }

    behaviorTracker.save(data);
  },

  /** Get recently viewed product IDs (most recent first) */
  getViewHistory: (limit = 20) => {
    const data = behaviorTracker.get();
    return (data.view || []).slice(0, limit).map(e => e.productId);
  },

  /** Get all behavior entries for scoring */
  getAllEntries: () => {
    const data = behaviorTracker.get();
    return {
      views:     data.view      || [],
      carts:     data.cart      || [],
      purchases: data.purchase  || [],
      wishlists: data.wishlist  || [],
    };
  },

  /** Clear all behavior data */
  clear: () => localStorage.removeItem(BEHAVIOR_KEY),
};

// ─── Related Products ──────────────────────────────────────────────────────────
/**
 * Get related products based on:
 *  - Same subcategory (highest priority)
 *  - Same category (fallback)
 *  - Similar price range (±40%)
 *  - Sorted by: bestseller > rating > price similarity
 *
 * @param {object} currentProduct - The product being viewed
 * @param {Array}  allProducts    - All available products
 * @param {number} limit          - Max results to return
 * @returns {Array} Related products (excluding current)
 */
export const getRelatedProducts = (currentProduct, allProducts, limit = 8) => {
  if (!currentProduct || !allProducts?.length) return [];

  const currentId       = Number(currentProduct.id || currentProduct.productId);
  const currentPrice    = Number(currentProduct.price) || 0;
  const currentCatId    = currentProduct.categoryId;
  const currentSubCatId = currentProduct.subcategoryId;

  // Score each product
  const scored = allProducts
    .filter(p => Number(p.id || p.productId) !== currentId) // exclude self
    .map(p => {
      let score = 0;

      // ── Category match ──
      if (p.subcategoryId && p.subcategoryId === currentSubCatId) {
        score += 50; // same subcategory = strongest signal
      } else if (p.categoryId === currentCatId) {
        score += 20; // same category = moderate signal
      }

      // ── Price similarity (within ±40%) ──
      if (currentPrice > 0) {
        const priceDiff = Math.abs(Number(p.price) - currentPrice) / currentPrice;
        if (priceDiff <= 0.15) score += 15;      // very close price
        else if (priceDiff <= 0.30) score += 10; // close price
        else if (priceDiff <= 0.40) score += 5;  // somewhat close
      }

      // ── Quality signals ──
      if (p.isBestseller) score += 10;
      if (p.rating >= 4.5) score += 8;
      else if (p.rating >= 4.0) score += 5;
      else if (p.rating >= 3.5) score += 2;

      return { ...p, _score: score };
    })
    .filter(p => p._score > 0) // must have at least some relevance
    .sort((a, b) => b._score - a._score);

  return scored.slice(0, limit);
};

// ─── Relevant Products (Behavior-Based) ───────────────────────────────────────
/**
 * Get relevant products based on user behavior:
 *  - Products from categories the user frequently views/buys
 *  - Recently viewed products (excluding current)
 *  - Products similar to what's in cart/wishlist
 *
 * Scoring weights (higher = more relevant):
 *  - Purchase history category match: 40 pts
 *  - Cart category match:             30 pts
 *  - Wishlist category match:         20 pts
 *  - View history category match:     10 pts
 *  - Recently viewed (recency bonus):  5 pts
 *  - Bestseller bonus:                 8 pts
 *  - Rating bonus:                   1-5 pts
 *
 * @param {object} currentProduct - The product being viewed
 * @param {Array}  allProducts    - All available products
 * @param {number} limit          - Max results to return
 * @returns {Array} Relevant products
 */
export const getRelevantProducts = (currentProduct, allProducts, limit = 8) => {
  if (!allProducts?.length) return [];

  const currentId = Number(currentProduct?.id || currentProduct?.productId);
  const { views, carts, purchases, wishlists } = behaviorTracker.getAllEntries();

  // Build category interest map from behavior
  const categoryInterest = {};

  const addInterest = (entries, weight) => {
    entries.forEach((entry, index) => {
      const catId = entry.categoryId;
      if (!catId) return;
      // Recency decay: more recent = higher score
      const recencyMultiplier = 1 / (1 + index * 0.1);
      categoryInterest[catId] = (categoryInterest[catId] || 0) + weight * recencyMultiplier;
    });
  };

  addInterest(purchases, 40);
  addInterest(carts,     30);
  addInterest(wishlists, 20);
  addInterest(views,     10);

  // Recently viewed product IDs for recency bonus
  const recentViewIds = new Set(views.slice(0, 10).map(e => e.productId));

  // Score all products
  const scored = allProducts
    .filter(p => Number(p.id || p.productId) !== currentId)
    .map(p => {
      let score = 0;

      // Category interest score
      const catScore = categoryInterest[p.categoryId] || 0;
      score += catScore;

      // Recency bonus: user recently viewed this product
      if (recentViewIds.has(Number(p.id || p.productId))) {
        score += 5;
      }

      // Quality signals
      if (p.isBestseller) score += 8;
      if (p.rating >= 4.5) score += 5;
      else if (p.rating >= 4.0) score += 3;
      else if (p.rating >= 3.5) score += 1;

      return { ...p, _score: score };
    })
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score);

  // If no behavior data yet, fall back to related products
  if (scored.length === 0) {
    return getRelatedProducts(currentProduct, allProducts, limit);
  }

  return scored.slice(0, limit);
};

// ─── Frequently Bought Together ───────────────────────────────────────────────
/**
 * Simulate "Frequently Bought Together" logic.
 *
 * In a real system this uses association rule mining (Apriori algorithm)
 * on order history. Here we simulate it using:
 *  - Complementary category pairs (e.g., bed → bedding, laptop → mouse)
 *  - Products in the same subcategory with high ratings
 *
 * @param {object} currentProduct
 * @param {Array}  allProducts
 * @param {number} limit
 * @returns {Array}
 */
export const getFrequentlyBoughtTogether = (currentProduct, allProducts, limit = 3) => {
  if (!currentProduct || !allProducts?.length) return [];

  const currentId    = Number(currentProduct.id || currentProduct.productId);
  const currentCatId = currentProduct.categoryId;

  // Complementary category pairs (customize for your domain)
  // Format: { sourceCategoryId: [complementaryCategoryIds] }
  const complementaryMap = {
    // Bedroom → Bedding, Lighting, Decor
    3: [5, 6],
    // Living Room → Lighting, Decor
    1: [5, 6],
    // Office → Lighting
    4: [5],
    // Dining Room → Decor
    2: [6],
  };

  const complementaryCats = complementaryMap[currentCatId] || [];

  const candidates = allProducts
    .filter(p => {
      const pid = Number(p.id || p.productId);
      if (pid === currentId) return false;
      // Prefer complementary categories, then same category
      return complementaryCats.includes(p.categoryId) || p.categoryId === currentCatId;
    })
    .map(p => ({
      ...p,
      _score:
        (complementaryCats.includes(p.categoryId) ? 20 : 5) +
        (p.isBestseller ? 10 : 0) +
        (p.rating >= 4 ? 5 : 0),
    }))
    .sort((a, b) => b._score - a._score);

  return candidates.slice(0, limit);
};

// ─── Recently Viewed ──────────────────────────────────────────────────────────
/**
 * Get recently viewed products (from behavior history)
 * @param {Array}  allProducts
 * @param {number} excludeProductId - Current product to exclude
 * @param {number} limit
 * @returns {Array}
 */
export const getRecentlyViewed = (allProducts, excludeProductId, limit = 6) => {
  const recentIds = behaviorTracker.getViewHistory(20);
  const excludeId = Number(excludeProductId);

  const result = [];
  for (const id of recentIds) {
    if (id === excludeId) continue;
    const product = allProducts.find(p => Number(p.id || p.productId) === id);
    if (product) result.push(product);
    if (result.length >= limit) break;
  }
  return result;
};
