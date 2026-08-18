import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Press & Media · Tourist Leader" };

export default function PressPage() {
  return (
    <InfoPage icon={Newspaper} title="Press &amp; Media" subtitle="Media enquiries, brand assets and interviews.">
      <InfoSection title="Media enquiries">
        <p>For press enquiries, interview requests or fact-checks, reach our communications team at <a href="mailto:press@touristleader.com" className="font-semibold text-brand hover:underline">press@touristleader.com</a>. We typically respond within two business days.</p>
      </InfoSection>
      <InfoSection title="Brand assets">
        <p>Need our logo or brand guidelines for a story? Email us and we&apos;ll share the latest press kit, including high-resolution logos and approved usage.</p>
      </InfoSection>
      <InfoSection title="About the company">
        <p>Tourist Leader is a travel platform for flights, hotels, holidays, bus, visa, forex and insurance, on a mission to make travel caring, seamless and sustainable.</p>
      </InfoSection>
    </InfoPage>
  );
}
