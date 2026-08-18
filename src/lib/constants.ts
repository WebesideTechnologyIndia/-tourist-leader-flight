import type { Airport } from "./types";

export const BRAND = {
  name: "Tourist Leader",
  tagline: "Make travel caring, seamless, and sustainable",
  promise: "Comfort before, during, and after take off",
};

export const NAV_TABS = [
  { id: "flights", label: "Flights", icon: "Plane", href: "/" },
  { id: "hotels", label: "Hotels", icon: "BedDouble", href: "/hotels" },
  { id: "holidays", label: "Holiday Packages", icon: "Palmtree", href: "/holidays" },
  { id: "bus", label: "Bus", icon: "Bus", href: "/bus" },
  { id: "visa", label: "Visa", icon: "Stamp", href: "/visa" },
] as const;

export const TRIP_TYPES = [
  { id: "ONE_WAY", label: "One Way", info: "Book a flight for a single journey from origin to destination with no return date." },
  { id: "ROUND_TRIP", label: "Round Trip", info: "Book both departure and return flights together to save more and simplify planning." },
  { id: "MULTI_CITY", label: "Multi City", info: "Plan complex itineraries with multiple destinations in one booking. Ideal for business travel, long vacations, and international trips." },
  { id: "GROUP_BOOKING", label: "Group Booking", badge: "New", info: "Booking for 10 or more travellers? Send a group query to unlock attractive bulk discounts, flexible part-payment to reserve seats, and flexibility in passenger names." },
] as const;

export const GROUP_BOOKING_PERKS = [
  "Attractive Bulk Discounts",
  "Flexible payment options (Pay part amount to reserve)",
  "Flexibility in passenger names",
];

export const CABIN_CLASSES = ["Economy", "Premium", "Business"] as const;

export interface PassengerType {
  id: string;
  label: string;
  title: string;
  eligibility?: string[];
  benefits?: string[];
  documents?: string[];
  important?: string[];
}

export const PASSENGER_TYPES: PassengerType[] = [
  {
    id: "REGULAR",
    label: "Regular User",
    title: "Anyone booking a standard flight ticket without any special discount or category",
    benefits: ["Standard fares", "Full baggage allowance", "No additional documentation required"],
  },
  {
    id: "STUDENT",
    label: "Student",
    title: "Special fares for students",
    eligibility: ["Must be 12–26 years old", "Valid student ID or college admission proof required at airport"],
    benefits: ["Special discounted fare", "Extra baggage (subject to airline)"],
    important: ["Failure to show ID during travel, fare difference at check-in may be applied"],
  },
  {
    id: "SENIOR",
    label: "Senior Citizen",
    title: "Reduced fares for senior citizens",
    eligibility: ["Indian nationals aged 60 years or above"],
    benefits: ["Reduced base fare", "Priority assistance at boarding and de-boarding (subject to airline)"],
    documents: ["Government-issued age proof (Aadhaar, Passport, PAN)"],
  },
  {
    id: "DISABILITY",
    label: "Passengers with physical disability",
    title: "Travellers with permanent or temporary physical disabilities (reduced mobility, wheelchair users, limb disability/injury, hearing or visual impairment, other conditions requiring assistance)",
    benefits: [
      "Complimentary wheelchair assistance from check-in to aircraft and arrival exit",
      "Priority check-in & boarding",
      "Seating preferences based on accessibility (aisle/near restrooms)",
      "Extra time allowed during security and boarding",
      "Assistance with baggage (where available)",
      "Discounted fares on select airlines (subject to route and airline policy)",
    ],
    documents: ["Government disability certificate, or", "Doctor's note confirming mobility limitation (temporary injuries allowed)"],
  },
  {
    id: "MOTHERS",
    label: "Expecting/lactating mothers",
    title: "Pregnant women (any trimester), post-delivery mothers traveling with/without infants, and lactating mothers",
    benefits: [
      "Priority check-in and boarding",
      "Preferred seating (aisle/front rows for comfort)",
      "Assistance with cabin baggage",
      "Extra flexibility during security checks",
      "Access to airport mother's room / nursing areas",
      "Option to request a special meal and water support",
      "Stroller assistance for mothers traveling with infants",
    ],
    important: [
      "Up to 27 weeks: Fit to fly; no medical certificate required",
      "28–35 weeks: Airline may require a fitness-to-fly certificate",
      "36+ weeks: Travel may be restricted; depends on airline policy",
      "Lactating mothers may carry additional liquid baby food (security allows exceptions)",
    ],
  },
  {
    id: "ARMED_FORCES",
    label: "Armed Forces",
    title: "Active/Retired Army, Navy, Air Force, Paramilitary (CRPF, BSF, CISF, ITBP, SSB) and military veterans",
    benefits: ["Armed forces concession", "Extra baggage allowance (airline-specific)"],
    documents: ["Valid service ID or veteran card at the airport"],
  },
  {
    id: "MEDICAL",
    label: "Medical Professionals",
    title: "Doctors, nurses, paramedics, healthcare workers",
    eligibility: ["Valid Professional ID / Registration certificate required"],
    benefits: ["Special discounted fare", "Priority medical assistance during travel (airline-dependent)"],
  },
  {
    id: "MINOR",
    label: "Unaccompanied Minor",
    title: "Children 5–12 years traveling without an adult",
    benefits: ["Dedicated airline staff escort", "Assistance at boarding and arrival", "Secure handover to guardian"],
    documents: ["Parent/guardian consent form", "ID copy of minor + receiving adult"],
  },
  {
    id: "GROUP",
    label: "Group of 4+ Passengers",
    title: "Better pricing and guaranteed seats together for 4 or more travellers",
    benefits: ["Better pricing for 4 or more travellers", "Guaranteed seat availability together", "Customised service options"],
    important: ["Groups above 10 passengers may get additional airline discounts (subject to availability)"],
  },
];

