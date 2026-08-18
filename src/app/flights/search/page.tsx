import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchResults } from "@/components/search/SearchResults";

export default function SearchPage() {
  return (
    <>
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-center text-slate-400">Loading flights…</div>}>
          <SearchResults />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
