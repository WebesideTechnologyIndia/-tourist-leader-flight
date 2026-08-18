"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Flight, FareOption, SearchQuery } from "@/lib/types";
import { fareBreakdown, type SsrMap } from "@/lib/fare-rules";

export interface PassengerInput {
  fullName: string;
  dob: string;
  gender: string;
  nationality: string;
  contactNumber?: string;
  email?: string;
  idType: string;
  idNumber: string;
  assistance: string; // none | wheelchair | priority | escort
  seat?: string;
  meal?: string;
}

/** A picked flight + its fare for one itinerary leg (round-trip return / multi-city legs). */
export interface ItineraryLeg {
  flight: Flight;
  fare: FareOption;
}

interface BookingState {
  query: SearchQuery | null;
  flight: Flight | null;
  fare: FareOption | null;
  // Additional legs beyond the primary `flight` (return leg for round trips,
  // legs 2..N for multi-city). Empty for one-way — keeps that flow unchanged.
  extraFlights: ItineraryLeg[];
  passengers: PassengerInput[];
  contactEmail: string;
  contactPhone: string;
  // Per-leg SSR selections: legIndex → passengerIndex → seatId/mealId.
  // Leg 0 = primary flight; legs 1..N = extraFlights (return / multi-city).
  seats: SsrMap;
  meals: SsrMap;
  addOns: number;
  promoCode: string;
  customerState: string;
  agentMarkup: number; // agent's own service charge added at checkout (agent bookings only)
  setQuery: (q: SearchQuery) => void;
  selectFlight: (f: Flight, fare: FareOption) => void;
  setItinerary: (legs: ItineraryLeg[]) => void;
  setPassengers: (p: PassengerInput[]) => void;
  setContact: (email: string, phone: string) => void;
  setSeat: (leg: number, i: number, seat: string) => void;
  setMeal: (leg: number, i: number, meal: string) => void;
  setAddOns: (n: number) => void;
  setPromo: (code: string) => void;
  setCustomerState: (s: string) => void;
  setAgentMarkup: (n: number) => void;
  reset: () => void;
  farePerPax: () => number; // combined per-passenger fare across all legs
  totalAmount: () => number;
}

export const useBooking = create<BookingState>()(
  persist(
    (set, get) => ({
      query: null,
      flight: null,
      fare: null,
      extraFlights: [],
      passengers: [],
      contactEmail: "",
      contactPhone: "",
      seats: {},
      meals: {},
      addOns: 0,
      promoCode: "",
      customerState: "",
      agentMarkup: 0,
      setQuery: (query) => set({ query }),
      // Single-leg selection (one-way) — clears any prior multi-leg itinerary.
      selectFlight: (flight, fare) => set({ flight, fare, extraFlights: [] }),
      // Multi-leg selection (round trip / multi-city): leg 0 is primary, rest are extras.
      setItinerary: (legs) => set({ flight: legs[0]?.flight ?? null, fare: legs[0]?.fare ?? null, extraFlights: legs.slice(1) }),
      setPassengers: (passengers) => set({ passengers }),
      setContact: (contactEmail, contactPhone) => set({ contactEmail, contactPhone }),
      setSeat: (leg, i, seat) => set((s) => ({ seats: { ...s.seats, [leg]: { ...(s.seats[leg] || {}), [i]: seat } } })),
      setMeal: (leg, i, meal) => set((s) => ({ meals: { ...s.meals, [leg]: { ...(s.meals[leg] || {}), [i]: meal } } })),
      setAddOns: (addOns) => set({ addOns }),
      setPromo: (promoCode) => set({ promoCode }),
      setCustomerState: (customerState) => set({ customerState }),
      setAgentMarkup: (agentMarkup) => set({ agentMarkup }),
      reset: () =>
        set({ flight: null, fare: null, extraFlights: [], passengers: [], seats: {}, meals: {}, addOns: 0, promoCode: "", agentMarkup: 0 }),
      farePerPax: () => {
        const { fare, extraFlights } = get();
        if (!fare) return 0;
        return fare.price + extraFlights.reduce((s, e) => s + e.fare.price, 0);
      },
      totalAmount: () => {
        const { query, addOns } = get();
        const per = get().farePerPax();
        if (!per || !query) return 0;
        // Adults + children at full fare, infants at the reduced infant rate.
        return fareBreakdown(query.travellers, per).fareTotal + addOns;
      },
    }),
    {
      name: "tl-booking",
      version: 1,
      // v0 stored seats/meals as a flat pax→id map (single flight). v1 nests them
      // per leg (leg 0 = onward). Wrap any legacy flat map under leg 0.
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as { seats?: Record<string, unknown>; meals?: Record<string, unknown> } | null;
        if (version < 1 && s) {
          const wrap = (m?: Record<string, unknown>) =>
            m && Object.values(m).some((v) => typeof v === "string") ? { 0: m } : m || {};
          s.seats = wrap(s.seats);
          s.meals = wrap(s.meals);
        }
        return s as unknown;
      },
    }
  )
);
