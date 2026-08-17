export const BUS_CITIES = [
  "Delhi", "Kanpur", "Lucknow", "Jaipur", "Agra", "Mumbai", "Pune", "Bengaluru",
  "Hyderabad", "Chennai", "Goa", "Ahmedabad", "Surat", "Indore", "Bhopal",
  "Chandigarh", "Dehradun", "Manali", "Shimla", "Udaipur", "Jodhpur", "Varanasi",
  "Patna", "Kolkata", "Nagpur", "Vijayawada", "Coimbatore", "Madurai", "Kochi",
];

export const BUS_OPERATORS = [
  "Tourist Leader Travels", "VRL Travels", "SRS Travels", "Orange Tours", "Neeta Travels",
  "Sharma Travels", "IntrCity SmartBus", "Zingbus", "GreenLine", "KPN Travels",
  "Parveen Travels", "City Land Travels", "Hans Travels", "Rajdhani Express",
];

export const BUS_TYPES = [
  { id: "AC Sleeper (2+1)", ac: true, sleeper: true },
  { id: "Non-AC Sleeper (2+1)", ac: false, sleeper: true },
  { id: "AC Seater / Sleeper (2+1)", ac: true, sleeper: true },
  { id: "AC Seater (2+2)", ac: true, sleeper: false },
  { id: "Volvo AC Multi-Axle Sleeper", ac: true, sleeper: true },
  { id: "Non-AC Seater (2+2)", ac: false, sleeper: false },
];

export const BUS_AMENITIES = [
  "Charging Point", "Water Bottle", "Blanket", "WiFi", "Reading Light",
  "CCTV", "Emergency Contact", "Track My Bus", "Movie", "Snacks",
];

export const BUS_BOARDING = [
  "ISBT Kashmere Gate", "Anand Vihar", "Dhaula Kuan", "Akshardham", "Majnu Ka Tila",
];
export const BUS_DROPPING = [
  "Jhakarkati Bus Stand", "Rawatpur", "Vijay Nagar", "Kalyanpur", "Ghantaghar",
];

/**
 * Trending routes, carrying BDSD city ids from the master list so a click goes
 * straight to a live search instead of relying on a name lookup.
 *
 * Two names had to change to match BDSD's list:
 *   - "Bengaluru" does not exist there at all; the city is listed as "Bangalore".
 *   - "Kanpur" appears twice (142 and 14292) with no distinguishing detail. We
 *     use 142 pending confirmation from BDSD — see the note in bus-cities.ts.
 */
export const BUS_TRENDING = [
  { from: "Delhi", fromId: 1354, to: "Kanpur", toId: 142 },
  { from: "Mumbai", fromId: 3534, to: "Pune", toId: 9771 },
  { from: "Bangalore", fromId: 8463, to: "Goa", toId: 7956 },
  { from: "Delhi", fromId: 1354, to: "Jaipur", toId: 7265 },
  { from: "Hyderabad", fromId: 9573, to: "Vijayawada", toId: 191 },
];
