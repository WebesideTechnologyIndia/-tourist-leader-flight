import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { ALL_PERMISSIONS } from "@/lib/rbac";
import { ensureSystemRoles } from "@/lib/roles";

export const dynamic = "force-dynamic";

function keyify(s: string) {
  return s.toUpperCase().trim().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}
const cleanPerms = (v: unknown): string[] => Array.isArray(v) ? (v as string[]).filter((p) => (ALL_PERMISSIONS as string[]).includes(p)) : [];

export async function GET() {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("roles.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await ensureSystemRoles();
  const [roles, counts] = await Promise.all([
    prisma.role.findMany({ orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }] }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);
  const userCount: Record<string, number> = Object.fromEntries(counts.map((c) => [c.role, c._count._all]));
  return NextResponse.json({ roles: roles.map((r) => ({ ...r, users: userCount[r.key] || 0 })) });
}

export async function POST(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("roles.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const perms = cleanPerms(body.permissions);
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Role name is required" }, { status: 400 });

  // Editing an existing role (by key)
  if (body.key) {
    const existing = await prisma.role.findUnique({ where: { key: body.key } });
    if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });
    if (existing.key === "SUPER_ADMIN") return NextResponse.json({ error: "Super Admin can't be edited" }, { status: 400 });
    const data = existing.isSystem
      ? { permissions: perms } // system roles: only permissions editable
      : { name, description: (body.description || "").trim() || null, permissions: perms };
    const role = await prisma.role.update({ where: { key: body.key }, data });
    return NextResponse.json({ role });
  }

  // Creating a new custom role
  const key = keyify(body.keyHint || name);
  if (!key) return NextResponse.json({ error: "Invalid role name" }, { status: 400 });
  const dupe = await prisma.role.findUnique({ where: { key } });
  if (dupe) return NextResponse.json({ error: "A role with this key already exists" }, { status: 400 });
  const role = await prisma.role.create({ data: { key, name, description: (body.description || "").trim() || null, permissions: perms, isSystem: false } });
  return NextResponse.json({ role });
}

export async function DELETE(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("roles.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  const role = await prisma.role.findUnique({ where: { key } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: "System roles can't be deleted" }, { status: 400 });
  // reassign users on this role back to USER
  await prisma.user.updateMany({ where: { role: key }, data: { role: "USER" } });
  await prisma.role.delete({ where: { key } });
  return NextResponse.json({ ok: true });
}
