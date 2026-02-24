import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";

import roomsImg from "@assets/image_1771913541445.png";
import catImg from "@assets/image_1771913536900.png";
import bestsellersImg from "@assets/image_1771913545767.png";

// Static categories matching the design intent
const CATEGORIES = [
  { id: 1, name: "Living Room", slug: "living-room", image: catImg },
  { id: 2, name: "Dining Room", slug: "dining-room", image: catImg },
  { id: 3, name: "Bedroom", slug: "bedroom", image: catImg },
  { id: 4, name: "Office", slug: "office", image: catImg },
  { id: 5, name: "Lighting", slug: "lighting", image: catImg },
  { id: 6, name: "Decor", slug: "decor", image: catImg },
];

export default function Home() {
  const { data: bestsellers, isLoading } = useProducts({ isBestseller: true });

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-secondary">
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent z-10" />
        {/* Placeholder for actual hero image if we had one, using a generic elegant placeholder from unsplash */}
        <img 
          src="https://pixabay.com/get/g922c4f344be6787078a38e6737ca2ebbf047b11a67ff649883d010c60905921c65ecafe192f6bb2ce664e36bf3e951ced5769e677e11c4d1ff8577f5b3ddf2fd_1280.jpg" 
          alt="Elegant interior" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        <div className="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-xl"
          >
            <h1 className="text-5xl md:text-7xl font-serif text-foreground leading-[1.1] mb-6">
              Elevate Your <br/><span className="text-primary italic">Living Space</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
              Discover our curated collection of premium inventory. Design elements that blend timeless elegance with modern functionality.
            </p>
            <Link href="/shop">
              <Button size="lg" className="px-8 py-6 text-base rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
                Shop Collection <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Categories (Circular) */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif mb-4">Shop by Category</h2>
          <div className="w-16 h-0.5 bg-primary mx-auto"></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
          {CATEGORIES.map((cat, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              key={cat.id} 
              className="flex flex-col items-center group cursor-pointer"
            >
              <Link href={`/shop?category=${cat.slug}`}>
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden mb-4 p-1 border-2 border-transparent group-hover:border-primary transition-all duration-300">
                  <div className="w-full h-full rounded-full overflow-hidden bg-secondary">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                </div>
                <h3 className="text-sm md:text-base font-medium text-center group-hover:text-primary transition-colors">{cat.name}</h3>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Shop by Room (Arched) */}
      <section className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif mb-4">Shop by Room</h2>
              <p className="text-muted-foreground max-w-lg">Find the perfect pieces tailored to specific spaces in your home. Thoughtfully designed sets for every room.</p>
            </div>
            <Link href="/shop">
              <Button variant="outline" className="rounded-full">View All Rooms</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['Living', 'Bedroom', 'Dining'].map((room, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                key={room} 
                className="group cursor-pointer"
              >
                <Link href={`/shop?room=${room.toLowerCase()}`}>
                  <div className="aspect-[3/4] overflow-hidden arch-image mb-6 relative">
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10" />
                    <img src={roomsImg} alt={`${room} Room`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <h3 className="text-xl font-serif text-center group-hover:text-primary transition-colors">{room} Room</h3>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif mb-4">Our Bestsellers</h2>
            <div className="w-16 h-0.5 bg-primary"></div>
          </div>
          <Link href="/shop?bestsellers=true">
            <Button variant="ghost" className="hover:bg-transparent hover:text-primary">
              Shop All Bestsellers <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="flex flex-col gap-4 animate-pulse">
                <div className="aspect-[4/5] bg-secondary rounded-xl" />
                <div className="h-4 bg-secondary w-3/4 rounded" />
                <div className="h-4 bg-secondary w-1/4 rounded" />
              </div>
            ))}
          </div>
        ) : bestsellers && bestsellers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* If we have real DB products, map them. Otherwise render a few mocks based on the provided screenshot reference */}
            {bestsellers.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No bestsellers found yet. Check back soon!
          </div>
        )}
      </section>
    </div>
  );
}
