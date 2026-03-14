import { icons } from '../utils/icons.js';

export const CompareBar = (state) => {
  if (state.compareProducts.length === 0) return '';

  return `
    <div class="fixed bottom-0 left-0 w-full bg-white border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
      <div class="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4 w-full sm:w-auto overflow-x-auto">
          <div class="flex items-center text-sm font-medium text-muted mr-2 shrink-0">
            ${icons.scale} Compare (${state.compareProducts.length}/3)
          </div>
          
          <div class="flex gap-4">
            ${state.compareProducts.map(p => `
              <div class="relative flex items-center gap-3 bg-secondary p-2 rounded-lg pr-8 shrink-0 w-[200px]">
                <img src="${p.imageUrl}" alt="${p.name}" class="w-10 h-10 object-cover rounded-md">
                <span class="text-xs font-medium truncate">${p.name}</span>
                <button onclick="removeFromCompare(${p.id})" 
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-red-500 p-1">
                  ${icons.close}
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="flex gap-3 shrink-0">
          <button onclick="clearCompare()" class="px-4 py-2 border border-border rounded-lg hover:bg-secondary">Clear</button>
          <button onclick="router.navigate('compare')" 
                  class="px-6 py-2 bg-primary text-white rounded-lg font-medium ${state.compareProducts.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}" 
                  ${state.compareProducts.length < 2 ? 'disabled' : ''}>
            Compare Models
          </button>
        </div>
      </div>
    </div>
  `;
};
