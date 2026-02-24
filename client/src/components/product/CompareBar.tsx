import { Link } from "wouter";
import { X, Scale } from "lucide-react";
import { useCompareStore } from "@/store/use-compare";
import { Button } from "@/components/ui/button";

export function CompareBar() {
  const { products, removeProduct, clear } = useCompareStore();

  if (products.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-background border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 animate-in slide-in-from-bottom flex justify-center">
      <div className="max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <div className="flex items-center text-sm font-medium text-muted-foreground mr-2 shrink-0">
            <Scale className="w-4 h-4 mr-2" />
            Compare ({products.length}/3)
          </div>
          
          <div className="flex gap-4">
            {products.map(p => (
              <div key={p.id} className="relative flex items-center gap-3 bg-secondary p-2 rounded-lg pr-8 shrink-0 w-[200px]">
                <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-md" />
                <span className="text-xs font-medium truncate">{p.name}</span>
                <button 
                  onClick={() => removeProduct(p.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <Button variant="ghost" onClick={clear}>Clear</Button>
          <Link href="/compare">
            <Button disabled={products.length < 2}>Compare Models</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
