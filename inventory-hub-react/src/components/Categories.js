import React, { useState, useEffect } from 'react';
import { categoriesApi } from '../services/apiService';
import { useNavigate } from 'react-router-dom';

export const Categories = ({ onFilterByCategory }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (cat) => {
    navigate(`/category/${cat.id}`);
  };

  if (loading) {
    return (
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center">
          <p>Loading categories...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-serif mb-4">Shop by Category</h2>
        <div className="w-16 h-0.5 bg-primary mx-auto"></div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
        {categories.map(cat => (
          <div key={cat.id} className="flex flex-col items-center group cursor-pointer" onClick={() => handleClick(cat)}>
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden mb-4 p-1 border-2 border-transparent group-hover:border-primary transition-all duration-300">
              <div className="w-full h-full rounded-full overflow-hidden bg-secondary">
                <img 
                  src={cat.imageUrl || 'https://via.placeholder.com/400'} 
                  alt={cat.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
              </div>
            </div>
            <h3 className="text-sm md:text-base font-medium text-center group-hover:text-primary transition-colors">{cat.name}</h3>
          </div>
        ))}
      </div>
    </section>
  );
};
