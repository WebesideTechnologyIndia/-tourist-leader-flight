export const HOTEL_CITIES = [
  { id: "goa", city: "Goa", country: "India", hint: "Beaches & nightlife" },
  { id: "mumbai", city: "Mumbai", country: "India", hint: "City of dreams" },
  { id: "delhi", city: "New Delhi", country: "India", hint: "Capital city" },
  { id: "bengaluru", city: "Bengaluru", country: "India", hint: "Garden city" },
  { id: "jaipur", city: "Jaipur", country: "India", hint: "Pink city" },
  { id: "udaipur", city: "Udaipur", country: "India", hint: "City of lakes" },
  { id: "manali", city: "Manali", country: "India", hint: "Hill station" },
  { id: "shimla", city: "Shimla", country: "India", hint: "Queen of hills" },
  { id: "kochi", city: "Kochi", country: "India", hint: "Backwaters" },
  { id: "chennai", city: "Chennai", country: "India", hint: "Marina beach" },
  { id: "dubai", city: "Dubai", country: "UAE", hint: "Luxury & shopping" },
  { id: "singapore", city: "Singapore", country: "Singapore", hint: "Garden city" },
  { id: "bangkok", city: "Bangkok", country: "Thailand", hint: "Temples & street food" },
  { id: "london", city: "London", country: "UK", hint: "Royal heritage" },
];

export const HOTEL_PRICE_BANDS = [
  { id: "any", label: "Any price" },
  { id: "0-1500", label: "₹0 – ₹1,500", min: 0, max: 1500 },
  { id: "1500-2500", label: "₹1,500 – ₹2,500", min: 1500, max: 2500 },
  { id: "2500-5000", label: "₹2,500 – ₹5,000", min: 2500, max: 5000 },
  { id: "5000-10000", label: "₹5,000 – ₹10,000", min: 5000, max: 10000 },
  { id: "10000+", label: "₹10,000+", min: 10000, max: 1000000 },
];

export const HOTEL_AMENITIES = [
  "Free WiFi", "Swimming Pool", "Breakfast", "Parking", "Restaurant", "Spa",
  "Gym", "Bar", "Room Service", "Air Conditioning", "Airport Shuttle", "Pet Friendly",
];

export const HOTEL_AREAS: Record<string, string[]> = {
  goa: ["Calangute", "Baga", "Candolim", "Anjuna", "Panaji"],
  mumbai: ["Andheri", "Bandra", "Colaba", "Juhu", "Powai"],
  delhi: ["Connaught Place", "Aerocity", "Karol Bagh", "Paharganj", "Saket"],
  bengaluru: ["MG Road", "Koramangala", "Whitefield", "Indiranagar", "Electronic City"],
  jaipur: ["C-Scheme", "Civil Lines", "Malviya Nagar", "Amer", "Bani Park"],
  default: ["City Center", "Downtown", "Old Town", "Beach Road", "Airport Area"],
};

export const TRENDING_HOTEL_SEARCHES = ["Goa", "Mumbai", "Jaipur", "Dubai", "Bangkok"];

export const HOTEL_IMAGES = ["/hotels/h1.jpg", "/hotels/h2.jpg", "/hotels/h3.jpg", "/hotels/h4.jpg", "/hotels/h5.jpg"];

export const HOTEL_BRANDS = [
  "Grand", "Royal", "The Leela", "Taj", "Marriott", "Radisson", "Novotel", "Lemon Tree",
  "Ibis", "Hyatt", "Sterling", "Treebo", "FabHotel", "OYO Townhouse", "Sea View", "Palm",
];
const SUFFIX = ["Residency", "Palace", "Resort & Spa", "Suites", "Grand", "Inn", "Hotel", "Retreat", "Bay", "Heights"];
export const HOTEL_NAME_PARTS = { HOTEL_BRANDS, SUFFIX };
