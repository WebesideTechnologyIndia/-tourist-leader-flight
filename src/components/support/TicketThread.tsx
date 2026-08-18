"use client";
import { useState } from "react";
import { Send, Loader2, Headset, User as UserIcon } from "lucide-react";
import { cn, formatDate, formatTime } from "@/lib/utils";

export interface TMessage { id: string; sender: "CUSTOMER" | "ADMIN"; authorName?: string | null; body: string; createdAt: string }
export interface TicketData {
  id: string; ticketNo: string; subject: string; name: string; email: string; phone?: string | null;
  category: string; bookingRef?: string | null; message: string; status: string;
  priority?: string; createdAt: string; messages?: TMessage[];
}

function Bubble({ m, own }: { m: { sender: "CUSTOMER" | "ADMIN"; authorName?: string | null; body: string; createdAt: string }; own: boolean }) {
  const isAdmin = m.sender === "ADMIN";
  return (
    <div className={cn("flex gap-2", own ? "flex-row-reverse" : "")}>
      <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white", isAdmin ? "bg-brand" : "bg-slate-400")}>
        {isAdmin ? <Headset size={14} /> : <UserIcon size={14} />}
      </span>
      <div className={cn("max-w-[78%]")}>
        <div className={cn("rounded-2xl px-3.5 py-2 text-sm", own ? "rounded-tr-sm bg-brand text-white" : "rounded-tl-sm bg-slate-100 text-slate-800")}>
          <p className="whitespace-pre-wrap">{m.body}</p>
        </div>
        <p className={cn("mt-1 text-[10px] text-slate-400", own ? "text-right" : "")}>{isAdmin ? (m.authorName || "Support") : (m.authorName || "You")} · {formatDate(m.createdAt)} {formatTime(m.createdAt)}</p>
      </div>
    </div>
  );
}

export function TicketThread({ ticket, role, onSent }: { ticket: TicketData; role: "ADMIN" | "CUSTOMER"; onSent?: (m: TMessage) => void }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const url = role === "ADMIN" ? "/api/admin/tickets/reply" : "/api/support/reply";

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: ticket.id, body: text }) });
      const data = await res.json();
      if (data.message) { setBody(""); onSent?.(data.message); }
    } finally { setLoading(false); }
  };

  const opener: TMessage = { id: "opener", sender: "CUSTOMER", authorName: ticket.name, body: ticket.message, createdAt: ticket.createdAt };
  const all = [opener, ...(ticket.messages || [])];
  const closed = ticket.status === "CLOSED";

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-1">
        {all.map((m) => <Bubble key={m.id} m={m} own={m.sender === role} />)}
      </div>
      {closed ? (
        <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2.5 text-center text-xs text-slate-500">This ticket is closed. {role === "CUSTOMER" ? "Reply to reopen it." : ""}</p>
      ) : null}
      <div className="mt-3 flex items-end gap-2 border-t border-slate-100 pt-3">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} rows={2} placeholder={role === "ADMIN" ? "Type your reply to the customer…" : "Reply to support…"} className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand" />
        <button onClick={send} disabled={loading || !body.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white disabled:opacity-40">{loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
      </div>
    </div>
  );
}
