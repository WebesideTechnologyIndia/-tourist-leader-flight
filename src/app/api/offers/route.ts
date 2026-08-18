import { NextResponse } from "next/server";
import { getOffers } from "@/lib/benzy";

export const dynamic = "force-dynamic";

export async function GET() {
  const { offers, live } = await getOffers();
  return NextResponse.json({ offers, live });
}
