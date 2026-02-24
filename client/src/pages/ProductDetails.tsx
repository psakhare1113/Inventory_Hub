import { useState } from "react";
import { useParams } from "wouter";
import { Shield, Truck, RotateCcw, Heart, Scale } from "lucide-react";
import { useProduct } from "@/hooks/use-products";
import { useAddToCart } from "@/hooks/use-cart";
import { useToggleWishlist, useWishlist } from "@/hooks/use-wishlist";
import { useCompareStore } from "@/store/use-compare";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import NotFound from "./not-found";

export default function ProductDetails() {
  const { id } = useParams();
  const productId = parseInt(id || "0", 10);
  
  const { data: product, isLoading } = useProduct(productId);
  const { mutate: addToCart, isPending: isAdding } = useAddToCart();
  const { mutate: toggleWishlist } = useToggleWishlist();
  const { data: wishlist } = useWishlist();
  const addCompare = useCompareStore(state => state.addProduct);
  
  const [quantity, setQuantity] = useState(1);

  if (isLoading) return <div className="min-h-[70vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  if (!product) return <NotFound />;

  const isWishlisted = wishlist?.some(item => item.productId === product.id);
  const formatPrice = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
        
        {/* Left: Images */}
        <div className="space-y-6">
          <div className="aspect-[4/5] md:aspect-square overflow-hidden rounded-2xl bg-secondary sticky top-28">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>

        {/* Right: Info */}
        <div className="flex flex-col">
          <div className="mb-2 text-sm text-primary font-medium tracking-wider uppercase">
            {product.isBestseller && "Bestseller"}
          </div>
          <h1 className="text-3xl md:text-5xl font-serif text-foreground mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-2xl font-semibold text-primary">{formatPrice(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xl text-muted-foreground line-through decoration-muted-foreground/50">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="bg-destructive/10 text-destructive text-sm font-semibold px-2 py-1 rounded-md">
                Save {Math.round((1 - product.price / product.originalPrice) * 100)}%
              </span>
            )}
          </div>

          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            {product.description}
          </p>

          <Separator className="mb-8" />

          {/* Actions */}
          <div className="flex flex-col gap-4 mb-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-border rounded-md h-12">
                <button 
                  className="px-4 h-full hover:bg-secondary transition-colors"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >-</button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button 
                  className="px-4 h-full hover:bg-secondary transition-colors"
                  onClick={() => setQuantity(quantity + 1)}
                >+</button>
              </div>
              <Button 
                size="lg" 
                className="flex-1 h-12 text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                onClick={() => addToCart({ productId: product.id, quantity })}
                disabled={isAdding}
              >
                {isAdding ? "Adding..." : "Add to Cart"}
              </Button>
            </div>
            
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className={`flex-1 h-12 ${isWishlisted ? 'border-primary text-primary bg-primary/5' : ''}`}
                onClick={() => toggleWishlist(product.id)}
              >
                <Heart className={`w-4 h-4 mr-2 ${isWishlisted ? 'fill-current' : ''}`} />
                {isWishlisted ? "Saved" : "Save to Wishlist"}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 h-12"
                onClick={() => addCompare(product)}
              >
                <Scale className="w-4 h-4 mr-2" />
                Compare
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-t border-b border-border">
            <div className="flex flex-col items-center text-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">10 Year Warranty</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <Truck className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">Free White-glove Delivery</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <RotateCcw className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">30-day Returns</span>
            </div>
          </div>

          {/* Product Specifications */}
          {product.features && product.features.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-serif mb-4">Specifications & Features</h3>
              <ul className="space-y-2">
                {product.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
