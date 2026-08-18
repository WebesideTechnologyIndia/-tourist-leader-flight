"use client";
import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import { AuthModal } from "./AuthModal";

/** Mounts once globally: keeps the session in sync and renders the login gate
 *  that any `requireAuth(...)` call can open (e.g. before starting a booking). */
export function AuthGate() {
  const { gateOpen, setGateOpen, fetched, fetchMe } = useAuth();

  useEffect(() => { if (!fetched) fetchMe(); }, [fetched, fetchMe]);

  return <AuthModal open={gateOpen} onClose={() => setGateOpen(false)} reason="Please log in or sign up to continue your booking." />;
}
