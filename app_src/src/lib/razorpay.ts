import Razorpay from "razorpay";
import crypto from "crypto";

let instance: Razorpay | null = null;

export function getRazorpay(): Razorpay | null {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  if (!instance) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
}

/** Refund a Razorpay payment back to the original source. Returns the refund id or null. */
export async function refundPayment(paymentId: string, amountRupees?: number): Promise<{ ok: boolean; refundId?: string; error?: string }> {
  const rzp = getRazorpay();
  if (!rzp || !paymentId) return { ok: false, error: "Razorpay not configured" };
  try {
    const refund = await rzp.payments.refund(paymentId, {
      ...(amountRupees ? { amount: Math.round(amountRupees) * 100 } : {}), // paise
      speed: "normal",
    });
    return { ok: true, refundId: refund.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Verify the checkout signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  // timing-safe compare
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
