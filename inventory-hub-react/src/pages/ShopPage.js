import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { categoriesApi, subcategoriesApi } from '../services/apiService';
import enhancedProductsService from '../services/enhancedProductsService';

export const ShopPage = ({ filters, compareProducts, wishlist, onNavigate, onAddToCart, onToggleWishlist, onAddToCompare, onFilterByCategory, onClearFilters }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localFilters, setLocalFilters] = useState({});

  // Sync external filters into local state
  useEffect(() => {
    setLocalFilters(filters || {});
  }, [filters]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadProducts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllPricing = async () => {
    try {
      const response = await fetch(
        'http://localhost:9999/api/products/pricing',
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok) {
        const list = await response.json();
        // Build a map keyed by productId for fast lookup
        return Array.isArray(list)
          ? list.reduce((map, p) => { map[p.productId] = p; return map; }, {})
          : {};
      }
    } catch (e) {}
    return {};
  };

  const loadProducts = async () => {
    const result = await enhancedProductsService.fetchAllProducts();
    if (result.success) {
      const pricingMap = await fetchAllPricing();
      const mapped = result.data.map(product => {
        const p = pricingMap[product.productId] || {};
        return {
          id: product.productId,
          name: product.name || product.productBarcode,
          price: parseFloat(p.sellingPrice) || product.price || 0,
          originalPrice: parseFloat(p.mrp) || 0,
          discount: p.discount != null ? parseFloat(p.discount) : null,
          unitSize: p.unitSize || '',
          unitLabel: p.unitLabel || '',
          imageUrl: product.productUrl || '/placeholder.jpg',
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId,
          status: product.status,
          productBarcode: product.productBarcode,
          description: product.description || '',
          rating: product.rating || 0
        };
      });
      setAllProducts(mapped);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Load categories & subcategories directly — correct endpoints
      const [cats, subs] = await Promise.all([
        categoriesApi.getAll(),
        subcategoriesApi.getAll()
      ]);
      setCategories(cats || []);
      setSubcategories(subs || []);
      await loadProducts();
    } catch (err) {
      console.error('ShopPage load error:', err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const activeFilters = { ...localFilters };

  const filterProducts = (f, products) => {
    return products.filter(product => {
      if (f.search && !product.name?.toLowerCase().includes(f.search.toLowerCase())) return false;
      if (f.subcategoryId && product.subcategoryId !== f.subcategoryId) return false;
      else if (!f.subcategoryId && f.categoryId && product.categoryId !== f.categoryId) return false;
      return true;
    });
  };

  const filteredProducts = filterProducts(activeFilters, allProducts);

  const handleSelectCategory = (catId) => setLocalFilters({ categoryId: catId });
  const handleSelectSubcategory = (subId, catId) => setLocalFilters({ categoryId: catId, subcategoryId: subId });
  const handleClearAll = () => { setLocalFilters({}); if (onClearFilters) onClearFilters(); };

  const getSubcategoriesByCategory = (categoryId) =>
    subcategories.filter(sub => sub.categoryId === categoryId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif mb-4">
          {activeFilters.search
            ? `Search: ${activeFilters.search}`
            : activeFilters.subcategoryId
            ? subcategories.find(s => s.id === activeFilters.subcategoryId)?.name
            : activeFilters.categoryId
            ? categories.find(c => c.id === activeFilters.categoryId)?.name
            : 'All Products'}
        </h1>
        <p className="text-muted text-sm">
          {loading ? 'Loading...' : `${filteredProducts.length} products found`}
          {error && <span className="ml-3 text-red-500">{error}</span>}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="sticky top-28 space-y-8">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wider mb-4">Categories</div>
              <ul className="space-y-3">
                <li>
                  <a
                    onClick={handleClearAll}
                    className={`text-sm hover:text-primary transition-colors cursor-pointer ${
                      !activeFilters.categoryId ? 'font-semibold text-primary' : 'text-muted'
                    }`}
                  >
                    All Categories
                  </a>
                </li>
                {categories.map(cat => {
                  const subs = getSubcategoriesByCategory(cat.id);
                  const isCatActive = activeFilters.categoryId === cat.id;
                  return (
                    <li key={cat.id}>
                      <a
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`text-sm hover:text-primary transition-colors cursor-pointer block ${
                          isCatActive ? 'font-semibold text-primary' : 'text-muted'
                        }`}
                      >
                        {cat.name}
                      </a>
                      {isCatActive && subs.length > 0 && (
                        <ul className="ml-4 mt-2 space-y-2">
                          <li>
                            <a
                              onClick={() => handleSelectCategory(cat.id)}
                              className={`text-xs hover:text-primary transition-colors cursor-pointer ${
                                !activeFilters.subcategoryId ? 'font-semibold text-primary' : 'text-muted'
                              }`}
                            >
                              Shop All {cat.name}
                            </a>
                          </li>
                          {subs.map(sub => (
                            <li key={sub.id}>
                              <a
                                onClick={() => handleSelectSubcategory(sub.id, cat.id)}
                                className={`text-xs hover:text-primary transition-colors cursor-pointer ${
                                  activeFilters.subcategoryId === sub.id
                                    ? 'font-semibold text-primary'
                                    : 'text-muted'
                                }`}
                              >
                                {sub.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-24 text-muted">Loading products...</div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {filteredProducts.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  wishlist={wishlist}
                  compareProducts={compareProducts}
                  onNavigate={onNavigate}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                  onAddToCompare={onAddToCompare}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-2xl bg-secondary/20">
              <h3 className="text-xl font-serif mb-2">No products found</h3>
              <p className="text-muted mb-6">Try adjusting your filters</p>
              <button
                onClick={handleClearAll}
                className="px-6 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
