import { formatPrice, wishlistManager } from '../../data.js';
import { icons } from '../utils/icons.js';

export const ProductDetailsPage = (state) => {
  if (!state.currentProduct) return '<div class="container py-12"><p>Product not found</p></div>';
  
  const product = state.currentProduct;
  const isWishlisted = wishlistManager.has(product.id);
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  
  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
        <div class="space-y-6">
          <div class="aspect-square overflow-hidden rounded-2xl bg-secondary sticky top-28">
            <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-full object-cover object-center">
          </div>
        </div>
        
        <div class="flex flex-col">
          ${product.isBestseller ? '<div class="mb-2 text-sm text-primary font-medium tracking-wider uppercase">Bestseller</div>' : ''}
          <h1 class="text-3xl md:text-5xl font-serif text-foreground mb-4">${product.name}</h1>
          
          <div class="flex items-center gap-4 mb-6">
            <span class="text-2xl font-semibold text-primary">${formatPrice(product.price)}</span>
            ${product.originalPrice && product.originalPrice > product.price ? `
              <span class="text-xl text-muted line-through">${formatPrice(product.originalPrice)}</span>
              <span class="bg-red-100 text-red-600 text-sm font-semibold px-2 py-1 rounded-md">Save ${discount}%</span>
            ` : ''}
          </div>
          
          <p class="text-base text-muted leading-relaxed mb-8">${product.description}</p>
          
          <div class="border-t border-border mb-8"></div>
          
          <div class="flex flex-col gap-4 mb-10">
            <div class="flex items-center gap-4">
              <div class="flex items-center border border-border rounded-md h-12">
                <button class="px-4 h-full hover:bg-secondary transition-colors" onclick="updateProductQuantity(-1)">−</button>
                <span class="w-8 text-center font-medium" id="productQuantity">1</span>
                <button class="px-4 h-full hover:bg-secondary transition-colors" onclick="updateProductQuantity(1)">+</button>
              </div>
              <button onclick="addToCartWithQuantity(${product.id})" 
                      class="flex-1 h-12 bg-primary text-white rounded-lg font-medium hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Add to Cart
              </button>
            </div>
            
            <div class="flex gap-4">
              <button onclick="toggleWishlist(${product.id})" 
                      class="flex-1 h-12 border border-border rounded-lg hover:bg-secondary transition-colors ${isWishlisted ? 'border-primary text-primary bg-primary/5' : ''}">
                ${icons.heart(isWishlisted)} ${isWishlisted ? 'Saved' : 'Save to Wishlist'}
              </button>
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-6 py-6 border-t border-b border-border">
            <div class="flex flex-col items-center text-center gap-2">
              <span class="text-2xl">${icons.shield}</span>
              <span class="text-sm font-medium">10 Year Warranty</span>
            </div>
            <div class="flex flex-col items-center text-center gap-2">
              <span class="text-2xl">${icons.truck}</span>
              <span class="text-sm font-medium">Free Delivery</span>
            </div>
            <div class="flex flex-col items-center text-center gap-2">
              <span class="text-2xl">${icons.rotate}</span>
              <span class="text-sm font-medium">30-day Returns</span>
            </div>
          </div>
          
          ${product.features && product.features.length > 0 ? `
            <div class="mt-8">
              <h3 class="text-lg font-serif mb-4">Specifications & Features</h3>
              <ul class="space-y-2">
                ${product.features.map(feature => `
                  <li class="flex items-start gap-2 text-sm text-muted">
                    <span class="block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                    ${feature}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
};
