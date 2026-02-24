import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useCheckout } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function Checkout() {
  const [_, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { data: cartItems } = useCart();
  const { mutate: checkout, isPending } = useCheckout();
  
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect if not logged in or empty cart
  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  const subtotal = cartItems?.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) || 0;
  const shipping = 5000; // $50.00
  const tax = Math.round(subtotal * 0.08); // 8% tax
  const total = subtotal + shipping + tax;

  const formatPrice = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkout(undefined, {
      onSuccess: () => setIsSuccess(true)
    });
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-32 text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-serif mb-4">Order Confirmed!</h1>
        <p className="text-muted-foreground mb-8 text-lg">Thank you for your purchase. We've received your order and will email you the receipt shortly.</p>
        <Link href="/profile">
          <Button size="lg">View Order History</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-serif mb-8">Checkout</h1>
      
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
            <section>
              <h2 className="text-xl font-medium mb-4 pb-2 border-b border-border">Shipping Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input required placeholder="Jane" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input required placeholder="Doe" />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input required placeholder="123 Main St" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input required placeholder="New York" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zip Code</label>
                  <Input required placeholder="10001" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-4 pb-2 border-b border-border">Payment Details (Mock)</h2>
              <div className="bg-secondary/50 p-4 rounded-lg border border-border mb-4 flex items-start gap-3">
                <ShieldCheck className="text-primary w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">This is a simulated checkout. No real payment is required. Just submit the form to create an order.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Card Number</label>
                  <Input required defaultValue="4242 4242 4242 4242" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expiry</label>
                    <Input required defaultValue="12/25" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CVC</label>
                    <Input required defaultValue="123" />
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        <div className="w-full lg:w-[400px]">
          <div className="bg-secondary/30 rounded-2xl p-6 border border-border sticky top-28">
            <h2 className="text-xl font-medium mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
              {cartItems?.map(item => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-20 bg-background rounded overflow-hidden">
                    <img src={item.product.imageUrl} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium line-clamp-2">{item.product.name}</p>
                    <p className="text-muted-foreground">Qty: {item.quantity}</p>
                    <p className="font-medium mt-1">{formatPrice(item.product.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="mb-4" />

            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-medium text-foreground">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <Button 
              type="submit" 
              form="checkout-form" 
              className="w-full py-6 text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              disabled={isPending || !cartItems?.length}
            >
              {isPending ? "Processing..." : "Place Order"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
