import React, { useState, useEffect } from 'react';
import { formatPrice } from '../data';
import { icons } from '../utils/icons';

export const ProductDetailsPage = ({ product, wishlist, onAddToCart, onToggleWishlist }) => {
  const [quantity, setQuantity] = useState(1);
  const [attributes, setAttributes] = useState([]);
  
  useEffect(() => {
    if (product?.productId) {
      fetchAttributes();
    }
  }, [product]);
  
  const fetchAttributes = async () => {
    try {
      const response = await fetch(`http://localhost:9999/api/product-attributes/product/${product.productId}`);
      if (response.ok) {
        const data = await response.json();
        setAttributes(data);
      }
    } catch (error) {
      console.error('Error fetching attributes:', error);
    }
  };
  
  if (!product) return <div className="container py-12"><p>Product not found</p></div>;
  
  const isWishlisted = wishlist.includes(product.productId || product.id);
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  
  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      onAddToCart(product.productId || product.id);
    }
    setQuantity(1);
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
        <div className="space-y-6">
          <div className="aspect-square overflow-hidden rounded-2xl bg-secondary sticky top-28">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover object-center" />
          </div>
        </div>
        
        <div className="flex flex-col">
          {product.isBestseller && (
            <div className="mb-2 text-sm text-primary font-medium tracking-wider uppercase">Bestseller</div>
          )}
          <h1 className="text-3xl md:text-5xl font-serif text-foreground mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-2xl font-semibold text-primary">{formatPrice(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <>
                <span className="text-xl text-muted line-through">{formatPrice(product.originalPrice)}</span>
                <span className="bg-red-100 text-red-600 text-sm font-semibold px-2 py-1 rounded-md">Save {discount}%</span>
              </>
            )}
          </div>
          
          <div className="mb-8">
            {product.description ? (
              <p className="text-base text-muted leading-relaxed">{product.description}</p>
            ) : (
              <p className="text-base text-gray-400 italic">No description available for this product.</p>
            )}
          </div>
          
          <div className="border-t border-border mb-8"></div>
          
          <div className="flex flex-col gap-4 mb-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-border rounded-md h-12">
                <button className="px-4 h-full hover:bg-secondary transition-colors" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button className="px-4 h-full hover:bg-secondary transition-colors" onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
              <button onClick={handleAddToCart} className="flex-1 h-12 bg-primary text-white rounded-lg font-medium hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Add to Cart
              </button>
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => onToggleWishlist(product.productId || product.id)} className={`flex-1 h-12 border border-border rounded-lg hover:bg-secondary transition-colors ${isWishlisted ? 'border-primary text-primary bg-primary/5' : ''}`}>
                {isWishlisted ? '♥ Saved' : '♡ Save to Wishlist'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 py-6 border-t border-b border-border">
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-2xl">🛡️</span>
              <span className="text-sm font-medium">10 Year Warranty</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-2xl">🚚</span>
              <span className="text-sm font-medium">Free Delivery</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-2xl">🔄</span>
              <span className="text-sm font-medium">30-day Returns</span>
            </div>
          </div>
          
          {attributes && attributes.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-lg font-serif mb-4">Key Features & Specifications</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <ul className="space-y-3">
                  {attributes.map((attribute, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <span className="block w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></span>
                      <span className="text-gray-700 leading-relaxed">
                        <strong>{attribute.attributeName}:</strong> {attribute.attributeValue}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <h3 className="text-lg font-serif mb-4">Key Features & Specifications</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-500 italic text-sm">
                  No features added yet. Add attributes through the admin panel to see them here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
