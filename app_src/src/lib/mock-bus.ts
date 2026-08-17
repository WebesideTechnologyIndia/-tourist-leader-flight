import { BUS_OPERATORS, BUS_TYPES, BUS_AMENITIES, BUS_BOARDING, BUS_DROPPING } from "./bus-constants";
import type { BusTrip, BusSearchQuery, BusSeat } from "./bus-types";

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

export function generateBuses(q: BusSearchQuery): BusTrip[] {
  const rand = seeded(`${q.from}-${q.to}-${q.date}`);
  const count = 8 + Math.floor(rand() * 8);
  const buses: BusTrip[] = [];

  for (let i = 0; i < count; i++) {
    const type = BUS_TYPES[Math.floor(rand() * BUS_TYPES.length)];
    const operator = BUS_OPERATORS[Math.floor(rand() * BUS_OPERATORS.length)];
    const departHour = 6 + Math.floor(rand() * 17);
    const departMin = [0, 15, 30, 45][Math.floor(rand() * 4)];
    const duration = 240 + Math.floor(rand() * 540); // 4-13h
    const depart = new Date(`${q.date}T${String(departHour).padStart(2, "0")}:${String(departMin).padStart(2, "0")}:00`);
    const arrive = new Date(depart.getTime() + duration * 60000);
    const base = Math.round((450 + rand() * 1600 + (type.ac ? 300 : 0) + (type.sleeper ? 200 : 0)) / 10) * 10;
    const original = Math.round((base * (1 + rand() * 0.4)) / 10) * 10;
    const amCount = 3 + Math.floor(rand() * 6);

    buses.push({
      id: `bus-${i}-${operator.replace(/\s/g, "")}`,
      operator,
      busType: type.id,
      ac: type.ac,
      sleeper: type.sleeper,
      from: q.from,
      to: q.to,
      departTime: depart.toISOString(),
      arriveTime: arrive.toISOString(),
      durationMinutes: duration,
      fare: base,
      originalFare: original,
      rating: Math.round((3.6 + rand() * 1.4) * 10) / 10,
      ratingCount: 40 + Math.floor(rand() * 2000),
      seatsAvailable: 4 + Math.floor(rand() * 38),
      windowSeats: 2 + Math.floor(rand() * 14),
      amenities: [...BUS_AMENITIES].sort(() => rand() - 0.5).slice(0, amCount),
      boardingPoints: BUS_BOARDING.map((name, idx) => ({ id: `bp${idx}`, name, time: `${String(departHour + Math.floor(idx / 3)).padStart(2, "0")}:${String((departMin + idx * 5) % 60).padStart(2, "0")}` })),
      droppingPoints: BUS_DROPPING.map((name, idx) => ({ id: `dp${idx}`, name, time: `${String((arrive.getHours() + idx) % 24).padStart(2, "0")}:${String((idx * 7) % 60).padStart(2, "0")}` })),
      liveTracking: rand() > 0.3,
    });
  }
  return buses.sort((a, b) => new Date(a.departTime).getTime() - new Date(b.departTime).getTime());
}

/** Deterministic seat layout for a bus (sleeper = decks, seater = single deck). */
export function generateSeatLayout(busId: string, fare: number, sleeper: boolean): BusSeat[] {
  const rand = seeded(busId + "-seats");
  const seats: BusSeat[] = [];
  const decks: ("lower" | "upper")[] = sleeper ? ["lower", "upper"] : ["lower"];
  const rows = sleeper ? 6 : 11;
  const colsLeft = 2; // 2+1 layout
  const colsRight = 1;

  decks.forEach((deck) => {
    for (let r = 1; r <= rows; r++) {
      // left side (2 seats), aisle, right side (1 seat)
      const positions = [
        { col: 0, side: "L" }, { col: 1, side: "L" }, { col: 3, side: "R" },
      ];
      positions.forEach((p, idx) => {
        const id = `${deck[0].toUpperCase()}${r}${String.fromCharCode(65 + idx)}`;
        const booked = rand() < 0.32;
        const ladies = !booked && rand() < 0.08;
        seats.push({
          id,
          deck,
          type: sleeper ? "sleeper" : "seater",
          row: r,
          col: p.col,
          price: deck === "upper" ? Math.round(fare * 0.92) : fare,
          status: booked ? "booked" : ladies ? "ladies" : "available",
        });
      });
    }
  });
  return seats;
}
