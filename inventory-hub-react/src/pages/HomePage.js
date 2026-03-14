import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { Categories } from '../components/Categories';
import { ProductCard } from '../components/ProductCard';
import { Footer } from '../components/Footer';
import { filterProducts, getAllProducts } from '../data';

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

export const HomePage = ({ compareProducts, onNavigate, onAddToCart, onToggleWishlist, onAddToCompare, onFilterByCategory }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const products = await getAllProducts();
      setAllProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
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

  const bestsellers = allProducts.slice(0, 4); // Show first 4 products as bestsellers

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
          ) : bestsellers.length > 0 ? (
            bestsellers.map(p => (
              <ProductCard 
                key={p.id}
                product={p}
                compareProducts={compareProducts}
                onNavigate={onNavigate}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
                onAddToCompare={onAddToCompare}
              />
            ))
          ) : (
            <div className="col-span-4 text-center py-12 text-muted">No bestsellers available</div>
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

      <Footer onNavigate={onNavigate} onFilterByCategory={onFilterByCategory} />
    </>
  );
};
