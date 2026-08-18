import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  // `tier` lets the UI show agent-only controls (e.g. the agent service charge at checkout).
  const { user, tier } = await isAdmin();
  return NextResponse.json({ user, tier });
}
