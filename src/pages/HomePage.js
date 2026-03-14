import { Hero } from '../components/Hero.js';
import { Categories } from '../components/Categories.js';
import { ProductCard } from '../components/ProductCard.js';
import { Footer } from '../components/Footer.js';
import { filterProducts } from '../../data.js';

let currentSlide = 0;
const slides = [
  { img: './src/images/ho.jpg', title: 'Modern Living' },
  { img: './src/images/mo.webp', title: 'Elegant Spaces' },
  { img: './src/images/kitchen.png', title: 'Cozy Interiors' }
];

window.nextSlide = () => {
  currentSlide = (currentSlide + 1) % slides.length;
  document.querySelectorAll('.carousel-slide').forEach((slide, i) => {
    slide.classList.toggle('active', i === currentSlide);
  });
};

window.prevSlide = () => {
  currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  document.querySelectorAll('.carousel-slide').forEach((slide, i) => {
    slide.classList.toggle('active', i === currentSlide);
  });
};

const galleryImages = [
  './src/images/bed1.png', './src/images/bed2.png', './src/images/bed3.png',
  './src/images/bedroom.png', './src/images/diningroom.png', './src/images/livingroom.png',
  './src/images/studyroom.png', './src/images/office.webp', './src/images/Aboutus2.jpg',
  './src/images/AbouUS2.jpg', './src/images/Aboutus4.jpg', './src/images/AboutUs1.jpg'
];

export const HomePage = (state) => `
  ${Hero()}
  ${Categories()}
  
  <section class="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
    <div class="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
      <div>
        <h2 class="text-3xl md:text-4xl font-serif mb-4">Our Bestsellers</h2>
        <div class="w-16 h-0.5 bg-primary"></div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      ${filterProducts({ isBestseller: true }).slice(0, 4).map(p => ProductCard(p, state)).join('')}
    </div>
  </section>
  
  <section class="py-24 bg-secondary/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
        <div>
          <h2 class="text-3xl md:text-4xl font-serif mb-4">Shop by Room</h2>
          <p class="text-muted max-w-lg">Find the perfect pieces tailored to specific spaces in your home.</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        ${['Living', 'Bedroom', 'Dining'].map((room, i) => `
          <div class="group cursor-pointer" onclick="filterByCategory(${i + 1})">
            <div class="aspect-[3/4] overflow-hidden arch-image mb-6 relative">
              <div class="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10"></div>
              <img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600" alt="${room}" 
                   class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
            </div>
            <h3 class="text-xl font-serif text-center group-hover:text-primary transition-colors">${room} Room</h3>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <section class="py-16 bg-gradient-to-br from-secondary/50 to-primary/10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 class="text-3xl md:text-4xl font-serif mb-12 text-center">Featured Collections</h2>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="carousel-container relative rounded-2xl overflow-hidden shadow-2xl h-96">
            <div class="carousel-inner relative h-full">
              ${slides.map((slide, i) => `
                <div class="carousel-slide ${i === 0 ? 'active' : ''} absolute inset-0 transition-opacity duration-500">
                  <img src="${slide.img}" class="w-full h-full object-cover" alt="${slide.title}">
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                    <h3 class="text-white text-2xl font-serif">${slide.title}</h3>
                  </div>
                </div>
              `).join('')}
            </div>
            <button onclick="prevSlide()" class="carousel-control-prev absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all z-10">
              <span class="text-2xl text-foreground">‹</span>
            </button>
            <button onclick="nextSlide()" class="carousel-control-next absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all z-10">
              <span class="text-2xl text-foreground">›</span>
            </button>
          </div>
          <div class="text-center mt-6">
            <button onclick="router.navigate('shop')" class="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold transition-all">Explore More</button>
          </div>
        </div>
        <div class="flex flex-col gap-6">
          <div class="video-box rounded-2xl overflow-hidden shadow-xl h-44">
            <video class="w-full h-full object-cover" autoplay muted loop playsinline>
              <source src="./src/images/video1.mp4" type="video/mp4">
            </video>
          </div>
          <div class="video-box rounded-2xl overflow-hidden shadow-xl h-44">
            <video class="w-full h-full object-cover" autoplay muted loop playsinline>
              <source src="./src/images/video2.mp4" type="video/mp4">
            </video>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="py-16 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 class="text-3xl md:text-4xl font-serif mb-12 text-center">Inspiration Gallery</h2>
      <div class="gallery-grid">
        ${galleryImages.map((img, i) => `
          <div class="gallery-item gallery-item-${i + 1} group cursor-pointer overflow-hidden rounded-xl">
            <img src="${img}" 
                 class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                 alt="Gallery ${i + 1}">
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  ${Footer()}
`;
