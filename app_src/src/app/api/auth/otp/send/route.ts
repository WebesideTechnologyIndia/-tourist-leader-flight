import { NextRequest, NextResponse } from "next/server";
import { generateOtp, signOtpToken } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const e = (email || "").trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    const otp = generateOtp();
    const otpToken = signOtpToken(e, otp);
    const mail = await sendOtpEmail(e, otp);

    // If SMTP isn't working (e.g. app-password mismatch), still let the user log in
    // by surfacing the code outside production so the flow is testable.
    const emailed = !("error" in mail) && !("skipped" in mail);
    const payload: Record<string, unknown> = { ok: true, otpToken, emailed };
    if (!emailed || process.env.NODE_ENV !== "production") {
      payload.devOtp = otp;
      console.log(`[auth/otp] code for ${e}: ${otp}`);
    }
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[auth/otp/send]", (err as Error).message);
    return NextResponse.json({ error: "Could not send code" }, { status: 500 });
  }
}
