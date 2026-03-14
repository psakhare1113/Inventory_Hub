import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { categoriesApi, subcategoriesApi } from '../services/apiService';
import { imsService } from '../services/imsApi';

export const ShopPage = ({ filters, compareProducts, onNavigate, onAddToCart, onToggleWishlist, onAddToCompare, onFilterByCategory, onClearFilters }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cats, subs, products, pricing] = await Promise.all([
        categoriesApi.getAll(),
        subcategoriesApi.getAll(),
        imsService.products.getAllProducts(),
        imsService.pricing.getAllPricing()
      ]);
      
      // Create a pricing map for quick lookup
      const pricingMap = pricing.reduce((map, p) => {
        map[p.productId] = p;
        return map;
      }, {});
      
      // Merge products with their pricing
      const productsWithPricing = products.map(product => {
        const productPricing = pricingMap[product.productId] || {};
        return {
          id: product.productId,
          name: product.name || product.productBarcode,
          price: productPricing.sellingPrice || 0,
          originalPrice: productPricing.mrp || 0,
          unitSize: productPricing.unitSize || '',
          unitLabel: productPricing.unitLabel || '',
          imageUrl: product.productUrl || '/placeholder.jpg',
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId,
          status: product.status,
          productBarcode: product.productBarcode
        };
      });
      
      setCategories(cats);
      setSubcategories(subs);
      setAllProducts(productsWithPricing);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = (filters, products) => {
    return products.filter(product => {
      if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.categoryId && product.categoryId !== filters.categoryId) {
        return false;
      }
      return true;
    });
  };

  const filteredProducts = filterProducts(filters, allProducts);

  const getSubcategoriesByCategory = (categoryId) => {
    return subcategories.filter(sub => sub.categoryId === categoryId);
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif mb-4">
          {filters.search ? `Search: ${filters.search}` : 
            filters.categoryId ? categories.find(c => c.id === filters.categoryId)?.name : 'All Products'}
        </h1>
        <p className="text-muted">{loading ? 'Loading...' : `${filteredProducts.length} items found`}</p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 shrink-0">
          <div className="sticky top-28 space-y-8">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wider mb-4">Categories</div>
              <ul className="space-y-3">
                <li>
                  <a 
                    onClick={onClearFilters}
                    className={`text-sm hover:text-primary transition-colors cursor-pointer ${!filters.categoryId ? 'font-semibold text-primary' : 'text-muted'}`}
                  >
                    All Categories
                  </a>
                </li>
                {categories.map(cat => {
                  const subs = getSubcategoriesByCategory(cat.id);
                  return (
                    <li key={cat.id}>
                      <a 
                        onClick={() => onFilterByCategory(cat.id)}
                        className={`text-sm hover:text-primary transition-colors cursor-pointer block ${filters.categoryId === cat.id ? 'font-semibold text-primary' : 'text-muted'}`}
                      >
                        {cat.name}
                      </a>
                      {subs.length > 0 && (
                        <ul className="ml-4 mt-2 space-y-2">
                          {subs.map(sub => (
                            <li key={sub.id}>
                              <a 
                                onClick={() => onFilterByCategory(cat.id)}
                                className="text-xs text-muted hover:text-primary transition-colors cursor-pointer"
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
        
        <div className="flex-1">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {filteredProducts.map(p => (
                <ProductCard 
                  key={p.id}
                  product={p}
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
                onClick={onClearFilters}
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
