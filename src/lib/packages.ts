export interface ItineraryDay {
  day: number;
  title: string;
  summary?: string;
  points: string[];
}

export interface Package {
  id: string;
  slug: string;
  title: string;
  destination: string;
  country: string;
  nights: number;
  days: number;
  image: string;
  priceINR: number; // from price, per person
  priceUSD?: number;
  rating: number;
  reviews: number;
  categories: string[]; // HONEYMOON | VISA_FREE | GROUP | CRUISE | LAST_MINUTE | BEACH | FAMILY
  themes: string[];
  bestTime: string;
  overview: string;
  highlights: string[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  paymentPolicy: string[];
  cancellationPolicy: string[];
  childPolicy: string[];
}

export const PACKAGE_CATEGORIES = [
  { id: "ALL", label: "All Packages" },
  { id: "HONEYMOON", label: "Honeymoon" },
  { id: "VISA_FREE", label: "Visa Free" },
  { id: "GROUP", label: "Group Tours" },
  { id: "BEACH", label: "Beach & Islands" },
  { id: "FAMILY", label: "Family" },
  { id: "LAST_MINUTE", label: "Last Minute Deals" },
];

export const DEMO_PACKAGES: Package[] = [
  {
    id: "phu-quoc-vietnam",
    slug: "phu-quoc-vietnam",
    title: "Phu Quoc Island Escape",
    destination: "Phu Quoc, Vietnam",
    country: "Vietnam",
    nights: 4,
    days: 5,
    image: "/packages/vietnam.jpg",
    priceINR: 26499,
    priceUSD: 319,
    rating: 4.7,
    reviews: 312,
    categories: ["BEACH", "GROUP", "FAMILY", "VISA_FREE"],
    themes: ["Islands", "Water Parks", "Sightseeing", "Cable Car"],
    bestTime: "Nov – Apr",
    overview:
      "Discover Vietnam's tropical paradise with 4 nights in Phu Quoc — island hopping, the world's longest sea-crossing cable car, Vinpearl Safari, VinWonders and Grand World. A caring, seamless escape with English-speaking guides, all transfers and entrance fees included.",
    highlights: [
      "4 Nights stay in Phu Quoc with daily breakfast",
      "4 Island Tour + Aquatopia Water Park + Cable Car (with lunch)",
      "Phu Quoc South City Tour with lunch",
      "Vinpearl Safari + VinWonders + Grand World combo",
      "Return airport transfers & English-speaking guide",
    ],
    itinerary: [
      {
        day: 1,
        title: "Arrive in Phu Quoc",
        summary: "Arrival, hotel transfer & day at leisure",
        points: [
          "Arrival at Phu Quoc Airport.",
          "Meet our representative outside the arrival gate holding your name placard.",
          "Transfer to your hotel in Phu Quoc.",
          "Day at leisure to relax and settle in.",
        ],
      },
      {
        day: 2,
        title: "4 Island Tour + Aquatopia + Cable Car",
        summary: "Island hopping, water park & sunset cable car",
        points: [
          "08:15–08:30: Pick up at hotel lobby, drive to An Thoi Harbour.",
          "Speedboat to 3 islands — Buom Island (swim & snorkel), Gam Ghi Island (snorkel at coral reef), May Rut Island (photos, SUP, chill-out).",
          "Lunch on the island.",
          "Optional: Sea walker — walk into the ocean to see fish & coral reefs (own payment).",
          "Thom Island — Aquatopia Water Park & Theme Park with 20+ modern games.",
          "Ride the world's longest sea-crossing cable car to see the sunset over Phu Quoc.",
          "Return to hotel.",
        ],
      },
      {
        day: 3,
        title: "Phu Quoc South City Tour",
        summary: "Culture, pagoda & Sao Beach with lunch",
        points: [
          "08:00–09:00: Pick up at hotel lobby.",
          "Pearl cultural area, Sim wine factory & Pepper Garden.",
          "Traditional fish sauce barrel house & Ho Quoc Pagoda.",
          "Sao Beach — lunch and swimming.",
          "Phu Quoc Prison.",
          "16:30: Return to the hotel.",
        ],
      },
      {
        day: 4,
        title: "Vinpearl Safari + VinWonders + Grand World",
        summary: "Combo tour with shows & dinner area",
        points: [
          "08:00–09:00: Pick up at hotel lobby.",
          "Vinpearl Safari & VinWonders theme park.",
          "13:00: Lunch (pizza) at VinWonders.",
          "19:00: Watch the 'Once' show.",
          "20:00: Grand World · 21:30: Colour of Venice show.",
          "22:00: Back to hotel.",
        ],
      },
      {
        day: 5,
        title: "Departure",
        summary: "Breakfast, check-out & airport drop",
        points: [
          "Breakfast at the hotel.",
          "Check-out at 11:30 AM (late check-out on request, subject to hotel terms).",
          "Day at leisure for shopping / personal activities.",
          "Departure drop to the airport.",
        ],
      },
    ],
    inclusions: [
      "Accommodation in twin/double room with daily breakfast",
      "Meals (B/L/D) as indicated in the program",
      "All transfers & transportation with air-conditioned vehicles",
      "Local English-speaking guide",
      "All entrance fees as per program",
      "Government tax and service charge",
      "02 bottles of mineral water per person per day on transfer/sightseeing days",
    ],
    exclusions: [
      "Flight tickets (international and domestic)",
      "Visa to enter Vietnam for foreign nationals",
      "Excess baggage fees & personal expenses / laundry",
      "Early check-in and late check-out",
      "Optional excursions and activities",
      "Meals & drinks other than those mentioned in the program",
      "Personal insurance, peak-season surcharges (if any)",
      "5% TCS & USD 35 remittance charges",
    ],
    paymentPolicy: [
      "Pay 50% token amount to hold your package.",
      "Balance 50% before 30 days from travel date for confirmation.",
      "We accept bank transfers / Western Union transfer.",
    ],
    cancellationPolicy: [
      "Holding amount (50%) is non-refundable.",
      "Before 1 month of travel date: 50% charged.",
      "Before 15 days: 70% charged + flight, visa & insurance charges.",
      "Before 10 days: 100% charged.",
      "Cancellation must be notified via email and confirmed by the company.",
    ],
    childPolicy: [
      "Infants under 2 years sharing a room with parents: free.",
      "Children below 6 years: charged 50%.",
      "Below 12 sharing room with 1 adult: 90%.",
      "Below 12 with extra bed sharing with parents: 75%.",
      "Below 12 with no extra bed sharing with parents: 65%.",
    ],
  },
  {
    id: "bali-indonesia",
    slug: "bali-romance",
    title: "Bali Romantic Getaway",
    destination: "Bali, Indonesia",
    country: "Indonesia",
    nights: 5,
    days: 6,
    image: "/packages/bali.jpg",
    priceINR: 38999,
    rating: 4.8,
    reviews: 540,
    categories: ["HONEYMOON", "BEACH", "VISA_FREE"],
    themes: ["Beaches", "Temples", "Romantic", "Waterfalls"],
    bestTime: "Apr – Oct",
    overview: "A dreamy 5-night Bali honeymoon — Ubud rice terraces, sacred temples, romantic candle-lit dinner and pristine beaches, with a private pool villa night.",
    highlights: ["Romantic candle-light dinner on the beach", "Ubud, Tegalalang rice terraces & Tanah Lot", "Watersports at Nusa Dua", "Honeymoon décor & flower bath", "All transfers + English guide"],
    itinerary: [
      { day: 1, title: "Arrive in Bali", points: ["Airport pickup & transfer to resort.", "Welcome drink & honeymoon room décor.", "Evening at leisure on the beach."] },
      { day: 2, title: "Ubud & Kintamani", points: ["Tegalalang rice terraces & swing.", "Kintamani volcano view with lunch.", "Tirta Empul holy spring temple."] },
      { day: 3, title: "Watersports & Uluwatu", points: ["Nusa Dua watersports (banana boat, jet ski).", "Uluwatu temple & Kecak fire dance.", "Romantic seafood dinner at Jimbaran Bay."] },
      { day: 4, title: "Nusa Penida Island", points: ["Speedboat to Nusa Penida.", "Kelingking & Broken Beach.", "Snorkelling at Crystal Bay."] },
      { day: 5, title: "Leisure & Tanah Lot", points: ["Spa & couple massage.", "Sunset at Tanah Lot temple.", "Candle-light dinner."] },
      { day: 6, title: "Departure", points: ["Breakfast & check-out.", "Shopping at Kuta.", "Airport drop."] },
    ],
    inclusions: ["5 nights stay with breakfast", "All transfers in AC vehicle", "English-speaking guide", "Entrance fees as per itinerary", "Honeymoon inclusions (décor, dinner)"],
    exclusions: ["Flights & visa", "Lunch & dinner unless mentioned", "Personal expenses", "Optional activities", "Insurance"],
    paymentPolicy: ["50% token to confirm.", "Balance before 21 days of travel.", "Bank transfer / UPI."],
    cancellationPolicy: ["Token non-refundable.", "Before 21 days: 40% charged.", "Before 10 days: 100% charged."],
    childPolicy: ["Infant under 2: free.", "Child 2–6: 50%.", "Child 6–12 without bed: 70%."],
  },
  {
    id: "thailand-phuket-krabi",
    slug: "thailand-phuket-krabi",
    title: "Phuket & Krabi Beach Holiday",
    destination: "Phuket & Krabi, Thailand",
    country: "Thailand",
    nights: 5,
    days: 6,
    image: "/packages/thailand.jpg",
    priceINR: 31999,
    rating: 4.6,
    reviews: 720,
    categories: ["BEACH", "GROUP", "FAMILY", "LAST_MINUTE", "VISA_FREE"],
    themes: ["Islands", "Beaches", "Nightlife", "Snorkelling"],
    bestTime: "Nov – Mar",
    overview: "Sun, sand and island adventures across Phuket and Krabi — Phi Phi islands, James Bond island and the famous 4-islands tour.",
    highlights: ["Phi Phi Islands tour by speedboat", "James Bond Island & Phang Nga Bay", "Krabi 4 Islands tour", "Phuket city & viewpoint", "Airport transfers"],
    itinerary: [
      { day: 1, title: "Arrive Phuket", points: ["Airport pickup & hotel transfer.", "Evening free at Patong Beach."] },
      { day: 2, title: "Phi Phi Islands", points: ["Speedboat to Phi Phi & Maya Bay.", "Snorkelling at Pileh Lagoon.", "Lunch on island."] },
      { day: 3, title: "James Bond Island", points: ["Phang Nga Bay canoeing.", "James Bond Island visit.", "Koh Panyee floating village."] },
      { day: 4, title: "Transfer to Krabi", points: ["Drive to Krabi.", "Ao Nang beach evening."] },
      { day: 5, title: "Krabi 4 Islands", points: ["Tup, Chicken, Poda & Phra Nang.", "Snorkelling & lunch.", "Sunset at Ao Nang."] },
      { day: 6, title: "Departure", points: ["Breakfast & checkout.", "Airport drop."] },
    ],
    inclusions: ["5 nights with breakfast", "Speedboat island tours", "All transfers", "Entrance & park fees"],
    exclusions: ["Flights & visa", "Lunch/dinner unless mentioned", "Personal expenses", "National park fees payable on spot (if any)"],
    paymentPolicy: ["50% advance to confirm.", "Balance before 20 days.", "Bank transfer / UPI."],
    cancellationPolicy: ["Advance non-refundable.", "Before 20 days: 40%.", "Before 7 days: 100%."],
    childPolicy: ["Infant under 2: free.", "Child 2–11 sharing: 60%."],
  },
  {
    id: "dubai-luxury",
    slug: "dubai-luxury",
    title: "Dubai City of Gold",
    destination: "Dubai, UAE",
    country: "UAE",
    nights: 4,
    days: 5,
    image: "/packages/dubai.jpg",
    priceINR: 44999,
    rating: 4.7,
    reviews: 890,
    categories: ["FAMILY", "GROUP", "LAST_MINUTE"],
    themes: ["City", "Desert", "Shopping", "Luxury"],
    bestTime: "Oct – Mar",
    overview: "Experience the dazzling city of Dubai — Burj Khalifa, desert safari, dhow cruise dinner and a day at the world-class theme parks.",
    highlights: ["Burj Khalifa 124th floor", "Desert Safari with BBQ dinner", "Dhow Cruise dinner at Marina", "Dubai City tour & Dubai Mall", "Half-day at the beach"],
    itinerary: [
      { day: 1, title: "Arrive Dubai", points: ["Airport pickup & hotel transfer.", "Dhow cruise dinner at Marina."] },
      { day: 2, title: "City Tour & Burj Khalifa", points: ["Dubai city tour.", "Burj Khalifa 124th floor.", "Dubai Mall & fountain show."] },
      { day: 3, title: "Desert Safari", points: ["Dune bashing & camel ride.", "BBQ dinner with belly dance & Tanoura show."] },
      { day: 4, title: "Theme Parks / Leisure", points: ["IMG Worlds or Global Village.", "Shopping at souks."] },
      { day: 5, title: "Departure", points: ["Breakfast & checkout.", "Airport drop."] },
    ],
    inclusions: ["4 nights with breakfast", "All tours & transfers", "Burj Khalifa & Desert Safari", "Dhow cruise dinner"],
    exclusions: ["Flights & visa", "Lunch/dinner unless mentioned", "Tourism Dirham fee at hotel", "Personal expenses"],
    paymentPolicy: ["50% advance.", "Balance before 25 days.", "Bank transfer / UPI."],
    cancellationPolicy: ["Advance non-refundable.", "Before 25 days: 50%.", "Before 10 days: 100% + visa cost."],
    childPolicy: ["Infant under 2: free.", "Child 2–11 without bed: 70%."],
  },
  {
    id: "maldives-honeymoon",
    slug: "maldives-honeymoon",
    title: "Maldives Overwater Bliss",
    destination: "Maldives",
    country: "Maldives",
    nights: 3,
    days: 4,
    image: "/packages/maldives.jpg",
    priceINR: 62999,
    rating: 4.9,
    reviews: 410,
    categories: ["HONEYMOON", "BEACH", "VISA_FREE"],
    themes: ["Overwater Villa", "Romantic", "Snorkelling", "Luxury"],
    bestTime: "Nov – Apr",
    overview: "Pure romance in the Maldives — an overwater villa, turquoise lagoons, a sunset dolphin cruise and a private candle-light dinner on the sand.",
    highlights: ["Overwater villa stay", "Speedboat / seaplane transfers", "Sunset dolphin cruise", "Private candle-light beach dinner", "Snorkelling in house reef"],
    itinerary: [
      { day: 1, title: "Arrive Maldives", points: ["Welcome at Malé airport.", "Speedboat to resort & villa check-in.", "Evening at leisure."] },
      { day: 2, title: "Island & Reef", points: ["Snorkelling at house reef.", "Sunset dolphin cruise.", "Candle-light dinner on the beach."] },
      { day: 3, title: "Leisure & Spa", points: ["Couple spa.", "Sandbank picnic (optional).", "Relax at the villa."] },
      { day: 4, title: "Departure", points: ["Breakfast & checkout.", "Transfer to airport."] },
    ],
    inclusions: ["3 nights overwater villa with breakfast", "Speedboat transfers", "Dolphin cruise", "Honeymoon inclusions"],
    exclusions: ["Flights", "Lunch/dinner unless mentioned", "Green tax (payable at resort)", "Optional excursions"],
    paymentPolicy: ["50% advance.", "Balance before 30 days.", "Bank transfer."],
    cancellationPolicy: ["Advance non-refundable.", "Before 30 days: 50%.", "Before 15 days: 100%."],
    childPolicy: ["Infant under 2: free.", "Child policy varies by resort."],
  },
  {
    id: "europe-highlights",
    slug: "europe-highlights",
    title: "Europe Highlights — 3 Countries",
    destination: "France · Switzerland · Italy",
    country: "Europe",
    nights: 7,
    days: 8,
    image: "/packages/europe.jpg",
    priceINR: 149999,
    rating: 4.7,
    reviews: 260,
    categories: ["GROUP", "FAMILY"],
    themes: ["Sightseeing", "Mountains", "Heritage", "Group Tour"],
    bestTime: "Apr – Sep",
    overview: "A classic 7-night escorted tour across Paris, the Swiss Alps and Italy — Eiffel Tower, Jungfrau, Venice gondola and Rome's Colosseum.",
    highlights: ["Eiffel Tower & Seine cruise", "Jungfraujoch — Top of Europe", "Venice gondola ride", "Rome Colosseum & Vatican", "Escorted group tour with tour manager"],
    itinerary: [
      { day: 1, title: "Arrive Paris", points: ["Airport pickup.", "Evening Seine river cruise."] },
      { day: 2, title: "Paris", points: ["Eiffel Tower 2nd level.", "City tour & Louvre photo stop.", "Disneyland (optional)."] },
      { day: 3, title: "Paris → Switzerland", points: ["TGV/coach to Switzerland.", "Lucerne lake & Chapel Bridge."] },
      { day: 4, title: "Jungfraujoch", points: ["Cogwheel train to Top of Europe.", "Ice Palace & snow.", "Interlaken evening."] },
      { day: 5, title: "Switzerland → Italy", points: ["Drive to Italy.", "Venice — St. Mark's Square.", "Gondola ride."] },
      { day: 6, title: "Rome", points: ["Colosseum & Roman Forum.", "Trevi Fountain & Spanish Steps."] },
      { day: 7, title: "Vatican", points: ["Vatican City & St. Peter's.", "Leisure & shopping."] },
      { day: 8, title: "Departure", points: ["Breakfast & checkout.", "Airport drop."] },
    ],
    inclusions: ["7 nights with breakfast & Indian dinners", "Escorted coach tour with tour manager", "All entrance fees as per itinerary", "Eurail/TGV where mentioned"],
    exclusions: ["Flights & Schengen visa", "Lunch", "City tax", "Optional tours", "Travel insurance (mandatory, can be arranged)"],
    paymentPolicy: ["Registration amount to book.", "Balance before 45 days of travel.", "Bank transfer."],
    cancellationPolicy: ["Registration non-refundable.", "Before 45 days: 50%.", "Before 30 days: 75%.", "Before 15 days: 100%."],
    childPolicy: ["Infant under 2: nominal.", "Child with extra bed: 90%.", "Child without bed: 80%."],
  },
];

export function getPackage(slug: string) {
  return DEMO_PACKAGES.find((p) => p.slug === slug || p.id === slug);
}
