import { create } from "zustand";

type Store = {
  openCart: boolean;
  setOpenCart(openCart: boolean): void;
};

export const useCart = create<Store>((set) => ({
  openCart: false,
  setOpenCart(openCart) {
    set({ openCart });
  },
}));
