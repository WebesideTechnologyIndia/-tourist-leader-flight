import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BusResults } from "@/components/bus/BusResults";

export default function BusSearchPage() {
  return (
    <>
      <Header active="bus" />
      <main className="flex-1 bg-background">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-center text-slate-400">Loading buses…</div>}>
          <BusResults />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
