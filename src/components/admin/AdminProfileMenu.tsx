"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, UserCog, LogOut, Crown, ShieldCheck, Loader2, Check, X, Mail } from "lucide-react";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

export function AdminProfileMenu({ role, roleName, email }: { role: string; roleName: string; email: string }) {
  const router = useRouter();
  const { user, fetchMe, updateProfile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchMe(); }, [fetchMe]);
  useEffect(() => { if (user) { setName(user.name || ""); setPhone(user.phone || ""); } }, [user]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setEditing(false); } };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const displayName = user?.name || email.split("@")[0];
  const initial = (user?.name || email).charAt(0).toUpperCase();
  const RoleIcon = role === "SUPER_ADMIN" ? Crown : ShieldCheck;

  const save = async () => {
    setSaving(true);
    const r = await updateProfile({ name, phone });
    setSaving(false);
    if (r.ok) { setSaved(true); setTimeout(() => { setSaved(false); setEditing(false); }, 900); }
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 hover:border-brand">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand to-sky-400 text-xs font-bold text-white">{initial}</span>
        <span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-700 sm:inline">{displayName}</span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-100 p-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-sky-400 text-lg font-bold text-white">{initial}</span>
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">{displayName}</p>
              <p className="flex items-center gap-1 truncate text-xs text-slate-400"><Mail size={11} /> {email}</p>
              <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", role === "SUPER_ADMIN" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700")}><RoleIcon size={10} /> {roleName}</span>
            </div>
          </div>

          {editing ? (
            <div className="p-3">
              <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Full name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand" /></label>
              <label className="mt-2 block"><span className="mb-1 block text-xs font-semibold text-slate-600">Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand" /></label>
              <div className="mt-3 flex gap-2">
                <button onClick={save} disabled={saving} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null} {saved ? "Saved" : "Save"}</button>
                <button onClick={() => setEditing(false)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
              </div>
            </div>
          ) : (
            <div className="p-1">
              <button onClick={() => setEditing(true)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"><UserCog size={16} className="text-slate-400" /> Edit profile</button>
              <button onClick={async () => { setOpen(false); await logout(); router.push("/"); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut size={16} className="text-rose-500" /> Logout</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
