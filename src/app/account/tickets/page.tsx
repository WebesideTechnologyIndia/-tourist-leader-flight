"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy, Loader2, ArrowLeft, Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/auth";
import { TicketThread, type TicketData, type TMessage } from "@/components/support/TicketThread";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = { OPEN: "bg-rose-100 text-rose-700", IN_PROGRESS: "bg-amber-100 text-amber-700", RESOLVED: "bg-emerald-100 text-emerald-700", CLOSED: "bg-slate-200 text-slate-600" };

export default function MyTicketsPage() {
  const router = useRouter();
  const { user, fetched, fetchMe } = useAuth();
  const [rows, setRows] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => { if (!fetched) fetchMe(); }, [fetched, fetchMe]);
  useEffect(() => {
    if (!fetched) return;
    if (!user) { setLoading(false); return; }
    fetch("/api/support", { cache: "no-store" }).then((r) => r.json()).then((d) => setRows(d.tickets || [])).finally(() => setLoading(false));
  }, [fetched, user]);

  const active = rows.find((t) => t.id === sel) || null;
  const onSent = (id: string, m: TMessage) => setRows((r) => r.map((t) => t.id === id ? { ...t, messages: [...(t.messages || []), m], status: (t.status === "RESOLVED" || t.status === "CLOSED") ? "OPEN" : t.status } : t));

  return (
    <>
      <Header active="flights" />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900"><LifeBuoy size={24} className="text-brand" /> My Tickets</h1>
            <Button size="sm" onClick={() => router.push("/help")}><Plus size={15} /> New Ticket</Button>
          </div>

          {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> :
            !user ? <Empty title="Please log in" sub="Your support tickets are linked to your account." onClick={() => router.push("/")} /> :
            rows.length === 0 ? <Empty title="No tickets yet" sub="Raise a support ticket and track replies here." onClick={() => router.push("/help")} cta="Raise a ticket" /> :
            active ? (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <button onClick={() => setSel(null)} className="mb-3 flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand"><ArrowLeft size={15} /> All tickets</button>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div><p className="font-bold text-slate-900">{active.subject}</p><p className="text-xs text-slate-400">{active.ticketNo} · {active.category}{active.bookingRef ? ` · ${active.bookingRef}` : ""}</p></div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", STATUS_COLOR[active.status])}>{active.status.replace("_", " ")}</span>
                </div>
                <div className="mt-3 h-[60vh]"><TicketThread ticket={active} role="CUSTOMER" onSent={(m) => onSent(active.id, m)} /></div>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((t) => {
                  const last = t.messages?.[t.messages.length - 1];
                  return (
                    <button key={t.id} onClick={() => setSel(t.id)} className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 hover:ring-brand/40">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">{t.ticketNo} · {t.category}</span>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", STATUS_COLOR[t.status])}>{t.status.replace("_", " ")}</span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-800">{t.subject}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{last ? `${last.sender === "ADMIN" ? "Support: " : "You: "}${last.body}` : t.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatDate(t.createdAt)}{t.messages?.length ? ` · ${t.messages.length} repl${t.messages.length > 1 ? "ies" : "y"}` : ""}</p>
                    </button>
                  );
                })}
              </div>
            )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Empty({ title, sub, onClick, cta = "Go to Home" }: { title: string; sub: string; onClick: () => void; cta?: string }) {
  return (
    <div className="mt-8 rounded-2xl bg-white p-12 text-center shadow-sm">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand"><LifeBuoy size={26} /></span>
      <p className="mt-4 text-lg font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
      <Button className="mt-5" onClick={onClick}>{cta}</Button>
    </div>
  );
}
