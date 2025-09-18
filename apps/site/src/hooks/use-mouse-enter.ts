import { create } from "zustand";

type Store = {
  isMouseEntered: boolean;
  setIsMouseEntered(isMouseEntered: boolean): void;
};

export const useMouseEnter = create<Store>((set) => ({
  isMouseEntered: false,
  setIsMouseEntered(isMouseEntered) {
    set({ isMouseEntered });
  },
}));
