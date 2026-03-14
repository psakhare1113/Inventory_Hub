import { icons } from '../utils/icons.js';

export const Navbar = (state) => `
  <header class="sticky top-0 z-50 w-full glass-nav border-b border-border/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-20">
        <div class="flex items-center gap-4">
          <div class="text-2xl font-serif font-bold text-primary cursor-pointer" onclick="router.navigate('home')">
            Inventory Hub
          </div>
        </div>
        
        <nav class="hidden lg:flex items-center gap-8">
          <a onclick="router.navigate('home')" class="text-sm font-medium hover:text-primary transition-colors cursor-pointer ${state.currentPage === 'home' ? 'text-primary' : ''}">Home</a>
          <a onclick="router.navigate('shop')" class="text-sm font-medium hover:text-primary transition-colors cursor-pointer ${state.currentPage === 'shop' ? 'text-primary' : ''}">Shop All</a>
        </nav>
        
        <div class="flex items-center gap-2 sm:gap-4">
          ${state.showSearch ? `
            <form onsubmit="handleSearch(event)" class="flex items-center animate-in fade-in">
              <input id="searchInput" type="text" placeholder="Search products..." 
                     class="w-[150px] sm:w-[200px] h-9 px-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" 
                     value="${state.searchQuery}" />
              <button type="button" onclick="toggleSearch()" class="p-2 hover:text-primary">${icons.close}</button>
            </form>
          ` : `
            <button onclick="toggleSearch()" class="p-2 hover:text-primary transition-colors">${icons.search}</button>
          `}
          <button onclick="toggleAuthModal()" class="hidden sm:block p-2 hover:text-primary transition-colors">${icons.user}</button>
          <button onclick="router.navigate('profile')" class="relative p-2 hover:text-primary transition-colors">
            ${icons.heart(false)}
            ${state.wishlist.length > 0 ? `<span class="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">${state.wishlist.length}</span>` : ''}
          </button>
          <button onclick="toggleCart()" class="relative p-2 hover:text-primary transition-colors">
            ${icons.cart}
            ${state.cart.length > 0 ? `<span class="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">${state.cart.reduce((acc, item) => acc + item.quantity, 0)}</span>` : ''}
          </button>
        </div>
      </div>
    </div>
  </header>
`;
