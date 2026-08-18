"use client";
import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, ShieldCheck, Crown, Lock, Users as UsersIcon } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { PERMISSION_GROUPS, type Permission } from "@/lib/rbac";
import { cn } from "@/lib/utils";

interface Role { id: string; key: string; name: string; description: string | null; permissions: string[]; isSystem: boolean; users: number }
type Editing = { mode: "new" } | { mode: "edit"; role: Role } | null;

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<Editing>(null);

  const load = () => { setLoading(true); fetch("/api/admin/roles", { cache: "no-store" }).then((r) => r.json()).then((d) => setRoles(d.roles || [])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const remove = async (r: Role) => {
    if (!confirm(`Delete the “${r.name}” role? Users with this role move to User.`)) return;
    setBusy(r.key);
    const res = await fetch(`/api/admin/roles?key=${encodeURIComponent(r.key)}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error || "Could not delete"); }
    setBusy(""); load();
  };

  return (
    <AdminShell title="Roles & Permissions">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{roles.length} role{roles.length !== 1 ? "s" : ""} · assign these to users to control admin access</p>
        <Button onClick={() => setEditing({ mode: "new" })}><Plus size={16} /> Create Role</Button>
      </div>

      {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => {
            const isSuper = r.key === "SUPER_ADMIN";
            return (
              <div key={r.key} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("grid h-9 w-9 place-items-center rounded-xl", isSuper ? "bg-amber-100 text-amber-600" : r.isSystem ? "bg-violet-100 text-violet-600" : "bg-brand/10 text-brand")}>{isSuper ? <Crown size={18} /> : <ShieldCheck size={18} />}</span>
                    <div>
                      <p className="font-bold text-slate-900">{r.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{r.key}</p>
                    </div>
                  </div>
                  {r.isSystem && <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500"><Lock size={9} /> System</span>}
                </div>
                {r.description && <p className="mt-2 text-sm text-slate-500">{r.description}</p>}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><UsersIcon size={12} /> {r.users} user{r.users !== 1 ? "s" : ""}</span>
                  <span>· {isSuper ? "All" : r.permissions.length} permission{r.permissions.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                  {isSuper ? <span className="text-xs text-slate-400">Full access · locked</span> : <>
                    <button onClick={() => setEditing({ mode: "edit", role: r })} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand hover:text-brand"><Pencil size={13} /> Edit</button>
                    {!r.isSystem && <button onClick={() => remove(r)} disabled={busy === r.key} className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">{busy === r.key ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete</button>}
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <RoleEditor editing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </AdminShell>
  );
}

function RoleEditor({ editing, onClose, onSaved }: { editing: NonNullable<Editing>; onClose: () => void; onSaved: () => void }) {
  const isNew = editing.mode === "new";
  const r = editing.mode === "edit" ? editing.role : null;
  const [name, setName] = useState(r?.name || "");
  const [description, setDescription] = useState(r?.description || "");
  const [perms, setPerms] = useState<string[]>(r?.permissions || ["dashboard.view"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lockMeta = !isNew && !!r?.isSystem; // system roles: name/desc locked, perms editable

  const toggle = (p: Permission) => setPerms((c) => c.includes(p) ? c.filter((x) => x !== p) : [...c, p]);
  const toggleGroup = (keys: Permission[], on: boolean) => setPerms((c) => on ? Array.from(new Set([...c, ...keys])) : c.filter((x) => !keys.includes(x as Permission)));

  const save = async () => {
    setError(""); setSaving(true);
    const body = isNew ? { name, description, permissions: perms } : { key: r!.key, name, description, permissions: perms };
    const res = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    setSaving(false);
    if (res.ok) onSaved(); else setError(d.error || "Could not save");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><ShieldCheck size={20} className="text-brand" /> {isNew ? "Create Role" : `Edit · ${r?.name}`}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Role name *</span><input value={name} disabled={lockMeta} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Agent" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-400" /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Description</span><input value={description} disabled={lockMeta} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-400" /></label>
          </div>
          {lockMeta && <p className="mt-2 text-xs text-slate-400">This is a system role — name is fixed, but you can adjust its permissions.</p>}

          <p className="mb-2 mt-5 text-sm font-bold text-slate-900">Permissions</p>
          <div className="space-y-2">
            {PERMISSION_GROUPS.map((g) => {
              const keys = g.items.map((i) => i.key);
              const all = keys.every((k) => perms.includes(k));
              return (
                <div key={g.title} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">{g.title}</p>
                    <button onClick={() => toggleGroup(keys, !all)} className="text-xs font-semibold text-brand hover:underline">{all ? "Clear" : "Select all"}</button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.items.map((it) => (
                      <label key={it.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                        <input type="checkbox" checked={perms.includes(it.key)} onChange={() => toggle(it.key)} className="h-4 w-4 accent-[var(--brand)]" />
                        <span className="text-sm text-slate-700">{it.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}
        </div>
        <div className="flex gap-2 border-t border-slate-100 p-4">
          <Button className="flex-1" onClick={save} disabled={saving || !name.trim()}>{saving ? <Loader2 size={16} className="animate-spin" /> : null} {isNew ? "Create Role" : "Save Changes"}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
