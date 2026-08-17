/** Minimum travellers for a group booking query. Below this, use a normal booking. */
export const GROUP_MIN_TRAVELLERS = 10;

/** Lifecycle of a group booking enquiry (mirrors the other lead pipelines). */
export const GROUP_STATUSES = ["NEW", "CONTACTED", "QUOTED", "BOOKED", "CLOSED"] as const;
export type GroupStatus = (typeof GROUP_STATUSES)[number];

export const GROUP_STATUS_META: Record<GroupStatus, { label: string; cls: string }> = {
  NEW: { label: "New", cls: "bg-sky-100 text-sky-700" },
  CONTACTED: { label: "Contacted", cls: "bg-amber-100 text-amber-700" },
  QUOTED: { label: "Quoted", cls: "bg-violet-100 text-violet-700" },
  BOOKED: { label: "Booked", cls: "bg-emerald-100 text-emerald-700" },
  CLOSED: { label: "Closed", cls: "bg-slate-100 text-slate-500" },
};

// ------------------------------------------------- journey & documents ----

export const JOURNEY_TYPES = ["DOMESTIC", "INTERNATIONAL"] as const;
export type JourneyType = (typeof JOURNEY_TYPES)[number];

/**
 * Shown whenever the enquiry is international. The airline will not carry a
 * passenger without the destination's visa, and we are not in a position to
 * check it for a bulk party, so it is called out on the form, in the
 * confirmation email and on the admin record.
 */
export const VISA_NOTE = "Please ensure a valid visa for every traveller before the travel date.";

/** Photo IDs accepted on a domestic sector. International always needs a passport. */
export const DOMESTIC_ID_TYPES = [
  "Aadhaar",
  "PAN Card",
  "Voter ID",
  "Driving Licence",
  "Passport",
  "Govt. Photo ID",
] as const;

export const PAX_TYPES = ["ADULT", "CHILD", "INFANT"] as const;
export type PaxType = (typeof PAX_TYPES)[number];

/**
 * One traveller on a bulk enquiry, with the document they will fly on.
 *
 * Declared as a type rather than an interface so it satisfies Prisma's
 * InputJsonValue constraint when written to the `passengers` Json column.
 */
export type GroupPassenger = {
  name: string;
  paxType: PaxType;
  /** Domestic only — which photo ID they will carry. */
  idType?: string;
  /** Domestic only — the number on that ID. */
  idNumber?: string;
  /** International only — mandatory. */
  passportNo?: string;
  /** International only — mandatory, ISO yyyy-mm-dd. */
  passportExpiry?: string;
  nationality?: string;
}

/**
 * Validate one traveller row. Returns a field→message map so the form can mark
 * the offending inputs and the API can reject with the same wording.
 *
 * Domestic asks for any photo ID; international requires a passport number and
 * expiry, per the client's brief.
 */
export function validatePassenger(p: GroupPassenger, journeyType: JourneyType, index: number): Record<string, string> {
  const errors: Record<string, string> = {};
  const at = `Traveller ${index + 1}`;
  if (!(p.name || "").trim()) errors[`p${index}.name`] = `${at}: name is required`;

  if (journeyType === "INTERNATIONAL") {
    if (!(p.passportNo || "").trim()) errors[`p${index}.passportNo`] = `${at}: passport number is mandatory for international travel`;
    const expiry = (p.passportExpiry || "").trim();
    if (!expiry) errors[`p${index}.passportExpiry`] = `${at}: passport expiry is mandatory for international travel`;
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) errors[`p${index}.passportExpiry`] = `${at}: passport expiry must be a date`;
  } else {
    if (!(p.idType || "").trim()) errors[`p${index}.idType`] = `${at}: choose an ID type`;
    if (!(p.idNumber || "").trim()) errors[`p${index}.idNumber`] = `${at}: ID number is required`;
  }
  return errors;
}

/** Validate the whole traveller list. Empty object means it is good to submit. */
export function validatePassengers(list: GroupPassenger[], journeyType: JourneyType): Record<string, string> {
  return list.reduce<Record<string, string>>(
    (acc, p, i) => Object.assign(acc, validatePassenger(p, journeyType, i)),
    {}
  );
}

/**
 * Keep only the last 4 characters of a document number.
 *
 * Passport, Aadhaar and PAN numbers are sensitive personal data, and the AGENT
 * role holds `enquiries.view`, so every agent can open this list. Masking runs
 * on the server: the full number is never sent to a browser that is not on the
 * admin tier.
 */
export function maskDocumentNumber(v?: string): string {
  const s = (v || "").trim();
  if (!s) return "";
  if (s.length <= 4) return "•".repeat(s.length);
  return "•".repeat(Math.min(s.length - 4, 8)) + s.slice(-4);
}

/** Copy of a traveller with document numbers masked. */
export function maskPassenger(p: GroupPassenger): GroupPassenger {
  return {
    ...p,
    idNumber: maskDocumentNumber(p.idNumber),
    passportNo: maskDocumentNumber(p.passportNo),
  };
}

/** Human-readable document summary for the admin list and the Excel export. */
export function documentSummary(p: GroupPassenger, journeyType: JourneyType): string {
  if (journeyType === "INTERNATIONAL") {
    const no = (p.passportNo || "").trim();
    if (!no) return "";
    const exp = (p.passportExpiry || "").trim();
    return exp ? `Passport ${no} (exp ${exp})` : `Passport ${no}`;
  }
  const type = (p.idType || "").trim();
  const no = (p.idNumber || "").trim();
  if (!type && !no) return "";
  return [type, no].filter(Boolean).join(" ");
}
