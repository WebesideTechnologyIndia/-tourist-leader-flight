import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HotelResults } from "@/components/hotels/HotelResults";

export default function HotelSearchPage() {
  return (
    <>
      <Header active="hotels" />
      <main className="flex-1 bg-background">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-center text-slate-400">Loading hotels…</div>}>
          <HotelResults />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
