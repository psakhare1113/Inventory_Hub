import { ProductCard } from '../components/ProductCard.js';
import { products } from '../../data.js';
import { icons } from '../utils/icons.js';

export const ProfilePage = (state) => {
  const wishlistProducts = products.filter(p => state.wishlist.includes(p.id));

  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="flex flex-col md:flex-row gap-12">
        <aside class="w-full md:w-64 shrink-0">
          <div class="bg-secondary/30 rounded-2xl p-6 border border-border sticky top-28">
            <div class="flex items-center gap-4 mb-8">
              <div class="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                U
              </div>
              <div class="flex flex-col">
                <span class="font-semibold text-foreground">My Account</span>
                <span class="text-xs text-muted">user@example.com</span>
              </div>
            </div>

            <nav class="flex flex-col gap-2">
              <button onclick="setProfileTab('wishlist')" 
                      class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-primary text-white shadow-md">
                ${icons.heart(false)} Saved Wishlist
              </button>
            </nav>
          </div>
        </aside>

        <div class="flex-1 min-h-[500px]">
          <div>
            <h2 class="text-3xl font-serif mb-6">Saved Wishlist</h2>
            
            ${wishlistProducts.length > 0 ? `
              <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10">
                ${wishlistProducts.map(p => ProductCard(p, state)).join('')}
              </div>
            ` : `
              <div class="text-center py-20 bg-secondary/20 rounded-2xl border border-dashed border-border">
                <div class="text-5xl mb-4">${icons.heart(false)}</div>
                <h3 class="text-xl font-serif mb-2">Your wishlist is empty</h3>
                <p class="text-muted mb-6">Save items you love to view them later.</p>
                <button onclick="router.navigate('shop')" class="px-6 py-3 bg-primary text-white rounded-lg font-medium">Explore Products</button>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
};
