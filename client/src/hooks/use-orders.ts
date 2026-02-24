import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useOrders() {
  return useQuery({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch orders");
      
      const data = await res.json();
      return api.orders.list.responses[200].parse(data);
    },
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.checkout.process.path, {
        method: api.checkout.process.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Checkout failed");
      const data = await res.json();
      return api.checkout.process.responses[200].parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cart.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    },
  });
}
