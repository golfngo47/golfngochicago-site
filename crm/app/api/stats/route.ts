import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [total, urgent, quotesOut, confirmed, completed] = await Promise.all([
    prisma.lead.count({
      where: { status: { notIn: ["Completed", "Lost"] } },
    }),
    prisma.lead.count({ where: { priority: "high" } }),
    prisma.lead.count({ where: { status: { in: ["Quote Sent", "Quote Approved"] } } }),
    prisma.lead.count({ where: { status: { in: ["Confirmed", "Deposit Paid"] } } }),
    prisma.lead.count({ where: { status: "Completed" } }),
  ]);

  return NextResponse.json({ active: total, urgent, quotesOut, confirmed, completed });
}
