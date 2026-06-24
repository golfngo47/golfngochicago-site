import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/sync/reset
 * Clears the lastSyncAt cursor so the next sync scans the full 90-day window.
 * Safe to call any time — it does not delete any lead data.
 */
export async function POST() {
  await prisma.syncState.upsert({
    where: { id: "singleton" },
    update: { lastSyncAt: null, lastSyncStatus: "reset" },
    create: { id: "singleton", lastSyncAt: null, lastSyncStatus: "reset" },
  });

  console.log("[Sync] lastSyncAt cursor cleared via /api/sync/reset");
  return NextResponse.json({ ok: true, message: "Sync cursor reset. Next refresh will scan the last 90 days." });
}
