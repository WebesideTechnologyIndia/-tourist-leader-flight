import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { GROUP_STATUSES, maskPassenger, type GroupPassenger, type GroupStatus, type JourneyType } from "@/lib/group";
import { buildXlsx, type CellValue } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

/**
 * One row per traveller, not per enquiry: the group desk works the document
 * list, so the enquiry columns repeat down the party. Enquiries filed before
 * documents were collected still export, with the traveller name from the old
 * `passengerNames` list and blank document columns.
 */
const HEADERS = [
  "Enquiry No", "Status", "Filed by", "Received", "Journey", "Trip", "Route",
  "Depart", "Return", "Cabin", "Party size", "Traveller #", "Traveller name",
  "Type", "ID type", "ID number", "Passport no", "Passport expiry", "Nationality",
  "Contact name", "Email", "Phone", "Organisation", "Message", "Internal note",
];

export async function GET(req: NextRequest) {
  const { ok, permissions, tier } = await isAdmin();
  if (!ok || !permissions.includes("enquiries.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Agents hold enquiries.view too — they get the sheet with masked document
  // numbers, matching what the on-screen list shows them.
  const full = tier === "admin";

  const status = req.nextUrl.searchParams.get("status");
  const where = status && GROUP_STATUSES.includes(status as GroupStatus) ? { status } : {};
  const enquiries = await prisma.groupEnquiry.findMany({ where, orderBy: { createdAt: "desc" } });

  const rows: CellValue[][] = [];
  for (const e of enquiries) {
    const journeyType = (e.journeyType || "DOMESTIC") as JourneyType;
    const docs = (Array.isArray(e.passengers) ? e.passengers : []) as unknown as GroupPassenger[];
    const legacyNames = (Array.isArray(e.passengerNames) ? e.passengerNames : []) as unknown as string[];
    const party = e.adults + e.children + e.infants;

    // Fall back to the legacy name list, then to a single row, so an enquiry is
    // never silently missing from the export.
    const travellers: GroupPassenger[] = docs.length
      ? docs
      : legacyNames.length
        ? legacyNames.map((n) => ({ name: n, paxType: "ADULT" as const }))
        : [{ name: "", paxType: "ADULT" as const }];

    travellers.forEach((raw, i) => {
      const p = full ? raw : maskPassenger(raw);
      rows.push([
        e.enquiryNo,
        e.status,
        e.submittedBy === "AGENT" ? "Agent" : "Customer",
        e.createdAt.toISOString().slice(0, 16).replace("T", " "),
        journeyType === "INTERNATIONAL" ? "International" : "Domestic",
        e.tripType === "ROUND_TRIP" ? "Round trip" : "One way",
        `${e.origin} - ${e.destination}`,
        e.departDate,
        e.returnDate || "",
        e.cabinClass,
        party,
        i + 1,
        p.name || "",
        p.paxType || "",
        journeyType === "INTERNATIONAL" ? "" : p.idType || "",
        journeyType === "INTERNATIONAL" ? "" : p.idNumber || "",
        journeyType === "INTERNATIONAL" ? p.passportNo || "" : "",
        journeyType === "INTERNATIONAL" ? p.passportExpiry || "" : "",
        p.nationality || "",
        // Contact details belong to the enquiry; repeat them only on the first
        // traveller so the sheet stays readable when scanning a party.
        i === 0 ? e.name : "",
        i === 0 ? e.email : "",
        i === 0 ? e.phone : "",
        i === 0 ? e.company || "" : "",
        i === 0 ? e.message || "" : "",
        i === 0 ? e.note || "" : "",
      ]);
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const file = buildXlsx("Bulk Booking Enquiries", HEADERS, rows);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bulk-booking-enquiries-${stamp}.xlsx"`,
      "Content-Length": String(file.length),
      "Cache-Control": "no-store",
    },
  });
}
