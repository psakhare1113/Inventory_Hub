import { ReactNode } from "react";
import { Link } from "wouter";
import { Trash2, Plus, Minus } from "lucide-react";
import { useCart, useUpdateCartItem, useRemoveFromCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export function CartDrawer({ trigger }: { trigger: ReactNode }) {
  const { data: cartItems, isLoading } = useCart();
  const { mutate: updateQuantity } = useUpdateCartItem();
  const { mutate: removeItem } = useRemoveFromCart();
  const { isAuthenticated } = useAuth();

  const subtotal = cartItems?.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) || 0;
  const formatPrice = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md bg-background border-l-0 shadow-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-serif text-2xl">Your Cart</SheetTitle>
        </SheetHeader>
        
        {!isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">Please sign in to view your cart.</p>
            <Button onClick={() => window.location.href = "/api/login"}>Sign In</Button>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : cartItems?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">Your cart is currently empty.</p>
            <SheetTrigger asChild>
              <Link href="/shop">
                <Button>Continue Shopping</Button>
              </Link>
            </SheetTrigger>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-6">
              {cartItems?.map((item) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="w-20 h-24 bg-secondary rounded-md overflow-hidden shrink-0">
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-medium text-sm line-clamp-2 leading-tight">{item.product.name}</h4>
                      <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex items-center border border-border rounded-md">
                        <button 
                          className="px-2 py-1 hover:bg-secondary transition-colors"
                          onClick={() => updateQuantity({ id: item.id, quantity: Math.max(1, item.quantity - 1) })}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button 
                          className="px-2 py-1 hover:bg-secondary transition-colors"
                          onClick={() => updateQuantity({ id: item.id, quantity: item.quantity + 1 })}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-medium">{formatPrice(item.product.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-6 mt-auto space-y-4">
              <Separator />
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">Shipping and taxes calculated at checkout.</p>
              <SheetTrigger asChild>
                <Link href="/checkout">
                  <Button className="w-full py-6 text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                    Proceed to Checkout
                  </Button>
                </Link>
              </SheetTrigger>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