export const SORT_OPTIONS = [
  { id: "cheapest", label: "Cheapest", info: "Shows the lowest available fares for your selected route." },
  { id: "fastest", label: "Fastest", info: "Sort by total travel time, including layovers." },
  { id: "earliest", label: "Earliest", info: "Filter flights departing early morning." },
  { id: "latest", label: "Late Departure", info: "Filter flights departing late evening." },
  { id: "choice", label: "Your Choice", info: "Sort manually using preferred filters like airline, stops, baggage, timings." },
] as const;

export interface FareTypeInfo {
  id: string;
  label: string;
  badge?: string;
  tagline: string;
  features: string[];
  multiplier: number; // applied to base price
  accent: string;
}

export const FARE_TYPES: FareTypeInfo[] = [
  {
    id: "FEE_SAVER",
    label: "Fee Saver",
    badge: "Lowest",
    tagline: "Best for budget travellers with fixed plans.",
    features: ["7 kg cabin baggage", "15 kg check-in baggage", "Meals chargeable", "Seats chargeable", "Stricter cancellation & date change rules"],
    multiplier: 0.92,
    accent: "emerald",
  },
  {
    id: "REGULAR",
    label: "Regular",
    tagline: "Balanced fare with standard inclusions.",
    features: ["7 kg cabin baggage", "15 kg check-in baggage", "Paid seat selection", "Paid meal", "Standard cancellation / reschedule"],
    multiplier: 1,
    accent: "sky",
  },
  {
    id: "COMFORT",
    label: "Comfort",
    badge: "Popular",
    tagline: "Value + convenience.",
    features: ["Free standard seat", "Free meal (veg / non-veg)", "7 kg + 15 kg baggage", "Lower change / cancellation fees", "Priority check-in (select airlines)"],
    multiplier: 1.18,
    accent: "violet",
  },
  {
    id: "YOUR_CHOICE",
    label: "Your Choice",
    badge: "Customisable",
    tagline: "Freedom and flexibility — start with Comfort and add on.",
    features: ["Baggage up to 25 kg", "Free date change", "Free cancellation", "Free meals", "Free preferred seats", "Priority check-in"],
    multiplier: 1.42,
    accent: "amber",
  },
];

export const AIRLINES = [
  { code: "AI", name: "Air India", color: "#e31837" },
  { code: "6E", name: "IndiGo", color: "#001b94" },
  { code: "UK", name: "Vistara", color: "#4b286d" },
  { code: "SG", name: "SpiceJet", color: "#e51b24" },
  { code: "QP", name: "Akasa Air", color: "#ff5a00" },
  { code: "I5", name: "AIX Connect", color: "#ce1126" },
];

