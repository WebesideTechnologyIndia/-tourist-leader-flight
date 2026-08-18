import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { genBookingRef } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();
    const rupees = Number(amount);
    if (!rupees || rupees < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const rzp = getRazorpay();
    if (!rzp) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
    }

    const order = await rzp.orders.create({
      amount: Math.round(rupees * 100), // paise
      currency: "INR",
      receipt: genBookingRef(),
      notes: { product: "flight", platform: "Tourist Leader" },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[razorpay/order] failed:", (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
