import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok, role, roleName, permissions, tier, user } = await isAdmin();
  return NextResponse.json({ admin: ok, role, roleName, permissions, tier, user });
}
