"use client";
import { useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EnquiryModal } from "./EnquiryModal";
import type { Package } from "@/lib/packages";
import { cn } from "@/lib/utils";

export function EnquiryButton({ pkg, label = "Send Enquiry", className, variant = "primary" }: { pkg: Package; label?: string; className?: string; variant?: "primary" | "accent" | "outline" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} className={cn(className)} onClick={() => setOpen(true)}><Phone size={16} /> {label}</Button>
      <EnquiryModal pkg={pkg} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
