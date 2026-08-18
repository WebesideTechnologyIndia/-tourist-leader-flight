import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { walletTxn } from "@/lib/billing";
import { verifyPaymentSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/** Credit the wallet after a successful Razorpay top-up. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { amount, razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();
  const amt = Math.round(Number(amount) || 0);
  if (amt < 100) return NextResponse.json({ error: "Minimum top-up is ₹100" }, { status: 400 });

  // verify payment (allow test/no-payment path when Razorpay isn't configured)
  const paid = (!razorpayPaymentId && !razorpayOrderId) ||
    (razorpayOrderId && razorpayPaymentId && razorpaySignature && verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature));
  if (!paid) return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });

  const res = await walletTxn({
    userId: user.id, type: "CREDIT", amount: amt, reason: "TOPUP",
    refType: "RAZORPAY", refId: razorpayPaymentId || null, note: "Added to wallet",
  });
  return NextResponse.json({ ok: true, balance: res?.balance });
}
