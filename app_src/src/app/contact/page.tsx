import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock, LifeBuoy } from "lucide-react";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Contact Us · Tourist Leader" };

export default function ContactPage() {
  return (
    <InfoPage icon={Mail} title="Contact Us" subtitle="We're here 24×7 — before, during and after your trip.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand"><Mail size={18} /></span>
          <div><p className="text-xs text-slate-400">Email</p><a href="mailto:help@touristleader.com" className="text-sm font-bold text-slate-800 hover:text-brand">help@touristleader.com</a></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand"><Phone size={18} /></span>
          <div><p className="text-xs text-slate-400">Phone</p><p className="text-sm font-bold text-slate-800">+91 1800-123-4567</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand"><Clock size={18} /></span>
          <div><p className="text-xs text-slate-400">Support hours</p><p className="text-sm font-bold text-slate-800">24×7, all days</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand"><MapPin size={18} /></span>
          <div><p className="text-xs text-slate-400">Office</p><p className="text-sm font-bold text-slate-800">Bengaluru, Karnataka, India</p></div>
        </div>
      </div>
      <InfoSection title="Need help with a booking?">
        <p>For the fastest help with a specific booking, raise a support ticket and our team will get back to you within hours.</p>
        <Link href="/help" className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"><LifeBuoy size={16} /> Raise a support ticket</Link>
      </InfoSection>
    </InfoPage>
  );
}
