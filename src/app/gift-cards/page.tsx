import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { InfoPage, InfoSection, InfoList } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Gift Cards · Tourist Leader" };

export default function GiftCardsPage() {
  return (
    <InfoPage icon={Gift} title="Gift Cards" subtitle="Give the gift of travel.">
      <InfoSection title="Coming soon">
        <p>Tourist Leader gift cards will let you gift travel to friends and family — redeemable towards flights, hotels, holiday packages and more.</p>
      </InfoSection>
      <InfoSection title="What to expect">
        <InfoList items={[
          "Digital gift cards delivered instantly by email",
          "Flexible denominations to suit any budget",
          "Redeemable across all Tourist Leader products",
          "Easy to send with a personalised message",
        ]} />
      </InfoSection>
      <InfoSection title="Get notified first">
        <p>Want early access? Email <a href="mailto:help@touristleader.com?subject=Gift%20Cards" className="font-semibold text-brand hover:underline">help@touristleader.com</a> with the subject &quot;Gift Cards&quot; and we&apos;ll let you know the moment they launch.</p>
      </InfoSection>
    </InfoPage>
  );
}
