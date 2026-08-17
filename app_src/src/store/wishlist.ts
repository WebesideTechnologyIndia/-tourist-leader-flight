"use client";
import { create } from "zustand";
import { useAuth } from "./auth";

export interface WishItem {
  id?: string;
  itemType: "HOTEL" | "DESTINATION" | "FLIGHT";
  itemKey: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  price?: string | null;
  href?: string | null;
}

const k = (t: string, key: string) => `${t}:${key}`;

interface WishlistState {
  items: WishItem[];
  keys: Set<string>;
  fetched: boolean;
  fetchWishlist: () => Promise<void>;
  isWished: (itemType: string, itemKey: string) => boolean;
  toggle: (item: WishItem) => void;
}

export const useWishlist = create<WishlistState>((set, get) => ({
  items: [],
  keys: new Set(),
  fetched: false,
  fetchWishlist: async () => {
    try {
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      const data = await res.json();
      const items: WishItem[] = data.items || [];
      set({ items, keys: new Set(items.map((i) => k(i.itemType, i.itemKey))), fetched: true });
    } catch {
      set({ fetched: true });
    }
  },
  isWished: (t, key) => get().keys.has(k(t, key)),
  toggle: (item) => {
    // require login first
    if (!useAuth.getState().user) {
      useAuth.getState().requireAuth(() => get().toggle(item));
      return;
    }
    const key = k(item.itemType, item.itemKey);
    const wished = get().keys.has(key);
    // optimistic update
    if (wished) {
      const keys = new Set(get().keys); keys.delete(key);
      set({ keys, items: get().items.filter((i) => k(i.itemType, i.itemKey) !== key) });
      fetch("/api/wishlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemType: item.itemType, itemKey: item.itemKey }) }).catch(() => {});
    } else {
      const keys = new Set(get().keys); keys.add(key);
      set({ keys, items: [item, ...get().items] });
      fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) }).catch(() => {});
    }
  },
}));
