import type { Metadata } from "next";
import { StickyNav } from "@/components/home/StickyNav";
import { Footer } from "@/components/Footer";
import { PnrStatus } from "@/components/home/PnrStatus";

export const metadata: Metadata = {
  title: "Check PNR / Booking Status · Tourist Leader",
  description: "Track your flight, hotel or bus booking status with your PNR or booking reference — no login required.",
};

export default function PnrStatusPage() {
  return (
    <>
      <StickyNav active="flights" />
      <main className="flex-1 bg-slate-50/60">
        <section className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <PnrStatus />
        </section>
      </main>
      <Footer />
    </>
  );
}
