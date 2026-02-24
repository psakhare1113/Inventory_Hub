import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Heart, User, Menu, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "../cart/CartDrawer";
import logoImg from "@assets/image_1771913684738.png";

export function Navbar() {
  const [_, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: cartItems } = useCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const cartCount = cartItems?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Left: Mobile Menu & Logo */}
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-8">
                  <Link href="/" className="text-lg font-medium hover:text-primary transition-colors">Home</Link>
                  <Link href="/shop" className="text-lg font-medium hover:text-primary transition-colors">Shop All</Link>
                  <Link href="/shop?category=furniture" className="text-lg font-medium hover:text-primary transition-colors">Furniture</Link>
                  <Link href="/shop?category=decor" className="text-lg font-medium hover:text-primary transition-colors">Decor</Link>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              <img src={logoImg} alt="Logo" className="h-8 md:h-10 object-contain" />
            </Link>
          </div>

          {/* Center: Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
            <Link href="/shop" className="text-sm font-medium hover:text-primary transition-colors">Shop All</Link>
            <Link href="/shop?category=furniture" className="text-sm font-medium hover:text-primary transition-colors">Furniture</Link>
            <Link href="/shop?category=decor" className="text-sm font-medium hover:text-primary transition-colors">Decor</Link>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isSearchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center animate-in fade-in slide-in-from-right-4">
                <Input 
                  autoFocus
                  placeholder="Search products..." 
                  className="w-[150px] sm:w-[200px] h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-5 w-5" />
              </Button>
            )}

            <Link href="/profile" className="hidden sm:flex">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>

            <Link href="/profile">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            <CartDrawer trigger={
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            } />
          </div>
        </div>
      </div>
    </header>
  );
}
