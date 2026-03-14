import { formatPrice } from '../../data.js';
import { icons } from '../utils/icons.js';

export const ComparePage = (state) => {
  if (state.compareProducts.length === 0) {
    return `
      <div class="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 class="text-4xl font-serif mb-4">Compare Products</h1>
        <p class="text-muted mb-8">You haven't selected any products to compare.</p>
        <button onclick="router.navigate('shop')" class="px-6 py-3 bg-primary text-white rounded-lg font-medium">Back to Shop</button>
      </div>
    `;
  }

  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="flex justify-between items-end mb-12">
        <div>
          <h1 class="text-4xl font-serif mb-2">Compare Products</h1>
          <p class="text-muted">Detailed comparison to help you choose perfectly.</p>
        </div>
        <button onclick="clearCompare()" class="px-4 py-2 border border-border rounded-lg hover:bg-secondary">Clear All</button>
      </div>

      <div class="overflow-x-auto pb-8">
        <table class="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th class="w-1/4 p-4 border-b-2 border-border font-serif text-lg text-muted align-bottom">Features</th>
              ${state.compareProducts.map(p => `
                <th class="w-1/4 p-4 border-b-2 border-border align-bottom">
                  <div class="relative bg-secondary/50 rounded-xl p-4 flex flex-col gap-4 group">
                    <button onclick="removeFromCompare(${p.id})" 
                            class="absolute top-2 right-2 bg-white hover:bg-red-500 hover:text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                      ${icons.close}
                    </button>
                    <img src="${p.imageUrl}" alt="${p.name}" class="w-full aspect-[4/5] object-cover rounded-lg">
                    <div>
                      <h3 class="font-medium text-lg truncate">${p.name}</h3>
                      <p class="text-primary font-semibold mt-1">${formatPrice(p.price)}</p>
                    </div>
                    <button onclick="addToCart(${p.id})" class="w-full py-2 bg-primary text-white rounded-lg font-medium hover:shadow-lg transition-all">
                      ${icons.cart} Add
                    </button>
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-border/50">
            <tr>
              <td class="p-4 font-medium text-muted">Price</td>
              ${state.compareProducts.map(p => `<td class="p-4 font-semibold">${formatPrice(p.price)}</td>`).join('')}
            </tr>
            <tr>
              <td class="p-4 font-medium text-muted">Description</td>
              ${state.compareProducts.map(p => `<td class="p-4 text-sm text-muted">${p.description}</td>`).join('')}
            </tr>
            <tr>
              <td class="p-4 font-medium text-muted">Features</td>
              ${state.compareProducts.map(p => `
                <td class="p-4">
                  <ul class="text-sm space-y-1">
                    ${p.features ? p.features.map(f => `
                      <li class="flex items-start gap-1 text-muted">
                        <span class="text-primary mt-0.5">•</span> ${f}
                      </li>
                    `).join('') : '<span class="text-muted/50">N/A</span>'}
                  </ul>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
};
