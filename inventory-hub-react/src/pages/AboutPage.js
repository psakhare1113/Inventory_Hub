import React from 'react';
import { 
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaFacebookF,
  FaTwitter,
  FaInstagram
} from 'react-icons/fa';
import '../styles/AboutPage.css';

export const AboutPage = ({ onNavigate }) => {
  return (
    <div className="about-container">
      {/* Image + Text Section */}
      <section className="about-image-text">
        <div className="image-container">
          <img
            src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"
            alt="Furniture Showcase"
          />
        </div>
        <div className="text-container">
          <h2>About Us</h2>
          <p>
            At <span className="brand">Inventory Hub</span>, we are passionate about
            transforming homes with furniture that combines style, comfort, and
            functionality. Our team of experts ensures every project is handled
            with care and precision.
          </p>
          <p>
            Whether you need modern designs, classic pieces, or custom furniture solutions,
            we are committed to delivering products that exceed expectations.
          </p>
        </div>
      </section>

      {/* Cards Section */}
      <section className="about-cards">
        <div className="card">
          <h2>Our Mission</h2>
          <p>
            To make quality furniture affordable, accessible, and stress-free for
            every home.
          </p>
        </div>
        <div className="card">
          <h2>Why Choose Us?</h2>
          <p>
            Premium quality products, fast delivery, transparent pricing, and
            guaranteed customer satisfaction.
          </p>
        </div>
        <div className="card">
          <h2>Our Story</h2>
          <p>
            Started with the vision of making quality furniture accessible,
            Inventory Hub has proudly served countless families with trust and excellence.
          </p>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="about-gallery">
        <h2>Our Collection</h2>
        <div className="gallery">
          <div className="gallery-item">
            <img
              src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400"
              alt="Living Room"
            />
            <p>Elegant living room setup with modern furniture</p>
          </div>
          <div className="gallery-item">
            <img
              src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400"
              alt="Bedroom"
            />
            <p>Cozy bedroom design with premium furniture</p>
          </div>
          <div className="gallery-item">
            <img
              src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400"
              alt="Dining Area"
            />
            <p>Spacious dining area with stylish table and chairs</p>
          </div>
          <div className="gallery-item">
            <img
              src="https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400"
              alt="Office"
            />
            <p>Modern office setup with ergonomic furniture</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="feature">
          <svg className="icon" width="48" height="48" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <p><strong>High Quality</strong><br />Crafted from top materials</p>
        </div>
        <div className="feature">
          <svg className="icon" width="48" height="48" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p><strong>Warranty Protection</strong><br />Over 2 years</p>
        </div>
        <div className="feature">
          <svg className="icon" width="48" height="48" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <p><strong>Free Shipping</strong><br />Order over $150</p>
        </div>
        <div className="feature">
          <svg className="icon" width="48" height="48" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p><strong>24/7 Support</strong><br />Dedicated support</p>
        </div>
      </section>

      {/* Footer */}
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
                <li><a onClick={() => onNavigate('shop')} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">Furniture</a></li>
                <li><a onClick={() => onNavigate('shop')} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">Lighting</a></li>
                <li><a onClick={() => onNavigate('shop')} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">Decor</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-serif font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-3">
                <li><a onClick={() => onNavigate('about')} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">About Us</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Shipping & Returns</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
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
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Inventory Hub. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Privacy Policy</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
