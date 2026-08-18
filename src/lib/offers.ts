export type OfferCategory = "BANK" | "WALLET" | "FLIGHT" | "HOTEL" | "SEASONAL";

export interface Offer {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  category: OfferCategory;
  discount: string;
  minBooking?: string;
  validTill?: string;
  bg: string; // gradient classes
  terms: string[];
}

/** Is this a recognised promo code (case-insensitive)? */
export function isKnownPromo(code: string): boolean {
  const c = (code || "").trim().toUpperCase();
  return DEMO_OFFERS.some((o) => o.code === c);
}

/**
 * Instant rupee discount a promo code applies to the discountable base (fare + add-ons).
 * Returns 0 for unknown codes, below-minimum bookings, or cashback/bonus codes
 * (TLUPI / TLWALLET) which are credited to the wallet after payment, not at checkout.
 */
export function promoDiscount(code: string, base: number): number {
  const c = (code || "").trim().toUpperCase();
  if (base <= 0) return 0;
  switch (c) {
    case "TLHDFC": return base >= 5000 ? Math.min(1500, base) : 0;                 // flat ₹1,500 · min ₹5,000
    case "TLICICI": return base >= 8000 ? Math.min(2000, Math.round(base * 0.1)) : 0; // 10% · max ₹2,000 · min ₹8,000
    case "TLSTUDENT": return Math.round(base * 0.1);                                // 10% off base fare
    case "TLSENIOR": return Math.min(600, base);                                    // up to ₹600
    case "TLFEST": return Math.round(base * 0.15);                                  // festive ~15%
    case "TLSTAY": return Math.min(3000, Math.round(base * 0.25));                  // hotels 25% · max ₹3,000
    default: return 0;
  }
}

export const OFFER_CATEGORIES: { id: OfferCategory | "ALL"; label: string }[] = [
  { id: "ALL", label: "All Offers" },
  { id: "BANK", label: "Bank Offers" },
  { id: "WALLET", label: "Wallet & UPI" },
  { id: "FLIGHT", label: "Flights" },
  { id: "HOTEL", label: "Hotels" },
  { id: "SEASONAL", label: "Seasonal" },
];

export const DEMO_OFFERS: Offer[] = [
  {
    id: "1", code: "TLHDFC", category: "BANK", title: "Flat ₹1,500 OFF", subtitle: "on domestic flights with HDFC Bank Credit Cards",
    discount: "Flat ₹1,500 OFF", minBooking: "Min. booking ₹5,000", validTill: "30 Jun 2026", bg: "from-rose-500 to-pink-600",
    terms: ["Valid on HDFC Bank Credit & Debit Cards.", "Minimum booking amount ₹5,000.", "Maximum discount ₹1,500 per transaction.", "Applicable on domestic flights only."],
  },
  {
    id: "2", code: "TLUPI", category: "WALLET", title: "Up to ₹3,000 Cashback", subtitle: "Pay via UPI & win assured wallet cashback",
    discount: "Up to ₹3,000 Cashback", minBooking: "No minimum", validTill: "31 Jul 2026", bg: "from-indigo-500 to-blue-600",
    terms: ["Pay using any UPI app at checkout.", "Cashback credited to Tourist Leader wallet within 24 hours.", "1 cashback per user per week."],
  },
  {
    id: "3", code: "TLSTUDENT", category: "FLIGHT", title: "Student Special", subtitle: "Extra baggage + up to 10% off base fare",
    discount: "Up to 10% OFF", minBooking: "Valid student ID required", validTill: "31 Dec 2026", bg: "from-emerald-500 to-teal-600",
    terms: ["Select the Student special fare while booking.", "Carry a valid student ID at the airport.", "Extra baggage subject to airline policy."],
  },
  {
    id: "4", code: "TLFEST", category: "SEASONAL", title: "Festive Fiesta", subtitle: "Seasonal fares to 100+ destinations",
    discount: "Up to 40% OFF", minBooking: "Limited period", validTill: "15 Aug 2026", bg: "from-amber-500 to-orange-600",
    terms: ["Discount varies by route and travel date.", "Subject to availability.", "Cannot be clubbed with other offers."],
  },
  {
    id: "5", code: "TLICICI", category: "BANK", title: "10% Instant Discount", subtitle: "on hotels & holiday packages with ICICI Cards",
    discount: "10% Instant OFF", minBooking: "Min. booking ₹8,000", validTill: "30 Jun 2026", bg: "from-orange-500 to-red-600",
    terms: ["Valid on ICICI Bank Credit Cards.", "Maximum discount ₹2,000.", "Applicable on hotels and holiday packages."],
  },
  {
    id: "6", code: "TLSTAY", category: "HOTEL", title: "Flat 25% OFF on Hotels", subtitle: "Stay more, save more across 50,000+ hotels",
    discount: "Flat 25% OFF", minBooking: "Min. 2 nights", validTill: "30 Sep 2026", bg: "from-violet-500 to-purple-600",
    terms: ["Minimum 2-night stay required.", "Maximum discount ₹3,000.", "Valid on select hotels."],
  },
  {
    id: "7", code: "TLWALLET", category: "WALLET", title: "₹500 Wallet Bonus", subtitle: "Add ₹2,000 to wallet & get ₹500 extra",
    discount: "₹500 Bonus", minBooking: "Add ₹2,000", validTill: "31 Jul 2026", bg: "from-sky-500 to-cyan-600",
    terms: ["Add ₹2,000 or more to your Tourist Leader wallet.", "Bonus credited instantly.", "One-time per user."],
  },
  {
    id: "8", code: "TLSENIOR", category: "FLIGHT", title: "Senior Citizen Fare", subtitle: "Reduced base fare + priority assistance",
    discount: "Up to ₹600 OFF", minBooking: "Age 60+", validTill: "31 Dec 2026", bg: "from-teal-500 to-emerald-600",
    terms: ["Select the Senior Citizen fare while booking.", "Carry a government age proof.", "Priority assistance subject to airline."],
  },
];
