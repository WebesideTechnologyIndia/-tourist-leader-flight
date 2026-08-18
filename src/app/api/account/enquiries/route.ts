import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** All enquiries (package / forex / visa / insurance) raised by the signed-in user or their email. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ enquiries: [] });
  const where = { OR: [{ userId: user.id }, { email: user.email }] };
  try {
    const [pkg, forex, visa, ins] = await Promise.all([
      prisma.packageEnquiry.findMany({ where, orderBy: { createdAt: "desc" }, take: 25 }),
      prisma.forexEnquiry.findMany({ where, orderBy: { createdAt: "desc" }, take: 25 }),
      prisma.visaEnquiry.findMany({ where, orderBy: { createdAt: "desc" }, take: 25 }),
      prisma.insuranceEnquiry.findMany({ where, orderBy: { createdAt: "desc" }, take: 25 }),
    ]);
    const enquiries = [
      ...pkg.map((e) => ({ id: e.id, kind: "PACKAGE", enquiryNo: e.enquiryNo, title: e.packageTitle, status: e.status, createdAt: e.createdAt })),
      ...forex.map((e) => ({ id: e.id, kind: "FOREX", enquiryNo: e.enquiryNo, title: e.type === "CARD" ? "Forex Card" : "Currency Notes", status: e.status, createdAt: e.createdAt })),
      ...visa.map((e) => ({ id: e.id, kind: "VISA", enquiryNo: e.enquiryNo, title: `${e.country} Visa`, status: e.status, createdAt: e.createdAt })),
      ...ins.map((e) => ({ id: e.id, kind: "INSURANCE", enquiryNo: e.enquiryNo, title: `${cap(e.type)} Insurance`, status: e.status, createdAt: e.createdAt })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return NextResponse.json({ enquiries });
  } catch {
    return NextResponse.json({ enquiries: [] });
  }
}
