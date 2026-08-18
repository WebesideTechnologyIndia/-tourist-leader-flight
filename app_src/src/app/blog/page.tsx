import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { InfoPage, InfoSection, InfoList } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Blog · Tourist Leader" };

export default function BlogPage() {
  return (
    <InfoPage icon={BookOpen} title="Tourist Leader Blog" subtitle="Travel guides, tips and inspiration — coming soon.">
      <InfoSection title="Launching soon">
        <p>Our blog is in the works — expect destination guides, money-saving tricks, visa & forex how-tos and packing checklists, written by travellers for travellers.</p>
      </InfoSection>
      <InfoSection title="Topics we&apos;ll cover">
        <InfoList items={[
          "Best time to book flights & hotels for the lowest fares",
          "Visa-free and visa-on-arrival destinations for Indians",
          "Forex card vs cash — smart ways to carry money abroad",
          "Family, honeymoon and budget itineraries",
        ]} />
      </InfoSection>
      <InfoSection title="Be the first to read">
        <p>Subscribe for launch updates at <a href="mailto:help@touristleader.com?subject=Blog" className="font-semibold text-brand hover:underline">help@touristleader.com</a>.</p>
      </InfoSection>
    </InfoPage>
  );
}
