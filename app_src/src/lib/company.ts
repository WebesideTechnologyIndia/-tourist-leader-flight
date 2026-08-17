/**
 * Tourist Leader's own legal identity, as it must appear on a GST tax invoice.
 *
 * A tax invoice is a statutory document: it has to carry the issuer's registered
 * name and address, GSTIN, PAN, CIN, the SAC code for the service and the place
 * of supply. None of these can be guessed, so they come from environment
 * variables and the invoice shows a visible placeholder until they are filled
 * in — better an obvious gap than a plausible-looking wrong number on a
 * document the agent files with their returns.
 *
 * Values mirror what MakeMyTrip prints on the invoices they issue to us as an
 * agent, which is the format the client asked us to match.
 */

/** Marker rendered when a statutory field has not been configured yet. */
export const NOT_SET = "— not configured —";

function env(key: string): string {
  return (process.env[key] || "").trim();
}

export interface CompanyIdentity {
  legalName: string;
  addressLines: string[];
  gstin: string;
  pan: string;
  cin: string;
  /** SAC for "Reservation services for air transportation" — MMT bills 998551. */
  sac: string;
  serviceDescription: string;
  /** State whose GST applies to the platform's own supplies. */
  placeOfSupply: string;
  supportEmail: string;
  /** True only when every statutory field is present. */
  complete: boolean;
}

export function companyIdentity(): CompanyIdentity {
  const legalName = env("COMPANY_LEGAL_NAME");
  const address = env("COMPANY_ADDRESS");
  const gstin = env("COMPANY_GSTIN");
  const pan = env("COMPANY_PAN");
  const cin = env("COMPANY_CIN");
  const sac = env("COMPANY_SAC") || "998551";
  const placeOfSupply = env("COMPANY_PLACE_OF_SUPPLY");

  return {
    legalName: legalName || "Tourist Leader",
    addressLines: address ? address.split("|").map((l) => l.trim()).filter(Boolean) : [NOT_SET],
    gstin: gstin || NOT_SET,
    pan: pan || NOT_SET,
    cin: cin || NOT_SET,
    sac,
    serviceDescription: env("COMPANY_SERVICE_DESC") || "Reservation Services For Air Transportation",
    placeOfSupply: placeOfSupply || NOT_SET,
    supportEmail: env("SUPPORT_EMAIL") || env("SMTP_USER") || "",
    complete: Boolean(legalName && address && gstin && pan && placeOfSupply),
  };
}

/**
 * Invoice number for the platform's own tax invoice on a booking.
 *
 * Derived from the booking reference so it is stable and unique without a
 * separate counter — re-printing an invoice must never mint a new number.
 */
export function taxInvoiceNo(bookingRef: string): string {
  // Booking refs already start with TL, so don't stutter the prefix.
  const ref = bookingRef.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return ref.startsWith("TL") ? `INV${ref}` : `INVTL${ref}`;
}
