import { imsService } from './services/imsApi';

// Static data
export const categories = [
  { id: 1, name: "Living Room", slug: "living-room", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400" },
  { id: 2, name: "Dining Room", slug: "dining-room", imageUrl: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400" },
  { id: 3, name: "Bedroom", slug: "bedroom", imageUrl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400" },
  { id: 4, name: "Office", slug: "office", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400" },
  { id: 5, name: "Lighting", slug: "lighting", imageUrl: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400" },
  { id: 6, name: "Decor", slug: "decor", imageUrl: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400" }
];

// Transform backend product to frontend format
export const transformProduct = (backendProduct, attributes = [], pricing = null) => {
  return {
    id: backendProduct.productId,
    categoryId: backendProduct.categoryId,
    subcategoryId: backendProduct.subcategoryId,
    name: backendProduct.name || `Product ${backendProduct.productId}`,
    description: backendProduct.description || '',
    price: pricing?.sellingPrice || (backendProduct.price || 0),
    originalPrice: pricing?.mrp || null,
    imageUrl: backendProduct.productUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
    isBestseller: attributes.find(a => a.attributeName === 'isBestseller')?.attributeValue === 'true',
    freeShipping: attributes.find(a => a.attributeName === 'freeShipping')?.attributeValue === 'true',
    features: attributes, // Pass attributes directly from backend
    status: backendProduct.status,
    rating: backendProduct.rating || 0,
    barcode: backendProduct.productBarcode
  };
};

// Fetch products from backend
let cachedProducts = null;
let cachedPricing = null;
let cachedAttributes = {};

// Clear product/pricing cache so next fetch gets fresh data from backend
export const clearProductCache = () => {
  cachedProducts = null;
  cachedPricing = null;
};

// Auto-clear cache whenever pricing is updated or deleted
if (typeof window !== 'undefined') {
  window.addEventListener('pricingUpdated', () => {
    cachedProducts = null;
    cachedPricing = null;
  });
}

export const fetchBackendProducts = async () => {
  try {
    const [backendProducts, pricingData] = await Promise.all([
      imsService.products.getAllProducts(),
      imsService.pricing.getAllPricing()
    ]);

    // Fetch attributes for all products
    const attributesPromises = backendProducts.map(p => 
      imsService.products.getProductAttributes(p.productId)
        .then(attrs => ({ productId: p.productId, attributes: attrs }))
        .catch(() => ({ productId: p.productId, attributes: [] }))
    );
    const attributesResults = await Promise.all(attributesPromises);
    
    const attributesMap = {};
    attributesResults.forEach(result => {
      attributesMap[result.productId] = result.attributes;
    });

    cachedProducts = backendProducts;
    cachedPricing = pricingData;
    cachedAttributes = attributesMap;

    return backendProducts.map(p => {
      const pricing = pricingData.find(pr => pr.productId === p.productId);
      const attributes = attributesMap[p.productId] || [];
      return transformProduct(p, attributes, pricing);
    });
  } catch (error) {
    console.error('Error fetching backend products:', error);
    return []; // Return empty array instead of static fallback
  }
};

// Get all products (backend only)
export const getAllProducts = async () => {
  return await fetchBackendProducts();
};

// Get single product by ID
export const getProductById = async (productId) => {
  try {
    const [product, pricingData] = await Promise.all([
      imsService.products.getProductById(productId),
      imsService.pricing.getAllPricing()
    ]);
    
    if (!product) return null;
    
    const pricing = pricingData.find(pr => pr.productId === product.productId);
    const attributes = await imsService.products.getProductAttributes(product.productId).catch(() => []);
    
    return transformProduct(product, attributes, pricing);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return null;
  }
};

// LocalStorage management — per-customer keys so each user has their own cart/wishlist
const getCustomerId = () => localStorage.getItem('customerId') || 'guest';
const CART_KEY = () => `inventory_cart_${getCustomerId()}`;
const WISHLIST_KEY = () => `inventory_wishlist_${getCustomerId()}`;

export const cartManager = {
  get: () => JSON.parse(localStorage.getItem(CART_KEY()) || '[]'),
  add: (productId, quantity = 1) => {
    const id = Number(productId);
    const cart = cartManager.get();
    const existing = cart.find(item => Number(item.productId) === id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ id: Date.now(), productId: id, quantity });
    }
    localStorage.setItem(CART_KEY(), JSON.stringify(cart));
    return cart;
  },
  update: (id, quantity) => {
    const cart = cartManager.get();
    const item = cart.find(item => item.id === id);
    if (item) item.quantity = quantity;
    localStorage.setItem(CART_KEY(), JSON.stringify(cart));
    return cart;
  },
  remove: (id) => {
    const cart = cartManager.get().filter(item => item.id !== id);
    localStorage.setItem(CART_KEY(), JSON.stringify(cart));
    return cart;
  },
  clear: () => {
    localStorage.setItem(CART_KEY(), '[]');
    return [];
  },
  getWithProducts: async () => {
    const cart = cartManager.get();
    if (cart.length === 0) return [];
    const allProducts = await getAllProducts();
    return cart.map(item => {
      const product = allProducts.find(p => Number(p.id) === Number(item.productId));
      console.log(`Cart item productId=${item.productId} mapped to product:`, product?.name);
      return { ...item, product };
    }).filter(item => item.product);
  }
};

export const wishlistManager = {
  get: () => JSON.parse(localStorage.getItem(WISHLIST_KEY()) || '[]').map(Number),
  add: (productId) => {
    const id = Number(productId);
    const wishlist = wishlistManager.get();
    if (!wishlist.includes(id)) {
      wishlist.push(id);
    }
    localStorage.setItem(WISHLIST_KEY(), JSON.stringify(wishlist));
    return wishlist;
  },
  remove: (productId) => {
    const id = Number(productId);
    const wishlist = wishlistManager.get().filter(wid => wid !== id);
    localStorage.setItem(WISHLIST_KEY(), JSON.stringify(wishlist));
    return wishlist;
  },
  toggle: (productId) => {
    const id = Number(productId);
    const wishlist = wishlistManager.get();
    if (wishlist.includes(id)) {
      return wishlistManager.remove(id);
    } else {
      return wishlistManager.add(id);
    }
  },
  has: (productId) => wishlistManager.get().includes(Number(productId))
};

export const filterProducts = (filters = {}, allProducts = []) => {
  let filtered = [...allProducts];
  if (filters.categoryId) {
    filtered = filtered.filter(p => p.categoryId === filters.categoryId);
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(search) || 
      p.description.toLowerCase().includes(search)
    );
  }
  if (filters.isBestseller) {
    filtered = filtered.filter(p => p.isBestseller);
  }
  return filtered;
};

export const getProduct = async (id) => {
  return await getProductById(id);
};
export const formatPrice = (price) => {
  const num = parseFloat(price);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toFixed(2)}`;
};
