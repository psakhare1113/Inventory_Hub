import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useWishlist() {
  return useQuery({
    queryKey: [api.wishlist.list.path],
    queryFn: async () => {
      const res = await fetch(api.wishlist.list.path, { credentials: "include" });
      if (res.status === 401) return []; // Not logged in
      if (!res.ok) throw new Error("Failed to fetch wishlist");
      
      const data = await res.json();
      return api.wishlist.list.responses[200].parse(data);
    },
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (productId: number) => {
      const res = await fetch(api.wishlist.toggle.path, {
        method: api.wishlist.toggle.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
        credentials: "include",
      });
      
      if (res.status === 401) {
        window.location.href = "/api/login";
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to update wishlist");
      
      const data = await res.json();
      return api.wishlist.toggle.responses[200].parse(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.wishlist.list.path] });
      toast({
        title: data.added ? "Added to Wishlist" : "Removed from Wishlist",
        description: data.added ? "Item saved for later." : "Item removed.",
      });
    },
  });
}
