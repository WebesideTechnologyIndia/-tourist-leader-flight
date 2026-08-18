import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { InfoPage, InfoSection, InfoList } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Cancellation Policy · Tourist Leader" };

export default function CancellationPage() {
  return (
    <InfoPage icon={XCircle} title="Cancellation Policy" subtitle="How cancellations work across flights, hotels and bus.">
      <InfoSection title="How to cancel">
        <p>Open <Link href="/account/trips" className="font-semibold text-brand hover:underline">My Trips</Link>, select your booking and choose Cancel. The exact refund amount is always shown before you confirm.</p>
      </InfoSection>
      <InfoSection title="Charges">
        <InfoList items={[
          "Cancellation charges are set by the airline / hotel / bus operator and depend on the fare rules and how close to departure you cancel.",
          "The Tourist Leader convenience fee is non-refundable.",
          "Any applicable taxes are refunded as per the operator's policy.",
        ]} />
      </InfoSection>
      <InfoSection title="Refund timeline">
        <p>Eligible refunds are credited to your original payment method or Tourist Leader wallet, typically within 5–7 business days depending on the operator and your bank. See our <Link href="/refund-policy" className="font-semibold text-brand hover:underline">Refund Policy</Link> for details.</p>
      </InfoSection>
      <InfoSection title="Need help?">
        <p>Raise a request from the <Link href="/help?topic=cancellation" className="font-semibold text-brand hover:underline">Help Centre</Link> and our team will assist.</p>
      </InfoSection>
    </InfoPage>
  );
}
