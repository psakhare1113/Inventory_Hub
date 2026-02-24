import { useLocation } from "wouter";
import { Filter, SlidersHorizontal } from "lucide-react";
import { useProducts, useCategories } from "@/hooks/use-products";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";

export default function Shop() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const categorySlug = searchParams.get("category");
  const searchQuery = searchParams.get("search");

  const { data: categories } = useCategories();
  
  // Find category ID if we have a slug
  const categoryId = categorySlug && categories 
    ? categories.find(c => c.slug === categorySlug)?.id 
    : undefined;

  const { data: products, isLoading } = useProducts({
    categoryId,
    search: searchQuery || undefined
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif mb-4 capitalize">
          {searchQuery ? `Search: ${searchQuery}` : categorySlug ? categorySlug.replace("-", " ") : "All Products"}
        </h1>
        <p className="text-muted-foreground">
          {products?.length || 0} items found. Discover the perfect pieces to complete your vision.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="sticky top-28 space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wider">
                <Filter className="w-4 h-4" /> Categories
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="/shop" className={`text-sm hover:text-primary transition-colors ${!categorySlug ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    All Categories
                  </a>
                </li>
                {categories?.map(cat => (
                  <li key={cat.id}>
                    <a href={`/shop?category=${cat.slug}`} className={`text-sm hover:text-primary transition-colors ${categorySlug === cat.slug ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                      {cat.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wider">
                <SlidersHorizontal className="w-4 h-4" /> Price Range
              </div>
              <div className="space-y-3">
                {/* Mock price filters for visual completeness */}
                {['Under $100', '$100 - $500', '$500 - $1000', 'Over $1000'].map(range => (
                  <label key={range} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/20 bg-background" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{range}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="flex flex-col gap-4 animate-pulse">
                  <div className="aspect-[4/5] bg-secondary rounded-xl" />
                  <div className="h-4 bg-secondary w-3/4 rounded" />
                  <div className="h-4 bg-secondary w-1/4 rounded" />
                </div>
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-2xl bg-secondary/20">
              <h3 className="text-xl font-serif mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your filters or search query.</p>
              <Button onClick={() => window.location.href = "/shop"} variant="outline">Clear Filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
