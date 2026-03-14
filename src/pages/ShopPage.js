import { ProductCard } from '../components/ProductCard.js';
import { filterProducts, categories } from '../../data.js';

export const ShopPage = (state) => {
  const filteredProducts = filterProducts(state.filters);
  
  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="mb-12">
        <h1 class="text-4xl md:text-5xl font-serif mb-4">
          ${state.filters.search ? `Search: ${state.filters.search}` : 
            state.filters.categoryId ? categories.find(c => c.id === state.filters.categoryId)?.name : 'All Products'}
        </h1>
        <p class="text-muted">${filteredProducts.length} items found</p>
      </div>
      
      <div class="flex flex-col lg:flex-row gap-8">
        <aside class="w-full lg:w-64 shrink-0">
          <div class="sticky top-28 space-y-8">
            <div>
              <div class="text-sm font-semibold uppercase tracking-wider mb-4">Categories</div>
              <ul class="space-y-3">
                <li><a onclick="clearFilters()" class="text-sm hover:text-primary transition-colors cursor-pointer ${!state.filters.categoryId ? 'font-semibold text-primary' : 'text-muted'}">All Categories</a></li>
                ${categories.map(cat => `
                  <li><a onclick="filterByCategory(${cat.id})" class="text-sm hover:text-primary transition-colors cursor-pointer ${state.filters.categoryId === cat.id ? 'font-semibold text-primary' : 'text-muted'}">${cat.name}</a></li>
                `).join('')}
              </ul>
            </div>
          </div>
        </aside>
        
        <div class="flex-1">
          ${filteredProducts.length > 0 ? `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              ${filteredProducts.map(p => ProductCard(p, state)).join('')}
            </div>
          ` : `
            <div class="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-2xl bg-secondary/20">
              <h3 class="text-xl font-serif mb-2">No products found</h3>
              <p class="text-muted mb-6">Try adjusting your filters</p>
              <button onclick="clearFilters()" class="px-6 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">Clear Filters</button>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
};
