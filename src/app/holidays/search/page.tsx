import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HolidayResults } from "@/components/holidays/HolidayResults";

export default function HolidaySearchPage() {
  return (
    <>
      <Header active="holidays" />
      <main className="flex-1 bg-background">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-center text-slate-400">Loading packages…</div>}>
          <HolidayResults />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
