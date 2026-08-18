"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, ShieldCheck, Shield, Crown, Plus, Pencil, Trash2, X, UserPlus } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { formatDate, cn } from "@/lib/utils";

interface U { id: string; email: string; name: string | null; phone: string | null; role: string; roleName: string; createdAt: string; bookings: number; superAdmin: boolean }
interface RoleOpt { key: string; name: string }
type Editing = { mode: "new" } | { mode: "edit"; user: U } | null;

export default function AdminUsersPage() {
  const [rows, setRows] = useState<U[]>([]);
  const [roles, setRoles] = useState<RoleOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      setRows(d.users || []); setRoles(d.roles || []); setCanManage(!!d.canManage); setCanManageRoles(!!d.canManageRoles);
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (u: U) => {
    if (!confirm(`Delete ${u.email}? Their bookings are kept but unlinked. This can't be undone.`)) return;
    setBusy(u.id);
    const res = await fetch(`/api/admin/users?id=${u.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error || "Could not delete"); }
    setBusy(""); load();
  };

  const filtered = useMemo(() => { const s = q.toLowerCase().trim(); return s ? rows.filter((u) => `${u.name} ${u.email} ${u.phone} ${u.roleName}`.toLowerCase().includes(s)) : rows; }, [rows, q]);

  const roleBadge = (u: U) => u.superAdmin
    ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700"><Crown size={11} /> Super Admin</span>
    : u.role === "USER"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500"><Shield size={11} /> {u.roleName}</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700"><ShieldCheck size={11} /> {u.roleName}</span>;

  return (
    <AdminShell title="Users">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{rows.length} registered user{rows.length !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100"><Search size={15} className="text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="w-40 bg-transparent text-sm outline-none sm:w-52" /></div>
          {canManage && <Button onClick={() => setEditing({ mode: "new" })}><Plus size={16} /> Add User</Button>}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400"><th className="px-4 py-3">User</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Role</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand to-sky-400 text-xs font-bold text-white">{(u.name || u.email).charAt(0).toUpperCase()}</span><div><p className="font-semibold text-slate-800">{u.name || "—"}</p><p className="text-xs text-slate-400">{u.email}</p></div></div></td>
                  <td className="px-4 py-3 text-slate-600">{u.phone || "—"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{u.bookings}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">{roleBadge(u)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {(canManage || canManageRoles) && !u.superAdmin ? <>
                        <button onClick={() => setEditing({ mode: "edit", user: u })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand" title="Edit"><Pencil size={15} /></button>
                        {canManage && <button onClick={() => remove(u)} disabled={busy === u.id} className="grid h-8 w-8 place-items-center rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">{busy === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}</button>}
                      </> : <span className="text-xs text-slate-300">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && <UserModal editing={editing} roles={roles} canManageRoles={canManageRoles} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </AdminShell>
  );
}

function UserModal({ editing, roles, canManageRoles, onClose, onSaved }: { editing: NonNullable<Editing>; roles: RoleOpt[]; canManageRoles: boolean; onClose: () => void; onSaved: () => void }) {
  const isNew = editing.mode === "new";
  const u = editing.mode === "edit" ? editing.user : null;
  const [email, setEmail] = useState(u?.email || "");
  const [name, setName] = useState(u?.name || "");
  const [phone, setPhone] = useState(u?.phone || "");
  const [role, setRole] = useState(u?.role || "USER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError(""); setSaving(true);
    const body = isNew ? { email, name, phone, role } : { id: u!.id, name, phone, ...(canManageRoles ? { role } : {}) };
    const res = await fetch("/api/admin/users", { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    setSaving(false);
    if (res.ok) onSaved(); else setError(d.error || "Could not save");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><UserPlus size={20} className="text-brand" /> {isNew ? "Add User" : "Edit User"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Email {isNew && "*"}</span><input type="email" value={email} disabled={!isNew} onChange={(e) => setEmail(e.target.value)} placeholder="user@email.com" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-400" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Full name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Role {!canManageRoles && <span className="text-slate-400">(needs role permission)</span>}</span>
            <select value={role} disabled={!canManageRoles} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-400">
              {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </label>
          {isNew && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">No password needed — the user signs in with an email OTP.</p>}
          {error && <p className={cn("rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600")}>{error}</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : null} {isNew ? "Create User" : "Save Changes"}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