export const AIRPORTS: Airport[] = [
  { code: "DEL", city: "New Delhi", name: "Indira Gandhi International", country: "India" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj Intl", country: "India" },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda International", country: "India" },
  { code: "MAA", city: "Chennai", name: "Chennai International", country: "India" },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi International", country: "India" },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhas Chandra Bose Intl", country: "India" },
  { code: "GOI", city: "Goa", name: "Dabolim Airport", country: "India" },
  { code: "COK", city: "Kochi", name: "Cochin International", country: "India" },
  { code: "PNQ", city: "Pune", name: "Pune Airport", country: "India" },
  { code: "AMD", city: "Ahmedabad", name: "Sardar Vallabhbai Patel Intl", country: "India" },
  { code: "JAI", city: "Jaipur", name: "Jaipur International", country: "India" },
  { code: "LKO", city: "Lucknow", name: "Chaudhary Charan Singh Intl", country: "India" },
  { code: "DXB", city: "Dubai", name: "Dubai International", country: "UAE" },
  { code: "SIN", city: "Singapore", name: "Changi Airport", country: "Singapore" },
  { code: "JED", city: "Jeddah", name: "King Abdulaziz International", country: "Saudi Arabia" },
  { code: "RUH", city: "Riyadh", name: "King Khalid International", country: "Saudi Arabia" },
  { code: "LHR", city: "London", name: "Heathrow Airport", country: "UK" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi Airport", country: "Thailand" },
];

export const MEALS = [
  { id: "veg", label: "Veg Meal", price: 350, info: "A wholesome vegetarian dish served hot or cold depending on the airline." },
  { id: "nonveg", label: "Non-veg Meal", price: 450, info: "Includes chicken/egg-based dishes based on airline availability." },
  { id: "dryfruits", label: "Dry Fruits Pack", price: 250, info: "Healthy light snack ideal for long flights." },
  { id: "fruits", label: "Fresh Fruit Basket", price: 300, info: "A seasonal fruit platter for health-conscious travellers." },
  { id: "special", label: "Special Dietary Meal", price: 500, info: "Jain / diabetic / gluten-free options on request." },
];

export const CABS = [
  { id: "hatchback", label: "Hatchback", info: "Economical option for 1–3 passengers with small luggage." },
  { id: "sedan", label: "Sedan", info: "Comfortable for 3–4 passengers; great for airport transfers." },
  { id: "suv", label: "SUV", info: "Spacious vehicle with large boot space—ideal for families." },
  { id: "luxury", label: "Luxury", info: "Premium vehicles for business travellers and VIP transfers." },
];

export const AIRPORT_SERVICES = [
  { id: "porter", label: "Porter Service", info: "Helpers assist with luggage at departure and arrival terminals." },
  { id: "meet", label: "Meet & Greet", info: "A dedicated staff member helps from entry to security check or from arrival gate to pick up." },
  { id: "lounge", label: "VIP Lounge", info: "Access air-conditioned lounges with snacks, Wi-Fi, and comfortable seating." },
  { id: "fasttrack", label: "Fast-Track Security", info: "Skip long queues with priority security clearance." },
  { id: "wheelchair", label: "Wheelchair Assistance", info: "Support for elderly or mobility-impaired travellers. (Free for many airlines)" },
];

export const OFFERS = [
  { id: 1, title: "Flat ₹1,500 OFF", subtitle: "on domestic flights with HDFC Bank cards", code: "TLHDFC", bg: "from-rose-500 to-pink-600", image: "/heroes/flights.jpg" },
  { id: 2, title: "Up to ₹3,000 Cashback", subtitle: "Pay via UPI & win assured wallet cashback", code: "TLUPI", bg: "from-indigo-500 to-blue-600", image: "/heroes/forex.jpg" },
  { id: 3, title: "Student Special", subtitle: "Extra baggage + up to 10% off base fare", code: "TLSTUDENT", bg: "from-emerald-500 to-teal-600", image: "/destinations/goa.jpg" },
  { id: 4, title: "Festive Fiesta", subtitle: "Seasonal fares to 100+ destinations", code: "TLFEST", bg: "from-amber-500 to-orange-600", image: "/packages/dubai.jpg" },
];
