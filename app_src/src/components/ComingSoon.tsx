import Link from "next/link";
import { Plane, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function ComingSoon({ title, active }: { title: string; active?: string }) {
  return (
    <>
      <Header active={active} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand">
          <Plane size={30} className="-rotate-45" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-900 sm:text-3xl">{title} — coming soon</h1>
        <p className="mt-2 max-w-md text-slate-500">We&apos;re crafting a caring, seamless experience here too. Meanwhile, book your flights with comfort.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark">
          <ArrowLeft size={16} /> Back to Flights
        </Link>
      </main>
      <Footer />
    </>
  );
}
