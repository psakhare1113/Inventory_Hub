import React, { useState, useEffect } from 'react';
import { categoriesApi, subcategoriesApi } from '../services/apiService';
import { Footer } from '../components/Footer';

export const SubcategoryPage = ({ categoryId, onNavigate, onFilterBySubcategory }) => {
  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryId) loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, subs] = await Promise.all([
        categoriesApi.getAll(),
        subcategoriesApi.getAll()
      ]);
      const parent = cats.find(c => c.id === parseInt(categoryId));
      const filtered = subs.filter(s => s.categoryId === parseInt(categoryId));
      setCategory(parent);
      setSubcategories(filtered);
    } catch (err) {
      console.error('Error loading subcategories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryClick = (sub) => {
    if (onFilterBySubcategory) {
      onFilterBySubcategory(sub.id, parseInt(categoryId));
    } else {
      onNavigate('shop');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted mb-8">
          <span
            className="cursor-pointer hover:text-primary transition-colors"
            onClick={() => onNavigate('home')}
          >
            Home
          </span>
          <span>/</span>
          <span className="font-medium text-foreground">{category?.name || 'Category'}</span>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif mb-3">{category?.name}</h1>
          <div className="w-16 h-0.5 bg-primary mx-auto mb-4"></div>
          <p className="text-muted">{subcategories.length} subcategories</p>
        </div>

        {subcategories.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <p className="text-muted mb-4">No subcategories found</p>
            <button
              onClick={() => onNavigate('shop')}
              className="px-6 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Shop All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
            {/* Shop All card */}
            <div
              className="flex flex-col items-center group cursor-pointer"
              onClick={() => onNavigate('shop')}
            >
              <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden mb-4 p-1 border-2 border-transparent group-hover:border-primary transition-all duration-300">
                <div className="w-full h-full rounded-full overflow-hidden bg-secondary flex items-center justify-center">
                  {category?.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt="Shop All"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60"
                    />
                  ) : (
                    <span className="text-3xl">🛍️</span>
                  )}
                </div>
              </div>
              <h3 className="text-sm md:text-base font-semibold text-center group-hover:text-primary transition-colors">
                Shop All
              </h3>
              <p className="text-xs text-muted mt-1">{category?.name}</p>
            </div>

            {subcategories.map(sub => (
              <div
                key={sub.id}
                className="flex flex-col items-center group cursor-pointer"
                onClick={() => handleSubcategoryClick(sub)}
              >
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden mb-4 p-1 border-2 border-transparent group-hover:border-primary transition-all duration-300">
                  <div className="w-full h-full rounded-full overflow-hidden bg-secondary">
                    <img
                      src={sub.imageUrl || 'https://via.placeholder.com/400'}
                      alt={sub.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/400'; }}
                    />
                  </div>
                </div>
                <h3 className="text-sm md:text-base font-medium text-center group-hover:text-primary transition-colors">
                  {sub.name}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer onNavigate={onNavigate} />
    </>
  );
};
