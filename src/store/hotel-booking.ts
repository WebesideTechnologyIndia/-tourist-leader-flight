"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Hotel, HotelSearchQuery } from "@/lib/hotel-types";

export interface HotelGuest {
  fullName: string;
  email: string;
  phone: string;
  requests?: string;
}

interface HotelBookingState {
  hotel: Hotel | null;
  roomName: string;
  roomPrice: number; // per night
  nights: number;
  query: HotelSearchQuery | null;
  guest: HotelGuest | null;
  select: (hotel: Hotel, roomName: string, roomPrice: number, nights: number, query: HotelSearchQuery) => void;
  setGuest: (g: HotelGuest) => void;
  reset: () => void;
  total: () => number;
}

const CONVENIENCE = 199;

export const useHotelBooking = create<HotelBookingState>()(
  persist(
    (set, get) => ({
      hotel: null,
      roomName: "",
      roomPrice: 0,
      nights: 1,
      query: null,
      guest: null,
      select: (hotel, roomName, roomPrice, nights, query) => set({ hotel, roomName, roomPrice, nights, query }),
      setGuest: (guest) => set({ guest }),
      reset: () => set({ hotel: null, roomName: "", roomPrice: 0, nights: 1, query: null, guest: null }),
      total: () => {
        const { roomPrice, nights, hotel } = get();
        if (!hotel) return 0;
        const room = roomPrice * nights;
        const taxes = Math.round(room * 0.12);
        return room + taxes + CONVENIENCE;
      },
    }),
    { name: "tl-hotel-booking" }
  )
);

export const HOTEL_CONVENIENCE = CONVENIENCE;
