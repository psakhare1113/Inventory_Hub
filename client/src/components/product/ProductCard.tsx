import { Link } from "wouter";
import { Heart, Scale, ShoppingBag } from "lucide-react";
import { type Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/hooks/use-cart";
import { useToggleWishlist, useWishlist } from "@/hooks/use-wishlist";
import { useCompareStore } from "@/store/use-compare";

export function ProductCard({ product }: { product: Product }) {
  const { mutate: addToCart, isPending: isAddingToCart } = useAddToCart();
  const { mutate: toggleWishlist } = useToggleWishlist();
  const { data: wishlistItems } = useWishlist();
  const addCompare = useCompareStore(state => state.addProduct);
  const compareProducts = useCompareStore(state => state.products);
  
  const isWishlisted = wishlistItems?.some(item => item.productId === product.id);
  const isCompared = compareProducts.some(p => p.id === product.id);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  return (
    <div className="group flex flex-col gap-4 relative">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-secondary/50">
        <Link href={`/product/${product.id}`}>
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        
        {/* Floating actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
          <Button 
            variant="secondary" 
            size="icon" 
            className={`h-9 w-9 rounded-full shadow-sm hover:text-primary ${isWishlisted ? 'text-primary' : ''}`}
            onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            className={`h-9 w-9 rounded-full shadow-sm hover:text-primary ${isCompared ? 'text-primary bg-primary/10' : ''}`}
            onClick={(e) => { e.preventDefault(); addCompare(product); }}
          >
            <Scale className="h-4 w-4" />
          </Button>
        </div>

        {/* Badges */}
        {product.isBestseller && (
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Bestseller
          </div>
        )}

        {/* Quick Add */}
        <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Button 
            className="w-full bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground backdrop-blur-sm shadow-lg"
            onClick={(e) => { e.preventDefault(); addToCart({ productId: product.id, quantity: 1 }); }}
            disabled={isAddingToCart}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            {isAddingToCart ? "Adding..." : "Quick Add"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1 px-1">
        <Link href={`/product/${product.id}`} className="font-medium text-foreground hover:text-primary transition-colors truncate">
          {product.name}
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary">{formatPrice(product.price)}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
