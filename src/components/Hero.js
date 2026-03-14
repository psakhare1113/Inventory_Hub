import { icons } from '../utils/icons.js';

export const Hero = () => `
  <section class="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-secondary">
    <div class="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent z-10"></div>
    <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200" alt="Hero" class="absolute inset-0 w-full h-full object-cover">
    
    <div class="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
      <div class="max-w-xl">
        <h1 class="text-5xl md:text-7xl font-serif text-foreground leading-tight mb-6">
          Elevate Your <br><span class="text-primary italic">Living Space</span>
        </h1>
        <p class="text-lg md:text-xl text-muted mb-10 leading-relaxed">
          Discover our curated collection of premium furniture. Design elements that blend timeless elegance with modern functionality.
        </p>
        <button onclick="router.navigate('shop')" class="px-8 py-4 bg-primary text-white rounded-full font-medium hover:shadow-xl hover:-translate-y-1 transition-all inline-flex items-center gap-2">
          Shop Collection ${icons.arrowRight}
        </button>
      </div>
    </div>
  </section>
`;
