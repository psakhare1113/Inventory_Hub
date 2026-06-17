import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { Categories } from '../components/Categories';
import { ProductCard } from '../components/ProductCard';
import { Footer } from '../components/Footer';
import RecommendationSection from '../components/RecommendationSection';
import { filterProducts, getAllProducts } from '../data';
import enhancedProductsService from '../services/enhancedProductsService';
import { useVisitTracker } from '../hooks/useVisitTracker';

const slides = [
  { img: '/images/ho.jpg', title: 'Modern Living' },
  { img: '/images/mo.webp', title: 'Elegant Spaces' },
  { img: '/images/kitchen.png', title: 'Cozy Interiors' }
];

const galleryImages = [
  '/images/bed1.png', '/images/bed2.png', '/images/bed3.png',
  '/images/bedroom.png', '/images/diningroom.png', '/images/livingroom.png',
  '/images/studyroom.png', '/images/office.webp', '/images/Aboutus2.jpg',
  '/images/AbouUS2.jpg', '/images/Aboutus4.jpg', '/images/AboutUs1.jpg'
];

export const HomePage = ({ compareProducts, wishlist, onNavigate, onAddToCart, onToggleWishlist, onAddToCompare, onFilterByCategory, isAuthenticated, onRequireAuth }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('unknown');
  const { getCurrentUserId } = useVisitTracker();

  useEffect(() => {
    loadProducts();
  }, []);

  const fetchAllPricing = async () => {
    try {
      const response = await fetch(
        'http://localhost:9999/api/products/pricing',
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok) {
        const list = await response.json();
        return Array.isArray(list)
          ? list.reduce((map, p) => { map[p.productId] = p; return map; }, {})
          : {};
      }
    } catch (e) {}
    return {};
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      const result = await enhancedProductsService.fetchAllProducts();
      
      if (result.success) {
        const pricingMap = await fetchAllPricing();

        // Fetch attributes for all products in parallel (for isBestseller / freeShipping)
        const attrResults = await Promise.allSettled(
          result.data.map(p =>
            fetch(`http://localhost:9999/api/product-attributes/product/${p.productId}`)
              .then(r => r.ok ? r.json() : [])
              .catch(() => [])
          )
        );

        const transformedProducts = result.data.map((product, idx) => {
          const p = pricingMap[product.productId] || {};
          const attrs = attrResults[idx].status === 'fulfilled' ? (attrResults[idx].value || []) : [];
          const isBestseller = attrs.find(a => a.attributeName === 'isBestseller')?.attributeValue === 'true';
          const freeShipping = attrs.find(a => a.attributeName === 'freeShipping')?.attributeValue === 'true';
          return {
            id: product.productId,
            name: product.name || product.productBarcode,
            price: parseFloat(p.sellingPrice) || product.price || 0,
            originalPrice: parseFloat(p.mrp) || 0,
            discount: p.discount != null ? parseFloat(p.discount) : null,
            imageUrl: product.productUrl || '/placeholder.jpg',
            categoryId: product.categoryId,
            subcategoryId: product.subcategoryId,
            status: product.status,
            rating: product.rating || 0,
            isBestseller,
            freeShipping,
          };
        });
        
        setAllProducts(transformedProducts);
        setDataSource(result.source);
      } else {
        setAllProducts([]);
      }
      
    } catch (error) {
      console.error('❌ HomePage: Exception during load:', error);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Show products marked as bestseller; fallback to first 4 if none tagged yet
  const bestsellers = allProducts.filter(p => p.isBestseller).slice(0, 8);
  const displayBestsellers = bestsellers.length > 0 ? bestsellers : allProducts.slice(0, 4);

  return (
    <>
      <Hero onNavigate={onNavigate} />
      <Categories onFilterByCategory={onFilterByCategory} />
      
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif mb-4">Our Bestsellers</h2>
            <div className="w-16 h-0.5 bg-primary"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {loading ? (
            <div className="col-span-4 text-center py-12">Loading products...</div>
          ) : displayBestsellers.length > 0 ? (
            displayBestsellers.map(p => (
              <ProductCard 
                key={p.id}
                product={p}
                wishlist={wishlist}
                compareProducts={compareProducts}
                onNavigate={onNavigate}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
                onAddToCompare={onAddToCompare}
              />
            ))
          ) : (
            <div className="col-span-4 text-center py-12">
              <div className="text-muted mb-4">No bestsellers available</div>
              <button 
                onClick={loadProducts}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                🔄 Retry Loading
              </button>
            </div>
          )}
        </div>
      </section>
      
      <section className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif mb-4">Shop by Room</h2>
              <p className="text-muted max-w-lg">Find the perfect pieces tailored to specific spaces in your home.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['Living', 'Bedroom', 'Dining'].map((room, i) => (
              <div key={room} className="group cursor-pointer" onClick={() => onFilterByCategory(i + 1)}>
                <div className="aspect-[3/4] overflow-hidden arch-image mb-6 relative">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10"></div>
                  <img 
                    src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600" 
                    alt={room}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <h3 className="text-xl font-serif text-center group-hover:text-primary transition-colors">{room} Room</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-secondary/50 to-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-serif mb-12 text-center">Featured Collections</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="carousel-container relative rounded-2xl overflow-hidden shadow-2xl h-96">
                <div className="carousel-inner relative h-full">
                  {slides.map((slide, i) => (
                    <div 
                      key={i}
                      className={`carousel-slide ${i === currentSlide ? 'active' : ''} absolute inset-0 transition-opacity duration-500`}
                    >
                      <img src={slide.img} className="w-full h-full object-cover" alt={slide.title} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                        <h3 className="text-white text-2xl font-serif">{slide.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={prevSlide}
                  className="carousel-control-prev absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all z-10"
                >
                  <span className="text-2xl text-foreground">‹</span>
                </button>
                <button 
                  onClick={nextSlide}
                  className="carousel-control-next absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all z-10"
                >
                  <span className="text-2xl text-foreground">›</span>
                </button>
              </div>
              <div className="text-center mt-6">
                <button 
                  onClick={() => onNavigate('shop')}
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold transition-all"
                >
                  Explore More
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="video-box rounded-2xl overflow-hidden shadow-xl h-44">
                <video className="w-full h-full object-cover" autoPlay muted loop playsInline>
                  <source src="/images/video1.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="video-box rounded-2xl overflow-hidden shadow-xl h-44">
                <video className="w-full h-full object-cover" autoPlay muted loop playsInline>
                  <source src="/images/video2.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-serif mb-12 text-center">Inspiration Gallery</h2>
          <div className="gallery-grid">
            {galleryImages.map((img, i) => (
              <div key={i} className={`gallery-item gallery-item-${i + 1} group cursor-pointer overflow-hidden rounded-xl`}>
                <img 
                  src={img}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  alt={`Gallery ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Amazon-style: Personalized Recommendations / Sign-in CTA ── */}
      {!isAuthenticated ? (
        /* Guest: "See personalized recommendations" banner */
        <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50 border-t border-amber-100">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <div className="mb-4 text-5xl">🛍️</div>
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-gray-800 mb-3">
              See personalized recommendations
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Sign in to discover products tailored to your taste, track your orders, and save your favourites.
            </p>
            <button
              onClick={() => onRequireAuth && onRequireAuth({ message: 'Sign in to see your personalized recommendations.' })}
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold px-8 py-3 rounded-full shadow-md hover:shadow-lg transition-all text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Sign in
            </button>
            <p className="mt-3 text-xs text-gray-400">
              New customer?{' '}
              <button
                onClick={() => onRequireAuth && onRequireAuth({ message: 'Create an account to get started.' })}
                className="text-primary font-semibold hover:underline"
              >
                Start here
              </button>
            </p>
          </div>
        </section>
      ) : (
        /* Logged-in: personalized "Recommended for You" strip */
        <RecommendationSection
          userId={getCurrentUserId()}
          currentProduct={null}
          onNavigateToProduct={onNavigate}
          onAddToCart={onAddToCart}
        />
      )}

      <Footer onNavigate={onNavigate} onFilterByCategory={onFilterByCategory} />
    </>
  );
};
