import { prisma } from "./prisma";
import type { BillTo } from "./invoice";

/** Minimal booking shape needed to resolve the billing party. */
interface BillableBooking {
  bookedByAgentId: string | null;
  passengers?: unknown;
  contactEmail: string;
  contactPhone: string;
  customerState?: string | null;
}

function customerBillTo(b: BillableBooking): BillTo {
  const passengers = b.passengers as { fullName?: string }[] | null | undefined;
  return {
    label: "Billed To",
    name: passengers?.[0]?.fullName || "Guest",
    lines: [
      ...(b.contactEmail ? [b.contactEmail] : []),
      ...(b.contactPhone ? [b.contactPhone] : []),
      ...(b.customerState ? [b.customerState] : []),
    ],
  };
}

/**
 * Resolve the "Billed To" party for each booking and attach it as `billTo`:
 *  - agent bookings (bookedByAgentId set) → the agency's name/address/GSTIN from their registration
 *  - direct customer bookings → the customer's name/email/phone/state
 * Agency rows are batch-loaded to avoid an N+1.
 */
export async function attachBillTo<T extends BillableBooking>(bookings: T[]): Promise<(T & { billTo: BillTo; agentName: string | null })[]> {
  const agentIds = [...new Set(bookings.map((b) => b.bookedByAgentId).filter((id): id is string => !!id))];
  // Agency details live in AgentApplication; the agent's User row is the fallback
  // when no registration exists (e.g. role granted directly by an admin).
  const [apps, users] = agentIds.length
    ? await Promise.all([
        prisma.agentApplication.findMany({ where: { userId: { in: agentIds } } }),
        prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true, email: true, phone: true, state: true } }),
      ])
    : [[], []];
  const appByUser = new Map(apps.map((a) => [a.userId as string, a]));
  const userById = new Map(users.map((u) => [u.id, u]));

  return bookings.map((b) => {
    if (b.bookedByAgentId) {
      const app = appByUser.get(b.bookedByAgentId);
      if (app) {
        const cityState = [app.city, app.state].filter(Boolean).join(", ");
        return {
          ...b,
          agentName: app.agencyName || app.fullName || null,
          billTo: {
            label: "Billed To (Agent)",
            name: app.agencyName || app.fullName,
            lines: [
              ...(app.address ? [app.address] : []),
              ...(cityState ? [cityState] : []),
              ...(app.gstNumber ? [`GSTIN: ${app.gstNumber}`] : []),
              ...(app.phone ? [app.phone] : []),
              ...(app.email ? [app.email] : []),
            ],
          },
        };
      }
      // No agency registration on file → still bill the agent (never the customer), from their User record.
      const u = userById.get(b.bookedByAgentId);
      if (u) {
        return {
          ...b,
          agentName: u.name || u.email || "Agent",
          billTo: {
            label: "Billed To (Agent)",
            name: u.name || u.email || "Agent",
            lines: [
              ...(u.email ? [u.email] : []),
              ...(u.phone ? [u.phone] : []),
              ...(u.state ? [u.state] : []),
            ],
          },
        };
      }
    }
    return { ...b, agentName: null, billTo: customerBillTo(b) };
  });
}
