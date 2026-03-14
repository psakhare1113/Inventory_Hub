import React from 'react';
import { icons } from '../utils/icons';

export const Hero = ({ onNavigate }) => (
  <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-secondary">
    <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent z-10"></div>
    <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200" alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
    
    <div className="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl">
        <h1 className="text-5xl md:text-7xl font-serif text-foreground leading-tight mb-6">
          Elevate Your <br /><span className="text-primary italic">Living Space</span>
        </h1>
        <p className="text-lg md:text-xl text-muted mb-10 leading-relaxed">
          Discover our curated collection of premium furniture. Design elements that blend timeless elegance with modern functionality.
        </p>
        <button 
          onClick={() => onNavigate('shop')}
          className="px-8 py-4 bg-primary text-white rounded-full font-medium hover:shadow-xl hover:-translate-y-1 transition-all inline-flex items-center gap-2"
        >
          Shop Collection {icons.arrowRight}
        </button>
      </div>
    </div>
  </section>
);
