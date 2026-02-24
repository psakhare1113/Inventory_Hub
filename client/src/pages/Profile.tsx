import { useState } from "react";
import { Link } from "wouter";
import { Package, Heart, LogOut, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { useWishlist } from "@/hooks/use-wishlist";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const { data: orders, isLoading: isLoadingOrders } = useOrders();
  const { data: wishlist, isLoading: isLoadingWishlist } = useWishlist();
  
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist'>('orders');

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  const formatPrice = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row gap-12">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-secondary/30 rounded-2xl p-6 border border-border sticky top-28">
            <div className="flex items-center gap-4 mb-8">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">{user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground truncate max-w-[150px]">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'My Account'}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.email}</span>
              </div>
            </div>

            <nav className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                <Package className="w-4 h-4" /> Order History
              </button>
              <button 
                onClick={() => setActiveTab('wishlist')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'wishlist' ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                <Heart className="w-4 h-4" /> Saved Wishlist
              </button>
            </nav>

            <div className="mt-8 pt-6 border-t border-border">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4 mr-3" /> Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-h-[500px]">
          {activeTab === 'orders' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-serif mb-6">Order History</h2>
              
              {isLoadingOrders ? (
                <div className="space-y-4">
                  {[1, 2].map(n => <div key={n} className="h-32 bg-secondary animate-pulse rounded-xl" />)}
                </div>
              ) : orders && orders.length > 0 ? (
                <div className="space-y-6">
                  {orders.map(order => (
                    <div key={order.id} className="border border-border rounded-xl p-6 bg-card shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 pb-4 border-b border-border/50">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                          <p className="font-semibold">#{order.id.toString().padStart(6, '0')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Date Placed</p>
                          <p className="font-medium">{new Date(order.createdAt!).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                          <p className="font-medium">{formatPrice(order.totalAmount)}</p>
                        </div>
                        <div>
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-secondary text-secondary-foreground'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm">
                          View Invoice <ExternalLink className="w-3 h-3 ml-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/20 rounded-2xl border border-dashed border-border">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-serif mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-6">When you place an order, it will appear here.</p>
                  <Link href="/shop"><Button>Start Shopping</Button></Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-serif mb-6">Saved Wishlist</h2>
              
              {isLoadingWishlist ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3].map(n => <div key={n} className="aspect-[4/5] bg-secondary animate-pulse rounded-xl" />)}
                </div>
              ) : wishlist && wishlist.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10">
                  {wishlist.map(item => (
                    <ProductCard key={item.id} product={item.product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/20 rounded-2xl border border-dashed border-border">
                  <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-serif mb-2">Your wishlist is empty</h3>
                  <p className="text-muted-foreground mb-6">Save items you love to view them later.</p>
                  <Link href="/shop"><Button>Explore Products</Button></Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
