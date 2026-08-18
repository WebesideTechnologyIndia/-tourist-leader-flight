"use client";
import { useEffect } from "react";
import { Heart } from "lucide-react";
import { useWishlist, type WishItem } from "@/store/wishlist";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

export function WishlistButton({ item, className, size = 18 }: { item: WishItem; className?: string; size?: number }) {
  const { isWished, toggle, fetched, fetchWishlist } = useWishlist();
  const user = useAuth((s) => s.user);
  const authFetched = useAuth((s) => s.fetched);

  useEffect(() => {
    if (user && !fetched) fetchWishlist();
  }, [user, fetched, fetchWishlist, authFetched]);

  const wished = isWished(item.itemType, item.itemKey);

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(item); }}
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      className={cn("grid place-items-center rounded-full bg-white/90 shadow transition-transform hover:scale-110 active:scale-95", className)}
      style={{ width: size + 16, height: size + 16 }}
    >
      <Heart size={size} className={cn("transition-colors", wished ? "fill-rose-500 text-rose-500" : "text-slate-500")} />
    </button>
  );
}
