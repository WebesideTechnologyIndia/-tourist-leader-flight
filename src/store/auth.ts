"use client";
import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  state?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  tier: "admin" | "agent" | "none";
  loading: boolean;
  fetched: boolean;
  // global login gate
  gateOpen: boolean;
  afterAuth: (() => void) | null;
  fetchMe: () => Promise<void>;
  sendOtp: (email: string) => Promise<{ ok: boolean; error?: string; otpToken?: string; devOtp?: string; emailed?: boolean }>;
  verifyOtp: (data: { email: string; otp: string; otpToken: string; name?: string; phone?: string; context?: "customer" | "admin" }) => Promise<{ ok: boolean; error?: string; tier?: "admin" | "agent" | "none" }>;
  updateProfile: (data: { name: string; phone: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  /** Run `action` if logged in; otherwise open the login gate and run it after a successful login. */
  requireAuth: (action: () => void) => void;
  setGateOpen: (open: boolean) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  tier: "none",
  loading: false,
  fetched: false,
  gateOpen: false,
  afterAuth: null,
  requireAuth: (action) => {
    if (get().user) action();
    else set({ gateOpen: true, afterAuth: action });
  },
  setGateOpen: (open) => set({ gateOpen: open, ...(open ? {} : { afterAuth: null }) }),
  fetchMe: async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      set({ user: data.user || null, tier: data.tier || "none", fetched: true });
    } catch {
      set({ fetched: true });
    }
  },
  sendOtp: async (email) => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      set({ loading: false });
      if (res.ok && data.otpToken) {
        return { ok: true, otpToken: data.otpToken, devOtp: data.devOtp, emailed: data.emailed };
      }
      return { ok: false, error: data.error || "Could not send code" };
    } catch {
      set({ loading: false });
      return { ok: false, error: "Network error" };
    }
  },
  verifyOtp: async (payload) => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        const cb = get().afterAuth;
        set({ user: data.user, loading: false, gateOpen: false, afterAuth: null });
        if (cb) setTimeout(cb, 60); // continue the gated action (e.g. proceed to booking)
        return { ok: true, tier: data.tier };
      }
      set({ loading: false });
      return { ok: false, error: data.error || "Invalid code" };
    } catch {
      set({ loading: false });
      return { ok: false, error: "Network error" };
    }
  },
  updateProfile: async ({ name, phone }) => {
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (res.ok && data.user) { set({ user: data.user }); return { ok: true }; }
      return { ok: false, error: data.error || "Could not update profile" };
    } catch {
      return { ok: false, error: "Network error" };
    }
  },
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    set({ user: null });
  },
}));
