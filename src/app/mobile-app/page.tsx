import type { Metadata } from "next";
import { Smartphone } from "lucide-react";
import { InfoPage, InfoSection, InfoList } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Mobile App · Tourist Leader" };

export default function MobileAppPage() {
  return (
    <InfoPage icon={Smartphone} title="Tourist Leader App" subtitle="Your trips, in your pocket — coming soon.">
      <InfoSection title="On the way">
        <p>The Tourist Leader app for Android and iOS is on its way. Book flights, hotels, holidays, bus, visa, forex and insurance, and manage every trip on the go.</p>
      </InfoSection>
      <InfoSection title="What you&apos;ll get">
        <InfoList items={[
          "One-tap booking with saved travellers & payment",
          "Live trip updates and boarding reminders",
          "App-only deals and wallet cashback",
          "Offline access to your tickets & vouchers",
        ]} />
      </InfoSection>
      <InfoSection title="Until then">
        <p>Our website works great on mobile — including a quick bottom navigation bar. Want early access to the app? Email <a href="mailto:help@touristleader.com?subject=App%20Early%20Access" className="font-semibold text-brand hover:underline">help@touristleader.com</a>.</p>
      </InfoSection>
    </InfoPage>
  );
}
