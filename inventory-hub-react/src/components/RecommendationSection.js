import React, { useState, useEffect } from 'react';
import { recommendationService } from '../services/recommendationService';
import { formatPrice } from '../data';

const RecommendationSection = ({ userId, currentProduct, onNavigateToProduct, onAddToCart }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [userId, currentProduct]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      let recs = [];
      
      if (userId) {
        // Get personalized recommendations for logged-in user
        recs = await recommendationService.getUserRecommendations(userId, 8);
      } else if (currentProduct) {
        // Get similar products for guest users
        recs = await recommendationService.getGuestRecommendations(
          currentProduct.productId || currentProduct.id,
          currentProduct.categoryId,
          currentProduct.subcategoryId,
          8
        );
      }
      
      setRecommendations(recs);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-serif mb-8">
            {userId ? 'Recommended for You' : 'You Might Also Like'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-serif">
            {userId ? '🎯 Recommended for You' : '💡 You Might Also Like'}
          </h2>
          <span className="text-sm text-gray-500">
            Based on {userId ? 'your browsing history' : 'similar products'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {recommendations.map((product) => (
            <div
              key={product.productId || product.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => onNavigateToProduct && onNavigateToProduct(product.productId || product.id)}
            >
              <div className="aspect-square overflow-hidden rounded-t-lg">
                <img
                  src={product.imageUrl || product.productUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              <div className="p-4">
                <h3 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary">
                    {formatPrice(product.price)}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart && onAddToCart(product.productId || product.id);
                    }}
                    className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecommendationSection;