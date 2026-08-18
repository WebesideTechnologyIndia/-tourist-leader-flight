import type { Metadata } from "next";
import { Leaf } from "lucide-react";
import { InfoPage, InfoSection, InfoList } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Sustainability · Tourist Leader" };

export default function SustainabilityPage() {
  return (
    <InfoPage icon={Leaf} title="Sustainability" subtitle="Caring travel that respects the planet.">
      <InfoSection title="Our commitment">
        <p>Sustainable travel is core to who we are. We believe a great trip shouldn&apos;t cost the earth — so we&apos;re continually working to reduce the footprint of every journey booked with us.</p>
      </InfoSection>
      <InfoSection title="What we&apos;re doing">
        <InfoList items={[
          "Surfacing carbon-aware itineraries and efficient routings",
          "Partnering with operators who follow responsible-tourism practices",
          "Encouraging trains and buses for shorter, greener journeys",
          "Going paperless with e-tickets, e-invoices and digital vouchers",
        ]} />
      </InfoSection>
      <InfoSection title="The road ahead">
        <p>We&apos;re building tools to help travellers understand and offset their impact, and to make the lower-carbon choice the easy choice.</p>
      </InfoSection>
    </InfoPage>
  );
}
