"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BusTrip, BoardingPoint } from "@/lib/bus-types";

export interface BusPassengerInput {
  fullName: string;
  age: string;
  gender: string;
  seatId: string;
}

interface BusBookingState {
  bus: BusTrip | null;
  query: { from: string; to: string; date: string } | null;
  seats: { id: string; price: number }[];
  boarding: BoardingPoint | null;
  dropping: BoardingPoint | null;
  fareTotal: number;
  passengers: BusPassengerInput[];
  contactEmail: string;
  contactPhone: string;
  select: (bus: BusTrip, query: { from: string; to: string; date: string }, seats: { id: string; price: number }[], boarding: BoardingPoint, dropping: BoardingPoint, fareTotal: number) => void;
  setPassengers: (p: BusPassengerInput[]) => void;
  setContact: (email: string, phone: string) => void;
  reset: () => void;
  total: () => number;
}

export const BUS_CONVENIENCE = 49;

export const useBusBooking = create<BusBookingState>()(
  persist(
    (set, get) => ({
      bus: null,
      query: null,
      seats: [],
      boarding: null,
      dropping: null,
      fareTotal: 0,
      passengers: [],
      contactEmail: "",
      contactPhone: "",
      select: (bus, query, seats, boarding, dropping, fareTotal) => set({ bus, query, seats, boarding, dropping, fareTotal, passengers: [] }),
      setPassengers: (passengers) => set({ passengers }),
      setContact: (contactEmail, contactPhone) => set({ contactEmail, contactPhone }),
      reset: () => set({ bus: null, query: null, seats: [], boarding: null, dropping: null, fareTotal: 0, passengers: [] }),
      total: () => {
        const { fareTotal } = get();
        if (!fareTotal) return 0;
        const taxes = Math.round(fareTotal * 0.05);
        return fareTotal + taxes + BUS_CONVENIENCE;
      },
    }),
    { name: "tl-bus-booking" }
  )
);
