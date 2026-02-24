import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

interface ProductsFilters {
  categoryId?: number;
  search?: string;
  isBestseller?: boolean;
}

export function useProducts(filters?: ProductsFilters) {
  return useQuery({
    queryKey: [api.products.list.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.categoryId) params.append("categoryId", filters.categoryId.toString());
      if (filters?.search) params.append("search", filters.search);
      if (filters?.isBestseller) params.append("isBestseller", "true");
      
      const url = `${api.products.list.path}?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      
      const data = await res.json();
      return api.products.list.responses[200].parse(data);
    },
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: [api.products.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.products.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      
      const data = await res.json();
      return api.products.get.responses[200].parse(data);
    },
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      
      const data = await res.json();
      return api.categories.list.responses[200].parse(data);
    },
  });
}
