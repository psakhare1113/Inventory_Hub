import React from 'react';

export const Footer = ({ onNavigate, onFilterByCategory }) => (
  <footer className="bg-secondary/50 border-t border-border mt-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-1">
          <div className="text-2xl font-serif font-bold text-primary mb-6">Inventory Hub</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Curated elegance for your space. We provide premium inventory and furnishings designed to elevate your everyday living.
          </p>
        </div>
        
        <div>
          <h4 className="font-serif font-semibold text-foreground mb-4">Shop</h4>
          <ul className="space-y-3">
            <li><a onClick={() => onNavigate('shop')} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">All Products</a></li>
            <li><a onClick={() => onFilterByCategory(1)} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">Furniture</a></li>
            <li><a onClick={() => onFilterByCategory(2)} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">Lighting</a></li>
            <li><a onClick={() => onFilterByCategory(3)} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">Decor</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif font-semibold text-foreground mb-4">Support</h4>
          <ul className="space-y-3">
            <li><a onClick={() => onNavigate('about')} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">About Us</a></li>
            <li><a onClick={() => onNavigate('contact')} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">Contact Us</a></li>
            <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Shipping & Returns</a></li>
            <li><a onClick={() => onNavigate('faq')} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">FAQ</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif font-semibold text-foreground mb-4">Newsletter</h4>
          <p className="text-sm text-muted-foreground mb-4">Subscribe for early access to new arrivals and exclusive offers.</p>
          <form className="flex" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Email address" 
              className="flex-1 px-4 py-2 text-sm bg-background border border-border rounded-l-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-r-md hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
          </form>
        </div>
      </div>
      
      <div className="border-t border-border/60 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Storefront. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Privacy Policy</a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Terms of Service</a>
        </div>
      </div>
    </div>
  </footer>
);
