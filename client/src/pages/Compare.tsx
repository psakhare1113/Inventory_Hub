import { useCompareStore } from "@/store/use-compare";
import { Link } from "wouter";
import { X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/hooks/use-cart";

export default function Compare() {
  const { products, removeProduct, clear } = useCompareStore();
  const { mutate: addToCart } = useAddToCart();

  if (products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-serif mb-4">Compare Products</h1>
        <p className="text-muted-foreground mb-8">You haven't selected any products to compare.</p>
        <Link href="/shop">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const formatPrice = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-serif mb-2">Compare Products</h1>
          <p className="text-muted-foreground">Detailed comparison to help you choose perfectly.</p>
        </div>
        <Button variant="outline" onClick={clear}>Clear All</Button>
      </div>

      <div className="overflow-x-auto pb-8">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="w-1/4 p-4 border-b-2 border-border font-serif text-lg text-muted-foreground align-bottom">Features</th>
              {products.map(p => (
                <th key={p.id} className="w-1/4 p-4 border-b-2 border-border align-bottom">
                  <div className="relative bg-secondary/50 rounded-xl p-4 flex flex-col gap-4 group">
                    <button 
                      onClick={() => removeProduct(p.id)}
                      className="absolute top-2 right-2 bg-background/80 hover:bg-destructive hover:text-destructive-foreground p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <img src={p.imageUrl} alt={p.name} className="w-full aspect-[4/5] object-cover rounded-lg" />
                    <div>
                      <h3 className="font-medium text-lg truncate">{p.name}</h3>
                      <p className="text-primary font-semibold mt-1">{formatPrice(p.price)}</p>
                    </div>
                    <Button onClick={() => addToCart({ productId: p.id })} className="w-full mt-2">
                      <ShoppingBag className="w-4 h-4 mr-2" /> Add
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            <tr>
              <td className="p-4 font-medium text-muted-foreground">Price</td>
              {products.map(p => (
                <td key={p.id} className="p-4 font-semibold">{formatPrice(p.price)}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-medium text-muted-foreground">Description</td>
              {products.map(p => (
                <td key={p.id} className="p-4 text-sm text-muted-foreground">{p.description}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-medium text-muted-foreground">Features</td>
              {products.map(p => (
                <td key={p.id} className="p-4">
                  <ul className="text-sm space-y-1">
                    {p.features?.map((f, i) => (
                      <li key={i} className="flex items-start gap-1 text-muted-foreground">
                        <span className="text-primary mt-0.5">•</span> {f}
                      </li>
                    )) || <span className="text-muted-foreground/50">N/A</span>}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
