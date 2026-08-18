import { HOTEL_AREAS, HOTEL_IMAGES, HOTEL_AMENITIES, HOTEL_NAME_PARTS } from "./hotel-constants";
import type { Hotel, HotelSearchQuery } from "./hotel-types";

function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h = (h ^= h >>> 16) >>> 0;
    return h / 4294967296;
  };
}

const TAGS = ["", "", "", "Couple Friendly", "Best Seller", "Great Value", "Newly Renovated"];

export function generateHotels(q: HotelSearchQuery): Hotel[] {
  const cityKey = q.city.toLowerCase().replace(/\s+/g, "");
  const areas = HOTEL_AREAS[cityKey] || HOTEL_AREAS.default;
  const rand = seeded(`${q.city}-${q.checkIn}`);
  const count = 12 + Math.floor(rand() * 8);
  const { HOTEL_BRANDS, SUFFIX } = HOTEL_NAME_PARTS;
  const hotels: Hotel[] = [];

  for (let i = 0; i < count; i++) {
    const star = 3 + Math.floor(rand() * 3); // 3..5
    const base = Math.round((900 + rand() * 9000 + star * 600) / 50) * 50;
    const discountPct = 0.1 + rand() * 0.45;
    const original = Math.round((base / (1 - discountPct)) / 50) * 50;
    const brand = HOTEL_BRANDS[Math.floor(rand() * HOTEL_BRANDS.length)];
    const suffix = SUFFIX[Math.floor(rand() * SUFFIX.length)];
    const area = areas[Math.floor(rand() * areas.length)];
    const amenityCount = 4 + Math.floor(rand() * 6);
    const amenities = [...HOTEL_AMENITIES].sort(() => rand() - 0.5).slice(0, amenityCount);

    hotels.push({
      id: `htl-${cityKey}-${i}`,
      name: `${brand} ${suffix}${rand() > 0.6 ? ` ${q.city}` : ""}`,
      area,
      city: q.city,
      starRating: star,
      userRating: Math.round((3.6 + rand() * 1.4) * 10) / 10,
      reviews: 80 + Math.floor(rand() * 3200),
      pricePerNight: base,
      originalPrice: original,
      taxes: Math.round(base * 0.12),
      image: HOTEL_IMAGES[i % HOTEL_IMAGES.length],
      amenities,
      freeCancellation: rand() > 0.4,
      breakfastIncluded: rand() > 0.5,
      tag: TAGS[Math.floor(rand() * TAGS.length)] || undefined,
    });
  }
  return hotels.sort((a, b) => b.userRating - a.userRating);
}
