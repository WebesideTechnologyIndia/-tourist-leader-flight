export interface BusSearchQuery {
  from: string;
  to: string;
  date: string;
}

export interface BoardingPoint {
  id: string;
  name: string;
  time: string; // "21:30"
}

export interface BusTrip {
  id: string;
  operator: string;
  busType: string; // "AC Sleeper (2+1)" etc
  ac: boolean;
  sleeper: boolean;
  from: string;
  to: string;
  departTime: string; // ISO
  arriveTime: string; // ISO
  durationMinutes: number;
  fare: number;
  originalFare: number;
  rating: number;
  ratingCount: number;
  seatsAvailable: number;
  windowSeats: number;
  amenities: string[];
  boardingPoints: BoardingPoint[];
  droppingPoints: BoardingPoint[];
  liveTracking: boolean;
}

export type SeatStatus = "available" | "booked" | "ladies" | "selected";
export interface BusSeat {
  id: string; // "L1", "U5"
  deck: "lower" | "upper";
  type: "sleeper" | "seater";
  row: number;
  col: number; // position
  price: number;
  status: SeatStatus;
}
