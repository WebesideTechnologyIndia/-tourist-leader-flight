import type { Metadata } from "next";
import Link from "next/link";
import { Luggage } from "lucide-react";
import { InfoPage, InfoSection, InfoList } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Baggage Rules · Tourist Leader" };

export default function BaggageRulesPage() {
  return (
    <InfoPage icon={Luggage} title="Baggage Rules" subtitle="A quick guide to cabin and check-in baggage.">
      <InfoSection title="Cabin (hand) baggage">
        <InfoList items={[
          "Most domestic airlines allow one cabin bag up to 7 kg, plus a small personal item.",
          "Maximum size is typically 55 × 35 × 25 cm — it must fit in the overhead bin.",
          "Liquids in cabin baggage must be in containers of 100 ml or less.",
        ]} />
      </InfoSection>
      <InfoSection title="Check-in baggage">
        <InfoList items={[
          "Free check-in allowance is usually 15 kg (domestic), varying by airline and fare type.",
          "International allowances are higher and depend on the airline, route and class.",
          "Excess baggage can be pre-booked online at a lower rate than at the airport.",
        ]} />
      </InfoSection>
      <InfoSection title="Good to know">
        <InfoList items={[
          "Exact allowance for your trip is shown on the fare and your ticket.",
          "Sharp objects, power banks above limits and restricted items aren't allowed in cabin baggage.",
          "Add extra baggage after booking from My Trips, subject to airline availability.",
        ]} />
      </InfoSection>
      <InfoSection title="Questions?">
        <p>Reach us via the <Link href="/help?topic=baggage" className="font-semibold text-brand hover:underline">Help Centre</Link> with your Booking ID.</p>
      </InfoSection>
    </InfoPage>
  );
}
