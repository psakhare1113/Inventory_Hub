import { create } from 'zustand';
import { type Product } from '@shared/schema';

interface CompareStore {
  products: Product[];
  addProduct: (product: Product) => void;
  removeProduct: (productId: number) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareStore>((set) => ({
  products: [],
  addProduct: (product) => 
    set((state) => {
      if (state.products.find(p => p.id === product.id)) return state;
      if (state.products.length >= 3) {
        return { products: [...state.products.slice(1), product] };
      }
      return { products: [...state.products, product] };
    }),
  removeProduct: (productId) => 
    set((state) => ({
      products: state.products.filter(p => p.id !== productId)
    })),
  clear: () => set({ products: [] }),
}));
