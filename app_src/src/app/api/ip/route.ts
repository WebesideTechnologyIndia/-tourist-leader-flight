import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch server outbound IP
    const outboundRes = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
    });
    const outboundData = await outboundRes.json();

    // 2. Read incoming request headers (client IP behind Vercel CDN/Proxy)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // 3. Log to server console / Vercel Logs
    console.log("==========================================");
    console.log("🌐 [Vercel Outbound IP]:", outboundData.ip);
    console.log("👤 [Client Request IP] :", clientIp);
    console.log("==========================================");

    return NextResponse.json({
      outboundIp: outboundData.ip,
      clientIp: clientIp,
      timestamp: new Date().toISOString(),
      note: "Vercel serverless functions have dynamic outbound IP addresses. If you need a static IP for whitelisting (e.g. DB or API firewalls), consider using a proxy service (like Fixie/QuotaGuard) or Vercel Secure Compute.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to retrieve outbound IP",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
