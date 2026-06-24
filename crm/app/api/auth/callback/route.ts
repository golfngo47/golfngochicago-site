import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return new NextResponse("Missing code parameter", { status: 400 });
  }

  try {
    await exchangeCodeForToken(code);
    // Redirect back to the app with a success flag
    return NextResponse.redirect(new URL("/?auth=success", req.url));
  } catch (e) {
    console.error("OAuth callback error:", e);
    return new NextResponse("Authentication failed. Check your credentials.", { status: 500 });
  }
}
