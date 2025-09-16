import { create } from "zustand";

type Store = {
  openCart: boolean;
  productsOnCart: number;
  setOpenCart(openCart: boolean): void;
  setProductsOnCart(productsOnCart: number): void;
};

export const useCart = create<Store>((set) => ({
  productsOnCart: 0,
  setProductsOnCart(productsOnCart) {
    set({ productsOnCart });
  },
  openCart: false,
  setOpenCart(openCart) {
    set({ openCart });
  },
}));
