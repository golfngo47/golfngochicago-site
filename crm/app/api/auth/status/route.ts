import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/gmail";

export async function GET() {
  return NextResponse.json({ authenticated: isAuthenticated() });
}
