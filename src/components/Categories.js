import { categories } from '../../data.js';

export const Categories = () => `
  <section class="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
    <div class="text-center mb-16">
      <h2 class="text-3xl md:text-4xl font-serif mb-4">Shop by Category</h2>
      <div class="w-16 h-0.5 bg-primary mx-auto"></div>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
      ${categories.map(cat => `
        <div class="flex flex-col items-center group cursor-pointer" onclick="filterByCategory(${cat.id})">
          <div class="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden mb-4 p-1 border-2 border-transparent group-hover:border-primary transition-all duration-300">
            <div class="w-full h-full rounded-full overflow-hidden bg-secondary">
              <img src="${cat.imageUrl}" alt="${cat.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
            </div>
          </div>
          <h3 class="text-sm md:text-base font-medium text-center group-hover:text-primary transition-colors">${cat.name}</h3>
        </div>
      `).join('')}
    </div>
  </section>
`;
