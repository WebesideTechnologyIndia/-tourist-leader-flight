export interface Currency {
  code: string;
  symbol: string;
  rate: number; // value of 1 INR in this currency
  label: string;
  locale: string;
}

// Indicative conversion rates (INR is the base / settlement currency).
export const CURRENCIES: Currency[] = [
  { code: "INR", symbol: "₹", rate: 1, label: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", rate: 0.012, label: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", rate: 0.011, label: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "£", rate: 0.0094, label: "British Pound", locale: "en-GB" },
  { code: "AED", symbol: "AED ", rate: 0.044, label: "UAE Dirham", locale: "en-AE" },
  { code: "SGD", symbol: "S$", rate: 0.016, label: "Singapore Dollar", locale: "en-SG" },
];

export interface Language {
  code: string;
  label: string;
  native: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "mr", label: "Marathi", native: "मराठी" },
];

export function currencyByCode(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function languageByCode(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** Convert an INR amount to the given currency and format it with the right symbol/locale. */
export function formatMoney(inr: number, code: string): string {
  const c = currencyByCode(code);
  const value = (inr || 0) * c.rate;
  if (c.code === "INR") {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
  }
  const decimals = Math.abs(value) > 0 && Math.abs(value) < 100 ? 2 : 0;
  return `${c.symbol}${value.toLocaleString(c.locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// Header-chrome strings that visibly switch with the selected language.
type StringKey = "listProperty" | "listPropertySub" | "tlBiz" | "tlBizSub" | "myTrips" | "myTripsSub" | "wishlist" | "wishlistSub" | "currency" | "language" | "preferences" | "payNote";

export const STRINGS: Record<string, Record<StringKey, string>> = {
  en: {
    listProperty: "List Your Property", listPropertySub: "Grow your business!",
    tlBiz: "TL Biz", tlBizSub: "Business Travel",
    myTrips: "My Dashboard", myTripsSub: "Manage bookings",
    wishlist: "Wishlist", wishlistSub: "Saved favourites",
    currency: "Currency", language: "Language", preferences: "Preferences",
    payNote: "Prices are indicative. Payments are processed in INR.",
  },
  hi: {
    listProperty: "अपनी प्रॉपर्टी जोड़ें", listPropertySub: "अपना व्यापार बढ़ाएँ!",
    tlBiz: "TL बिज़", tlBizSub: "बिज़नेस ट्रैवल",
    myTrips: "मेरा डैशबोर्ड", myTripsSub: "बुकिंग प्रबंधित करें",
    wishlist: "पसंदीदा", wishlistSub: "सहेजे गए",
    currency: "मुद्रा", language: "भाषा", preferences: "प्राथमिकताएँ",
    payNote: "कीमतें सांकेतिक हैं। भुगतान INR में होता है।",
  },
};

export function strings(lang: string): Record<StringKey, string> {
  return STRINGS[lang] ?? STRINGS.en;
}
