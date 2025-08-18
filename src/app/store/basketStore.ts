// store/basketStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BasketItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  quantity: number;
  option?: { name: string; price: number };
  optionId: number | null;
}

interface BasketState {
  basketItems: BasketItem[];
  deliveryMode: "delivery" | "collection";
  postcode: string;
  address: string;
  deliveryFee: number;
  orderNote: string;
  currentRestaurantId: number | null;
  promoCode: string;
  discountAmount: number;
  appliedPromo:  { code: string; discountAmount: number } | null;
  guestName: string;
  guestEmail: string;

  setGuestInfo: (name: string, email: string) => void;
  setPromoCode: (code: string) => void;
  setDiscount: (amount: number) => void;
  clearPromo: () => void;

  // Actions
  addToBasket: (item: Omit<BasketItem, "quantity">) => void;
  removeFromBasket: (id: number, optionId: number | null) => void;
  updateQuantity: (id: number, optionId: number | null, quantity: number) => void;
  setItems: (items: BasketItem[]) => void;
  replaceBasket: (items: BasketItem[], restaurantId: number) => void;
  setDeliveryMode: (mode: "delivery" | "collection") => void;
  setPostcode: (code: string) => void;
  setAddress: (addr: string) => void;
  setDeliveryFee: (fee: number) => void;
  setOrderNote: (note: string) => void;
  setCurrentRestaurantId: (id: number | null) => void;
  resetDeliveryDetails: () => void;
  clearBasket: () => void;
}

export const useBasketStore = create<BasketState>()(
  persist(
    (set, get) => ({
      basketItems: [],
      deliveryMode: "delivery",
      postcode: "",
      address: "",
      deliveryFee: 0,
      orderNote: "",
      currentRestaurantId: null,
      promoCode: "",
      discountAmount: 0,
      appliedPromo: null,
      guestName: "",
      guestEmail: "",

      addToBasket: (newItem) =>
        set((state) => {
          const existingIndex = state.basketItems.findIndex(
            (item) => item.id === newItem.id && item.optionId === newItem.optionId
          );
          if (existingIndex !== -1) {
            const updated = [...state.basketItems];
            updated[existingIndex].quantity += 1;
            return { basketItems: updated };
          }
          return {
            basketItems: [...state.basketItems, { ...newItem, quantity: 1 }],
          };
        }),

      removeFromBasket: (id, optionId) =>
        set((state) => {
          const item = state.basketItems.find((i) => i.id === id && i.optionId === optionId);
          if (!item) return state;
          if (item.quantity > 1) {
            return {
              basketItems: state.basketItems.map((i) =>
                i.id === id && i.optionId === optionId
                  ? { ...i, quantity: i.quantity - 1 }
                  : i
              ),
            };
          } else {
            return {
              basketItems: state.basketItems.filter(
                (i) => !(i.id === id && i.optionId === optionId)
              ),
            };
          }
        }),

      updateQuantity: (id, optionId, quantity) =>
        set((state) => ({
          basketItems: state.basketItems.map((item) =>
            item.id === id && item.optionId === optionId
              ? { ...item, quantity }
              : item
          ),
        })),

      setItems: (items) =>
        set((state) => ({
          basketItems: [...state.basketItems, ...items],
        })),

      replaceBasket: (items, restaurantId) =>
        set(() => ({
          basketItems: items,
          orderNote: "",
          deliveryMode: "delivery",
          postcode: "",
          address: "",
          deliveryFee: 0,
          currentRestaurantId: restaurantId,
        })),

      setGuestInfo: (name, email) => set({ guestName: name, guestEmail: email }),
      setDeliveryMode: (mode) => set({ deliveryMode: mode }),
      setPostcode: (code) => set({ postcode: code }),
      setAddress: (addr) => set({ address: addr }),
      setDeliveryFee: (fee) => set({ deliveryFee: fee }),
      setOrderNote: (note) => set({ orderNote: note }),
      setCurrentRestaurantId: (id) => set({ currentRestaurantId: id }),

      resetDeliveryDetails: () =>
        set({
          deliveryMode: "delivery",
          postcode: "",
          address: "",
          deliveryFee: 0,
        }),

      clearBasket: () =>
        set({
          basketItems: [],
          orderNote: "",
          deliveryMode: "delivery",
          postcode: "",
          address: "",
          deliveryFee: 0,
          currentRestaurantId: null,
        }),
        setPromoCode: (code) => set({ promoCode: code }),
      setDiscount: (amount) => set({ discountAmount: amount }),
      clearPromo: () =>
        set({
          promoCode: "",
          discountAmount: 0,
          appliedPromo: null,
        }),
    }),
    {
      name: "basket-storage",
    }
  )
);