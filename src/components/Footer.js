export const Footer = () => `
  <footer class="bg-secondary/50 border-t border-border mt-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div class="col-span-1 md:col-span-1">
          <div class="text-2xl font-serif font-bold text-primary mb-6">Inventory Hub</div>
          <p class="text-sm text-muted-foreground leading-relaxed">
            Curated elegance for your space. We provide premium inventory and furnishings designed to elevate your everyday living.
          </p>
        </div>
        
        <div>
          <h4 class="font-serif font-semibold text-foreground mb-4">Shop</h4>
          <ul class="space-y-3">
            <li><a onclick="router.navigate('shop')" class="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">All Products</a></li>
            <li><a onclick="filterByCategory(1)" class="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">Furniture</a></li>
            <li><a onclick="filterByCategory(2)" class="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">Lighting</a></li>
            <li><a onclick="filterByCategory(3)" class="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">Decor</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-serif font-semibold text-foreground mb-4">Support</h4>
          <ul class="space-y-3">
            <li><a href="#" class="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Us</a></li>
            <li><a href="#" class="text-sm text-muted-foreground hover:text-primary transition-colors">Shipping & Returns</a></li>
            <li><a href="#" class="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
            <li><a href="#" class="text-sm text-muted-foreground hover:text-primary transition-colors">Care Guide</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-serif font-semibold text-foreground mb-4">Newsletter</h4>
          <p class="text-sm text-muted-foreground mb-4">Subscribe for early access to new arrivals and exclusive offers.</p>
          <form class="flex" onsubmit="event.preventDefault()">
            <input 
              type="email" 
              placeholder="Email address" 
              class="flex-1 px-4 py-2 text-sm bg-background border border-border rounded-l-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-r-md hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
          </form>
        </div>
      </div>
      
      <div class="border-t border-border/60 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-sm text-muted-foreground">© ${new Date().getFullYear()} Storefront. All rights reserved.</p>
        <div class="flex gap-4">
          <a href="#" class="text-muted-foreground hover:text-primary transition-colors text-sm">Privacy Policy</a>
          <a href="#" class="text-muted-foreground hover:text-primary transition-colors text-sm">Terms of Service</a>
        </div>
      </div>
    </div>
  </footer>
`;
