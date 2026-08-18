"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Mail, Phone, Ticket, LogOut, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";

export default function AccountPage() {
  const router = useRouter();
  const { user, fetched, fetchMe, logout } = useAuth();

  useEffect(() => { if (!fetched) fetchMe(); }, [fetched, fetchMe]);

  return (
    <>
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900"><UserCircle size={24} className="text-brand" /> My Account</h1>

          {!fetched ? (
            <div className="mt-10 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
          ) : !user ? (
            <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-bold text-slate-800">You&apos;re not logged in</p>
              <Button className="mt-4" onClick={() => router.push("/")}>Go to Home</Button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-center gap-4">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand to-sky-400 text-2xl font-bold text-white">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-lg font-extrabold text-slate-900">{user.name || "Traveller"}</p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-500"><Mail size={14} /> {user.email}</p>
                    {user.phone && <p className="flex items-center gap-1.5 text-sm text-slate-500"><Phone size={14} /> {user.phone}</p>}
                  </div>
                </div>
              </div>

              <button onClick={() => router.push("/account/trips")} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 hover:ring-brand">
                <Ticket size={20} className="text-brand" />
                <span className="flex-1"><span className="block font-semibold text-slate-800">My Dashboard</span><span className="block text-xs text-slate-400">View your bookings & enquiries</span></span>
              </button>

              <Button variant="outline" className="w-full !text-rose-600 !border-rose-200 hover:!bg-rose-50" onClick={async () => { await logout(); router.push("/"); }}>
                <LogOut size={16} /> Logout
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
