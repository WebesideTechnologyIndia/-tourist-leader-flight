import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin, isAdminEmail } from "@/lib/auth";
import { ensureSystemRoles } from "@/lib/roles";

export const dynamic = "force-dynamic";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("users.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await ensureSystemRoles();
  const [rows, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" }, take: 500,
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true, _count: { select: { bookings: true } } },
    }),
    prisma.role.findMany({ where: { key: { not: "SUPER_ADMIN" } }, orderBy: [{ isSystem: "desc" }, { name: "asc" }], select: { key: true, name: true } }),
  ]);
  const roleName: Record<string, string> = Object.fromEntries(roles.map((r) => [r.key, r.name]));
  roleName.SUPER_ADMIN = "Super Admin";
  const users = rows.map((u) => ({ ...u, bookings: u._count.bookings, superAdmin: isAdminEmail(u.email), roleName: roleName[u.role] || u.role }));
  return NextResponse.json({ users, roles, canManage: permissions.includes("users.manage"), canManageRoles: permissions.includes("users.manage_roles") });
}

export async function POST(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("users.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { email, name, phone, role } = await req.json();
  if (!emailRe.test((email || "").trim())) return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (exists) return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
  if (role && permissions.includes("users.manage_roles") === false && role !== "USER") {
    return NextResponse.json({ error: "You can't assign roles" }, { status: 403 });
  }
  const user = await prisma.user.create({
    data: { email: email.trim().toLowerCase(), name: (name || "").trim() || null, phone: (phone || "").trim() || null, role: role || "USER" },
    select: { id: true, email: true },
  });
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, name, phone, role } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (isAdminEmail(target.email)) return NextResponse.json({ error: "Super Admin can't be modified" }, { status: 400 });

  const data: Record<string, string | null> = {};
  if (name !== undefined || phone !== undefined) {
    if (!permissions.includes("users.manage")) return NextResponse.json({ error: "You can't edit users" }, { status: 403 });
    if (name !== undefined) data.name = (name || "").trim() || null;
    if (phone !== undefined) data.phone = (phone || "").trim() || null;
  }
  if (role !== undefined) {
    if (!permissions.includes("users.manage_roles")) return NextResponse.json({ error: "Only the Super Admin can change roles" }, { status: 403 });
    data.role = role;
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { ok, permissions, user: me } = await isAdmin();
  if (!ok || !permissions.includes("users.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (isAdminEmail(target.email)) return NextResponse.json({ error: "Super Admin can't be deleted" }, { status: 400 });
  if (me?.id === id) return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
  // detach bookings (keep records), then delete user
  await prisma.booking.updateMany({ where: { userId: id }, data: { userId: null } });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
