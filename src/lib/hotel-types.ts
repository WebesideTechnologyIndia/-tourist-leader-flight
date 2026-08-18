export interface HotelSearchQuery {
  city: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  priceBand?: string;
}

export interface Hotel {
  id: string;
  name: string;
  area: string;
  city: string;
  starRating: number; // 3..5
  userRating: number; // 3.5..5.0
  reviews: number;
  pricePerNight: number;
  originalPrice: number;
  taxes: number;
  image: string;
  amenities: string[];
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  tag?: string;
}
