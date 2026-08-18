"use client";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Loader2, Plane, BedDouble, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";
import { useWishlist } from "@/store/wishlist";

export default function WishlistPage() {
  const router = useRouter();
  const { user, fetched: authFetched, fetchMe } = useAuth();
  const { items, fetched, fetchWishlist, toggle } = useWishlist();

  useEffect(() => { if (!authFetched) fetchMe(); }, [authFetched, fetchMe]);
  useEffect(() => { if (user && !fetched) fetchWishlist(); }, [user, fetched, fetchWishlist]);

  const loading = (user && !fetched) || !authFetched;

  return (
    <>
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900"><Heart size={24} className="fill-rose-500 text-rose-500" /> Wishlist</h1>

          {loading ? (
            <div className="mt-10 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
          ) : !user ? (
            <Empty title="Please log in to see your wishlist" sub="Save hotels & destinations to plan trips faster." cta="Go to Home" onClick={() => router.push("/")} />
          ) : items.length === 0 ? (
            <Empty title="Your wishlist is empty" sub="Tap the ♥ on any hotel or destination to save it here." cta="Explore destinations" onClick={() => router.push("/")} />
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <div key={`${it.itemType}:${it.itemKey}`} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                  <Link href={it.href || "/"} className="relative block h-36 overflow-hidden">
                    {it.image ? (
                      <Image src={it.image} alt={it.title} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : <div className="h-full w-full bg-gradient-to-br from-brand to-sky-400" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                    <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                      {it.itemType === "HOTEL" ? <BedDouble size={12} /> : <Plane size={12} />} {it.itemType === "HOTEL" ? "Hotel" : "Destination"}
                    </span>
                    <span className="absolute bottom-2 left-3 text-lg font-extrabold text-white drop-shadow">{it.title}</span>
                  </Link>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-slate-500">{it.subtitle}</p>
                      {it.price && <p className="text-sm font-bold text-slate-900">{it.price}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => toggle(it)} className="grid h-9 w-9 place-items-center rounded-full text-rose-500 hover:bg-rose-50" aria-label="Remove"><Trash2 size={16} /></button>
                      <Link href={it.href || "/"}><Button size="sm">View</Button></Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Empty({ title, sub, cta, onClick }: { title: string; sub: string; cta: string; onClick: () => void }) {
  return (
    <div className="mt-8 rounded-2xl bg-white p-12 text-center shadow-sm">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500"><Heart size={26} /></span>
      <p className="mt-4 text-lg font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
      <Button className="mt-5" onClick={onClick}>{cta}</Button>
    </div>
  );
}
