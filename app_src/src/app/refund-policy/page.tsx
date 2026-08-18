import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { InfoPage, InfoSection, InfoList } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Refund Policy · Tourist Leader" };

export default function RefundPolicyPage() {
  return (
    <InfoPage icon={RefreshCcw} title="Refund Policy" subtitle="When and how you get your money back.">
      <InfoSection title="How refunds are calculated">
        <InfoList items={[
          "Refunds equal the amount paid minus the operator's cancellation charges and the non-refundable convenience fee.",
          "The exact refundable amount is shown before you confirm a cancellation.",
          "Promo / cashback components, if any, are adjusted as per the offer terms.",
        ]} />
      </InfoSection>
      <InfoSection title="Where the refund goes">
        <InfoList items={[
          "Payments made by card / UPI / netbanking are refunded to the original payment method.",
          "Payments made from your Tourist Leader wallet are credited back to the wallet instantly.",
          "You can choose to receive eligible refunds as wallet credit for faster processing.",
        ]} />
      </InfoSection>
      <InfoSection title="Timeline">
        <p>Once approved, refunds typically reach your account within 5–7 business days, depending on the airline / hotel / bus operator and your bank.</p>
      </InfoSection>
      <InfoSection title="Track your refund">
        <p>You can see refund status in <Link href="/account/trips" className="font-semibold text-brand hover:underline">My Trips</Link>, or raise a query from the <Link href="/help?topic=refund" className="font-semibold text-brand hover:underline">Help Centre</Link>.</p>
      </InfoSection>
    </InfoPage>
  );
}
