import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { InfoPage, InfoSection, InfoList } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Careers · Tourist Leader" };

export default function CareersPage() {
  return (
    <InfoPage icon={Briefcase} title="Careers at Tourist Leader" subtitle="Build delightful travel experiences with us.">
      <InfoSection title="Why join us">
        <p>We&apos;re a small, fast-moving team building a full-stack travel platform used across India. We hire for curiosity, ownership and craft — and we ship quickly.</p>
      </InfoSection>
      <InfoSection title="Where we hire">
        <InfoList items={[
          "Engineering — frontend, backend & platform",
          "Product & design",
          "Operations & travel supply",
          "Customer support & success",
        ]} />
      </InfoSection>
      <InfoSection title="How to apply">
        <p>Write to <a href="mailto:careers@touristleader.com" className="font-semibold text-brand hover:underline">careers@touristleader.com</a> with the role you&apos;re interested in and your CV or portfolio. We respond to every application.</p>
      </InfoSection>
    </InfoPage>
  );
}
