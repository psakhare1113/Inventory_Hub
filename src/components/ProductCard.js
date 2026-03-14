import { formatPrice, wishlistManager } from '../../data.js';
import { icons } from '../utils/icons.js';

export const ProductCard = (product, state) => {
  const isWishlisted = wishlistManager.has(product.id);
  const isCompared = state.compareProducts.some(p => p.id === product.id);
  
  return `
    <div class="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300">
      <div class="relative aspect-square overflow-hidden">
        <img src="${product.imageUrl}" alt="${product.name}" 
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
             onclick="router.navigate('product', {productId: ${product.id}})">
        
        ${product.isBestseller ? '<div class="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">BESTSELLER</div>' : ''}
        
        <div class="absolute top-4 right-4 flex flex-col gap-2">
          <button onclick="toggleWishlist(${product.id})" 
                  class="h-10 w-10 rounded-full bg-white shadow-lg hover:bg-primary hover:text-white flex items-center justify-center transition-all ${isWishlisted ? 'bg-primary text-white' : 'text-gray-600'}">
            ${icons.heart(isWishlisted)}
          </button>
          <button onclick="addToCompare(${product.id})" 
                  class="h-10 w-10 rounded-full bg-white shadow-lg hover:bg-primary hover:text-white flex items-center justify-center transition-all ${isCompared ? 'bg-primary text-white' : 'text-gray-600'}">
            ${icons.scale}
          </button>
        </div>
        
        <div class="absolute bottom-0 left-0 right-0 p-4 translate-y-full opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button onclick="addToCart(${product.id})" 
                  class="w-full bg-white hover:bg-primary hover:text-white text-gray-800 font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">
            ${icons.cart} Add to Cart
          </button>
        </div>
      </div>
      
      <div class="p-5">
        <h3 class="font-semibold text-lg text-gray-800 mb-2 truncate cursor-pointer hover:text-primary transition-colors" 
            onclick="router.navigate('product', {productId: ${product.id}})">
          ${product.name}
        </h3>
        <div class="flex items-center gap-2">
          <span class="text-2xl font-bold text-gray-800">${formatPrice(product.price)}</span>
          ${product.originalPrice && product.originalPrice > product.price ? 
            `<span class="text-sm text-gray-400 line-through">${formatPrice(product.originalPrice)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
};
