import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { InfoPage, InfoSection, InfoList } from "@/components/InfoPage";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = { title: "About Us · Tourist Leader" };

export default function AboutPage() {
  return (
    <InfoPage icon={Building2} title="About Tourist Leader" subtitle={`${BRAND.tagline}.`}>
      <InfoSection title="Our story">
        <p>Tourist Leader is a full-stack travel platform for flights, hotels, holiday packages, bus, visa, forex and insurance. We started with one belief — that travel should feel caring, seamless and sustainable, with comfort before, during and after take off.</p>
        <p>Today we help travellers across India plan and book complete trips in one place, backed by 24×7 human support and transparent pricing.</p>
      </InfoSection>
      <InfoSection title="What we offer">
        <InfoList items={[
          "Domestic & international flights with live fares and a fare calendar",
          "Hotels, homestays and holiday packages curated for every budget",
          "Bus tickets, visa assistance, forex and travel insurance — all in one place",
          "24×7 support and a simple, transparent booking experience",
        ]} />
      </InfoSection>
      <InfoSection title="Our mission">
        <p>To make travel caring, seamless and sustainable for everyone — removing friction at every step so you can focus on the journey, not the paperwork.</p>
      </InfoSection>
    </InfoPage>
  );
}
